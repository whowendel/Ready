"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

export default function WorkerPortal() {
  const router = useRouter();
  
  // Navigation tabs in phone
  const [activeTab, setActiveTab] = useState<"tasks" | "ptt" | "handover">("tasks");
  const [profile, setProfile] = useState<any>(null);
  const [tasks, setTasks] = useState<any[]>([]);
  const [handovers, setHandovers] = useState<any[]>([]);
  const [pttClips, setPttClips] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [newHandover, setNewHandover] = useState("");
  const [pttText, setPttText] = useState("");
  
  // Microphone recording states
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recognitionRef = useRef<any>(null);
  const durationIntervalRef = useRef<any>(null);

  // Helper to parse PTT JSON content safely
  const parsePttText = (rawText: string) => {
    try {
      const parsed = JSON.parse(rawText);
      if (parsed && typeof parsed === 'object' && 'text' in parsed) {
        return { text: parsed.text, audio: parsed.audio };
      }
    } catch (e) {}
    return { text: rawText, audio: null };
  };

  // Helper to play PTT clip audio
  const playPttClip = (clip: any) => {
    const { text, audio } = parsePttText(clip.text);
    if (audio) {
      const audioObj = new Audio(audio);
      audioObj.play().catch(err => {
        console.error("Playback failed", err);
        speakText(text);
      });
    } else {
      speakText(text);
    }
  };

  const speakText = (text: string) => {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      const utterance = new SpeechSynthesisUtterance(text);
      window.speechSynthesis.speak(utterance);
    } else {
      alert(`Playing text: "${text}"`);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = async () => {
          const base64Audio = reader.result as string;
          
          const transcript = pttText.trim() || "Voice message";
          const finalDuration = formatDuration(recordingDuration);
          
          try {
            await fetch("/api/dashboard/ptt", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                sender: profile?.name || "Staff",
                duration: finalDuration,
                text: JSON.stringify({ text: transcript, audio: base64Audio }),
                timestamp: "Just now"
              })
            });
            fetchData();
          } catch (err) {
            console.error("Failed to post PTT clip:", err);
          }
          
          setPttText("");
          setRecordingDuration(0);
        };

        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingDuration(0);

      durationIntervalRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);

      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const rec = new SpeechRecognition();
        rec.continuous = true;
        rec.interimResults = true;
        rec.lang = 'en-US';
        
        rec.onresult = (event: any) => {
          let currentTranscript = "";
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
              currentTranscript += event.results[i][0].transcript;
            }
          }
          if (currentTranscript) {
            setPttText(currentTranscript);
          }
        };

        rec.onerror = (err: any) => {
          console.error("Speech recognition error", err);
        };

        rec.start();
        recognitionRef.current = rec;
      } else {
        setPttText("Voice message");
      }

    } catch (err) {
      console.error("Failed to access microphone:", err);
      alert("Microphone access denied or not supported.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
    }
    setIsRecording(false);
  };

  const formatDuration = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // Simulated Camera / Photo Upload State
  const [uploadingTaskId, setUploadingTaskId] = useState<string | null>(null);
  const [simulatedPhoto, setSimulatedPhoto] = useState<string | null>(null);

  // Fetch all worker operational data
  const fetchData = async () => {
    try {
      // 1. Fetch profile details
      const profRes = await fetch("/api/worker/profile");
      if (profRes.status === 401 || profRes.status === 404) {
        router.push("/login");
        return;
      }
      if (!profRes.ok) {
        const errJson = await profRes.json().catch(() => ({}));
        setError(errJson.error || `Failed to load worker profile (Status: ${profRes.status}).`);
        setLoading(false);
        return;
      }
      const profData = await profRes.json();
      setProfile(profData.profile);

      // 2. Fetch tasks
      const taskRes = await fetch("/api/dashboard/tasks");
      if (!taskRes.ok) {
        setError("Failed to load tasks.");
        setLoading(false);
        return;
      }
      const taskData = await taskRes.json();
      // Filter tasks assigned to this worker
      const assigned = (taskData.tasks || []).filter((t: any) => t.workerId === profData.profile.id);
      setTasks(assigned);

      // 3. Fetch handovers
      const handRes = await fetch("/api/dashboard/handovers");
      if (handRes.ok) {
        const handData = await handRes.json();
        setHandovers(handData.handovers || []);
      }

      // 4. Fetch PTT clips
      const pttRes = await fetch("/api/dashboard/ptt");
      if (pttRes.ok) {
        const pttData = await pttRes.json();
        setPttClips(pttData.clips || []);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || String(err));
    } finally {
      setLoading(false);
    }
  };

  const toggleDutyStatus = async () => {
    if (!profile) return;
    const newStatus = !profile.isOnShift;
    try {
      const res = await fetch("/api/worker/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isOnShift: newStatus })
      });
      if (res.ok) {
        const resData = await res.json();
        setProfile(resData.profile);
      } else {
        alert("Failed to toggle duty status.");
      }
    } catch (err) {
      console.error(err);
      alert("Error toggling duty status.");
    }
  };

  useEffect(() => {
    fetchData();
    // Poll data every 4 seconds for real-time synchronization
    const timer = setInterval(fetchData, 4000);
    return () => clearInterval(timer);
  }, []);

  // Handle Logout
  const handleLogout = async () => {
    try {
      const res = await fetch("/api/auth/logout", { method: "POST" });
      if (res.ok) {
        router.push("/login");
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Start / Activate a task
  const handleActivateTask = async (taskId: string) => {
    try {
      const res = await fetch("/api/dashboard/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: taskId, status: "in_progress" })
      });
      if (res.ok) {
        fetchData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Trigger file uploader or simulated snaps
  const triggerPhotoUpload = (taskId: string) => {
    setUploadingTaskId(taskId);
    setSimulatedPhoto(null);
  };

  // Handle file picker convert to Base64
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSimulatedPhoto(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Simulate a quick camera snap
  const handleSimulateCameraSnap = () => {
    // A simple red completion check image representation in base64
    const mockBase64 = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100'><rect width='100' height='100' fill='%23FF2E2E'/><text x='50%' y='55%' font-family='sans-serif' font-size='12' font-weight='bold' fill='white' text-anchor='middle'>QA PASS</text></svg>";
    setSimulatedPhoto(mockBase64);
  };

  // Complete task with photo attachment
  const handleCompleteTask = async (taskId: string) => {
    if (!simulatedPhoto) {
      alert("Please capture or upload photo proof first.");
      return;
    }

    try {
      const today = new Date();
      const formattedDate = today.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      const formattedTime = today.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
      const completionString = `${formattedDate}, ${formattedTime}`;

      const res = await fetch("/api/dashboard/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: taskId,
          status: "completed",
          completedAt: completionString,
          photoUrl: simulatedPhoto
        })
      });

      if (res.ok) {
        setUploadingTaskId(null);
        setSimulatedPhoto(null);
        fetchData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Send walkie talkie PTT clip
  const handleSendPtt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pttText.trim()) return;

    try {
      const res = await fetch("/api/dashboard/ptt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sender: profile?.name || "Staff",
          duration: "0:05",
          text: JSON.stringify({ text: pttText.trim(), audio: null }),
          timestamp: "Just now"
        })
      });

      if (res.ok) {
        setPttText("");
        fetchData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Post handover log
  const handleSendHandover = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHandover.trim()) return;

    try {
      const today = new Date();
      const formattedDate = today.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      const formattedTime = today.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

      const res = await fetch("/api/dashboard/handovers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          author: profile?.name || "Staff",
          text: newHandover.trim(),
          time: `${formattedDate}, ${formattedTime}`
        })
      });

      if (res.ok) {
        setNewHandover("");
        fetchData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center text-black font-bold text-xs">
        Connecting to Operational Network...
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 space-y-4">
        <p className="text-sm font-bold text-blue-600">Failed to connect: {error || "Session expired."}</p>
        <button
          onClick={() => router.push("/login")}
          className="px-4 py-2 bg-blue-600 text-white rounded text-xs font-bold"
        >
          Return to Login
        </button>
      </div>
    );
  }

  const isShielded = profile.inProgressCount >= 1;

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      
      {/* Smartphone Device Frame Container */}
      <div className="w-[375px] h-[780px] bg-slate-900 rounded-[48px] shadow-2xl p-3 border-4 border-slate-950 flex flex-col relative overflow-hidden">
        
        {/* Device Notch Speaker */}
        <div className="absolute top-3 left-1/2 transform -translate-x-1/2 w-32 h-4.5 bg-slate-950 rounded-b-xl z-50 flex items-center justify-center">
          <div className="w-12 h-1 bg-slate-800 rounded-full" />
        </div>

        {/* Simulated Inner Screen */}
        <div className="flex-grow bg-slate-50 rounded-[38px] overflow-hidden flex flex-col justify-between relative text-slate-850">
          
          {/* Phone Header Banner */}
          <div className="bg-white border-b border-slate-200 pt-6 px-4 pb-3 flex justify-between items-center z-40 shadow-sm">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-widest block">Ready Worker</span>
              <span className="text-sm font-black text-black">READY.</span>
            </div>
            
            <div className="flex items-center space-x-2">
              <span className="text-[9px] font-bold text-slate-400">LTE [94%]</span>
              <button
                onClick={handleLogout}
                className="px-2 py-1 bg-slate-100 border border-slate-200 hover:bg-blue-50 text-[9px] font-bold rounded-lg text-slate-700 transition"
              >
                Log Out
              </button>
            </div>
          </div>

          {/* Worker Identity Info Block */}
          <div className="bg-white px-4 py-3 border-b border-slate-200 flex justify-between items-center text-xs">
            <div>
              <p className="font-extrabold text-black">{profile.name}</p>
              <p className="text-[10px] font-bold text-blue-600">{profile.department}</p>
            </div>
            <div className="text-right">
              <span className="text-[9px] text-slate-400 font-bold block">CURRENT MODE</span>
              {isShielded ? (
                <span className="inline-block text-[9px] bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded font-black">
                  Shield Mode Active
                </span>
              ) : (
                <span className="inline-block text-[9px] bg-slate-100 text-slate-800 border border-slate-200 px-2 py-0.5 rounded font-bold">
                  Available
                </span>
              )}
            </div>
          </div>

          {/* Phone Main Scrollable Content */}
          <div className="flex-grow overflow-y-auto p-4 space-y-4">

            {/* Profile Shift Info & Shift Toggle */}
            <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-sm space-y-3">
              <div className="flex justify-between items-center text-xs">
                <div>
                  <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">Assigned Shift schedule</span>
                  <p className="font-extrabold text-black mt-0.5">{profile?.shift || "Morning (06:00 - 14:00)"}</p>
                </div>
                
                {/* Duty Switch */}
                <div className="flex items-center space-x-2">
                  <span className={`text-[10px] font-bold ${profile?.isOnShift ? "text-emerald-600" : "text-slate-500"}`}>
                    {profile?.isOnShift ? "ON DUTY" : "OFF DUTY"}
                  </span>
                  <button
                    onClick={toggleDutyStatus}
                    type="button"
                    className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      profile?.isOnShift ? "bg-blue-600" : "bg-slate-200"
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        profile?.isOnShift ? "translate-x-5" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>

            {/* TAB CONTENT: MY TASKS */}
            {activeTab === "tasks" && (
              <div className="space-y-4">
                
                {/* Visual Workload Bar */}
                <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-sm space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-extrabold text-black">Active Workload Capacity</span>
                    <span className="font-black text-slate-800">{tasks.filter(t => t.status !== "completed").length} / 5 Tasks</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div
                      className={`h-2 rounded-full transition-all duration-300 ${
                        tasks.filter(t => t.status !== "completed").length >= 5 ? "bg-blue-600" :
                        tasks.filter(t => t.status !== "completed").length >= 3 ? "bg-amber-500" : "bg-emerald-500"
                      }`}
                      style={{ width: `${(tasks.filter(t => t.status !== "completed").length / 5) * 100}%` }}
                    />
                  </div>
                  {tasks.filter(t => t.status !== "completed").length >= 5 && (
                    <p className="text-[9px] text-blue-600 font-bold animate-pulse">⚠️ Focus Shield overload prevention active</p>
                  )}
                </div>

                {/* Section 1: Active Duty */}
                <div className="space-y-2.5">
                  <h4 className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest px-1">Pending Assignments ({tasks.filter(t => t.status !== "completed").length})</h4>
                  
                  {tasks.filter(t => t.status !== "completed").length === 0 ? (
                    <div className="bg-white border border-slate-200 p-6 rounded-2xl text-center text-xs italic text-slate-500">
                      No pending tasks assigned.
                    </div>
                  ) : (
                    tasks.filter(t => t.status !== "completed").map((t) => (
                      <div key={t.id} className="bg-white border border-slate-200 p-4 rounded-2xl shadow-sm space-y-3 relative overflow-hidden">
                        {t.priority === "CRITICAL" && (
                          <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-600" />
                        )}
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="text-[9px] font-mono font-bold text-slate-800 block">{t.id}</span>
                            <h4 className="text-xs font-black text-black leading-snug">{t.name}</h4>
                            <p className="text-[10px] text-slate-805 text-black font-bold mt-1">Room: {t.room} • Load: {t.difficulty} pts</p>
                          </div>
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase ${
                            t.priority === "CRITICAL" ? "bg-blue-50 text-blue-700 border border-blue-250" :
                            t.priority === "HIGH" ? "bg-amber-50 text-amber-600 border border-amber-200" :
                            "bg-slate-100 text-slate-700 border border-slate-200"
                          }`}>
                            {t.priority}
                          </span>
                        </div>

                        {/* Task Actions */}
                        <div className="pt-2 border-t border-slate-100 flex flex-col gap-2">
                          {t.status === "backlog" && (
                            <button
                              onClick={() => handleActivateTask(t.id)}
                              className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-sm transition cursor-pointer"
                            >
                              Accept Task
                            </button>
                          )}
                          
                          {t.status === "in_progress" && (
                            <div className="space-y-2">
                              {uploadingTaskId !== t.id ? (
                                <button
                                  onClick={() => triggerPhotoUpload(t.id)}
                                  className="w-full py-2 bg-white border border-slate-200 text-black font-bold text-xs rounded-xl shadow-sm hover:bg-slate-100 transition cursor-pointer"
                                >
                                  Complete Task (Proof)
                                </button>
                              ) : (
                                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                                  <p className="text-[10px] font-bold text-black uppercase tracking-wider">Photo Proof Uploader</p>
                                  
                                  <div className="flex gap-2">
                                    <input
                                      type="file"
                                      accept="image/*"
                                      onChange={handleFileChange}
                                      className="hidden"
                                      id="phone-file-picker"
                                    />
                                    <label
                                      htmlFor="phone-file-picker"
                                      className="flex-1 text-center py-2 bg-white border border-slate-200 rounded-lg text-[10px] font-bold text-slate-800 hover:bg-slate-100 cursor-pointer"
                                    >
                                      Upload File
                                    </label>
                                    <button
                                      type="button"
                                      onClick={handleSimulateCameraSnap}
                                      className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-bold rounded-lg transition cursor-pointer"
                                    >
                                      Simulate Snap
                                    </button>
                                  </div>

                                  {simulatedPhoto && (
                                    <div className="space-y-2">
                                      <p className="text-[9px] font-mono italic text-slate-500 truncate">Attachment loaded successfully.</p>
                                      <button
                                        onClick={() => handleCompleteTask(t.id)}
                                        className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-bold rounded-lg shadow transition cursor-pointer"
                                      >
                                        Submit to QA Dashboard
                                      </button>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Section 2: Completed History */}
                <div className="space-y-2">
                  <h4 className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest px-1">Completed History ({tasks.filter(t => t.status === "completed").length})</h4>
                  
                  {tasks.filter(t => t.status === "completed").length > 0 && (
                    <div className="bg-white border border-slate-200 rounded-2xl divide-y divide-slate-100 overflow-hidden shadow-sm">
                      {tasks.filter(t => t.status === "completed").map((t) => (
                        <div key={t.id} className="p-3 flex justify-between items-center text-xs">
                          <div>
                            <span className="text-[9px] font-mono text-black font-bold block">{t.id}</span>
                            <span className="font-bold text-black leading-snug">{t.name}</span>
                          </div>
                          <div className="text-right flex flex-col items-end gap-0.5">
                            <span className="text-[10px] text-emerald-600 font-bold">✓ Verified</span>
                            {t.completedAt && (
                              <span className="text-[9px] text-slate-500">{t.completedAt}</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

              </div>
            )}

            {/* TAB CONTENT: PTT RADIO */}
            {activeTab === "ptt" && (
              <div className="space-y-4">
                <div className="bg-blue-50 border border-blue-200 p-5 rounded-2xl space-y-4 text-center">
                  <h4 className="text-xs font-bold text-blue-600 uppercase tracking-wider">Push-to-Talk Radio</h4>
                  
                  {/* Record controls */}
                  <div className="flex flex-col items-center justify-center space-y-3 py-2">
                    {isRecording ? (
                      <div className="space-y-2 flex flex-col items-center">
                        <div className="relative flex items-center justify-center">
                          <div className="h-16 w-16 bg-blue-600 rounded-full flex items-center justify-center animate-ping absolute opacity-25" />
                          <button
                            type="button"
                            onClick={stopRecording}
                            className="h-16 w-16 bg-blue-600 hover:bg-blue-700 text-white rounded-full flex items-center justify-center shadow-lg relative cursor-pointer"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                              <rect x="6" y="6" width="12" height="12" rx="1" />
                            </svg>
                          </button>
                        </div>
                        <div className="text-xs font-black text-blue-600 tracking-wider animate-pulse">
                          SPEAKING... ({formatDuration(recordingDuration)})
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2 flex flex-col items-center">
                        <button
                          type="button"
                          onClick={startRecording}
                          className="h-16 w-16 bg-blue-600 hover:bg-blue-700 text-white rounded-full flex items-center justify-center shadow-lg cursor-pointer transition hover:scale-105 active:scale-95"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                          </svg>
                        </button>
                        <p className="text-[10px] text-slate-800 font-bold tracking-wide">TAP MIC TO TRANSMIT AUDIO</p>
                      </div>
                    )}
                  </div>

                  {/* Fallback/Transcript manual text area */}
                  <div className="space-y-2 text-left">
                    <textarea
                      rows={2}
                      value={pttText}
                      onChange={(e) => setPttText(e.target.value)}
                      placeholder={isRecording ? "Transcribing your voice in real time..." : "Type backup voice transcript or record..."}
                      className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs text-black font-semibold focus:outline-none resize-none"
                    />
                    {!isRecording && pttText.trim() && (
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            await fetch("/api/dashboard/ptt", {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({
                                sender: profile?.name || "Staff",
                                duration: "0:05",
                                text: JSON.stringify({ text: pttText.trim(), audio: null }),
                                timestamp: "Just now"
                              })
                            });
                            fetchData();
                            setPttText("");
                          } catch (err) {
                            console.error(err);
                          }
                        }}
                        className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl shadow transition cursor-pointer"
                      >
                        Send Text-Only Transcript
                      </button>
                    )}
                  </div>
                </div>

                <div className="space-y-2.5">
                  <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Radio Feed logs</h3>
                  <div className="space-y-2 max-h-[220px] overflow-y-auto">
                    {pttClips.map((clip) => {
                      const { text } = parsePttText(clip.text);
                      return (
                        <div key={clip.id} className="p-2.5 bg-white border border-slate-200 rounded-xl text-xs flex justify-between items-center gap-2 shadow-sm">
                          <div>
                            <p className="font-bold text-black">{clip.sender} <span className="text-[9px] text-slate-400 font-medium ml-1">{clip.timestamp}</span></p>
                            <p className="text-[10px] italic text-slate-850 mt-0.5">"{text}"</p>
                          </div>
                          <button
                            onClick={() => playPttClip(clip)}
                            className="px-2.5 py-1 bg-slate-100 hover:bg-blue-600 hover:text-white border border-slate-200 text-[9px] font-bold rounded transition cursor-pointer"
                          >
                            Play ({clip.duration})
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* TAB CONTENT: HANDOVER LOG */}
            {activeTab === "handover" && (
              <div className="space-y-4">
                <div className="bg-white border border-slate-200 p-4 rounded-2xl space-y-3 shadow-sm">
                  <h4 className="text-xs font-black text-black uppercase tracking-wide">Write Handover Log</h4>
                  <form onSubmit={handleSendHandover} className="space-y-2">
                    <textarea
                      rows={3}
                      required
                      value={newHandover}
                      onChange={(e) => setNewHandover(e.target.value)}
                      placeholder="Post critical information for incoming shift crew..."
                      className="w-full bg-white border border-slate-200 rounded-xl p-2 text-xs focus:outline-none resize-none"
                    />
                    <button
                      type="submit"
                      className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow transition"
                    >
                      Post Shift Log
                    </button>
                  </form>
                </div>

                <div className="space-y-2.5">
                  <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Handover Logbook Feed</h3>
                  <div className="space-y-2 max-h-[200px] overflow-y-auto">
                    {handovers.map((log) => (
                      <div key={log.id} className="p-3 bg-white border border-slate-200 rounded-xl text-xs space-y-1 shadow-sm">
                        <div className="flex justify-between text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                          <span>{log.author}</span>
                          <span>{log.time}</span>
                        </div>
                        <p className="text-[11px] text-black font-semibold leading-relaxed">{log.text}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

          </div>

          {/* Phone Bottom Viewport Switcher (No Emojis) */}
          <div className="bg-white border-t border-slate-200 p-2 grid grid-cols-3 gap-1 z-40 shadow-inner rounded-b-[38px] sticky bottom-0">
            <button
              onClick={() => setActiveTab("tasks")}
              className={`py-2 text-center text-[10px] font-black rounded-xl transition ${
                activeTab === "tasks"
                  ? "bg-blue-50 text-blue-600"
                  : "text-slate-800 hover:text-black"
              }`}
            >
              My Tasks
            </button>
            <button
              onClick={() => setActiveTab("ptt")}
              className={`py-2 text-center text-[10px] font-black rounded-xl transition ${
                activeTab === "ptt"
                  ? "bg-blue-50 text-blue-600"
                  : "text-slate-800 hover:text-black"
              }`}
            >
              PTT Radio
            </button>
            <button
              onClick={() => setActiveTab("handover")}
              className={`py-2 text-center text-[10px] font-black rounded-xl transition ${
                activeTab === "handover"
                  ? "bg-blue-50 text-blue-600"
                  : "text-slate-800 hover:text-black"
              }`}
            >
              Handover
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
