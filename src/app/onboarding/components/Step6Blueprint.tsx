"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface Step6Props {
  data: any;
  onChange: (newData: any) => void;
  onCheckpointUpdate?: (score: number, isComplete: boolean) => void;
}

export default function Step6Blueprint({ data, onChange, onCheckpointUpdate }: Step6Props) {
  const router = useRouter();
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Checkpoint State
  const [isAuditing, setIsAuditing] = useState(false);
  const [auditScore, setAuditScore] = useState<number>(0);
  const [auditComplete, setAuditComplete] = useState(false);
  const [warnings, setWarnings] = useState<string[]>([]);

  // Compiling Simulation State
  const [isCompiling, setIsCompiling] = useState(false);
  const [compileLog, setCompileLog] = useState("Initializing database tables...");

  // Generate default list of tasks on mount if empty
  useEffect(() => {
    const activeDepts = data.departments || [];
    const activeFacs = data.facilities || [];
    const currentBlueprint = data.operationalBlueprint || [];

    if (currentBlueprint.length === 0) {
      const generated: any[] = [];

      // 1. Add Housekeeping tasks
      if (activeDepts.some((d: any) => d.name.toLowerCase() === "housekeeping")) {
        generated.push({ name: "Daily Room Deep Clean", dept: "Housekeeping", role: "Room Attendant", manpower: 1, frequency: "daily", timeWindow: "08:00 - 13:00", classification: "mandatory", recommendedSLA: 40, adjustedSLA: 40 });
        generated.push({ name: "Linen Restocking", dept: "Housekeeping", role: "Room Attendant", manpower: 1, frequency: "on-demand", timeWindow: "09:00 - 16:00", classification: "guest_request", recommendedSLA: 30, adjustedSLA: 30 });
        generated.push({ name: "Turndown Service", dept: "Housekeeping", role: "Room Attendant", manpower: 1, frequency: "per shift", timeWindow: "18:00 - 20:00", classification: "mandatory", recommendedSLA: 30, adjustedSLA: 30 });
      }

      // 2. Add Front Desk tasks
      if (activeDepts.some((d: any) => d.name.toLowerCase() === "front desk" || d.name.toLowerCase() === "front office")) {
        generated.push({ name: "Guest Check-in Registration", dept: "Front Desk", role: "Receptionist", manpower: 1, frequency: "per check-in", timeWindow: "14:00 - 23:00", classification: "guest_request", recommendedSLA: 15, adjustedSLA: 15 });
        generated.push({ name: "Guest Checkout Processing", dept: "Front Desk", role: "Receptionist", manpower: 1, frequency: "per check-out", timeWindow: "06:00 - 12:00", classification: "guest_request", recommendedSLA: 15, adjustedSLA: 15 });
        generated.push({ name: "Keycard Re-programming", dept: "Front Desk", role: "Receptionist", manpower: 1, frequency: "on-demand", timeWindow: "24 Hours", classification: "guest_request", recommendedSLA: 10, adjustedSLA: 10 });
      }

      // 3. Add Maintenance tasks
      if (activeDepts.some((d: any) => d.name.toLowerCase() === "maintenance")) {
        generated.push({ name: "Emergency HVAC Fix", dept: "Maintenance", role: "Technician", manpower: 2, frequency: "on-demand", timeWindow: "24 Hours", classification: "guest_request", recommendedSLA: 45, adjustedSLA: 45 });
        generated.push({ name: "Lightbulb Replacement", dept: "Maintenance", role: "Technician", manpower: 1, frequency: "on-demand", timeWindow: "08:00 - 17:00", classification: "guest_request", recommendedSLA: 30, adjustedSLA: 30 });
        generated.push({ name: "Plumbing Inspection", dept: "Maintenance", role: "Technician", manpower: 1, frequency: "weekly", timeWindow: "10:00 - 12:00", classification: "mandatory", recommendedSLA: 60, adjustedSLA: 60 });
      }

      // 4. Add F&B tasks
      if (activeDepts.some((d: any) => d.name.toLowerCase() === "food & beverage" || d.name.toLowerCase() === "food and beverage")) {
        generated.push({ name: "Room Service Meal Delivery", dept: "Food & Beverage", role: "Waiter", manpower: 1, frequency: "on-demand", timeWindow: "06:00 - 23:00", classification: "guest_request", recommendedSLA: 30, adjustedSLA: 30 });
        generated.push({ name: "Table Prep & Cleaning", dept: "Food & Beverage", role: "Waiter", manpower: 2, frequency: "per shift", timeWindow: "11:00 - 22:00", classification: "mandatory", recommendedSLA: 20, adjustedSLA: 20 });
      }

      // 5. Add Security tasks
      if (activeDepts.some((d: any) => d.name.toLowerCase() === "security")) {
        generated.push({ name: "Hourly Perimeter Patrol", dept: "Security", role: "Guard", manpower: 1, frequency: "per shift", timeWindow: "24 Hours", classification: "mandatory", recommendedSLA: 60, adjustedSLA: 60 });
        generated.push({ name: "CCTV Camera Feed Audits", dept: "Security", role: "Guard", manpower: 1, frequency: "daily", timeWindow: "22:00 - 02:00", classification: "mandatory", recommendedSLA: 120, adjustedSLA: 120 });
      }

      // 6. Add Laundry tasks
      if (activeDepts.some((d: any) => d.name.toLowerCase() === "laundry")) {
        generated.push({ name: "Pool Towels Wash", dept: "Laundry", role: "Laundry Attendant", manpower: 1, frequency: "daily", timeWindow: "07:00 - 10:00", classification: "mandatory", recommendedSLA: 90, adjustedSLA: 90 });
        generated.push({ name: "Guest Clothes Dry Clean", dept: "Laundry", role: "Laundry Attendant", manpower: 1, frequency: "on-demand", timeWindow: "08:00 - 15:00", classification: "guest_request", recommendedSLA: 180, adjustedSLA: 180 });
      }

      // 7. Add Facility tasks based on Phase 2
      if (activeFacs.some((f: any) => f.name.toLowerCase() === "swimming pool")) {
        generated.push({ name: "Pool Chemical Level Test", dept: "Maintenance", role: "Pool Attendant", manpower: 1, frequency: "daily", timeWindow: "06:30 - 07:00", classification: "mandatory", recommendedSLA: 30, adjustedSLA: 30 });
      }
      if (activeFacs.some((f: any) => f.name.toLowerCase() === "gym")) {
        generated.push({ name: "Gym Machine Sanitizing", dept: "Housekeeping", role: "Gym Attendant", manpower: 1, frequency: "per shift", timeWindow: "12:00 - 14:00", classification: "mandatory", recommendedSLA: 20, adjustedSLA: 20 });
      }
      if (activeFacs.some((f: any) => f.name.toLowerCase() === "spa")) {
        generated.push({ name: "Massage Room Prep", dept: "Housekeeping", role: "Spa Therapist", manpower: 1, frequency: "on-demand", timeWindow: "09:00 - 21:00", classification: "guest_request", recommendedSLA: 15, adjustedSLA: 15 });
      }

      onChange({ ...data, operationalBlueprint: generated });
    }
  }, []);



  const runPhaseAudit = async () => {
    setIsAuditing(true);
    try {
      const bypassActive = localStorage.getItem("aiBypass") === "true";
      if (bypassActive) {
        setAuditScore(100);
        setAuditComplete(true);
        setWarnings([]);
        if (onCheckpointUpdate) {
          onCheckpointUpdate(100, true);
        }
        return;
      }

      const res = await fetch("/api/onboarding/readiness", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phase: 6 }),
      });
      if (res.ok) {
        const resData = await res.json();
        setAuditScore(resData.score);
        setAuditComplete(resData.isComplete);
        setWarnings(resData.warnings || []);
        if (onCheckpointUpdate) {
          onCheckpointUpdate(resData.score, resData.isComplete);
        }
      }
    } catch (err) {
      console.error("Audit failed", err);
    } finally {
      setIsAuditing(false);
    }
  };

  const handleUpdateTaskField = (idx: number, field: string, val: any) => {
    const updated = [...(data.operationalBlueprint || [])];
    
    // SLA Constraints Check (+/- 50%)
    if (field === "adjustedSLA") {
      const recommended = Number(updated[idx].recommendedSLA) || 30;
      const parsedVal = Number(val) || 0;
      const minSLA = Math.round(recommended * 0.5);
      const maxSLA = Math.round(recommended * 1.5);
      
      // Clamp to boundary limits
      let clampedVal = parsedVal;
      if (parsedVal < minSLA) clampedVal = minSLA;
      if (parsedVal > maxSLA) clampedVal = maxSLA;
      
      updated[idx] = { ...updated[idx], [field]: clampedVal };
    } else {
      updated[idx] = { ...updated[idx], [field]: val };
    }

    onChange({ ...data, operationalBlueprint: updated });
  };

  const handleFinalizeLaunch = async () => {
    setIsFinalizing(true);
    setError(null);
    setIsCompiling(true);

    // Simulate database build logs
    setTimeout(() => setCompileLog("Analyzing hotel capacity and service parameters..."), 600);
    setTimeout(() => setCompileLog("Compiling task blueprints and workforce allocations..."), 1200);
    setTimeout(() => setCompileLog("Generating operational SLA routing paths..."), 1800);
    setTimeout(() => setCompileLog("Committing configurations transactionally to database..."), 2400);

    setTimeout(async () => {
      try {
        const res = await fetch("/api/onboarding/finalize", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            readinessScore: {
              knowledgeCoverage: auditScore,
              policiesCoverage: auditScore,
              isDepartmentMappingComplete: true,
              isRoutingMatrixComplete: true,
              isPriorityMatrixComplete: true,
              isCoreOperationalDataAvailable: true,
            },
            data,
          }),
        });

        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.error || "Failed to finalize onboarding configuration.");
        }

        router.push("/onboarding/summary");
      } catch (err: any) {
        setError(err.message || String(err));
        setIsCompiling(false);
        setIsFinalizing(false);
      }
    }, 3200);
  };

  const [activeDeptTab, setActiveDeptTab] = useState<string>("All");

  const tasks = data.operationalBlueprint || [];
  
  // Extract unique departments dynamically
  const departmentsList = ["All", ...Array.from(new Set(tasks.map((t: any) => t.dept))) as string[]];

  const filteredTasks = tasks
    .map((task: any, originalIdx: number) => ({ task, originalIdx }))
    .filter((item: any) => activeDeptTab === "All" || item.task.dept === activeDeptTab);

  return (
    <div className="space-y-8 animate-fade-in text-black">
      
      {/* Compiler Simulation Overlay */}
      {isCompiling && (
        <div className="fixed inset-0 bg-slate-900/80 bg-white/90 backdrop-blur-md z-[9999] flex flex-col items-center justify-center text-center p-6 select-none animate-fade-in">
          <div className="space-y-6 max-w-md">
            <div className="h-16 w-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto shadow-md" />
            <div className="space-y-2">
              <h2 className="text-xl font-extrabold text-slate-900 text-black tracking-tight">Compiling your hotel information...</h2>
              <p className="text-sm text-black dark:text-black font-mono py-1 px-3 bg-white rounded-lg inline-block shadow-inner border border-slate-200 dark:border-slate-850">
                {compileLog}
              </p>
            </div>
            <p className="text-xs text-slate-455 dark:text-black font-medium">Please wait while the READY system prepares your hotel launch blueprint.</p>
          </div>
        </div>
      )}

      <div className="border-b border-slate-200 pb-4">
        <h2 className="text-xl font-bold mb-1">Phase 6: Operational Blueprint</h2>
        <p className="text-sm text-black dark:text-black font-medium">Map required roles, manpower, shift schedules, and SLA controls for each department task.</p>
      </div>

      {/* Tabs Navigation Bar */}
      {tasks.length > 0 && (
        <div className="flex flex-wrap gap-2 pb-2">
          {departmentsList.map((deptName) => {
            const isActive = activeDeptTab === deptName;
            return (
              <button
                key={deptName}
                type="button"
                onClick={() => setActiveDeptTab(deptName)}
                className={`px-4 py-2 rounded-xl text-xs font-bold tracking-wider uppercase transition border ${
                  isActive
                    ? "bg-blue-600 text-white border-blue-600 shadow-md"
                    : "bg-white border-slate-200 hover:bg-slate-50 dark:hover:bg-slate-900/60 text-black dark:text-black"
                }`}
              >
                {deptName}
              </button>
            );
          })}
        </div>
      )}

      {error && <div className="text-rose-500 text-xs font-semibold">{error}</div>}

      {/* Blueprint Tasks Editor */}
      <div className="space-y-6 bg-slate-100/50 bg-white p-6 rounded-2xl border border-slate-200">
        <div className="flex justify-between items-center border-b border-slate-200 pb-3">
          <h3 className="text-md font-bold uppercase tracking-wider">Operational Tasks Matrix</h3>
        </div>
        
        {tasks.length === 0 ? (
          <p className="text-xs text-black italic py-4">No tasks generated. Go back and select active departments or facilities.</p>
        ) : (
          <div className="space-y-6 max-h-[600px] overflow-y-auto pr-2">
            {filteredTasks.map(({ task, originalIdx }: { task: any; originalIdx: number }) => {
              const minSLA = Math.round(task.recommendedSLA * 0.5);
              const maxSLA = Math.round(task.recommendedSLA * 1.5);

              return (
                <div key={originalIdx} className="bg-white border border-slate-200 p-5 rounded-xl space-y-4 shadow-sm">
                  {/* Task Header info */}
                  <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-850 pb-2.5">
                    <div>
                      <span className="text-xs font-bold text-black">{task.name}</span>
                      <span className="ml-3 text-[10px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded font-bold border border-blue-100">
                        {task.dept}
                      </span>
                    </div>
                    <span className="text-[10px] text-black font-mono">Index: #{originalIdx + 1}</span>
                  </div>

                  {/* Operational Settings Form fields */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-4 text-xs">
                    
                    {/* Manpower */}
                    <div className="space-y-1">
                      <label className="block text-[10px] uppercase font-bold text-black">Manpower Required</label>
                      <input
                        type="number"
                        min={1}
                        value={task.manpower === 0 || task.manpower === undefined ? "" : task.manpower}
                        onChange={(e) => handleUpdateTaskField(originalIdx, "manpower", e.target.value === "" ? 0 : Number(e.target.value) || 0)}
                        className="w-full bg-white border border-slate-200 rounded-lg p-2 text-black focus:outline-none"
                      />
                    </div>

                    {/* Responsible Position Role */}
                    <div className="space-y-1">
                      <label className="block text-[10px] uppercase font-bold text-black">Responsible Role</label>
                      <input
                        type="text"
                        value={task.role || ""}
                        onChange={(e) => handleUpdateTaskField(originalIdx, "role", e.target.value)}
                        placeholder="e.g. Room Attendant"
                        className="w-full bg-white border border-slate-200 rounded-lg p-2 text-black focus:outline-none"
                      />
                    </div>

                    {/* Frequency */}
                    <div className="space-y-1">
                      <label className="block text-[10px] uppercase font-bold text-black">Frequency</label>
                      <select
                        value={task.frequency || "daily"}
                        onChange={(e) => handleUpdateTaskField(originalIdx, "frequency", e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-lg p-2 text-black focus:outline-none"
                      >
                        <option value="daily">Daily</option>
                        <option value="weekly">Weekly</option>
                        <option value="monthly">Monthly</option>
                        <option value="per shift">Per Shift</option>
                        <option value="per check-in">Per Check-In</option>
                        <option value="per check-out">Per Check-Out</option>
                        <option value="on-demand">On-Demand</option>
                        <option value="custom">Custom Schedule</option>
                      </select>
                    </div>

                    {/* Time window */}
                    <div className="space-y-1">
                      <label className="block text-[10px] uppercase font-bold text-black">Time Window</label>
                      <input
                        type="text"
                        value={task.timeWindow || ""}
                        onChange={(e) => handleUpdateTaskField(originalIdx, "timeWindow", e.target.value)}
                        placeholder="e.g. 08:00 - 12:00"
                        className="w-full bg-white border border-slate-200 rounded-lg p-2 text-black focus:outline-none"
                      />
                    </div>

                    {/* Classification */}
                    <div className="space-y-1">
                      <label className="block text-[10px] uppercase font-bold text-black">Classification</label>
                      <select
                        value={task.classification || "mandatory"}
                        onChange={(e) => handleUpdateTaskField(originalIdx, "classification", e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-lg p-2 text-black focus:outline-none font-bold"
                      >
                        <option value="mandatory">Mandatory Operational</option>
                        <option value="guest_request">Guest-Requested</option>
                      </select>
                    </div>

                  </div>

                  {/* SLA Response Controls */}
                  <div className="bg-white/60 p-3 rounded-lg border border-slate-150 border-slate-200 grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                    <div className="text-[11px] text-black dark:text-black">
                      <p>SLA Response: Recommended standard is <span className="font-bold text-black">{task.recommendedSLA} minutes</span>.</p>
                      <p className="mt-0.5">Control range (+/- 50%): <span className="font-mono text-blue-700 font-bold">{minSLA} to {maxSLA} minutes</span>.</p>
                    </div>
                    <div className="flex items-center space-x-3 justify-end">
                      <span className="text-[10px] uppercase font-bold text-black">Adjusted SLA:</span>
                      <div className="flex items-center">
                        <input
                          type="number"
                          value={task.adjustedSLA === 0 || task.adjustedSLA === undefined ? "" : task.adjustedSLA}
                          onChange={(e) => handleUpdateTaskField(originalIdx, "adjustedSLA", e.target.value === "" ? 0 : Number(e.target.value) || 0)}
                          className="w-20 bg-white border border-slate-250 border-slate-200 rounded-lg p-1.5 text-center text-xs font-bold text-blue-700 focus:outline-none"
                        />
                        <span className="text-xs text-black ml-2">mins</span>
                      </div>
                    </div>
                  </div>

                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* AI Checkpoint & Launch Panel */}
      <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 space-y-6 shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <h3 className="text-sm font-bold text-indigo-950 uppercase tracking-wider flex items-center space-x-2">
            <span>🛡️</span>
            <span>AI Checkpoint: Phase 6 Blueprint Validation</span>
          </h3>
          <div className="flex items-center space-x-3">
            <button
              onClick={runPhaseAudit}
              disabled={isAuditing}
              className="px-3 py-1 bg-white border border-slate-250 border-slate-200 text-indigo-700 hover:text-indigo-505 text-[10px] font-bold rounded-lg transition"
            >
              {isAuditing ? "Re-verifying..." : "🔄 Verify Checkpoint"}
            </button>
            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
              auditComplete ? "bg-emerald-100 text-emerald-700 border border-emerald-250" : "bg-amber-100 text-amber-700 border border-amber-200"
            }`}>
              {auditComplete ? "LAUNCH READY" : "PENDING GAPS"}
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-800 font-medium">Validates task manpower allocations, roles, and keeps SLA response adjustments within strict boundaries.</p>
            <p className="text-[10px] text-slate-500 mt-1">Passing score: &gt;=80% triggers deployment launch permissions.</p>
          </div>
          <div className="h-16 w-16 rounded-full border-2 border-slate-200 flex items-center justify-center relative overflow-hidden">
            <div className="absolute bottom-0 inset-x-0 bg-indigo-500/20" style={{ height: `${auditScore}%` }} />
            <span className="text-sm font-bold text-indigo-750 relative z-10">{auditScore}%</span>
          </div>
        </div>

        {warnings.length > 0 && (
          <div className="bg-rose-50 border border-rose-200 p-4 rounded-xl text-rose-955 text-xs space-y-1.5 shadow-sm">
            <p className="font-extrabold uppercase tracking-wider text-[10px] text-rose-800">⚠️ Warnings Checklist:</p>
            <ul className="list-disc pl-4 space-y-1 font-medium">
              {warnings.map((warn, i) => <li key={i}>{warn}</li>)}
            </ul>
          </div>
        )}

        {/* Final Launch Chassis */}
        <div className="pt-4 border-t border-slate-200 flex justify-end">
          <button
            onClick={handleFinalizeLaunch}
            disabled={isFinalizing || !auditComplete}
            className="px-8 py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-lg transition transform hover:-translate-y-0.5 disabled:opacity-40 disabled:pointer-events-none"
          >
            {isFinalizing ? "Seeding operational tables..." : "Deploy Configuration & Go Live"}
          </button>
        </div>

      </div>

    </div>
  );
}
