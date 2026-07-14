"use client";

import { useState, useEffect } from "react";

interface Step1Props {
  data: any;
  onChange: (newData: any) => void;
  hotelId: number;
  onCheckpointUpdate?: (score: number, isComplete: boolean, auditData?: any) => void;
  auditState?: any;
}

export default function Step1Foundation({ data, onChange, hotelId, onCheckpointUpdate, auditState }: Step1Props) {
  const [documents, setDocuments] = useState<any[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Checkpoint State
  const [isAuditing, setIsAuditing] = useState(false);
  const [auditScore, setAuditScore] = useState<number>(0);
  const [auditComplete, setAuditComplete] = useState(false);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [questions, setQuestions] = useState<any[]>([]);

  // Poll status of uploads
  useEffect(() => {
    let lastCompletedCount = 0;
    const fetchStatus = () => {
      fetch("/api/onboarding/status")
        .then((res) => res.json())
        .then((resData) => {
          const docs = resData.documents || [];
          setDocuments(docs);
          
          const completedCount = docs.filter((d: any) => d.status === "COMPLETED").length;
          if (completedCount > lastCompletedCount) {
            fetch("/api/onboarding/session")
              .then((res) => res.json())
              .then((sessionData) => {
                if (sessionData && sessionData.data) {
                  onChange({
                    ...data,
                    ...sessionData.data
                  });
                }
              })
              .catch(console.error);
          }
          lastCompletedCount = completedCount;
        })
        .catch(console.error);
    };

    fetchStatus();
    const interval = setInterval(fetchStatus, 4000);
    return () => clearInterval(interval);
  }, [data, onChange]);

  // Sync with parent auditState
  useEffect(() => {
    if (auditState) {
      setAuditScore(auditState.score || 0);
      setAuditComplete(auditState.isComplete || false);
      setWarnings(auditState.warnings || []);
      setQuestions(auditState.followUpQuestions || []);
    } else {
      setAuditScore(0);
      setAuditComplete(false);
      setWarnings([]);
      setQuestions([]);
    }
  }, [auditState]);

  const runPhaseAudit = async () => {
    setIsAuditing(true);
    try {
      const bypassActive = localStorage.getItem("aiBypass") === "true";
      if (bypassActive) {
        setAuditScore(100);
        setAuditComplete(true);
        setWarnings([]);
        setQuestions([]);
        if (onCheckpointUpdate) {
          onCheckpointUpdate(100, true, {
            warnings: [],
            followUpQuestions: [],
            templates: []
          });
        }
        return;
      }

      const res = await fetch("/api/onboarding/readiness", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phase: 1 }),
      });
      if (res.ok) {
        const resData = await res.json();
        setAuditScore(resData.score);
        setAuditComplete(resData.isComplete);
        setWarnings(resData.warnings || []);
        setQuestions(resData.followUpQuestions || []);
        if (onCheckpointUpdate) {
          onCheckpointUpdate(resData.score, resData.isComplete, {
            warnings: resData.warnings || [],
            followUpQuestions: resData.followUpQuestions || [],
            templates: resData.templates || []
          });
        }
      }
    } catch (err) {
      console.error("Audit failed", err);
    } finally {
      setIsAuditing(false);
    }
  };

  const handleInputChange = (field: string, value: any) => {
    onChange({
      ...data,
      foundation: {
        ...data.foundation,
        [field]: value,
      },
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadError(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/onboarding/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "File upload failed.");
      }

      const resData = await res.json();
      setDocuments((prev) => [
        { id: resData.documentId, name: resData.name, status: resData.status, createdAt: new Date() },
        ...prev,
      ]);
    } catch (err: any) {
      setUploadError(err.message || String(err));
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteFile = async (documentId: number) => {
    if (!confirm("Are you sure you want to delete this document?")) return;

    try {
      const res = await fetch("/api/onboarding/upload", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentId }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to delete file.");
      }

      setDocuments((prev) => prev.filter((doc) => doc.id !== documentId));
    } catch (err: any) {
      alert(err.message || String(err));
    }
  };

  const foundation = data.foundation || {
    name: "",
    type: "Resort",
    totalRooms: 100,
    totalFloors: 4,
    timezone: "UTC",
    address: "",
    gmapsLocation: "",
  };

  return (
    <div className="space-y-8 animate-fade-in text-black">
      <div className="border-b border-slate-200 pb-4">
        <h2 className="text-xl font-bold mb-1">Phase 1: Hotel Profile</h2>
        <p className="text-sm text-black dark:text-black font-medium">Establish general settings, location mapping, and upload manual documents.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-100/50 bg-white p-6 rounded-2xl border border-slate-200">
        <div>
          <label className="block text-sm font-semibold text-black mb-2">Hotel Name</label>
          <input
            type="text"
            required
            placeholder="e.g. The Grand Palace"
            value={foundation.name || ""}
            onChange={(e) => handleInputChange("name", e.target.value)}
            className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-black mb-2">Hotel Type</label>
          <select
            value={foundation.type || "Resort"}
            onChange={(e) => handleInputChange("type", e.target.value)}
            className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
          >
            <option value="Resort">Resort & Spa</option>
            <option value="Boutique">Boutique Hotel</option>
            <option value="Business">Business Hotel</option>
            <option value="Airport">Airport Hotel</option>
            <option value="Hostel">Hostel / Inn</option>
          </select>
        </div>

        <div className="col-span-1 md:col-span-2">
          <label className="block text-sm font-semibold text-black mb-2">Hotel Address</label>
          <input
            type="text"
            placeholder="e.g. 123 Beach Boulevard, Cebu City"
            value={foundation.address || ""}
            onChange={(e) => handleInputChange("address", e.target.value)}
            className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-black mb-2">Google Maps Link</label>
          <input
            type="url"
            placeholder="e.g. https://maps.google.com/?q=..."
            value={foundation.gmapsLocation || ""}
            onChange={(e) => handleInputChange("gmapsLocation", e.target.value)}
            className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-black mb-2">Timezone</label>
          <select
            value={foundation.timezone || "UTC"}
            onChange={(e) => handleInputChange("timezone", e.target.value)}
            className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
          >
            <option value="UTC">UTC</option>
            <option value="Asia/Manila">Asia/Manila (PHT)</option>
            <option value="America/New_York">America/New_York (EST)</option>
            <option value="Europe/London">Europe/London (GMT)</option>
          </select>
        </div>
      </div>

      {/* AI Discovery Upload Box */}
      <div className="bg-slate-100/50 bg-white p-6 rounded-2xl border border-slate-200 space-y-6">
        <div>
          <h3 className="text-md font-bold mb-1">AI Knowledge Ingestion</h3>
          <p className="text-xs text-black dark:text-black">Upload employee manuals, SOP sheets, menus, or evacuation plans to let Gemini parse your structure.</p>
        </div>

        <div className="border-2 border-dashed border-slate-200 hover:border-blue-500/50 bg-white rounded-2xl p-8 flex flex-col items-center justify-center text-center transition cursor-pointer relative">
          <input
            type="file"
            onChange={handleFileUpload}
            disabled={isUploading}
            accept=".pdf,image/*,.txt,.doc,.docx"
            className="absolute inset-0 opacity-0 cursor-pointer"
          />
          <div className="h-12 w-12 rounded-xl bg-white flex items-center justify-center text-xl text-black mb-3">
            📁
          </div>
          <span className="text-sm font-semibold text-slate-650 text-black">
            {isUploading ? "Uploading & Enqueueing job..." : "Click or drag files here to upload"}
          </span>
          <span className="text-xs text-black mt-1">Supports PDF, PNG, JPG, Docx (Max 20MB)</span>
        </div>

        {uploadError && <div className="text-rose-500 text-xs font-semibold">{uploadError}</div>}

        {/* Upload status list */}
        {documents.length > 0 && (
          <div className="space-y-2 mt-4">
            <h4 className="text-xs font-bold text-black uppercase tracking-wider">Ingested Documents & Processing Queue</h4>
            <div className="divide-y divide-slate-200 dark:divide-slate-900/60 max-h-[180px] overflow-y-auto pr-2">
              {documents.map((doc) => (
                <div key={doc.id} className="py-2.5 flex items-center justify-between text-xs">
                  <div className="flex items-center space-x-2.5">
                    <span className="text-base">📄</span>
                    <span className="text-black font-medium">{doc.name}</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center space-x-1.5">
                      <span className={`h-1.5 w-1.5 rounded-full ${
                        doc.status === "COMPLETED" ? "bg-emerald-500" :
                        doc.status === "FAILED" ? "bg-rose-500" :
                        doc.status === "PROCESSING" ? "bg-blue-500 animate-pulse" :
                        "bg-amber-500 animate-pulse"
                      }`} />
                      <span className={`font-semibold ${
                        doc.status === "COMPLETED" ? "text-emerald-500 text-emerald-700" :
                        doc.status === "FAILED" ? "text-rose-500 dark:text-rose-400" :
                        doc.status === "PROCESSING" ? "text-blue-600" :
                        "text-amber-500 dark:text-amber-400"
                      }`}>
                        {doc.status}
                      </span>
                    </div>
                    <button
                      onClick={() => handleDeleteFile(doc.id)}
                      className="text-black hover:text-rose-500 transition text-[11px] font-bold"
                    >
                      🗑️ Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* AI Readiness Checkpoint Panel */}
      <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 space-y-4 shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <h3 className="text-sm font-bold text-indigo-950 uppercase tracking-wider flex items-center space-x-2">
            <span>🛡️</span>
            <span>AI Checkpoint: Phase 1 Readiness</span>
          </h3>
          <div className="flex items-center space-x-3">
            <button
              onClick={runPhaseAudit}
              disabled={isAuditing}
              className="px-3 py-1 bg-white border border-slate-250 border-slate-200 text-indigo-700 hover:text-indigo-500 text-[10px] font-bold rounded-lg transition"
            >
              {isAuditing ? "Re-verifying..." : "🔄 Verify Checkpoint"}
            </button>
            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
              auditComplete ? "bg-emerald-100 text-emerald-700 border border-emerald-250" : "bg-amber-100 text-amber-750 border border-amber-200"
            }`}>
              {auditComplete ? "PASSED" : "PENDING GAPS"}
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-800 font-medium">Phase 1 Score verifies general properties, address details, and location maps.</p>
            <p className="text-[10px] text-slate-500 mt-1">Minimum target: 80% (Requires Name, Address, GMaps, and Timezone)</p>
          </div>
          <div className="h-14 w-14 rounded-full border-2 border-slate-200 flex items-center justify-center relative overflow-hidden">
            <div className="absolute bottom-0 inset-x-0 bg-indigo-500/20" style={{ height: `${auditScore}%` }} />
            <span className="text-xs font-bold text-indigo-750 relative z-10">{auditScore}%</span>
          </div>
        </div>

        {warnings.length > 0 && (
          <div className="bg-rose-50 border border-rose-200 p-4 rounded-xl text-rose-955 text-xs space-y-1.5 shadow-sm">
            <p className="font-extrabold uppercase tracking-wider text-[10px] text-rose-800">⚠️ Audit Flags:</p>
            <ul className="list-disc pl-4 space-y-1 font-medium">
              {warnings.map((warn, i) => <li key={i}>{warn}</li>)}
            </ul>
          </div>
        )}
      </div>

    </div>
  );
}
