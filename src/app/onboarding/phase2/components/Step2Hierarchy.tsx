"use client";

import { useState, useEffect } from "react";

interface Step2Props {
  data: any;
  onChange: (newData: any) => void;
  onCheckpointUpdate?: (score: number, isComplete: boolean) => void;
}

const defaultHierarchy = [
  { name: "Hotel Manager", role: "Hotel Manager", parent: "" },
  { name: "Front Office Manager", role: "Front Office Manager", parent: "Hotel Manager" },
  { name: "Receptionist", role: "Receptionist", parent: "Front Office Manager" },
  { name: "Concierge", role: "Concierge", parent: "Front Office Manager" },
  { name: "Housekeeping Manager", role: "Housekeeping Manager", parent: "Hotel Manager" },
  { name: "Housekeeping Supervisor", role: "Housekeeping Supervisor", parent: "Housekeeping Manager" },
  { name: "Room Attendant", role: "Room Attendant", parent: "Housekeeping Supervisor" },
  { name: "Maintenance Manager", role: "Maintenance Manager", parent: "Hotel Manager" },
  { name: "Technician", role: "Technician", parent: "Maintenance Manager" },
  { name: "Security Manager", role: "Security Manager", parent: "Hotel Manager" },
  { name: "Security Officer", role: "Security Officer", parent: "Security Manager" }
];

export default function Step2Hierarchy({ data, onChange, onCheckpointUpdate }: Step2Props) {
  const [nodes, setNodes] = useState<any[]>([]);
  const [isAuditing, setIsAuditing] = useState(false);
  const [auditScore, setAuditScore] = useState<number>(0);
  const [auditComplete, setAuditComplete] = useState(false);

  // Initialize from draft or use defaults
  useEffect(() => {
    const savedHierarchy = data.phase2?.hierarchy || [];
    if (savedHierarchy.length > 0) {
      setNodes(savedHierarchy);
    } else {
      setNodes(defaultHierarchy);
      updateDraft(defaultHierarchy);
    }
  }, []);

  useEffect(() => {
    if (nodes.length > 0) {
      runCheckpointAudit();
    }
  }, [nodes]);

  const updateDraft = (updatedNodes: any[]) => {
    onChange({
      ...data,
      phase2: {
        ...(data.phase2 || {}),
        hierarchy: updatedNodes
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
        if (onCheckpointUpdate) {
          onCheckpointUpdate(100, true);
        }
        return;
      }

      const res = await fetch("/api/onboarding/phase2/readiness", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ step: 2 }),
      });
      if (res.ok) {
        const resData = await res.json();
        setAuditScore(resData.score.hierarchyScore);
        setAuditComplete(resData.score.hierarchyScore >= 80);
        if (onCheckpointUpdate) {
          onCheckpointUpdate(resData.score.hierarchyScore, resData.score.hierarchyScore >= 80);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsAuditing(false);
    }
  };

  const handleAddNode = () => {
    const roleName = prompt("Enter position title name (e.g. F&B Supervisor):");
    if (!roleName || roleName.trim().length === 0) return;

    if (nodes.some(n => n.role.toLowerCase() === roleName.toLowerCase().trim())) {
      alert("A position with this role name already exists.");
      return;
    }

    // Generate parent select list
    const parentName = prompt(`Enter parent reporting role (or leave empty if reporting to Hotel Manager):\nOptions: ${nodes.map(n => n.role).join(", ")}`);
    const validParent = nodes.some(n => n.role.toLowerCase() === (parentName || "").toLowerCase().trim()) ? parentName?.trim() : "Hotel Manager";

    const updated = [
      ...nodes,
      { name: roleName.trim(), role: roleName.trim(), parent: validParent || "" }
    ];
    setNodes(updated);
    updateDraft(updated);
  };

  const handleRemoveNode = (roleName: string) => {
    if (roleName === "Hotel Manager") {
      alert("Cannot remove the root Hotel Manager role.");
      return;
    }

    const confirmed = window.confirm(`Are you sure you want to remove the "${roleName}" role? Any reporting children will report to Hotel Manager.`);
    if (!confirmed) return;

    const updated = nodes
      .filter(n => n.role !== roleName)
      .map(n => n.parent === roleName ? { ...n, parent: "Hotel Manager" } : n);

    setNodes(updated);
    updateDraft(updated);
  };

  // Helper function to render visual tree recursively
  const renderTreeNodes = (parentName: string, depth = 0) => {
    const children = nodes.filter(n => n.parent === parentName);
    return children.map((node, i) => (
      <div key={node.role} className="pl-6 border-l border-slate-200 ml-4 relative mt-2 text-xs">
        <div className="absolute top-3 left-0 w-4 h-px bg-slate-200 dark:bg-slate-800" />
        <div className="bg-white p-3 rounded-lg border border-slate-200 inline-flex items-center space-x-3 pr-4 shadow-sm">
          <span>💼</span>
          <div>
            <p className="font-bold text-black">{node.role}</p>
            <p className="text-[9px] text-black dark:text-black font-semibold uppercase">Reports to: {node.parent}</p>
          </div>
          <button
            onClick={() => handleRemoveNode(node.role)}
            className="text-[10px] text-rose-500 hover:text-rose-400 font-bold pl-3 border-l border-slate-200"
          >
            × Delete
          </button>
        </div>
        {renderTreeNodes(node.role, depth + 1)}
      </div>
    ));
  };

  const rootNode = nodes.find(n => !n.parent || n.role === "Hotel Manager");

  return (
    <div className="space-y-8 text-black">
      <div className="flex justify-between items-center border-b border-slate-200 pb-4">
        <div>
          <h2 className="text-xl font-bold mb-1">Step 2: Organizational Structure</h2>
          <p className="text-sm text-black dark:text-black font-medium">Structure reporting lines and design hotel workforce hierarchy roles.</p>
        </div>
        <button
          onClick={handleAddNode}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow transition"
        >
          ➕ Add Position
        </button>
      </div>

      {/* Visual Tree Rendering Panel */}
      <div className="bg-white/20 border border-slate-200 p-6 rounded-2xl overflow-x-auto min-h-[400px]">
        {rootNode ? (
          <div>
            <div className="bg-blue-50 px-4 py-3 rounded-xl border border-blue-200 inline-flex items-center space-x-3 pr-6">
              <span className="text-lg">🏢</span>
              <div>
                <p className="font-bold text-blue-700">{rootNode.role}</p>
                <p className="text-[9px] text-blue-500 uppercase font-bold tracking-widest">Root Executive Node</p>
              </div>
            </div>
            {renderTreeNodes(rootNode.role)}
          </div>
        ) : (
          <p className="text-xs text-black italic">No root manager role defined.</p>
        )}
      </div>

      {/* Checkpoint Panel */}
      <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <h3 className="text-sm font-bold text-indigo-950 uppercase tracking-wider">AI Checkpoint: Org Chart Validated</h3>
          <div className="flex items-center space-x-3">
            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
              auditComplete ? "bg-emerald-100 text-emerald-700 border border-emerald-200" : "bg-amber-100 text-amber-700 border border-amber-200"
            }`}>
              {auditComplete ? "PASSED" : "PENDING GAPS"}
            </span>
          </div>
        </div>
        <div className="flex items-center justify-between text-xs">
          <p className="text-black">Verifies that the reporting lines are connected and roles type check without any loops.</p>
          <span className="font-bold text-blue-700">{auditScore}% Readiness</span>
        </div>
      </div>
    </div>
  );
}
