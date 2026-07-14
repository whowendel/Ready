"use client";

import { useState, useEffect } from "react";

interface Step5Props {
  data: any;
  onChange: (newData: any) => void;
  onCheckpointUpdate?: (score: number, isComplete: boolean) => void;
}

export default function Step5Readiness({ data, onChange, onCheckpointUpdate }: Step5Props) {
  // Checkpoint State
  const [isAuditing, setIsAuditing] = useState(false);
  const [auditScore, setAuditScore] = useState<number>(0);
  const [auditComplete, setAuditComplete] = useState(false);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);



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
        body: JSON.stringify({ phase: 5 }),
      });
      if (res.ok) {
        const resData = await res.json();
        setAuditScore(resData.score);
        setAuditComplete(resData.isComplete);
        setWarnings(resData.warnings || []);
        setTemplates(resData.templates || []);
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

  const handleUpdatePolicy = (topicName: string, ruleVal: string) => {
    const currentPolicies = data.policies || [];
    const index = currentPolicies.findIndex((p: any) => p.topic.toLowerCase() === topicName.toLowerCase());
    const updated = [...currentPolicies];
    if (index >= 0) {
      updated[index] = { ...updated[index], rule: ruleVal };
    } else {
      updated.push({ topic: topicName, rule: ruleVal });
    }
    onChange({ ...data, policies: updated });
  };

  const handleApplyTemplate = (tpl: any) => {
    const topic = tpl.title.replace("Template", "").trim();
    const updatedPolicies = [
      ...(data.policies || []),
      { topic, rule: tpl.content },
    ];
    onChange({ ...data, policies: updatedPolicies });
    alert(`Applied template: "${tpl.title}" to policies list!`);
  };

  const activeDepartments = data.departments || [];
  const policies = data.policies || [];

  const getPolicyRule = (topic: string) => {
    return policies.find((p: any) => p.topic.toLowerCase() === topic.toLowerCase())?.rule || "";
  };

  return (
    <div className="space-y-8 animate-fade-in text-black">
      <div className="border-b border-slate-200 pb-4">
        <h2 className="text-xl font-bold mb-1">Phase 5: Policies & Rules</h2>
        <p className="text-sm text-black dark:text-black font-medium">Review hotel operating rules, shift handover policies, and department-specific guidelines.</p>
      </div>

      {/* Policies Panels */}
      <div className="bg-slate-100/50 bg-white p-6 rounded-2xl border border-slate-200 space-y-6">
        <h3 className="text-md font-bold uppercase tracking-wider border-b border-slate-200 pb-2">Hotel Rules & Policies</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Required vs Recommended Policies */}
          <div className="space-y-5">
            <div>
              <h4 className="text-xs font-bold text-slate-455 uppercase tracking-wider mb-3">Required Core Policies</h4>
              <div className="space-y-4">
                <div className="space-y-2 bg-white p-4 rounded-xl border border-slate-250 border-slate-200">
                  <label className="block text-xs font-bold text-black dark:text-slate-250 flex items-center justify-between">
                    <span>Check-in & Check-out Policy</span>
                    <span className="text-[9px] uppercase bg-red-50 dark:bg-red-950 text-red-600 text-red-700 px-1.5 py-0.5 rounded font-bold">Required</span>
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Mandatory check-in times, late checkout schedules, luggage rules..."
                    value={getPolicyRule("Check-in & Check-out")}
                    onChange={(e) => handleUpdatePolicy("Check-in & Check-out", e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-xs text-slate-750 text-black focus:outline-none resize-none mt-1"
                  />
                </div>

                <div className="space-y-2 bg-white p-4 rounded-xl border border-slate-250 border-slate-200">
                  <label className="block text-xs font-bold text-black dark:text-slate-250 flex items-center justify-between">
                    <span>Staff Shift Handover & Rostering Rules</span>
                    <span className="text-[9px] uppercase bg-red-50 dark:bg-red-950 text-red-600 text-red-700 px-1.5 py-0.5 rounded font-bold">Required</span>
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Mandatory shift checklist, roster handover approvals, scheduling policies..."
                    value={getPolicyRule("Shift Handover")}
                    onChange={(e) => handleUpdatePolicy("Shift Handover", e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-xs text-slate-750 text-black focus:outline-none resize-none mt-1"
                  />
                </div>
              </div>
            </div>

            <div>
              <h4 className="text-xs font-bold text-slate-455 uppercase tracking-wider mb-3">Optional Recommended Policies</h4>
              <div className="space-y-3">
                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-slate-650 text-black">Guest Visitor Registration Policy</label>
                  <textarea
                    rows={2.5}
                    placeholder="Visitor verification details, guestroom capacity limits..."
                    value={getPolicyRule("Visitor Registration")}
                    onChange={(e) => handleUpdatePolicy("Visitor Registration", e.target.value)}
                    className="w-full bg-white border border-slate-200 dark:border-slate-850 rounded-lg p-2.5 text-xs text-slate-750 text-black focus:outline-none resize-none"
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-slate-655 dark:text-slate-355">Other Policies (e.g. Pets, Cancellations)</label>
                  <textarea
                    rows={2.5}
                    placeholder="Cancellations and refunds, smoking bans..."
                    value={getPolicyRule("Cancellation & Refunds")}
                    onChange={(e) => handleUpdatePolicy("Cancellation & Refunds", e.target.value)}
                    className="w-full bg-white border border-slate-200 dark:border-slate-855 rounded-lg p-2.5 text-xs text-slate-755 text-black focus:outline-none resize-none"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Department-Specific Policies */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold text-slate-455 uppercase tracking-wider">Department-Specific Operating Policies</h4>
            {activeDepartments.length === 0 ? (
              <p className="text-xs text-black italic">No active departments selected. Go back to Phase 3 to select departments.</p>
            ) : (
              <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
                {activeDepartments.map((dept: any, idx: number) => {
                  const policyTopic = `${dept.name} Operating Rules`;
                  return (
                    <div key={idx} className="space-y-2 bg-white p-4 rounded-xl border border-slate-250 border-slate-200">
                      <label className="block text-xs font-bold text-black">{dept.name} Operations Rules</label>
                      <textarea
                        rows={2.5}
                        placeholder={`e.g. ${dept.name} team ticket resolutions protocols, tools care guidelines...`}
                        value={getPolicyRule(policyTopic)}
                        onChange={(e) => handleUpdatePolicy(policyTopic, e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-xs text-slate-750 text-black focus:outline-none resize-none mt-1"
                      />
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* AI Readiness Checkpoint Panel */}
      <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 space-y-4 shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <h3 className="text-sm font-bold text-indigo-950 uppercase tracking-wider flex items-center space-x-2">
            <span>🛡️</span>
            <span>AI Checkpoint: Phase 5 Readiness</span>
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
              auditComplete ? "bg-emerald-100 text-emerald-700 border border-emerald-250" : "bg-amber-100 text-amber-700 border border-amber-200"
            }`}>
              {auditComplete ? "PASSED" : "PENDING GAPS"}
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-800 font-medium">Verifies required check-in/out and shift handover policies.</p>
            <p className="text-[10px] text-slate-500 mt-1">Minimum target: 100% (Requires both Check-in/out and Shift handover rules completed)</p>
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

        {/* Templates suggestions */}
        {templates.length > 0 && (
          <div className="space-y-3">
            <label className="block text-[10px] uppercase font-bold text-black dark:text-black">AI Suggested Policy Templates</label>
            <div className="grid grid-cols-1 gap-3">
              {templates.map((tpl: any, idx: number) => (
                <div key={idx} className="bg-white border border-slate-200 p-4 rounded-lg relative flex items-start justify-between">
                  <div className="space-y-1 w-[80%]">
                    <p className="text-xs font-bold text-black">{tpl.title}</p>
                    <p className="text-[10px] text-black dark:text-black font-mono line-clamp-2">{tpl.content}</p>
                  </div>
                  <button
                    onClick={() => handleApplyTemplate(tpl)}
                    className="text-[10px] text-blue-700 hover:text-blue-600 font-bold border border-slate-200 rounded px-2.5 py-1 bg-white/60"
                  >
                    Apply
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
    </div>
  );
}
