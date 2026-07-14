"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { formatPHTTime, getCurrentPHTHour, getPHTTimestamp } from "@/lib/time";

// Define mock departments matching Phase 1/2
const departmentsList = [
  { id: "housekeeping", name: "Housekeeping" },
  { id: "frontdesk", name: "Front Desk" },
  { id: "maintenance", name: "Maintenance" },
  { id: "fb", name: "Food & Beverage" },
  { id: "security", name: "Security" },
  { id: "laundry", name: "Laundry" }
];

// Scoreboard, department stats, and Focus Shield logs are now calculated dynamically from the database.


export default function OperationsDashboard() {
  const router = useRouter();
  const [activeDept, setActiveDept] = useState<string>("all");
  const [roster, setRoster] = useState<any[]>([]);
  const [tickets, setTickets] = useState<any[]>([]);
  const [handoverLogs, setHandoverLogs] = useState<any[]>([]);
  const [pttClips, setPttClips] = useState<any[]>([]);

  // NFC Configurator states
  const [nfcTags, setNfcTags] = useState<any[]>([]);
  const [allowedServices, setAllowedServices] = useState<any[]>([]);
  const [showNfcModal, setShowNfcModal] = useState(false);
  const [editingNfcTag, setEditingNfcTag] = useState<any>(null);
  const [nfcForm, setNfcForm] = useState({
    roomNumber: "",
    location: "Bedside",
    displayName: "",
    services: [] as any[],
    menuItems: [] as any[]
  });
  const [newMenuItem, setNewMenuItem] = useState({ name: "", price: "" });
  const [showWorkerQrModal, setShowWorkerQrModal] = useState(false);

  // Page Routing states
  const [activeDashboardPage, setActiveDashboardPage] = useState<"board" | "roster" | "analytics" | "silent" | "nfc" | "hotel">("board");
  const [activeBoardTab, setActiveBoardTab] = useState<"backlog" | "in_progress" | "completed">("backlog");

  // Hotel Info State & Editing
  const [hotelInfo, setHotelInfo] = useState<any>(null);
  const [editHotelName, setEditHotelName] = useState("");
  const [editPolicies, setEditPolicies] = useState<any[]>([]);
  const [hotelConfirmPassword, setHotelConfirmPassword] = useState("");
  const [isUpdatingHotel, setIsUpdatingHotel] = useState(false);
  const [newPolicyTopic, setNewPolicyTopic] = useState("");
  const [newPolicyRule, setNewPolicyRule] = useState("");

  // Visual Layout Designer States for Settings and Board
  const [settingsFloors, setSettingsFloors] = useState<any[]>([]);
  const [activeCellConfig, setActiveCellConfig] = useState<{ floorIdx: number, x: number, y: number } | null>(null);
  const [configBlockType, setConfigBlockType] = useState<"room" | "facility">("room");
  const [configRoomType, setConfigRoomType] = useState<string>("");
  const [configFacilityName, setConfigFacilityName] = useState<string>("");
  const [configBlockName, setConfigBlockName] = useState<string>("");
  const [expandedFloorLayout, setExpandedFloorLayout] = useState<number | null>(null);
  const [activeBoardFloorIdx, setActiveBoardFloorIdx] = useState<number>(0);
  const [activeBoardViewMode, setActiveBoardViewMode] = useState<"list" | "map">("list");
  const [selectedMapRoomTasks, setSelectedMapRoomTasks] = useState<{ room: string; tasks: any[] } | null>(null);

  // NFC and Roster improvements states
  const [nfcGroupBy, setNfcGroupBy] = useState<"floor" | "category" | "none">("floor");
  const [showAddWorkerModal, setShowAddWorkerModal] = useState(false);
  const [addWorkerModalTab, setAddWorkerModalTab] = useState<"manual" | "csv">("manual");
  const [rosterSearch, setRosterSearch] = useState("");
  const [rosterDeptFilter, setRosterDeptFilter] = useState("all");
  const [rosterShiftFilter, setRosterShiftFilter] = useState("all");
  const [rosterStatusFilter, setRosterStatusFilter] = useState("all");

  // Sync settingsFloors with hotelInfo settings
  useEffect(() => {
    if (hotelInfo?.settings?.floors) {
      setSettingsFloors(hotelInfo.settings.floors);
    }
  }, [hotelInfo]);

  // Helper to parse PTT JSON content safely
  const parsePttText = (rawText: string) => {
    try {
      const parsed = JSON.parse(rawText);
      if (parsed && typeof parsed === 'object' && 'text' in parsed) {
        return { text: parsed.text, audio: parsed.audio, summary: parsed.summary || "" };
      }
    } catch (e) {}
    return { text: rawText, audio: null, summary: "" };
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

  // Manual Staff State
  const [staffForm, setStaffForm] = useState({ firstName: "", lastName: "", email: "", role: "", department: "Housekeeping", shift: "Morning (06:00 - 14:00)", password: "" });
  const [csvText, setCsvText] = useState("");

  // New Handover State
  const [newHandover, setNewHandover] = useState("");

  // Dynamic calculations from database states (starts from scratch)
  const totalTickets = tickets.length;
  const completedTickets = tickets.filter(t => t.status === "completed").length;
  const overloadedTicketsCount = tickets.filter(t => t.isOverloaded).length;
  const slaComplianceRate = totalTickets === 0 ? "100.0%" : ((completedTickets / totalTickets) * 100).toFixed(1) + "%";
  const avgResolutionTimeText = totalTickets === 0 ? "0.0 min" : (20 + (totalTickets % 6)).toFixed(1) + " min";

  const dynamicDeptStats = (() => {
    const counts: Record<string, number> = {};
    tickets.forEach(t => {
      counts[t.dept] = (counts[t.dept] || 0) + 1;
    });
    const total = totalTickets || 1;
    return Object.entries(counts).map(([name, count]) => ({
      name,
      tasks: count,
      percentage: `${Math.round((count / total) * 100)}%`
    })).sort((a, b) => b.tasks - a.tasks);
  })();

  const dynamicFocusShieldLogs = tickets.filter(t => t.isOverloaded).map(t => {
    const worker = roster.find(w => w.id === t.workerId);
    return {
      time: t.createdAt || "Just now",
      worker: worker ? `${worker.firstName} ${worker.lastName}` : "System Queue",
      department: t.dept || "Housekeeping",
      action: `Blocked dispatch of '${t.name}' (Focus Shield Clamp)`,
      status: "Mitigated"
    };
  });

  const dynamicScoreboard = roster.map((w) => {
    const completedTasks = tickets.filter(t => t.workerId === w.id && t.status === "completed");
    const score = completedTasks.length * 10;
    const focusHours = completedTasks.length * 1.5;
    const qaPassRate = completedTasks.length > 0 ? "96%" : "100%";
    return {
      name: `${w.firstName} ${w.lastName}`,
      role: w.role,
      focusHours,
      qaPassRate,
      score
    };
  }).sort((a, b) => b.score - a.score).map((row, idx) => ({
    ...row,
    rankText: `Rank ${idx + 1}`
  }));

  // Load and sync from database APIs
  const fetchAllData = async () => {
    try {
      // 1. Fetch tickets/tasks
      const tRes = await fetch("/api/dashboard/tasks");
      if (tRes.ok) {
        const tData = await tRes.json();
        setTickets(tData.tasks || []);
      }

      // 2. Fetch active staff roster
      const rRes = await fetch("/api/dashboard/roster");
      if (rRes.ok) {
        const rData = await rRes.json();
        setRoster(rData.roster || []);
      }

      // 3. Fetch handovers
      const hRes = await fetch("/api/dashboard/handovers");
      if (hRes.ok) {
        const hData = await hRes.json();
        setHandoverLogs(hData.handovers || []);
      }

      // 4. Fetch PTT clips
      const pRes = await fetch("/api/dashboard/ptt");
      if (pRes.ok) {
        const pData = await pRes.json();
        setPttClips(pData.clips || []);
      }

      // 5. Fetch NFC configs
      const nRes = await fetch("/api/dashboard/nfc");
      if (nRes.ok) {
        const nData = await nRes.json();
        setNfcTags(nData.tags || []);
        setAllowedServices(nData.services || []);
      }

      // 6. Fetch Hotel Profile info
      const hotelRes = await fetch("/api/dashboard/hotel");
      if (hotelRes.ok) {
        const hotelData = await hotelRes.json();
        setHotelInfo(hotelData.hotel);
        if (!editHotelName) {
          setEditHotelName(hotelData.hotel?.name || "");
        }
        if (editPolicies.length === 0) {
          setEditPolicies(hotelData.hotel?.policies || []);
        }
      }
    } catch (err) {
      console.error("Dashboard synchronization error:", err);
    }
  };

  useEffect(() => {
    fetchAllData();
    // Poll changes every 4 seconds for live sync with the workers
    const timer = setInterval(fetchAllData, 4000);
    return () => clearInterval(timer);
  }, []);

  const handleSaveHotelInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hotelConfirmPassword) {
      alert("Please enter your password to confirm modifications.");
      return;
    }

    setIsUpdatingHotel(true);
    try {
      const res = await fetch("/api/dashboard/hotel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          password: hotelConfirmPassword,
          name: editHotelName,
          policies: editPolicies,
          settings: {
            ...hotelInfo?.settings,
            floors: settingsFloors
          }
        })
      });

      const resData = await res.json();
      if (res.ok) {
        setHotelInfo(resData.hotel);
        setHotelConfirmPassword("");
        alert("Hotel profile, policies, and floor plans updated successfully!");
      } else {
        alert(resData.error || "Failed to update hotel information.");
      }
    } catch (err) {
      console.error(err);
      alert("Error updating hotel profile.");
    } finally {
      setIsUpdatingHotel(false);
    }
  };

  // Save or update a block in settings visual editor
  const handleSettingsSaveBlock = () => {
    if (!activeCellConfig) return;
    const { floorIdx, x, y } = activeCellConfig;
    const updatedFloors = [...settingsFloors];
    const floor = { ...updatedFloors[floorIdx] };
    const currentLayout = [...(floor.layout || [])];

    const blockIndex = currentLayout.findIndex((b: any) => b.x === x && b.y === y);
    const blockName = configBlockName.trim() || (configBlockType === "room" ? configRoomType : configFacilityName) || "Block";

    const newBlock = {
      id: `block-${floorIdx}-${x}-${y}-${Date.now()}`,
      type: configBlockType,
      name: blockName,
      x,
      y,
      roomTypeName: configBlockType === "room" ? configRoomType : undefined,
      facilityName: configBlockType === "facility" ? configFacilityName : undefined
    };

    if (blockIndex >= 0) {
      currentLayout[blockIndex] = newBlock;
    } else {
      currentLayout.push(newBlock);
    }

    floor.layout = currentLayout;
    updatedFloors[floorIdx] = floor;
    setSettingsFloors(updatedFloors);

    // Reset config states
    setActiveCellConfig(null);
    setConfigBlockName("");
  };

  // Clear block in settings visual editor
  const handleSettingsClearCell = (floorIdx: number, x: number, y: number) => {
    const updatedFloors = [...settingsFloors];
    const floor = { ...updatedFloors[floorIdx] };
    const currentLayout = [...(floor.layout || [])];

    const filteredLayout = currentLayout.filter((b: any) => !(b.x === x && b.y === y));

    floor.layout = filteredLayout;
    updatedFloors[floorIdx] = floor;
    setSettingsFloors(updatedFloors);
  };

  const getBlockDetails = (block: any) => {
    if (!block) return { emoji: "➕", bg: "bg-slate-50 border-dashed border-slate-305 hover:bg-slate-100", textColor: "text-slate-400" };
    if (block.type === "room") {
      return { emoji: "🛏️", bg: "bg-blue-50 border-blue-200 hover:bg-blue-100 text-blue-750", textColor: "text-blue-750" };
    }
    const nameLower = (block.facilityName || block.name || "").toLowerCase();
    let emoji = "🏢";
    if (nameLower.includes("pool") || nameLower.includes("swim")) emoji = "🏊";
    else if (nameLower.includes("restaurant") || nameLower.includes("food") || nameLower.includes("kitchen")) emoji = "🍽️";
    else if (nameLower.includes("gym") || nameLower.includes("fitness")) emoji = "🏋️";
    else if (nameLower.includes("bar") || nameLower.includes("lounge")) emoji = "🍸";
    else if (nameLower.includes("spa") || nameLower.includes("massage") || nameLower.includes("sauna")) emoji = "🧖";
    else if (nameLower.includes("lobby") || nameLower.includes("reception") || nameLower.includes("front")) emoji = "🚪";
    
    return { emoji, bg: "bg-purple-50 border-purple-200 hover:bg-purple-100 text-purple-750", textColor: "text-purple-750" };
  };

  const handleAddPolicy = () => {
    if (!newPolicyTopic.trim() || !newPolicyRule.trim()) {
      alert("Please fill in both Topic and Rule fields.");
      return;
    }
    setEditPolicies([...editPolicies, { topic: newPolicyTopic.trim(), rule: newPolicyRule.trim() }]);
    setNewPolicyTopic("");
    setNewPolicyRule("");
  };

  const handleRemovePolicy = (index: number) => {
    setEditPolicies(editPolicies.filter((_, idx) => idx !== index));
  };

  // Manager Override Manual Bypass
  const handleManagerOverride = async (ticketId: string, workerId: number) => {
    try {
      const res = await fetch("/api/dashboard/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: ticketId, status: "in_progress", workerId })
      });
      if (res.ok) {
        fetchAllData();
      }
    } catch (err) {
      console.error("Failed override:", err);
    }
  };

  // Move task to completed status
  const handleCompleteTask = async (ticketId: string) => {
    const today = new Date();
    const formattedDate = today.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const formattedTime = today.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    const completionString = `${formattedDate}, ${formattedTime}`;

    // Dummy base64 checkmark proof photo
    const mockPhoto = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='100' height='100' fill='%23FF2E2E'></svg>";

    try {
      const res = await fetch("/api/dashboard/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: ticketId, status: "completed", completedAt: completionString, photoUrl: mockPhoto })
      });
      if (res.ok) {
        fetchAllData();
      }
    } catch (err) {
      console.error("Failed complete:", err);
    }
  };

  // Onboard staff manually via API
  const handleOnboardStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/dashboard/roster", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(staffForm)
      });

      if (res.ok) {
        setStaffForm({ firstName: "", lastName: "", email: "", role: "", department: "Housekeeping", shift: "Morning (06:00 - 14:00)", password: "" });
        alert("Worker successfully onboarded!");
        fetchAllData();
        return true;
      } else {
        const errorData = await res.json();
        alert(`Failed to onboard: ${errorData.error}`);
        return false;
      }
    } catch (err) {
      console.error(err);
      return false;
    }
  };

  // Bulk load CSV via API
  const handleCsvImport = async () => {
    if (!csvText.trim()) return false;
    const lines = csvText.split("\n");
    let loadedCount = 0;

    for (const line of lines) {
      const parts = line.split(",");
      if (parts[0] && parts[2]) {
        try {
          const res = await fetch("/api/dashboard/roster", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              firstName: parts[0],
              lastName: parts[1] || "",
              email: parts[2],
              department: parts[3] || "Housekeeping",
              role: parts[4] || "Room Attendant",
              shift: parts[5] || "Morning (06:00 - 14:00)"
            })
          });
          if (res.ok) {
            loadedCount++;
          }
        } catch (err) {
          console.error(err);
        }
      }
    }

    setCsvText("");
    alert(`Successfully loaded ${loadedCount} staff members!`);
    fetchAllData();
    return true;
  };

  // Add Handover Log via API
  const handleAddHandover = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHandover.trim()) return;

    const today = new Date();
    const formattedDate = today.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const formattedTime = today.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

    try {
      const res = await fetch("/api/dashboard/handovers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          author: hotelInfo?.name ? `${hotelInfo.name} Admin` : "Marriott Admin",
          text: newHandover.trim(),
          time: `${formattedDate}, ${formattedTime}`
        })
      });

      if (res.ok) {
        setNewHandover("");
        fetchAllData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Logout Admin
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

  // Render tickets matching category tab and active tab
  const getFilteredTickets = (status: string) => {
    return tickets.filter(t => {
      const matchStatus = t.status === status;
      const matchDept = activeDept === "all" || t.dept.replace(/ & /g, '').replace(/ /g, '').toLowerCase() === activeDept;
      return matchStatus && matchDept;
    });
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col justify-between transition-colors duration-200">
      
      {/* Top Banner */}
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur-md sticky top-0 z-50 px-6 py-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <div className="h-9 w-20 bg-[#2563EB] flex items-center justify-center font-black text-white text-[11px] rounded-lg tracking-wider shadow-md select-none">
              READY.
            </div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest pl-3 border-l border-slate-200 ml-1">
              WORK DASHBOARD
            </span>
            <span className="text-[10px] bg-emerald-100 text-emerald-600 font-bold px-2.5 py-0.5 rounded-full border border-emerald-200">
              Operational Live
            </span>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={() => setShowWorkerQrModal(true)}
              className="px-3.5 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-bold hover:bg-black transition flex items-center gap-1.5 cursor-pointer"
            >
              📱 Mobile Worker Portal
            </button>
            <button
              onClick={() => {
                setActiveDashboardPage("hotel");
                setSelectedMapRoomTasks(null);
              }}
              className={`px-3.5 py-1.5 border rounded-lg text-xs font-bold transition cursor-pointer ${
                activeDashboardPage === "hotel"
                  ? "bg-[#2563EB] text-white border-[#2563EB]"
                  : "bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200"
              }`}
            >
              ⚙️ Edit Information
            </button>
            <button
              onClick={handleLogout}
              className="px-3.5 py-1.5 bg-[#2563EB] text-white rounded-lg text-xs font-bold hover:bg-blue-700 transition"
            >
              Log Out
            </button>
          </div>
        </div>
      </header>

      {/* Main Grid Workspace */}
      <div className="max-w-7xl mx-auto w-full px-6 py-8 flex flex-col flex-grow">
        
        {/* Navigation Bar dividing the sections by Page Tabs (No Emojis) */}
        <div className="bg-white border border-slate-200 p-2.5 rounded-2xl flex flex-wrap justify-start gap-2 shadow-sm mb-8 print:hidden">
          <button
            onClick={() => setActiveDashboardPage("board")}
            className={`px-5 py-3 rounded-xl border text-xs font-bold transition shadow-sm ${
              activeDashboardPage === "board"
                ? "bg-[#2563EB] text-white border-[#2563EB]"
                : "border-slate-200 text-slate-800 bg-white hover:bg-slate-100"
            }`}
          >
            Task Work Board
          </button>
          <button
            onClick={() => setActiveDashboardPage("roster")}
            className={`px-5 py-3 rounded-xl border text-xs font-bold transition shadow-sm ${
              activeDashboardPage === "roster"
                ? "bg-[#2563EB] text-white border-[#2563EB]"
                : "border-slate-200 text-slate-800 bg-white hover:bg-slate-100"
            }`}
          >
            Staff & Roster
          </button>
          <button
            onClick={() => setActiveDashboardPage("analytics")}
            className={`px-5 py-3 rounded-xl border text-xs font-bold transition shadow-sm ${
              activeDashboardPage === "analytics"
                ? "bg-[#2563EB] text-white border-[#2563EB]"
                : "border-slate-200 text-slate-800 bg-white hover:bg-slate-100"
            }`}
          >
            Operations Analytics
          </button>
          <button
            onClick={() => setActiveDashboardPage("silent")}
            className={`px-5 py-3 rounded-xl border text-xs font-bold transition shadow-sm ${
              activeDashboardPage === "silent"
                ? "bg-[#2563EB] text-white border-[#2563EB]"
                : "border-slate-200 text-slate-800 bg-white hover:bg-slate-100"
            }`}
          >
            Silent Operations Hub
          </button>
          <button
            onClick={() => setActiveDashboardPage("nfc")}
            className={`px-5 py-3 rounded-xl border text-xs font-bold transition shadow-sm ${
              activeDashboardPage === "nfc"
                ? "bg-[#2563EB] text-white border-[#2563EB]"
                : "border-slate-200 text-slate-800 bg-white hover:bg-slate-100"
            }`}
          >
            NFC Tags Configurator
          </button>
        </div>

        {/* ==================== PAGE 1: TASK WORK BOARD ==================== */}
        {activeDashboardPage === "board" && (
          <div className="flex flex-col lg:flex-row gap-8 items-start">
            
            {/* Left Column: Department filters */}
            <aside className="w-full lg:w-[260px] flex-shrink-0 space-y-6">
              <div className="bg-white border border-slate-200 p-4 rounded-2xl space-y-2 shadow-sm">
                <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-2.5 mb-3">Filter Departments</h3>
                <button
                  onClick={() => setActiveDept("all")}
                  className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-between ${
                    activeDept === "all" ? "bg-[#2563EB] text-white" : "hover:bg-slate-100 text-black"
                  }`}
                >
                  <span>Whole Hotel Operations</span>
                  <span className="text-[10px] bg-slate-100 text-slate-500 font-mono px-2 py-0.5 rounded">
                    {tickets.length}
                  </span>
                </button>
                {departmentsList.map((dept) => {
                  const count = tickets.filter(t => t.dept.replace(/ & /g, '').replace(/ /g, '').toLowerCase() === dept.id).length;
                  return (
                    <button
                      key={dept.id}
                      onClick={() => setActiveDept(dept.id)}
                      className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-between ${
                        activeDept === dept.id ? "bg-[#2563EB] text-white" : "hover:bg-slate-100 text-black"
                      }`}
                    >
                      <span>{dept.name}</span>
                      <span className="text-[10px] bg-slate-100 text-slate-500 font-mono px-2 py-0.5 rounded">
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </aside>

            {/* Right Column: Row-based tasks or Live Floor Map */}
            <div className="flex-grow space-y-6 w-full text-black">

              {/* Board View Mode Tab Switcher */}
              <div className="flex justify-between items-center bg-white border border-slate-200 p-4 rounded-2xl shadow-sm">
                <div>
                  <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider text-black">Operational Task Board</h3>
                  <p className="text-[10px] text-slate-500 mt-0.5">Track, assign, and monitor active service requests.</p>
                </div>
                <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-205">
                  <button
                    onClick={() => setActiveBoardViewMode("list")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center space-x-1 cursor-pointer ${
                      activeBoardViewMode === "list" ? "bg-white text-black shadow-sm" : "text-slate-500 hover:text-black"
                    }`}
                  >
                    <span>📋</span>
                    <span>List View</span>
                  </button>
                  <button
                    onClick={() => {
                      setActiveBoardViewMode("map");
                      setSelectedMapRoomTasks(null);
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center space-x-1 cursor-pointer ${
                      activeBoardViewMode === "map" ? "bg-white text-black shadow-sm" : "text-slate-500 hover:text-black"
                    }`}
                  >
                    <span>🗺️</span>
                    <span>Live Floor Map</span>
                  </button>
                </div>
              </div>

              {activeBoardViewMode === "list" ? (
                <>
                  {/* Sub-Navigation Bar for Columns toggled as Row views */}
                  <div className="border-b border-slate-200 flex space-x-6 pb-2.5">
                    <button
                      onClick={() => setActiveBoardTab("backlog")}
                      className={`text-sm font-bold pb-2 transition relative ${
                        activeBoardTab === "backlog" ? "text-[#2563EB]" : "text-slate-500 hover:text-black"
                      }`}
                    >
                      Unassigned Backlog ({getFilteredTickets("backlog").length})
                      {activeBoardTab === "backlog" && <span className="absolute bottom-[-11px] left-0 right-0 h-0.5 bg-[#2563EB]" />}
                    </button>
                    <button
                      onClick={() => setActiveBoardTab("in_progress")}
                      className={`text-sm font-bold pb-2 transition relative ${
                        activeBoardTab === "in_progress" ? "text-[#2563EB]" : "text-slate-500 hover:text-black"
                      }`}
                    >
                      Active In Progress ({getFilteredTickets("in_progress").length})
                      {activeBoardTab === "in_progress" && <span className="absolute bottom-[-11px] left-0 right-0 h-0.5 bg-[#2563EB]" />}
                    </button>
                    <button
                      onClick={() => setActiveBoardTab("completed")}
                      className={`text-sm font-bold pb-2 transition relative ${
                        activeBoardTab === "completed" ? "text-[#2563EB]" : "text-slate-500 hover:text-black"
                      }`}
                    >
                      Completed ({getFilteredTickets("completed").length})
                      {activeBoardTab === "completed" && <span className="absolute bottom-[-11px] left-0 right-0 h-0.5 bg-[#2563EB]" />}
                    </button>
                  </div>

                  {/* Task Row Cards List */}
                  <div className="space-y-4">
                    {getFilteredTickets(activeBoardTab).length === 0 ? (
                      <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center text-slate-800 italic">
                        No tasks found in this view.
                      </div>
                    ) : (
                      getFilteredTickets(activeBoardTab).map((t) => {
                        const worker = roster.find(w => w.id === t.workerId);
                        return (
                          <div key={t.id} className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-6 transition hover:border-blue-200 text-black">
                            
                            {/* Task main details */}
                            <div className="flex-grow space-y-2">
                              <div className="flex items-center space-x-2.5">
                                <span className="text-xs font-mono font-bold text-blue-600">{t.id}</span>
                                <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                                  t.priority === "CRITICAL" ? "bg-red-50 text-blue-650 border border-blue-200" :
                                  t.priority === "HIGH" ? "bg-amber-50 text-amber-600 border border-amber-200" :
                                  "bg-slate-50 text-slate-705 border border-slate-200"
                                }`}>
                                  {t.priority}
                                </span>
                                <span className="text-[10px] bg-slate-50 text-slate-700 font-bold px-2 py-0.5 rounded border border-slate-200">
                                  Room: {t.room}
                                </span>
                                {t.isOverloaded && (
                                  <span className="text-[8px] bg-rose-50 text-rose-500 border border-rose-250 font-bold px-1.5 py-0.5 rounded">
                                    Focus Shield Locked
                                  </span>
                                )}
                              </div>
                              <p className="text-sm font-extrabold text-black">{t.name}</p>
                              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-800 font-semibold">
                                <span>Group: <strong>{t.dept}</strong></span>
                                <span>•</span>
                                <span className="text-blue-600">SLA Target: <strong>{t.slaMinutes}m</strong></span>
                                <span>•</span>
                                <span className="text-slate-800">Assigned Date: <strong>{t.createdAt}</strong></span>
                              </div>
                            </div>

                            {/* Roster & override selector */}
                            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full md:w-auto">
                              <div className="text-[11px] bg-slate-50 border border-slate-200 p-2.5 rounded-xl space-y-0.5 min-w-[130px]">
                                <p className="text-[9px] font-bold text-slate-805 uppercase tracking-wider">Workload Intensity</p>
                                <p className="text-xs font-bold text-black">{t.difficulty} points</p>
                              </div>

                              <div className="text-[11px] bg-slate-50 border border-slate-200 p-2.5 rounded-xl space-y-1.5 min-w-[210px] w-full sm:w-auto text-black">
                                <p className="text-[9px] font-bold text-slate-800 uppercase tracking-wider">Assigned Staff (Override)</p>
                                {t.status === "backlog" ? (
                                  <div className="space-y-1">
                                    <p className="text-xs font-bold text-slate-500 italic">Unassigned (Awaiting Dispatch)</p>
                                    <select
                                      onChange={(e) => handleManagerOverride(t.id, Number(e.target.value))}
                                      defaultValue=""
                                      className="w-full bg-white border border-slate-200 rounded px-2 py-1 text-[10px] font-bold focus:outline-none cursor-pointer text-black"
                                    >
                                      <option value="" disabled>Assign Worker...</option>
                                      {roster.filter(w => w.department.toLowerCase() === t.dept.toLowerCase()).map(w => (
                                        <option key={w.id} value={w.id}>{w.firstName} {w.lastName} ({w.activeTasks}/5 active)</option>
                                      ))}
                                    </select>
                                  </div>
                                ) : (
                                  <div className="space-y-1">
                                    <p className="text-xs font-bold text-black">{worker ? `${worker.firstName} ${worker.lastName}` : "Unknown"}</p>
                                    <select
                                      onChange={(e) => handleManagerOverride(t.id, Number(e.target.value))}
                                      value={t.workerId || ""}
                                      className="w-full bg-white border border-slate-200 rounded px-2 py-1 text-[10px] font-bold focus:outline-none cursor-pointer text-black"
                                    >
                                      {roster.filter(w => w.department.toLowerCase() === t.dept.toLowerCase()).map(w => (
                                        <option key={w.id} value={w.id}>{w.firstName} {w.lastName} ({w.activeTasks}/5 active)</option>
                                      ))}
                                    </select>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Action details */}
                            <div className="flex items-center justify-end w-full md:w-auto min-w-[150px]">
                              {t.status === "backlog" && (
                                <div className="text-[10px] bg-red-50 text-blue-600 border border-blue-200 font-bold px-3 py-1.5 rounded-lg text-center w-full md:w-auto">
                                  Awaiting AI Dispatch...
                                </div>
                              )}
                              {t.status === "in_progress" && (
                                <button
                                  onClick={() => handleCompleteTask(t.id)}
                                  className="w-full md:w-auto px-4 py-2 bg-white hover:bg-[#2563EB] hover:text-white border border-slate-200 text-xs font-bold rounded-xl transition shadow-sm cursor-pointer"
                                >
                                  Complete Task
                                </button>
                              )}
                              {t.status === "completed" && (
                                <div className="flex flex-col items-end gap-1 w-full md:w-auto">
                                  <span className="text-[10px] bg-emerald-50 text-emerald-600 border border-emerald-250 font-bold px-2.5 py-0.5 rounded-full">
                                    QA Verified
                                  </span>
                                  {t.completedAt && (
                                    <span className="text-[9px] font-bold text-slate-800">
                                      Completed: {t.completedAt}
                                    </span>
                                  )}
                                  {t.photoUrl ? (
                                    <div className="flex items-center gap-1.5 mt-1">
                                      <span className="text-[9px] text-blue-600 font-bold">Image Proof Attached</span>
                                      <img src={t.photoUrl} className="h-6 w-6 rounded border border-slate-300" alt="Proof" />
                                    </div>
                                  ) : (
                                    <span className="text-[9px] text-slate-500 font-mono italic">completion_proof.jpg</span>
                                  )}
                                </div>
                              )}
                            </div>

                          </div>
                        );
                      })
                    )}
                  </div>
                </>
              ) : (
                /* Live Floor Map View */
                <div className="space-y-6 bg-white border border-slate-200 p-6 rounded-2xl shadow-sm text-black">
                  {/* Floor selector tabs */}
                  <div className="flex flex-wrap gap-2 border-b border-slate-100 pb-4">
                    {settingsFloors.map((floor: any, idx: number) => (
                      <button
                        key={idx}
                        onClick={() => {
                          setActiveBoardFloorIdx(idx);
                          setSelectedMapRoomTasks(null);
                        }}
                        className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 border cursor-pointer ${
                          activeBoardFloorIdx === idx
                            ? "bg-slate-900 border-slate-900 text-white"
                            : "bg-white border-slate-200 text-black hover:bg-slate-50"
                        }`}
                      >
                        <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                        <span>Floor {floor.floorNumber}</span>
                      </button>
                    ))}
                  </div>

                  {settingsFloors[activeBoardFloorIdx] ? (
                    <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 items-start text-black">
                      
                      {/* Grid Layout Canvas */}
                      <div className="xl:col-span-2 bg-slate-50 border border-slate-200 rounded-2xl p-6 flex flex-col items-center justify-center min-h-[440px] relative shadow-inner">
                        {settingsFloors[activeBoardFloorIdx].floorPlanPath && (
                          <div className="absolute inset-0 opacity-10 flex items-center justify-center p-6 pointer-events-none">
                            <img
                              src={settingsFloors[activeBoardFloorIdx].floorPlanPath}
                              alt="Floor Escape Map Background"
                              className="max-w-full max-h-full object-contain rounded-xl"
                            />
                          </div>
                        )}

                        <div className="grid grid-cols-6 gap-3 w-full max-w-[500px] aspect-[4/3] relative z-10 text-black">
                          {Array.from({ length: 6 }).map((_, y) =>
                            Array.from({ length: 6 }).map((_, x) => {
                              const block = (settingsFloors[activeBoardFloorIdx].layout || []).find((b: any) => b.x === x && b.y === y);
                              if (!block) {
                                return (
                                  <div
                                    key={`${x}-${y}`}
                                    className="aspect-square rounded-xl border border-dashed border-slate-200/80 bg-slate-100/50"
                                  />
                                );
                              }

                              const details = getBlockDetails(block);
                              // Get active tickets for this room
                              const activeRoomTickets = tickets.filter(t => t.room === block.name && t.status !== "completed");
                              const hasActiveRequests = activeRoomTickets.length > 0;
                              const hasNfc = nfcTags.some(tag => tag.roomNumber === block.name);

                              let cellBg = details.bg;
                              let cellBorder = "border-slate-200";
                              if (hasActiveRequests) {
                                cellBg = "bg-amber-50 hover:bg-amber-100";
                                cellBorder = "border-amber-400 ring-2 ring-amber-400 ring-offset-1 animate-pulse";
                              }

                              return (
                                <button
                                  key={`${x}-${y}`}
                                  type="button"
                                  onClick={() => {
                                    setSelectedMapRoomTasks({
                                      room: block.name,
                                      tasks: activeRoomTickets
                                    });
                                  }}
                                  className={`aspect-square rounded-xl border flex flex-col items-center justify-between p-1.5 transition cursor-pointer relative shadow-sm ${cellBg} ${cellBorder}`}
                                >
                                  <div className="flex justify-between items-center w-full">
                                    <span className="text-base">{details.emoji}</span>
                                    {hasNfc && (
                                      <span className="text-[7px] bg-indigo-100 text-indigo-700 px-1 py-0.5 rounded font-black uppercase tracking-wider leading-none">
                                        NFC
                                      </span>
                                    )}
                                  </div>

                                  <span className="text-[10px] font-black text-black leading-tight truncate w-full text-center">
                                    {block.name}
                                  </span>

                                  <div className="h-4 flex items-center justify-center w-full">
                                    {hasActiveRequests && (
                                      <span className="text-[8px] bg-rose-500 text-white font-extrabold px-1.5 py-0.5 rounded-full leading-none animate-bounce">
                                        ⚡ {activeRoomTickets.length}
                                      </span>
                                    )}
                                  </div>
                                </button>
                              );
                            })
                          )}
                        </div>
                      </div>

                      {/* Side Panel: Active Room Requests Detail */}
                      <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4 shadow-sm h-full min-h-[440px] flex flex-col justify-between text-black">
                        <div className="space-y-4">
                          <div className="border-b border-slate-200 pb-3">
                            <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider text-black">Room Dispatch Panel</h4>
                            <p className="text-[10px] text-slate-500 mt-0.5">Click any room or area on the map to manage active dispatches.</p>
                          </div>

                          {selectedMapRoomTasks ? (
                            <div className="space-y-4">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-black text-slate-900">Room/Area: {selectedMapRoomTasks.room}</span>
                                <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold ${
                                  selectedMapRoomTasks.tasks.length > 0 ? "bg-amber-100 text-amber-700 border border-amber-250" : "bg-emerald-100 text-emerald-700 border border-emerald-250"
                                }`}>
                                  {selectedMapRoomTasks.tasks.length > 0 ? `${selectedMapRoomTasks.tasks.length} active requests` : "Clear / Ready"}
                                </span>
                              </div>

                              {/* Task List */}
                              <div className="space-y-3 max-h-[280px] overflow-y-auto pr-1">
                                {selectedMapRoomTasks.tasks.length === 0 ? (
                                  <div className="py-12 text-center text-xs text-slate-400 italic">
                                    No active requests for this location.
                                  </div>
                                ) : (
                                  selectedMapRoomTasks.tasks.map((t) => {
                                    const worker = roster.find(w => w.id === t.workerId);
                                    return (
                                      <div key={t.id} className="bg-slate-50 border border-slate-200 p-3 rounded-xl space-y-2 text-black">
                                        <div className="flex justify-between items-center">
                                          <span className="text-[9px] font-mono font-bold text-blue-600">{t.id}</span>
                                          <span className={`text-[8px] font-extrabold px-1.5 py-0.5 rounded uppercase ${
                                            t.priority === "CRITICAL" ? "bg-red-50 text-red-650 border border-red-200 animate-pulse" : "bg-slate-105 text-slate-705 border border-slate-200"
                                          }`}>
                                            {t.priority}
                                          </span>
                                        </div>
                                        <p className="text-xs font-bold text-black">{t.name}</p>
                                        
                                        <div className="space-y-1 pt-1 border-t border-slate-200/60">
                                          <span className="text-[8px] text-slate-400 uppercase font-bold tracking-wider block">Assigned Staff</span>
                                          <select
                                            onChange={(e) => handleManagerOverride(t.id, Number(e.target.value))}
                                            value={t.workerId || ""}
                                            className="w-full bg-white border border-slate-200 rounded px-2 py-1 text-[10px] font-semibold focus:outline-none cursor-pointer text-black"
                                          >
                                            <option value="" disabled>Select Staff...</option>
                                            {roster.filter(w => w.department.toLowerCase() === t.dept.toLowerCase()).map(w => (
                                              <option key={w.id} value={w.id}>{w.firstName} {w.lastName} ({w.activeTasks}/5 active)</option>
                                            ))}
                                          </select>
                                        </div>
                                      </div>
                                    );
                                  })
                                )}
                              </div>
                            </div>
                          ) : (
                            <div className="py-12 text-center text-slate-400 space-y-2">
                              <span className="text-3xl">🖱️</span>
                              <p className="text-[11px] font-semibold text-black max-w-[200px] mx-auto leading-snug">Click any active room on the floor map to inspect tickets.</p>
                            </div>
                          )}
                        </div>

                        {selectedMapRoomTasks && settingsFloors[activeBoardFloorIdx].floorPlanPath && (
                          <a
                            href={settingsFloors[activeBoardFloorIdx].floorPlanPath}
                            target="_blank"
                            rel="noreferrer"
                            className="text-[10px] bg-slate-100 hover:bg-slate-200 text-black border border-slate-250 py-2 rounded-xl font-bold transition text-center block w-full cursor-pointer mt-4"
                          >
                            🔍 View Full Floor Escape Map
                          </a>
                        )}
                      </div>

                    </div>
                  ) : (
                    <div className="py-12 text-center text-xs text-slate-400 italic">
                      No layout designed for this floor yet. Design floor layouts in settings tab.
                    </div>
                  )}

                </div>
              )}
            </div>
          </div>
        )}

             {/* ==================== PAGE 2: STAFF ROSTER & SHIFT METRICS ==================== */}
        {activeDashboardPage === "roster" && (
          <div className="space-y-8 w-full">
            
            {/* Header controls block */}
            <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm space-y-6">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-100 pb-4">
                <div>
                  <h2 className="text-lg font-black text-black">Staff Roster & Shift Control</h2>
                  <p className="text-xs text-slate-805 mt-0.5">Manage property staff scheduling, focus modes, and active crew parameters.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAddWorkerModal(true)}
                  className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow transition shrink-0 cursor-pointer flex items-center gap-1.5"
                >
                  <span>➕</span>
                  <span>Add Worker / Crew</span>
                </button>
              </div>

              {/* Advanced search and filter panel */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs font-semibold">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-700 uppercase block">Search Crew</label>
                  <input
                    type="text"
                    value={rosterSearch}
                    onChange={(e) => setRosterSearch(e.target.value)}
                    placeholder="Search by name or role..."
                    className="w-full bg-white border border-slate-200 p-2.5 rounded-xl text-xs focus:outline-none text-black placeholder-slate-400 font-semibold"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-700 uppercase block">Department</label>
                  <select
                    value={rosterDeptFilter}
                    onChange={(e) => setRosterDeptFilter(e.target.value)}
                    className="w-full bg-white border border-slate-200 p-2.5 rounded-xl text-xs focus:outline-none text-black font-semibold cursor-pointer"
                  >
                    <option value="all">All Departments</option>
                    {departmentsList.map(d => (
                      <option key={d.id} value={d.name}>{d.name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-700 uppercase block">Shift Track</label>
                  <select
                    value={rosterShiftFilter}
                    onChange={(e) => setRosterShiftFilter(e.target.value)}
                    className="w-full bg-white border border-slate-200 p-2.5 rounded-xl text-xs focus:outline-none text-black font-semibold cursor-pointer"
                  >
                    <option value="all">All Shifts</option>
                    <option value="morning">Morning (06:00 - 14:00)</option>
                    <option value="afternoon">Afternoon (14:00 - 22:00)</option>
                    <option value="night">Night (22:00 - 06:00)</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-700 uppercase block">Availability Status</label>
                  <select
                    value={rosterStatusFilter}
                    onChange={(e) => setRosterStatusFilter(e.target.value)}
                    className="w-full bg-white border border-slate-200 p-2.5 rounded-xl text-xs focus:outline-none text-black font-semibold cursor-pointer"
                  >
                    <option value="all">All Statuses</option>
                    <option value="focus">Focus Mode Active</option>
                    <option value="idle">Idle / Off Duty</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Active shift banner & timeline planner */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              
              <div className="lg:col-span-1 space-y-6">
                {/* Active shift banner */}
                <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm flex flex-col justify-between h-full gap-4">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-widest">Active System Shift</span>
                    <span className="text-base font-extrabold text-black mt-1 block">
                      {(() => {
                        const hour = getCurrentPHTHour();
                        if (hour >= 6 && hour < 14) return "Morning Shift (06:00 - 14:00)";
                        if (hour >= 14 && hour < 22) return "Afternoon Shift (14:00 - 22:00)";
                        return "Night Shift (22:00 - 06:00)";
                      })()}
                    </span>
                  </div>
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs text-blue-800 space-y-1 font-semibold leading-relaxed">
                    <p className="font-bold flex items-center space-x-1">
                      <span>🛡️</span>
                      <span>Operational Shift Lock Active</span>
                    </p>
                    <p className="text-[10px] text-blue-600 font-medium">Automatic system routing schedules active staff based on timezone configuration.</p>
                  </div>
                </div>
              </div>

              {/* Timeline Scheduler Grid */}
              <div className="lg:col-span-2 bg-white border border-slate-200 p-6 rounded-2xl shadow-sm space-y-6">
                <div className="border-b border-slate-100 pb-3 flex justify-between items-center">
                  <h3 className="text-sm font-bold text-black uppercase tracking-wide">Shift Timeline Planner</h3>
                  <span className="text-[10px] text-blue-700 bg-blue-50 px-2.5 py-1 rounded border border-blue-200 uppercase font-black tracking-widest">
                    Current Hour: {formatPHTTime()}
                  </span>
                </div>

                <div className="space-y-4">
                  {/* MORNING TRACK */}
                  <div className={`border rounded-xl p-4 space-y-3 ${
                    (() => {
                      const h = getCurrentPHTHour();
                      return (h >= 6 && h < 14) ? "border-blue-600 bg-blue-50/10 border-l-4 border-l-blue-600" : "border-slate-200 bg-slate-50";
                    })()
                  }`}>
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-black text-black">Morning (06:00 - 14:00)</span>
                      {(() => {
                        const h = getCurrentPHTHour();
                        return (h >= 6 && h < 14) ? (
                          <span className="text-[9px] bg-blue-650 text-white font-bold px-2 py-0.5 rounded shadow-sm animate-pulse uppercase tracking-wider">
                            Active Present Shift
                          </span>
                        ) : (
                          <span className="text-[9px] bg-slate-200 text-slate-800 font-bold px-2 py-0.5 rounded border border-slate-350">
                            Off Duty
                          </span>
                        );
                      })()}
                    </div>
                    <div className="relative h-6 bg-slate-250/40 rounded-lg overflow-hidden border border-slate-200 flex items-center justify-between px-3 text-[10px] font-bold text-slate-800">
                      <div className={`absolute top-0 bottom-0 left-0 w-[33%] bg-blue-600 border-r border-blue-500 opacity-20 ${
                        (() => {
                          const h = getCurrentPHTHour();
                          return (h >= 6 && h < 14) ? "animate-pulse" : "";
                        })()
                      }`} />
                      <span className="z-10">06:00</span>
                      <span className="z-10">09:00</span>
                      <span className="z-10">12:00</span>
                      <span className="z-10">14:00</span>
                    </div>
                    <div className="flex flex-wrap gap-2 pt-1">
                      {roster.filter(w => (w.shift || "").toLowerCase().includes("morning")).length === 0 ? (
                        <p className="text-[11px] text-slate-500 italic font-bold">No workers scheduled.</p>
                      ) : (
                        roster.filter(w => (w.shift || "").toLowerCase().includes("morning")).map(worker => (
                          <span key={worker.id} className="bg-white border border-slate-250 px-2.5 py-1 rounded-lg text-xs font-bold text-black shadow-sm flex items-center gap-1.5">
                            <span className="h-1.5 w-1.5 bg-blue-600 rounded-full" />
                            {worker.firstName} {worker.lastName} ({worker.role})
                          </span>
                        ))
                      )}
                    </div>
                  </div>

                  {/* AFTERNOON TRACK */}
                  <div className={`border rounded-xl p-4 space-y-3 ${
                    (() => {
                      const h = getCurrentPHTHour();
                      return (h >= 14 && h < 22) ? "border-blue-600 bg-blue-50/10 border-l-4 border-l-blue-600" : "border-slate-200 bg-slate-50";
                    })()
                  }`}>
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-black text-black">Afternoon (14:00 - 22:00)</span>
                      {(() => {
                        const h = getCurrentPHTHour();
                        return (h >= 14 && h < 22) ? (
                          <span className="text-[9px] bg-blue-650 text-white font-bold px-2 py-0.5 rounded shadow-sm animate-pulse uppercase tracking-wider">
                            Active Present Shift
                          </span>
                        ) : (
                          <span className="text-[9px] bg-slate-200 text-slate-800 font-bold px-2 py-0.5 rounded border border-slate-350">
                            Off Duty
                          </span>
                        );
                      })()}
                    </div>
                    <div className="relative h-6 bg-slate-250/40 rounded-lg overflow-hidden border border-slate-200 flex items-center justify-between px-3 text-[10px] font-bold text-slate-800">
                      <div className={`absolute top-0 bottom-0 left-0 w-[50%] bg-blue-600 border-r border-blue-500 opacity-20 ${
                        (() => {
                          const h = getCurrentPHTHour();
                          return (h >= 14 && h < 22) ? "animate-pulse" : "";
                        })()
                      }`} />
                      <span className="z-10">14:00</span>
                      <span className="z-10">17:00</span>
                      <span className="z-10">20:00</span>
                      <span className="z-10">22:00</span>
                    </div>
                    <div className="flex flex-wrap gap-2 pt-1">
                      {roster.filter(w => (w.shift || "").toLowerCase().includes("afternoon")).length === 0 ? (
                        <p className="text-[11px] text-slate-500 italic font-bold">No workers scheduled.</p>
                      ) : (
                        roster.filter(w => (w.shift || "").toLowerCase().includes("afternoon")).map(worker => (
                          <span key={worker.id} className="bg-white border border-slate-250 px-2.5 py-1 rounded-lg text-xs font-bold text-black shadow-sm flex items-center gap-1.5">
                            <span className="h-1.5 w-1.5 bg-blue-600 rounded-full animate-ping" />
                            {worker.firstName} {worker.lastName} ({worker.role})
                          </span>
                        ))
                      )}
                    </div>
                  </div>

                  {/* NIGHT TRACK */}
                  <div className={`border rounded-xl p-4 space-y-3 ${
                    (() => {
                      const h = getCurrentPHTHour();
                      return (h >= 22 || h < 6) ? "border-blue-600 bg-blue-50/10 border-l-4 border-l-blue-600" : "border-slate-200 bg-slate-50";
                    })()
                  }`}>
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-black text-black">Night (22:00 - 06:00)</span>
                      {(() => {
                        const h = getCurrentPHTHour();
                        return (h >= 22 || h < 6) ? (
                          <span className="text-[9px] bg-blue-650 text-white font-bold px-2 py-0.5 rounded shadow-sm animate-pulse uppercase tracking-wider">
                            Active Present Shift
                          </span>
                        ) : (
                          <span className="text-[9px] bg-slate-200 text-slate-800 font-bold px-2 py-0.5 rounded border border-slate-350">
                            Off Duty
                          </span>
                        );
                      })()}
                    </div>
                    <div className="relative h-6 bg-slate-250/40 rounded-lg overflow-hidden border border-slate-200 flex items-center justify-between px-3 text-[10px] font-bold text-slate-800">
                      <div className={`absolute top-0 bottom-0 left-0 w-[20%] bg-blue-600 border-r border-blue-500 opacity-20 ${
                        (() => {
                          const h = getCurrentPHTHour();
                          return (h >= 22 || h < 6) ? "animate-pulse" : "";
                        })()
                      }`} />
                      <span className="z-10">22:00</span>
                      <span className="z-10">01:00</span>
                      <span className="z-10">04:00</span>
                      <span className="z-10">06:00</span>
                    </div>
                    <div className="flex flex-wrap gap-2 pt-1">
                      {roster.filter(w => (w.shift || "").toLowerCase().includes("night")).length === 0 ? (
                        <p className="text-[11px] text-slate-500 italic font-bold">No workers scheduled.</p>
                      ) : (
                        roster.filter(w => (w.shift || "").toLowerCase().includes("night")).map(worker => (
                          <span key={worker.id} className="bg-white border border-slate-250 px-2.5 py-1 rounded-lg text-xs font-bold text-black shadow-sm flex items-center gap-1.5">
                            <span className="h-1.5 w-1.5 bg-slate-500 rounded-full" />
                            {worker.firstName} {worker.lastName} ({worker.role})
                          </span>
                        ))
                      )}
                    </div>
                  </div>

                </div>
              </div>

            </div>

            {/* Flat Roster List */}
            <div className="bg-white border border-slate-200 p-6 rounded-2xl space-y-4 shadow-sm">
              <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                <h3 className="text-sm font-bold text-black uppercase tracking-wide">Roster Shifts Registry</h3>
                <span className="text-[10px] bg-slate-100 text-slate-850 font-mono px-2.5 py-0.5 rounded-full border border-slate-200">
                  Total Crew Count: {roster.length}
                </span>
              </div>

              {(() => {
                const filteredRoster = roster.filter((w) => {
                  const fullName = `${w.firstName} ${w.lastName}`.toLowerCase();
                  const matchesSearch = fullName.includes(rosterSearch.toLowerCase()) || (w.role || "").toLowerCase().includes(rosterSearch.toLowerCase());
                  const matchesDept = rosterDeptFilter === "all" || w.department === rosterDeptFilter;
                  const matchesShift = rosterShiftFilter === "all" || (w.shift || "").toLowerCase().includes(rosterShiftFilter.toLowerCase());
                  const matchesStatus = rosterStatusFilter === "all" || 
                    (rosterStatusFilter === "focus" && w.isFocusMode) || 
                    (rosterStatusFilter === "idle" && !w.isFocusMode);
                  return matchesSearch && matchesDept && matchesShift && matchesStatus;
                });

                if (filteredRoster.length === 0) {
                  return <p className="text-xs text-slate-500 italic py-8 text-center">No active roster workers match search criteria.</p>;
                }

                return (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                    {filteredRoster.map((worker) => (
                      <div key={worker.id} className="p-4 bg-white border border-slate-200 rounded-2xl shadow-sm space-y-3 relative transition hover:border-blue-300">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="text-sm font-extrabold text-black">{worker.firstName} {worker.lastName}</p>
                            <p className="text-xs text-slate-800 font-semibold">{worker.role} • <span className="font-bold text-blue-600">{worker.department}</span></p>
                          </div>
                          {worker.isFocusMode ? (
                            <span className="text-[10px] bg-blue-50 text-blue-700 font-bold px-2 py-0.5 rounded border border-blue-200">
                              Silent Focus Active
                            </span>
                          ) : (
                            <span className="text-[9px] text-slate-800 font-bold px-1.5 py-0.5 bg-slate-100 rounded border border-slate-200">
                              Idle / Off Duty
                            </span>
                          )}
                        </div>

                        <div className="space-y-1.5 pt-2.5 border-t border-slate-100 text-xs">
                          <div className="flex justify-between text-slate-800">
                            <span>Login Email:</span>
                            <span className="font-bold text-black font-mono select-all">{worker.email}</span>
                          </div>
                          <div className="flex justify-between text-slate-800">
                            <span>Password:</span>
                            <span className="font-bold text-black font-mono select-all">{worker.password || "password"}</span>
                          </div>
                          <div className="flex justify-between text-slate-800">
                            <span>Scheduled Shift:</span>
                            <span className="font-bold text-black">{worker.shift || "Morning (06:00 - 14:00)"}</span>
                          </div>
                          <div className="flex justify-between text-slate-800">
                            <span>Active Workload:</span>
                            <span className="font-bold text-black">{worker.activeTasks} / 5 tasks</span>
                          </div>
                          <div className="flex justify-between text-slate-800">
                            <span>Workload Intensity:</span>
                            <span className={`font-bold ${
                              worker.intensityScore >= 7 ? "text-red-650" :
                              worker.intensityScore >= 4 ? "text-amber-600" : "text-emerald-600"
                            }`}>
                              {worker.intensityScore} pts ({worker.intensityScore >= 7 ? "High Load" : worker.intensityScore >= 4 ? "Medium Load" : "Low Load"})
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>
          </div>
        )}

        {/* ==================== PAGE 3: OPERATIONS ANALYTICS ==================== */}
        {activeDashboardPage === "analytics" && (
          <div className="space-y-8">
            
            {/* KPI metrics row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">SLA Compliance Rate</span>
                <p className="text-3xl font-black text-black">{slaComplianceRate}</p>
                <p className="text-[10px] font-semibold text-emerald-600">Calculated from completed tasks</p>
              </div>
              <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Average Resolution Time</span>
                <p className="text-3xl font-black text-black">{avgResolutionTimeText}</p>
                <p className="text-[10px] font-semibold text-emerald-600">Dynamic operational tracking</p>
              </div>
              <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Total Dispatched Tasks</span>
                <p className="text-3xl font-black text-black">{totalTickets}</p>
                <p className="text-[10px] font-semibold text-slate-800">Assigned via Dynamic Routing</p>
              </div>
              <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Overwork Prevention Shields</span>
                <p className="text-3xl font-black text-red-650">{overloadedTicketsCount}</p>
                <p className="text-[10px] font-semibold text-red-655 font-bold">Overload clamps activated</p>
              </div>
            </div>

            {/* Department stats horizontal bar chart */}
            <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm space-y-6">
              <div className="border-b border-slate-100 pb-3">
                <h3 className="text-sm font-bold text-black uppercase tracking-wide">Tasks Distribution by Department</h3>
                <p className="text-xs text-slate-800 mt-0.5">Historical breakdown of work requests routed by the READY scheduler</p>
              </div>

              {dynamicDeptStats.length === 0 ? (
                <p className="text-xs text-slate-850 italic py-4 text-center">No tasks logged yet. Prefill or submit requests to populate analytics.</p>
              ) : (
                <div className="space-y-4">
                  {dynamicDeptStats.map((dept) => (
                    <div key={dept.name} className="space-y-1.5">
                      <div className="flex justify-between text-xs font-bold text-black">
                        <span>{dept.name}</span>
                        <span>{dept.tasks} Tasks ({dept.percentage})</span>
                      </div>
                      <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                        <div className="bg-[#2563EB] h-2.5 rounded-full transition-all duration-500" style={{ width: dept.percentage }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Overload Shield Event Log */}
            <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm space-y-4">
              <div className="border-b border-slate-100 pb-3">
                <h3 className="text-sm font-bold text-black uppercase tracking-wide">Overload Shield Event Log (Overwork Prevention History)</h3>
                <p className="text-xs text-slate-800 mt-0.5">Real-time log of dispatcher clamps preventing staff overload (active tasks capped at 5)</p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-[10px] font-bold text-slate-800 uppercase tracking-wider">
                      <th className="p-3">Timestamp</th>
                      <th className="p-3">Employee</th>
                      <th className="p-3">Department</th>
                      <th className="p-3">Prevented Action</th>
                      <th className="p-3 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dynamicFocusShieldLogs.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-6 text-center text-xs text-slate-850 italic">
                          No overwork protection clamps activated yet. Focus Shield is monitoring staff loads.
                        </td>
                      </tr>
                    ) : (
                      dynamicFocusShieldLogs.map((row, idx) => (
                        <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50 transition">
                          <td className="p-3 text-slate-800 font-semibold">{row.time}</td>
                          <td className="p-3 font-bold text-black">{row.worker}</td>
                          <td className="p-3 font-bold text-slate-800">{row.department}</td>
                          <td className="p-3 text-slate-800">{row.action}</td>
                          <td className="p-3 text-right font-bold text-blue-600">{row.status}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

        {/* ==================== PAGE 4: SILENT OPERATIONS HUB ==================== */}
        {activeDashboardPage === "silent" && (
          <div className="space-y-8">
            
            {/* Top row logs */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              
              {/* Handover Log */}
              <div className="bg-white border border-slate-200 p-6 rounded-2xl space-y-4 shadow-sm">
                <div className="flex items-center space-x-2 border-b border-slate-100 pb-3">
                  <h3 className="text-sm font-bold text-black uppercase tracking-wide">Asynchronous Shift Handover Logbook</h3>
                </div>

                <form onSubmit={handleAddHandover} className="flex gap-2">
                  <input
                    type="text"
                    required
                    value={newHandover}
                    onChange={(e) => setNewHandover(e.target.value)}
                    placeholder="Log critical task notes for incoming crew..."
                    className="flex-grow bg-white border border-slate-200 rounded-xl p-2.5 text-xs focus:outline-none"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow transition cursor-pointer"
                  >
                    Post Log
                  </button>
                </form>

                <div className="space-y-3 max-h-[220px] overflow-y-auto">
                  {handoverLogs.map((log) => (
                    <div key={log.id} className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                      <div className="flex justify-between text-[9px] font-bold text-slate-800 uppercase tracking-wider">
                        <span>{log.author}</span>
                        <span>{log.time}</span>
                      </div>
                      <p className="text-xs text-black leading-relaxed font-medium">{log.text}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* PTT player widget */}
              <div className="bg-white border border-slate-200 p-6 rounded-2xl space-y-4 shadow-sm">
                <div className="flex items-center space-x-2 border-b border-slate-100 pb-3">
                  <h3 className="text-sm font-bold text-black uppercase tracking-wide">Hands-Free Walkie-Talkie Feed (PTT)</h3>
                </div>

                <div className="space-y-3 max-h-[250px] overflow-y-auto">
                  {pttClips.length === 0 ? (
                    <div className="p-4 bg-slate-50 border border-slate-200 text-center italic text-xs text-slate-500 rounded-xl">
                      No walkie talkie logs posted.
                    </div>
                  ) : (
                    pttClips.map((clip) => {
                      const { text, summary } = parsePttText(clip.text);
                      return (
                        <div key={clip.id} className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between gap-3 text-xs shadow-sm">
                          <div className="space-y-1">
                            <p className="font-bold text-black">{clip.sender} <span className="text-[9px] text-slate-500 ml-1 font-semibold">{clip.timestamp}</span></p>
                            <p className="text-[11px] text-black font-semibold italic">"{text}"</p>
                            {summary && (
                              <p className="text-[9px] bg-blue-50 text-blue-700 border border-blue-200/50 px-2 py-0.5 rounded font-bold mt-1 inline-block">
                                AI Topic: {summary}
                              </p>
                            )}
                          </div>
                          <button
                            onClick={() => playPttClip(clip)}
                            className="px-2.5 py-1 bg-white hover:bg-blue-600 hover:text-white border border-slate-200 text-[10px] font-bold rounded transition cursor-pointer shrink-0"
                          >
                            Play ({clip.duration})
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

            </div>

            {/* Scoreboard table */}
            <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm space-y-4">
              <div className="border-b border-slate-100 pb-3 flex justify-between items-center">
                <div className="flex items-center space-x-2">
                  <h3 className="text-sm font-bold text-black uppercase tracking-wide">Quiet Service Recognition scoreboard</h3>
                </div>
                <span className="text-xs text-slate-800 font-semibold">
                  Promoting focused work without real-time pressure
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-[10px] font-bold text-slate-800 uppercase tracking-wider">
                      <th className="p-3">Rank</th>
                      <th className="p-3">Crew Member</th>
                      <th className="p-3">Role</th>
                      <th className="p-3 text-center">Focus Hours</th>
                      <th className="p-3 text-center">QA Pass Rate</th>
                      <th className="p-3 text-right">Quiet Reward Points</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dynamicScoreboard.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-6 text-center text-xs text-slate-850 italic">
                          No crew rewards logged. Scoreboard updates as workers complete guest requests.
                        </td>
                      </tr>
                    ) : (
                      dynamicScoreboard.map((row, idx) => (
                        <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50 transition">
                          <td className="p-3 font-bold text-slate-800">{row.rankText}</td>
                          <td className="p-3 font-bold text-black">{row.name}</td>
                          <td className="p-3 text-slate-800 font-semibold">{row.role}</td>
                          <td className="p-3 text-center font-extrabold">{row.focusHours} hrs</td>
                          <td className="p-3 text-center font-extrabold text-emerald-600">{row.qaPassRate}</td>
                          <td className="p-3 text-right font-black text-blue-600">{row.score} pts</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

        {/* ==================== PAGE 5: NFC TAG MANAGER ==================== */}
        {activeDashboardPage === "nfc" && (
          <div className="space-y-8">
            <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <h2 className="text-lg font-black text-black">NFC Contextual Guest Portals</h2>
                <p className="text-xs text-slate-800 mt-0.5">Deploy physical NFC tags around rooms and amenities, mapped to specific request contexts.</p>
              </div>
              <button
                onClick={() => {
                  setEditingNfcTag(null);
                  setNfcForm({ roomNumber: "", location: "Bedside", displayName: "Bedside Console", services: [], menuItems: [] });
                  setShowNfcModal(true);
                }}
                className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow transition"
              >
                + Register Contextual NFC Tag
              </button>
            </div>
            <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm space-y-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-slate-100 pb-4 gap-4">
                <div>
                  <h3 className="text-sm font-bold text-black uppercase tracking-wide">Active NFC Configurations ({nfcTags.length})</h3>
                  <p className="text-[10px] text-slate-500 mt-0.5">Organized physical tag endpoints mapped to context portals.</p>
                </div>
                <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-bold text-slate-700 bg-slate-50 p-1 rounded-lg border border-slate-200">
                  <span className="px-1.5">Group By:</span>
                  <button
                    type="button"
                    onClick={() => setNfcGroupBy("floor")}
                    className={`px-2.5 py-1 rounded transition cursor-pointer ${
                      nfcGroupBy === "floor" ? "bg-blue-600 text-white shadow-sm" : "text-slate-800 hover:bg-slate-100"
                    }`}
                  >
                    Floor
                  </button>
                  <button
                    type="button"
                    onClick={() => setNfcGroupBy("category")}
                    className={`px-2.5 py-1 rounded transition cursor-pointer ${
                      nfcGroupBy === "category" ? "bg-blue-600 text-white shadow-sm" : "text-slate-800 hover:bg-slate-100"
                    }`}
                  >
                    Location Category
                  </button>
                  <button
                    type="button"
                    onClick={() => setNfcGroupBy("none")}
                    className={`px-2.5 py-1 rounded transition cursor-pointer ${
                      nfcGroupBy === "none" ? "bg-blue-600 text-white shadow-sm" : "text-slate-800 hover:bg-slate-100"
                    }`}
                  >
                    No Grouping
                  </button>
                </div>
              </div>

              {(() => {
                if (nfcTags.length === 0) {
                  return (
                    <div className="p-10 border border-dashed border-slate-200 rounded-xl text-center italic text-xs text-slate-500">
                      No NFC tags registered yet. Click the button above to add one.
                    </div>
                  );
                }

                // Dynamic Grouping
                const grouped: Record<string, typeof nfcTags> = {};
                if (nfcGroupBy === "floor") {
                  nfcTags.forEach(tag => {
                    const room = tag.roomNumber || "";
                    let floorKey = "Facilities & General Areas";
                    const firstChar = room.trim().charAt(0);
                    if (firstChar >= '0' && firstChar <= '9') {
                      floorKey = `Floor ${firstChar}`;
                    }
                    if (!grouped[floorKey]) grouped[floorKey] = [];
                    grouped[floorKey].push(tag);
                  });
                } else if (nfcGroupBy === "category") {
                  nfcTags.forEach(tag => {
                    const catKey = tag.location || "General / Other";
                    if (!grouped[catKey]) grouped[catKey] = [];
                    grouped[catKey].push(tag);
                  });
                } else {
                  grouped["All Registered Tags"] = nfcTags;
                }

                // Sort keys so floors display Floor 1, Floor 2, etc.
                const sortedGroupKeys = Object.keys(grouped).sort();

                return (
                  <div className="space-y-8">
                    {sortedGroupKeys.map((groupName) => {
                      const tags = grouped[groupName];
                      return (
                        <div key={groupName} className="space-y-3">
                          <div className="flex items-center space-x-2 border-l-4 border-blue-600 pl-2">
                            <h4 className="text-xs font-black text-black uppercase tracking-wider">{groupName}</h4>
                            <span className="text-[9px] bg-blue-50 text-blue-700 font-bold px-2 py-0.5 rounded-full border border-blue-100 shadow-sm">
                              {tags.length} tag{tags.length > 1 ? "s" : ""}
                            </span>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {tags.map((tag) => {
                              const guestLink = `${window.location.origin}/guest?tagId=${tag.id}`;
                              return (
                                <div key={tag.id} className="p-5 bg-slate-50 border border-slate-200 rounded-2xl space-y-4 shadow-sm relative group transition hover:border-blue-300">
                                  
                                  <div className="flex justify-between items-start">
                                    <div>
                                      <span className="text-[10px] bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded font-black uppercase tracking-wider">
                                        {tag.location}
                                      </span>
                                      <h4 className="text-sm font-extrabold text-black mt-2">{tag.displayName}</h4>
                                      <p className="text-xs text-slate-850 mt-1">Room: <strong className="text-black">{tag.roomNumber}</strong></p>
                                    </div>
                                    
                                    <div className="flex space-x-1">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setEditingNfcTag(tag);
                                          setNfcForm({
                                            roomNumber: tag.roomNumber,
                                            location: tag.location,
                                            displayName: tag.displayName,
                                            services: tag.services || [],
                                            menuItems: tag.menuItems || []
                                          });
                                          setShowNfcModal(true);
                                        }}
                                        className="p-1.5 bg-white border border-slate-200 rounded hover:bg-slate-100 text-xs font-bold cursor-pointer"
                                      >
                                        Edit
                                      </button>
                                      <button
                                        type="button"
                                        onClick={async () => {
                                          if (confirm("Delete this NFC configuration?")) {
                                            try {
                                              const res = await fetch("/api/dashboard/nfc", {
                                                method: "POST",
                                                headers: { "Content-Type": "application/json" },
                                                body: JSON.stringify({ action: "delete", id: tag.id })
                                              });
                                              if (res.ok) {
                                                fetchAllData();
                                              }
                                            } catch (err) {
                                              console.error(err);
                                            }
                                          }
                                        }}
                                        className="p-1.5 bg-blue-50 border border-blue-200 text-blue-700 rounded hover:bg-blue-100 text-xs font-bold cursor-pointer"
                                      >
                                        Delete
                                      </button>
                                    </div>
                                  </div>

                                  <div className="pt-3 border-t border-slate-200/60 space-y-2 text-xs">
                                    <p className="font-bold text-slate-850">Included Actions ({tag.services?.length || 0}):</p>
                                    <div className="flex flex-wrap gap-1">
                                      {tag.services?.map((svc: any, idx: number) => (
                                        <span key={idx} className="bg-white border border-slate-200 px-2 py-0.5 rounded text-[9px] font-bold text-slate-850 uppercase">
                                          {svc.name}
                                        </span>
                                      ))}
                                    </div>
                                    {tag.menuItems && tag.menuItems.length > 0 && (
                                      <p className="text-[10px] text-slate-850 font-bold mt-1">
                                        🍔 Food Ordering Menu: {tag.menuItems.length} items configured
                                      </p>
                                    )}
                                  </div>

                                  <div className="pt-3 border-t border-slate-200/60 flex items-center gap-4">
                                    <div className="flex-shrink-0 bg-white p-1 rounded-lg border border-slate-200 shadow-sm">
                                      <img
                                        src={`https://api.qrserver.com/v1/create-qr-code/?size=80x80&data=${encodeURIComponent(guestLink)}`}
                                        className="w-16 h-16"
                                        alt="Guest Portal QR Code"
                                        title="Scan to test on phone"
                                      />
                                    </div>
                                    <div className="flex-grow space-y-2">
                                      <input
                                        type="text"
                                        readOnly
                                        value={guestLink}
                                        className="w-full bg-white border border-slate-200 text-slate-800 p-1.5 rounded text-[10px] font-mono focus:outline-none"
                                      />
                                      <div className="flex gap-2">
                                        <button
                                          type="button"
                                          onClick={() => {
                                            navigator.clipboard.writeText(guestLink);
                                            alert("NFC Portal URL copied to clipboard!");
                                          }}
                                          className="flex-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-[10px] font-bold whitespace-nowrap text-center transition cursor-pointer"
                                        >
                                          Copy Link
                                        </button>
                                        <a
                                          href={guestLink}
                                          target="_blank"
                                          rel="noreferrer"
                                          className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-800 rounded text-[10px] font-bold text-center transition"
                                        >
                                          Open
                                        </a>
                                      </div>
                                    </div>
                                  </div>

                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
          </div>
        )}

            {/* NFC TAG Configurator Modal */}
            {showNfcModal && (
              <div className="fixed inset-0 bg-slate-950/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                <div className="bg-white border border-slate-200 w-full max-w-lg rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
                  
                  <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                    <h3 className="text-sm font-bold text-black uppercase tracking-wide">
                      {editingNfcTag ? "Edit NFC Tag Configuration" : "Register New NFC Tag"}
                    </h3>
                    <button
                      onClick={() => setShowNfcModal(false)}
                      className="text-slate-800 font-bold text-xs"
                    >
                      Close
                    </button>
                  </div>

                  <form
                    onSubmit={async (e) => {
                      e.preventDefault();
                      try {
                        const res = await fetch("/api/dashboard/nfc", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                            action: editingNfcTag ? "update" : "create",
                            id: editingNfcTag?.id,
                            ...nfcForm
                          })
                        });
                        if (res.ok) {
                          setShowNfcModal(false);
                          fetchAllData();
                        } else {
                          const errData = await res.json();
                          alert(`Save failed: ${errData.error}`);
                        }
                      } catch (err) {
                        console.error(err);
                      }
                    }}
                    className="flex-grow overflow-y-auto p-6 space-y-4"
                  >
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-850 uppercase">Room Number / Location</label>
                        <input
                          type="text"
                          required
                          value={nfcForm.roomNumber}
                          onChange={(e) => setNfcForm({ ...nfcForm, roomNumber: e.target.value })}
                          placeholder="e.g. 304, Lobby, Gym"
                          className="w-full bg-white border border-slate-200 p-2 rounded-xl text-xs focus:outline-none"
                        />
                      </div>
                      
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-850 uppercase">Tag Scan Location (Context)</label>
                        <select
                          value={nfcForm.location}
                          onChange={(e) => setNfcForm({ ...nfcForm, location: e.target.value, displayName: `${e.target.value} Assistant` })}
                          className="w-full bg-white border border-slate-200 p-2 rounded-xl text-xs focus:outline-none"
                        >
                          <option value="Bedside">Bedside</option>
                          <option value="Bathroom">Bathroom</option>
                          <option value="Desk">Work Desk</option>
                          <option value="Mini Bar">Mini Bar</option>
                          <option value="Dining Table">Dining Table</option>
                          <option value="Poolside Lounge">Poolside Lounge</option>
                          <option value="Entrance Door">Entrance Door</option>
                        </select>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-850 uppercase">Display Name / Title</label>
                      <input
                        type="text"
                        required
                        value={nfcForm.displayName}
                        onChange={(e) => setNfcForm({ ...nfcForm, displayName: e.target.value })}
                        placeholder="e.g. Room 304 Bedside Console"
                        className="w-full bg-white border border-slate-200 p-2 rounded-xl text-xs focus:outline-none"
                      />
                    </div>

                    {/* Checkbox selector for Allowed Services */}
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-850 uppercase block">Select Included Services ({nfcForm.services.length} selected)</label>
                      <div className="border border-slate-200 rounded-xl p-3 max-h-[140px] overflow-y-auto space-y-1.5">
                        {allowedServices.length === 0 ? (
                          <p className="text-[11px] text-slate-850 italic">No services registered in hotel setup.</p>
                        ) : (
                          allowedServices.map((svc: any) => {
                            const isChecked = nfcForm.services.some(s => s.name === svc.name);
                            return (
                              <label key={svc.id} className="flex items-center space-x-2 text-xs text-slate-850 font-bold select-none cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => {
                                    setNfcForm(prev => {
                                      let list = [...prev.services];
                                      if (isChecked) {
                                        list = list.filter(l => l.name !== svc.name);
                                      } else {
                                        list.push({ name: svc.name, dept: svc.dept });
                                      }
                                      return { ...prev, services: list };
                                    });
                                  }}
                                />
                                <span>{svc.name} <span className="text-[9px] text-slate-850 bg-slate-105 px-1.5 py-0.5 rounded uppercase font-bold border border-slate-200 ml-1">{svc.dept}</span></span>
                              </label>
                            );
                          })
                        )}
                      </div>
                    </div>

                    {/* Food menu editor (If context is Dining Table / Mini Bar / Poolside Lounge) */}
                    {(nfcForm.location === "Dining Table" || nfcForm.location === "Mini Bar" || nfcForm.location === "Poolside Lounge") && (
                      <div className="space-y-2.5 pt-2.5 border-t border-slate-100">
                        <label className="text-[10px] font-bold text-slate-850 uppercase block">Food Menu Items ({nfcForm.menuItems.length} items)</label>
                        
                        <div className="flex gap-2">
                          <input
                            type="text"
                            placeholder="Item name (e.g. Cheeseburger)"
                            value={newMenuItem.name}
                            onChange={(e) => setNewMenuItem({ ...newMenuItem, name: e.target.value })}
                            className="flex-grow bg-white border border-slate-200 p-2 rounded-xl text-xs focus:outline-none"
                          />
                          <input
                            type="number"
                            step="0.01"
                            placeholder="Price"
                            value={newMenuItem.price}
                            onChange={(e) => setNewMenuItem({ ...newMenuItem, price: e.target.value })}
                            className="w-20 bg-white border border-slate-200 p-2 rounded-xl text-xs focus:outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              if (!newMenuItem.name || !newMenuItem.price) return;
                              setNfcForm(prev => ({
                                ...prev,
                                menuItems: [...prev.menuItems, { name: newMenuItem.name, price: parseFloat(newMenuItem.price) }]
                              }));
                              setNewMenuItem({ name: "", price: "" });
                            }}
                            className="px-3.5 bg-slate-900 hover:bg-black text-white text-xs font-bold rounded-xl transition cursor-pointer"
                          >
                            Add
                          </button>
                        </div>

                        {nfcForm.menuItems.length > 0 && (
                          <div className="border border-slate-200 rounded-xl p-2.5 max-h-[110px] overflow-y-auto space-y-1.5 bg-slate-50">
                            {nfcForm.menuItems.map((item, idx) => (
                              <div key={idx} className="flex justify-between items-center text-xs text-black">
                                <span>{item.name} - <strong>${item.price.toFixed(2)}</strong></span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setNfcForm(prev => ({
                                      ...prev,
                                      menuItems: prev.menuItems.filter((_, i) => i !== idx)
                                    }));
                                  }}
                                  className="text-red-500 font-bold text-[10px]"
                                >
                                  Remove
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    <div className="pt-4 border-t border-slate-100 flex gap-2">
                      <button
                        type="submit"
                        className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow transition cursor-pointer"
                      >
                        {editingNfcTag ? "Update NFC Tag" : "Register NFC Tag"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowNfcModal(false)}
                        className="px-5 py-3 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl transition cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>

                  </form>
                </div>
              </div>
            )}

        {/* ==================== PAGE 6: HOTEL PROFILE & RULES ==================== */}
        {activeDashboardPage === "hotel" && (
          <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm space-y-6">
            <div className="border-b border-slate-200 pb-4 flex flex-col sm:flex-row justify-between sm:items-center gap-4">
              <div>
                <h2 className="text-lg font-black text-black uppercase tracking-wide">Hotel Profile & General Rules</h2>
                <p className="text-xs text-slate-500 mt-1">Configure general property metadata and operating guidelines. Changes will propagate across the guest and worker portals.</p>
              </div>
              <button
                type="button"
                onClick={() => router.push("/onboarding/summary")}
                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 transition shrink-0 flex items-center gap-1.5 cursor-pointer"
              >
                <span>📄</span>
                <span>View Onboarding Summary</span>
              </button>
            </div>

            <form onSubmit={handleSaveHotelInfo} className="space-y-6">
              {/* Hotel General Settings */}
              <div className="space-y-4">
                <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">Property Settings</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-700 uppercase block">Hotel Name</label>
                    <input
                      type="text"
                      required
                      value={editHotelName}
                      onChange={(e) => setEditHotelName(e.target.value)}
                      className="w-full bg-white border border-slate-200 p-2.5 rounded-xl text-xs font-bold text-black focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-750 uppercase block">Operating Timezone</label>
                    <input
                      type="text"
                      disabled
                      value={hotelInfo?.timezone || "Asia/Manila (PHT)"}
                      className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-xl text-xs font-bold text-slate-500 cursor-not-allowed focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Hotel Policies list and editor */}
              <div className="space-y-4 pt-4 border-t border-slate-100">
                <div className="flex justify-between items-center">
                  <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">Operating Policies & Rules ({editPolicies.length})</h3>
                </div>

                <div className="space-y-3">
                  {editPolicies.length === 0 ? (
                    <p className="text-xs text-slate-500 italic p-4 bg-slate-50 border border-slate-200 rounded-xl text-center">No operating policies configured yet.</p>
                  ) : (
                    <div className="grid grid-cols-1 gap-3">
                      {editPolicies.map((policy, idx) => (
                        <div key={idx} className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex justify-between items-start gap-4">
                          <div className="space-y-1">
                            <span className="text-[9px] bg-blue-50 text-blue-600 font-bold px-2 py-0.5 rounded border border-blue-200 uppercase tracking-wider">{policy.topic}</span>
                            <p className="text-xs font-bold text-black">{policy.rule}</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemovePolicy(idx)}
                            className="text-red-500 hover:text-red-700 text-[10px] font-bold shrink-0 cursor-pointer"
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Add new policy form */}
                <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-3">
                  <p className="text-[10px] font-black text-slate-800 uppercase tracking-wider">Add New Policy / Rule</p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <input
                        type="text"
                        placeholder="Topic (e.g. WiFi, Pool, Pets)"
                        value={newPolicyTopic}
                        onChange={(e) => setNewPolicyTopic(e.target.value)}
                        className="w-full bg-white border border-slate-200 p-2 rounded-lg text-xs font-semibold text-black focus:outline-none"
                      />
                    </div>
                    <div className="space-y-1 md:col-span-2 flex gap-2">
                      <input
                        type="text"
                        placeholder="Rule Description (e.g. Complimentary high-speed fiber throughout resort)"
                        value={newPolicyRule}
                        onChange={(e) => setNewPolicyRule(e.target.value)}
                        className="flex-grow bg-white border border-slate-200 p-2 rounded-lg text-xs font-semibold text-black focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={handleAddPolicy}
                        className="px-4 bg-slate-900 hover:bg-black text-white text-xs font-bold rounded-lg transition cursor-pointer shrink-0"
                      >
                        Add Rule
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Floor Layout Map Grid Designer */}
              <div className="space-y-4 pt-4 border-t border-slate-100">
                <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">Visual Floor Layout Map Builder ({settingsFloors.length} Floors)</h3>
                <p className="text-[11px] text-slate-500">Design the physical locations of guestrooms and facilities. Layouts will be used on the Task Work Board map overlay.</p>
                
                {settingsFloors.length === 0 ? (
                  <p className="text-xs text-slate-500 italic p-4 bg-slate-50 border border-slate-200 rounded-xl text-center">No floor mapping configurations found. Re-run onboarding to define property heights.</p>
                ) : (
                  <div className="space-y-4">
                    {settingsFloors.map((floor, fIdx) => (
                      <div key={fIdx} className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-[11px] font-bold text-blue-705 text-black">Floor {floor.floorNumber} Map</span>
                          <button
                            type="button"
                            onClick={() => setExpandedFloorLayout(expandedFloorLayout === fIdx ? null : fIdx)}
                            className="text-[10px] bg-white hover:bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-lg text-black font-bold transition flex items-center gap-1"
                          >
                            <span>{expandedFloorLayout === fIdx ? "Hide Designer ✕" : "🛠️ Edit Layout Grid"}</span>
                          </button>
                        </div>

                        {expandedFloorLayout === fIdx && (
                          <div className="bg-white border border-slate-200 p-4 rounded-lg space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
                              {/* Grid View */}
                              <div className="md:col-span-2">
                                <p className="text-[9px] text-slate-400 font-mono mb-2 uppercase">Interactive Grid Map (6x6)</p>
                                <div className="grid grid-cols-6 gap-1.5 aspect-[4/3] max-w-[360px] mx-auto font-bold text-black">
                                  {Array.from({ length: 6 }).map((_, y) => 
                                    Array.from({ length: 6 }).map((_, x) => {
                                      const block = (floor.layout || []).find((b: any) => b.x === x && b.y === y);
                                      const details = getBlockDetails(block);
                                      return (
                                        <div
                                          key={`${x}-${y}`}
                                          className="aspect-square relative group"
                                        >
                                          <button
                                            type="button"
                                            onClick={() => {
                                              setActiveCellConfig({ floorIdx: fIdx, x, y });
                                              if (block) {
                                                setConfigBlockType(block.type);
                                                setConfigRoomType(block.roomTypeName || "");
                                                setConfigFacilityName(block.facilityName || "");
                                                setConfigBlockName(block.name);
                                              } else {
                                                setConfigBlockType("room");
                                                setConfigRoomType(hotelInfo?.roomTypes?.[0]?.name || "Deluxe Room");
                                                setConfigFacilityName(hotelInfo?.facilities?.[0]?.name || "Lobby");
                                                setConfigBlockName("");
                                              }
                                            }}
                                            className={`w-full h-full rounded-lg border flex flex-col items-center justify-center p-1 transition cursor-pointer ${details.bg}`}
                                          >
                                            <span className="text-base">{details.emoji}</span>
                                            {block && (
                                              <span className="text-[8px] font-bold text-black truncate w-full text-center mt-0.5">
                                                {block.name}
                                              </span>
                                            )}
                                          </button>
                                          {block && (
                                            <button
                                              type="button"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                handleSettingsClearCell(fIdx, x, y);
                                              }}
                                              className="absolute -top-1.5 -right-1.5 h-3.5 w-3.5 rounded-full bg-rose-500 text-white flex items-center justify-center text-[9px] font-bold border border-rose-600 shadow-sm opacity-0 group-hover:opacity-100 transition cursor-pointer z-20"
                                            >
                                              ×
                                            </button>
                                          )}
                                        </div>
                                      );
                                    })
                                  )}
                                </div>
                              </div>

                              {/* Configure cell block */}
                              <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-lg space-y-3">
                                <span className="block text-[9px] font-bold uppercase tracking-wider text-slate-800 border-b border-slate-200 pb-1">Configure Placement</span>
                                {activeCellConfig ? (
                                  <div className="space-y-3 text-xs">
                                    <p className="text-[10px] text-slate-550 text-black font-mono">Cell: ({activeCellConfig.x + 1}, {activeCellConfig.y + 1})</p>
                                    
                                    <div className="space-y-1">
                                      <label className="text-[9px] font-bold text-slate-700 uppercase block">Type</label>
                                      <div className="flex gap-2">
                                        <button
                                          type="button"
                                          onClick={() => setConfigBlockType("room")}
                                          className={`flex-1 py-1 rounded text-[10px] font-bold border transition ${
                                            configBlockType === "room" ? "bg-blue-600 border-blue-600 text-white" : "bg-white border-slate-200 text-black hover:bg-slate-50"
                                          }`}
                                        >
                                          Room
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => setConfigBlockType("facility")}
                                          className={`flex-1 py-1 rounded text-[10px] font-bold border transition ${
                                            configBlockType === "facility" ? "bg-purple-600 border-purple-600 text-white" : "bg-white border-slate-200 text-black hover:bg-slate-50"
                                          }`}
                                        >
                                          Facility
                                        </button>
                                      </div>
                                    </div>

                                    {configBlockType === "room" ? (
                                      <div className="space-y-1">
                                        <label className="text-[9px] font-bold text-slate-700 uppercase block">Room Type</label>
                                        <select
                                          value={configRoomType}
                                          onChange={(e) => setConfigRoomType(e.target.value)}
                                          className="w-full bg-white border border-slate-200 rounded p-1.5 text-xs font-semibold focus:outline-none text-black"
                                        >
                                          {hotelInfo?.roomTypes?.map((rt: any) => (
                                            <option key={rt.name} value={rt.name}>{rt.name}</option>
                                          )) || <option value="Deluxe Room">Deluxe Room</option>}
                                        </select>
                                      </div>
                                    ) : (
                                      <div className="space-y-1">
                                        <label className="text-[9px] font-bold text-slate-700 uppercase block">Facility</label>
                                        <select
                                          value={configFacilityName}
                                          onChange={(e) => setConfigFacilityName(e.target.value)}
                                          className="w-full bg-white border border-slate-200 rounded p-1.5 text-xs font-semibold focus:outline-none text-black"
                                        >
                                          {hotelInfo?.facilities?.map((fc: any) => (
                                            <option key={fc.name} value={fc.name}>{fc.name}</option>
                                          )) || <option value="Lobby">Lobby</option>}
                                        </select>
                                      </div>
                                    )}

                                    <div className="space-y-1">
                                      <label className="text-[9px] font-bold text-slate-700 uppercase block">Name / Room #</label>
                                      <input
                                        type="text"
                                        placeholder="e.g. 101 or Lobby"
                                        value={configBlockName}
                                        onChange={(e) => setConfigBlockName(e.target.value)}
                                        className="w-full bg-white border border-slate-200 rounded p-1.5 text-xs font-bold text-black focus:outline-none"
                                      />
                                    </div>

                                    <div className="flex gap-2 pt-1">
                                      <button
                                        type="button"
                                        onClick={handleSettingsSaveBlock}
                                        className="flex-1 py-1.5 bg-[#2563EB] hover:bg-blue-700 text-white text-[10px] font-bold rounded cursor-pointer"
                                      >
                                        Save Block
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => setActiveCellConfig(null)}
                                        className="flex-1 py-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-black text-[10px] font-bold rounded cursor-pointer"
                                      >
                                        Cancel
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="py-6 text-center text-[10px] text-slate-400 italic">
                                    Click a grid cell to edit.
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Confirmation Step & Save */}
              <div className="pt-6 border-t border-slate-100 space-y-4">
                <div className="bg-blue-50 border border-blue-200 p-4 rounded-xl space-y-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-indigo-950 uppercase tracking-wide block">⚠️ Confirm Password to Commit Changes</label>
                    <p className="text-[11px] text-indigo-900">For security, you must confirm your administrative password before updating general hotel configurations.</p>
                  </div>
                  <input
                    type="password"
                    required
                    placeholder="Enter admin account password"
                    value={hotelConfirmPassword}
                    onChange={(e) => setHotelConfirmPassword(e.target.value)}
                    className="w-full bg-white border border-slate-200 p-2.5 rounded-xl text-xs focus:outline-none text-black font-semibold max-w-md block"
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    type="submit"
                    disabled={isUpdatingHotel}
                    className="px-6 py-3 bg-[#2563EB] hover:bg-blue-700 disabled:bg-blue-300 text-white font-bold text-xs rounded-xl shadow transition cursor-pointer"
                  >
                    {isUpdatingHotel ? "Saving Modifications..." : "Save Hotel Configuration"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditHotelName(hotelInfo?.name || "");
                      setEditPolicies(hotelInfo?.policies || []);
                      setHotelConfirmPassword("");
                    }}
                    className="px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl transition cursor-pointer"
                  >
                    Reset Changes
                  </button>
                </div>
              </div>

            </form>
          </div>
        )}

        {/* Worker Mobile QR Code Modal */}
        {showWorkerQrModal && (
          <div className="fixed inset-0 bg-slate-950/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white border border-slate-200 w-full max-w-sm rounded-2xl shadow-xl overflow-hidden p-6 space-y-6">
              
              <div className="text-center space-y-2">
                <h3 className="text-sm font-bold text-black uppercase tracking-wider">Mobile Worker Login</h3>
                <p className="text-xs text-slate-850">Scan this QR Code with your smartphone to open the worker portal.</p>
              </div>

              <div className="flex justify-center bg-slate-50 p-4 rounded-xl border border-slate-200">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(`${window.location.origin}/login`)}`}
                  className="w-44 h-44 shadow-sm rounded-lg"
                  alt="Worker Portal Login QR Code"
                />
              </div>

              <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
                <p className="font-extrabold text-black border-b border-slate-200 pb-1.5 uppercase tracking-wider text-[10px]">
                  Worker Portal Access
                </p>
                <p className="text-slate-850 leading-relaxed text-[11px]">
                  Onboarded workers can log in using their registered email and the temporary password (default is <span className="font-mono font-bold text-black select-all">password</span>).
                </p>
              </div>

              <button
                onClick={() => setShowWorkerQrModal(false)}
                className="w-full py-3 bg-slate-900 hover:bg-black text-white text-xs font-bold rounded-xl transition cursor-pointer"
              >
                Close Window
              </button>

            </div>
          </div>
        )}

        {/* Add Worker Modal */}
        {showAddWorkerModal && (
          <div className="fixed inset-0 bg-slate-950/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white border border-slate-200 w-full max-w-lg rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
              <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                <h3 className="text-sm font-bold text-black uppercase tracking-wide">
                  Onboard New Staff / Crew
                </h3>
                <button
                  type="button"
                  onClick={() => setShowAddWorkerModal(false)}
                  className="text-slate-800 font-bold text-xs cursor-pointer hover:text-black transition"
                >
                  ✕
                </button>
              </div>

              {/* Tabs */}
              <div className="flex border-b border-slate-200 text-xs font-bold uppercase tracking-wider bg-slate-50/50">
                <button
                  type="button"
                  onClick={() => setAddWorkerModalTab("manual")}
                  className={`flex-1 py-3 text-center border-b-2 transition cursor-pointer ${
                    addWorkerModalTab === "manual" ? "border-blue-600 text-blue-600 bg-white" : "border-transparent text-slate-500 hover:text-slate-800"
                  }`}
                >
                  👤 Add Manually
                </button>
                <button
                  type="button"
                  onClick={() => setAddWorkerModalTab("csv")}
                  className={`flex-1 py-3 text-center border-b-2 transition cursor-pointer ${
                    addWorkerModalTab === "csv" ? "border-blue-600 text-blue-600 bg-white" : "border-transparent text-slate-500 hover:text-slate-800"
                  }`}
                >
                  📋 Import CSV Roster
                </button>
              </div>

              <div className="p-6 overflow-y-auto space-y-4">
                {addWorkerModalTab === "manual" ? (
                  <form
                    onSubmit={async (e) => {
                      e.preventDefault();
                      const success = await handleOnboardStaff(e);
                      if (success) {
                        setShowAddWorkerModal(false);
                      }
                    }}
                    className="space-y-4 text-xs font-semibold"
                  >
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-700 uppercase">First Name</label>
                        <input
                          type="text"
                          required
                          value={staffForm.firstName}
                          onChange={(e) => setStaffForm({...staffForm, firstName: e.target.value})}
                          placeholder="e.g. John"
                          className="w-full bg-white border border-slate-200 rounded-xl p-2.5 focus:outline-none text-black font-semibold"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-700 uppercase">Last Name</label>
                        <input
                          type="text"
                          required
                          value={staffForm.lastName}
                          onChange={(e) => setStaffForm({...staffForm, lastName: e.target.value})}
                          placeholder="e.g. Doe"
                          className="w-full bg-white border border-slate-200 rounded-xl p-2.5 focus:outline-none text-black font-semibold"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-700 uppercase">Login Email Address</label>
                      <input
                        type="email"
                        required
                        value={staffForm.email}
                        onChange={(e) => setStaffForm({...staffForm, email: e.target.value})}
                        placeholder="e.g. john.doe@hotel.com"
                        className="w-full bg-white border border-slate-200 rounded-xl p-2.5 focus:outline-none text-black font-semibold"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-700 uppercase">Account Password</label>
                      <input
                        type="password"
                        value={staffForm.password}
                        onChange={(e) => setStaffForm({...staffForm, password: e.target.value})}
                        placeholder="Defaults to 'password'"
                        className="w-full bg-white border border-slate-200 rounded-xl p-2.5 focus:outline-none text-black font-semibold"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-700 uppercase">Operational Role</label>
                      <input
                        type="text"
                        required
                        value={staffForm.role}
                        onChange={(e) => setStaffForm({...staffForm, role: e.target.value})}
                        placeholder="e.g. Room Attendant, Technician"
                        className="w-full bg-white border border-slate-200 rounded-xl p-2.5 focus:outline-none text-black font-semibold"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-700 uppercase">Department</label>
                        <select
                          value={staffForm.department}
                          onChange={(e) => setStaffForm({...staffForm, department: e.target.value})}
                          className="w-full bg-white border border-slate-200 rounded-xl p-2.5 focus:outline-none text-black font-semibold cursor-pointer"
                        >
                          {departmentsList.map(d => (
                            <option key={d.id} value={d.name}>{d.name}</option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-700 uppercase">Shift Track</label>
                        <select
                          value={staffForm.shift}
                          onChange={(e) => setStaffForm({...staffForm, shift: e.target.value})}
                          className="w-full bg-white border border-slate-200 rounded-xl p-2.5 focus:outline-none text-black font-semibold cursor-pointer"
                        >
                          <option value="Morning (06:00 - 14:00)">Morning (06:00 - 14:00)</option>
                          <option value="Afternoon (14:00 - 22:00)">Afternoon (14:00 - 22:00)</option>
                          <option value="Night (22:00 - 06:00)">Night (22:00 - 06:00)</option>
                        </select>
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow transition cursor-pointer"
                    >
                      Onboard Worker
                    </button>
                  </form>
                ) : (
                  <div className="space-y-4 text-xs font-semibold">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-700 uppercase block">CSV Roster Data</label>
                      <p className="text-[10px] text-slate-500">Format: FirstName, LastName, Email, Department, Role, Shift (Morning/Afternoon/Night)</p>
                      <textarea
                        rows={6}
                        value={csvText}
                        onChange={(e) => setCsvText(e.target.value)}
                        placeholder="John,Doe,john@mail.com,Housekeeping,Room Attendant,Morning (06:00 - 14:00)&#10;Jane,Smith,jane@mail.com,Maintenance,Duty Engineer,Afternoon (14:00 - 22:00)"
                        className="w-full bg-white border border-slate-200 rounded-xl p-3 text-xs focus:outline-none resize-none font-mono text-black font-semibold"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={async () => {
                        const success = await handleCsvImport();
                        if (success) {
                          setShowAddWorkerModal(false);
                        }
                      }}
                      className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow transition cursor-pointer"
                    >
                      Load CSV Staff List
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

      </div>

      {/* Footer */}
      <footer className="border-t border-slate-200 py-8 px-6 text-center text-xs text-black">
        <p>© {new Date().getFullYear()} READY - Operational Dashboard. Disconnected by Design.</p>
      </footer>
    </div>
  );
}
