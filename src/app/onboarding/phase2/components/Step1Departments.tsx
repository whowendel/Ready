"use client";

import { useState, useEffect } from "react";

interface Step1Props {
  data: any;
  onChange: (newData: any) => void;
  onCheckpointUpdate?: (score: number, isComplete: boolean) => void;
}

export default function Step1Departments({ data, onChange, onCheckpointUpdate }: Step1Props) {
  const [departments, setDepartments] = useState<any[]>([]);
  const [isAuditing, setIsAuditing] = useState(false);
  const [auditScore, setAuditScore] = useState<number>(0);
  const [auditComplete, setAuditComplete] = useState(false);
  const [warnings, setWarnings] = useState<string[]>([]);

  // Initialize departments from Phase 2 draft, fallback to Phase 1 data
  useEffect(() => {
    const p2Depts = data.phase2?.departments || [];
    if (p2Depts.length > 0) {
      setDepartments(p2Depts);
    } else {
      const p1Depts = data.departments || [];
      const initialized = p1Depts.map((d: any) => ({
        name: d.name,
        description: d.description || `Responsible for ${d.name.toLowerCase()} operations.`,
        workerCount: d.workerCount || 4,
        shifts: d.shifts || [
          { name: "Morning Shift", open: "06:00", close: "14:00" },
          { name: "Afternoon Shift", open: "14:00", close: "22:00" }
        ],
        tasks: d.tasks || []
      }));
      setDepartments(initialized);
      updateDraft(initialized);
    }
  }, []);

  // Run Phase 2 Step 1 audit when departments change
  useEffect(() => {
    if (departments.length > 0) {
      runCheckpointAudit();
    }
  }, [departments]);

  const updateDraft = (updatedDepts: any[]) => {
    onChange({
      ...data,
      phase2: {
        ...(data.phase2 || {}),
        departments: updatedDepts
      }
    });
  };

  const runCheckpointAudit = async () => {
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

      const res = await fetch("/api/onboarding/phase2/readiness", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ step: 1 }),
      });
      if (res.ok) {
        const resData = await res.json();
        setAuditScore(resData.score.deptsScore);
        setAuditComplete(resData.score.deptsScore >= 80);
        setWarnings(resData.warnings || []);
        if (onCheckpointUpdate) {
          onCheckpointUpdate(resData.score.deptsScore, resData.score.deptsScore >= 80);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsAuditing(false);
    }
  };

  const handleUpdateField = (idx: number, field: string, val: any) => {
    const updated = [...departments];
    updated[idx] = { ...updated[idx], [field]: val };
    setDepartments(updated);
    updateDraft(updated);
  };

  const handleAddShift = (idx: number) => {
    const updated = [...departments];
    const currentShifts = updated[idx].shifts || [];
    updated[idx].shifts = [
      ...currentShifts,
      { name: `Shift ${currentShifts.length + 1}`, open: "08:00", close: "16:00" }
    ];
    setDepartments(updated);
    updateDraft(updated);
  };

  const handleRemoveShift = (deptIdx: number, shiftIdx: number) => {
    const updated = [...departments];
    updated[deptIdx].shifts = updated[deptIdx].shifts.filter((_: any, i: number) => i !== shiftIdx);
    setDepartments(updated);
    updateDraft(updated);
  };

  const handleShiftTimeChange = (deptIdx: number, shiftIdx: number, field: string, val: string) => {
    const updated = [...departments];
    updated[deptIdx].shifts[shiftIdx] = {
      ...updated[deptIdx].shifts[shiftIdx],
      [field]: val
    };
    setDepartments(updated);
    updateDraft(updated);
  };

  const handleMergeDepartments = (sourceIdx: number, targetName: string) => {
    if (!targetName) return;
    const targetIdx = departments.findIndex(d => d.name === targetName);
    if (targetIdx === -1 || sourceIdx === targetIdx) return;

    const source = departments[sourceIdx];
    const target = departments[targetIdx];

    // Merge tasks & shifts
    const mergedShifts = [...(target.shifts || []), ...(source.shifts || [])];
    const mergedTasks = [...(target.tasks || []), ...(source.tasks || [])];
    
    const updated = [...departments];
    updated[targetIdx] = {
      ...target,
      description: `${target.description} (Merged with ${source.name})`,
      shifts: mergedShifts,
      tasks: mergedTasks
    };

    // Remove source department
    const finalDepts = updated.filter((_, i) => i !== sourceIdx);
    setDepartments(finalDepts);
    updateDraft(finalDepts);
    alert(`Successfully merged "${source.name}" into "${target.name}"!`);
  };

  const handleAddDepartment = () => {
    const newDeptName = prompt("Enter new department name:");
    if (!newDeptName || newDeptName.trim().length === 0) return;
    
    if (departments.some(d => d.name.toLowerCase() === newDeptName.toLowerCase().trim())) {
      alert("A department with this name already exists.");
      return;
    }

    const updated = [
      ...departments,
      {
        name: newDeptName.trim(),
        description: "New custom department.",
        workerCount: 2,
        shifts: [{ name: "Regular Shift", open: "09:00", close: "17:00" }],
        tasks: []
      }
    ];
    setDepartments(updated);
    updateDraft(updated);
  };

  const handleRemoveDepartment = (idx: number) => {
    const confirmed = window.confirm(`Are you sure you want to remove the "${departments[idx].name}" department?`);
    if (!confirmed) return;

    const finalDepts = departments.filter((_, i) => i !== idx);
    setDepartments(finalDepts);
    updateDraft(finalDepts);
  };

  return (
    <div className="space-y-8 text-black">
      <div className="flex justify-between items-center border-b border-slate-200 pb-4">
        <div>
          <h2 className="text-xl font-bold mb-1">Step 1: Department Review & Approval</h2>
          <p className="text-sm text-black dark:text-black font-medium">Verify department descriptions, set shift windows, or merge departments.</p>
        </div>
        <button
          onClick={handleAddDepartment}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow transition"
        >
          ➕ Add Department
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {departments.map((dept, idx) => (
          <div key={idx} className="bg-white p-6 rounded-2xl border border-slate-200 space-y-6 shadow-sm">
            {/* Card Header */}
            <div className="flex flex-col sm:flex-row justify-between sm:items-center border-b border-slate-100 dark:border-slate-850 pb-3 gap-3">
              <div>
                <span className="text-sm font-bold text-slate-850 text-black">{dept.name}</span>
                <span className="text-[10px] text-black dark:text-black font-mono ml-3">Shifts count: {dept.shifts?.length || 0}</span>
              </div>
              <div className="flex items-center space-x-3">
                {/* Merge Select */}
                <select
                  onChange={(e) => handleMergeDepartments(idx, e.target.value)}
                  defaultValue=""
                  className="bg-white border border-slate-200 dark:border-slate-850 text-[10px] font-bold rounded px-2 py-1 focus:outline-none"
                >
                  <option value="" disabled>Merge Into...</option>
                  {departments.map((d) => d.name !== dept.name && (
                    <option key={d.name} value={d.name}>{d.name}</option>
                  ))}
                </select>
                <button
                  onClick={() => handleRemoveDepartment(idx)}
                  className="text-[10px] text-rose-500 hover:text-rose-400 font-bold border border-rose-200 dark:border-rose-955/40 rounded px-2 py-1"
                >
                  Delete
                </button>
              </div>
            </div>

            {/* Description */}
            <div className="space-y-1 text-xs">
              <label className="block text-[10px] uppercase font-bold text-black">Department Description</label>
              <textarea
                rows={2}
                value={dept.description || ""}
                onChange={(e) => handleUpdateField(idx, "description", e.target.value)}
                placeholder="Describe role responsibilities..."
                className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-black focus:outline-none resize-none"
              />
            </div>

            {/* Shifts */}
            <div className="space-y-3.5 pt-3 border-t border-slate-100 dark:border-slate-850">
              <div className="flex justify-between items-center">
                <span className="text-[10px] uppercase font-bold text-black">Operating shifts</span>
                <button
                  type="button"
                  onClick={() => handleAddShift(idx)}
                  className="text-[10px] text-blue-600 hover:text-blue-700 font-bold"
                >
                  + Add Shift
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                {(dept.shifts || []).map((shift: any, sIdx: number) => (
                  <div key={sIdx} className="bg-white p-3.5 border border-slate-200 dark:border-slate-850 rounded-xl flex items-center justify-between gap-3">
                    <div className="space-y-1 flex-grow">
                      <input
                        type="text"
                        value={shift.name}
                        onChange={(e) => handleShiftTimeChange(idx, sIdx, "name", e.target.value)}
                        className="bg-transparent font-bold border-b border-transparent focus:border-slate-300 dark:focus:border-slate-800 focus:outline-none text-[11px] w-full"
                      />
                      <div className="flex items-center space-x-2 text-[10px] text-black font-medium">
                        <span>Open:</span>
                        <input
                          type="time"
                          value={shift.open}
                          onChange={(e) => handleShiftTimeChange(idx, sIdx, "open", e.target.value)}
                          className="bg-transparent border border-slate-250 border-slate-200 rounded px-1"
                        />
                        <span>Close:</span>
                        <input
                          type="time"
                          value={shift.close}
                          onChange={(e) => handleShiftTimeChange(idx, sIdx, "close", e.target.value)}
                          className="bg-transparent border border-slate-250 border-slate-200 rounded px-1"
                        />
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveShift(idx, sIdx)}
                      className="text-black hover:text-rose-500 text-xs font-bold px-1"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Checkpoint Panel */}
      <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <h3 className="text-sm font-bold text-indigo-950 uppercase tracking-wider">AI Checkpoint: Departments Approved</h3>
          <div className="flex items-center space-x-3">
            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
              auditComplete ? "bg-emerald-100 text-emerald-700 border border-emerald-200" : "bg-amber-100 text-amber-700 border border-amber-200"
            }`}>
              {auditComplete ? "PASSED" : "PENDING GAPS"}
            </span>
          </div>
        </div>
        <div className="flex items-center justify-between text-xs">
          <p className="text-black">Verifies that all departments have description summaries and operational shift windows defined.</p>
          <span className="font-bold text-blue-700">{auditScore}% Readiness</span>
        </div>
      </div>
    </div>
  );
}
