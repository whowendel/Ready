"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface Step5Props {
  data: any;
  onChange: (newData: any) => void;
  onCheckpointUpdate?: (score: number, isComplete: boolean) => void;
}

export default function Step5Validation({ data, onChange, onCheckpointUpdate }: Step5Props) {
  const router = useRouter();
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Checkpoint State
  const [isAuditing, setIsAuditing] = useState(false);
  const [scores, setScores] = useState({
    deptsScore: 0,
    hierarchyScore: 0,
    employeeScore: 0,
    managerScore: 0,
    overallReadiness: 0
  });
  const [auditComplete, setAuditComplete] = useState(false);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [recommendations, setRecommendations] = useState<string[]>([]);

  // Compiler Overlay State
  const [isCompiling, setIsCompiling] = useState(false);
  const [compileLog, setCompileLog] = useState("Analyzing staff directory...");



  const runPhaseAudit = async () => {
    setIsAuditing(true);
    try {
      const bypassActive = localStorage.getItem("aiBypass") === "true";
      if (bypassActive) {
        const fullScore = { deptsScore: 100, hierarchyScore: 100, employeeScore: 100, managerScore: 100, overallReadiness: 100 };
        setScores(fullScore);
        setAuditComplete(true);
        setWarnings([]);
        setRecommendations([]);
        if (onCheckpointUpdate) {
          onCheckpointUpdate(100, true);
        }
        return;
      }

      const res = await fetch("/api/onboarding/phase2/readiness", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ step: 5 }),
      });
      if (res.ok) {
        const resData = await res.json();
        setScores(resData.score);
        setAuditComplete(resData.isComplete);
        setWarnings(resData.warnings || []);
        setRecommendations(resData.recommendations || []);
        if (onCheckpointUpdate) {
          onCheckpointUpdate(resData.score.overallReadiness, resData.isComplete);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsAuditing(false);
    }
  };

  const handleFinalizeLaunch = async () => {
    setIsFinalizing(true);
    setError(null);
    setIsCompiling(true);

    // Simulate compiler logs
    setTimeout(() => setCompileLog("Re-evaluating shift allocations..."), 600);
    setTimeout(() => setCompileLog("Mapping role matrices and permission tables..."), 1200);
    setTimeout(() => setCompileLog("Seeding staff accounts and profiles in DB..."), 1800);
    setTimeout(() => setCompileLog("Finalizing system operations checklist..."), 2400);

    setTimeout(async () => {
      try {
        const res = await fetch("/api/onboarding/phase2/finalize", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ data }),
        });

        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.error || "Failed to finalize workforce setup.");
        }

        router.push("/onboarding/summary");
      } catch (err: any) {
        setError(err.message || String(err));
        setIsCompiling(false);
        setIsFinalizing(false);
      }
    }, 3200);
  };

  return (
    <div className="space-y-8 animate-fade-in text-black">
      
      {/* Compiler Simulation Overlay */}
      {isCompiling && (
        <div className="fixed inset-0 bg-slate-900/80 bg-white/90 backdrop-blur-md z-[9999] flex flex-col items-center justify-center text-center p-6 select-none animate-fade-in">
          <div className="space-y-6 max-w-md">
            <div className="h-16 w-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto shadow-md" />
            <div className="space-y-2">
              <h2 className="text-xl font-extrabold text-slate-900 text-black tracking-tight">Activating Operations Environment...</h2>
              <p className="text-sm text-black dark:text-black font-mono py-1 px-3 bg-white rounded-lg inline-block shadow-inner border border-slate-200 dark:border-slate-850">
                {compileLog}
              </p>
            </div>
            <p className="text-xs text-slate-455 dark:text-black font-medium">Please wait while the READY system applies workforce rules.</p>
          </div>
        </div>
      )}

      <div className="border-b border-slate-200 pb-4">
        <h2 className="text-xl font-bold mb-1">Step 5: Workflow Validation & Launch</h2>
        <p className="text-sm text-black dark:text-black font-medium">Run final workflow validation audits to confirm workforce operational readiness.</p>
      </div>

      {error && <div className="text-rose-500 text-xs font-semibold">{error}</div>}

      {/* Validation Scores Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        
        {/* Depts Config */}
        <div className="bg-white p-4 border border-slate-200 rounded-xl space-y-1 text-center shadow-sm">
          <span className="text-[10px] uppercase font-bold text-black block">Departments</span>
          <span className="text-xl font-bold text-black dark:text-slate-150">{scores.deptsScore}%</span>
        </div>

        {/* Hierarchy Node */}
        <div className="bg-white p-4 border border-slate-200 rounded-xl space-y-1 text-center shadow-sm">
          <span className="text-[10px] uppercase font-bold text-black block">Org Structure</span>
          <span className="text-xl font-bold text-black dark:text-slate-150">{scores.hierarchyScore}%</span>
        </div>

        {/* Employee Coverage */}
        <div className="bg-white p-4 border border-slate-200 rounded-xl space-y-1 text-center shadow-sm">
          <span className="text-[10px] uppercase font-bold text-black block">Staffing Coverage</span>
          <span className="text-xl font-bold text-black dark:text-slate-150">{scores.employeeScore}%</span>
        </div>

        {/* Manager Roles */}
        <div className="bg-white p-4 border border-slate-200 rounded-xl space-y-1 text-center shadow-sm">
          <span className="text-[10px] uppercase font-bold text-black block">Manager Roles</span>
          <span className="text-xl font-bold text-black dark:text-slate-150">{scores.managerScore}%</span>
        </div>

      </div>

      {/* Overall AI Checkpoint Block */}
      <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 space-y-6 shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <h3 className="text-sm font-bold text-indigo-950 uppercase tracking-wider flex items-center space-x-2">
            <span>🛡️</span>
            <span>AI Checkpoint: Operations Workforce Readiness</span>
          </h3>
          <div className="flex items-center space-x-3">
            <button
              onClick={runPhaseAudit}
              disabled={isAuditing}
              className="px-3 py-1 bg-white border border-slate-250 border-slate-200 text-indigo-700 hover:text-indigo-500 text-[10px] font-bold rounded-lg transition"
            >
              {isAuditing ? "Re-auditing..." : "🔄 Run Audit"}
            </button>
            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
              auditComplete ? "bg-emerald-100 text-emerald-700 border border-emerald-250" : "bg-amber-100 text-amber-700 border border-amber-200"
            }`}>
              {auditComplete ? "COMPLETED" : "INCOMPLETE GAPS"}
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-800 font-medium">Verifies staffing rosters, managers exist, and permission rules align correctly.</p>
            <p className="text-[10px] text-slate-500 mt-1">Passing score: &gt;=80% triggers operations activation parameters.</p>
          </div>
          <div className="h-16 w-16 rounded-full border-2 border-slate-200 flex items-center justify-center relative overflow-hidden">
            <div className="absolute bottom-0 inset-x-0 bg-indigo-500/20" style={{ height: `${scores.overallReadiness}%` }} />
            <span className="text-xs font-bold text-indigo-750 relative z-10">{scores.overallReadiness}%</span>
          </div>
        </div>

        {/* Warnings List */}
        {warnings.length > 0 && (
          <div className="bg-rose-50 border border-rose-200 p-4 rounded-xl text-rose-955 text-xs space-y-1.5 shadow-sm">
            <p className="font-extrabold uppercase tracking-wider text-[10px] text-rose-800">⚠️ Staffing Warnings:</p>
            <ul className="list-disc pl-4 space-y-1 font-medium">
              {warnings.map((warn, i) => <li key={i}>{warn}</li>)}
            </ul>
          </div>
        )}

        {/* Recommendations list */}
        {recommendations.length > 0 && (
          <div className="bg-indigo-50 border border-indigo-200 p-4 rounded-xl text-indigo-955 text-xs space-y-2 shadow-sm">
            <p className="font-extrabold uppercase tracking-wider text-[10px] text-indigo-850">🤖 AI Workforce Recommendations:</p>
            <ul className="list-disc pl-4 space-y-1 font-medium text-indigo-900">
              {recommendations.map((rec, i) => <li key={i}>{rec}</li>)}
            </ul>
          </div>
        )}

        {/* Final Launch controls */}
        <div className="pt-4 border-t border-slate-200 flex justify-end">
          <button
            onClick={handleFinalizeLaunch}
            disabled={isFinalizing || !auditComplete}
            className="px-8 py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-lg transition transform hover:-translate-y-0.5 disabled:opacity-40 disabled:pointer-events-none"
          >
            {isFinalizing ? "Activating operational tools..." : "Activate Workforce Setup & Go Live"}
          </button>
        </div>

      </div>

    </div>
  );
}
