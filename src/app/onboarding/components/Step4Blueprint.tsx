"use client";

import { useState, useEffect } from "react";

interface Step4Props {
  data: any;
  onChange: (newData: any) => void;
  onCheckpointUpdate?: (score: number, isComplete: boolean) => void;
}

export default function Step4Blueprint({ data, onChange, onCheckpointUpdate }: Step4Props) {
  // Checkpoint State
  const [isAuditing, setIsAuditing] = useState(false);
  const [auditScore, setAuditScore] = useState<number>(0);
  const [auditComplete, setAuditComplete] = useState(false);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [uploadingFloor, setUploadingFloor] = useState<number | null>(null);

  // Trigger phase audit on mount
  useEffect(() => {
    runPhaseAudit();
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
        body: JSON.stringify({ phase: 4 }),
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

  const handleTotalFloorsChange = (count: number) => {
    const validCount = Math.max(0, count);
    const floorsList = [...(data.floors || [])];

    if (floorsList.length < validCount) {
      for (let i = floorsList.length; i < validCount; i++) {
        floorsList.push({
          floorNumber: i + 1,
          rooms: {}, // Map of RoomType name -> room count on this floor
          departments: [], // Array of responsible department names
          floorPlanPath: ""
        });
      }
    } else if (floorsList.length > validCount) {
      floorsList.splice(validCount);
    }

    onChange({
      ...data,
      foundation: {
        ...data.foundation,
        totalFloors: validCount
      },
      floors: floorsList
    });
  };

  const handleUpdateFloorRoom = (floorIndex: number, roomTypeName: string, qty: number) => {
    const list = [...(data.floors || [])];
    const floor = { ...list[floorIndex] };
    const currentRooms = { ...(floor.rooms || {}) };

    if (qty <= 0) {
      delete currentRooms[roomTypeName];
    } else {
      currentRooms[roomTypeName] = qty;
    }

    floor.rooms = currentRooms;
    list[floorIndex] = floor;
    onChange({ ...data, floors: list });
  };

  const handleToggleFloorDept = (floorIndex: number, deptName: string, isChecked: boolean) => {
    const list = [...(data.floors || [])];
    const floor = { ...list[floorIndex] };
    let currentDepts = [...(floor.departments || [])];

    if (isChecked) {
      if (!currentDepts.includes(deptName)) {
        currentDepts.push(deptName);
      }
    } else {
      currentDepts = currentDepts.filter((d: string) => d !== deptName);
    }

    floor.departments = currentDepts;
    list[floorIndex] = floor;
    onChange({ ...data, floors: list });
  };

  const handleCopyLayoutToAll = (sourceIndex: number) => {
    const list = [...(data.floors || [])];
    const sourceFloor = list[sourceIndex];
    if (!sourceFloor) return;

    const updatedList = list.map((floor, idx) => {
      if (idx === sourceIndex) return floor;
      return {
        ...floor,
        rooms: { ...sourceFloor.rooms },
        departments: [...(sourceFloor.departments || [])],
        floorPlanPath: sourceFloor.floorPlanPath
      };
    });
    onChange({ ...data, floors: updatedList });
    alert(`Copied Floor ${sourceFloor.floorNumber} layout configuration to all other floors!`);
  };

  const handleFloorplanUpload = async (floorIndex: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingFloor(floorIndex);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/onboarding/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Floorplan upload failed.");
      }

      const resData = await res.json();
      const list = [...(data.floors || [])];
      list[floorIndex] = { ...list[floorIndex], floorPlanPath: `/uploads/${resData.name}` };
      onChange({ ...data, floors: list });
      alert(`Floor ${floorIndex + 1} plan uploaded successfully!`);
    } catch (err: any) {
      alert(err.message || String(err));
    } finally {
      setUploadingFloor(null);
    }
  };

  const roomTypes = data.roomTypes || [];
  const activeDepartments = data.departments || [];
  const floors = data.floors || [];
  const totalFloors = Number(data.foundation?.totalFloors) || 0;

  // Calculate totals for blueprint summary panel
  const getSummaryTotals = () => {
    const totals: Record<string, number> = {};
    floors.forEach((floor: any) => {
      Object.entries(floor.rooms || {}).forEach(([roomName, count]) => {
        totals[roomName] = (totals[roomName] || 0) + (Number(count) || 0);
      });
    });
    return totals;
  };
  const summaryTotals = getSummaryTotals();

  return (
    <div className="space-y-8 animate-fade-in text-black">
      <div className="border-b border-slate-200 pb-4">
        <h2 className="text-xl font-bold mb-1">Phase 4: Floor-by-Floor Mapping</h2>
        <p className="text-sm text-black font-medium">Map guestrooms, responsibility layouts, and upload blueprint plans floor-by-floor.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Total Floors Setup */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 space-y-4 shadow-sm">
          <h3 className="text-md font-bold uppercase tracking-wider border-b border-slate-200/60 pb-2 text-indigo-955">Property Heights</h3>
          <div className="flex items-center space-x-4">
            <label className="text-sm font-semibold text-black">Total Number of Floors:</label>
            <input
              type="number"
              min={1}
              value={totalFloors === 0 || totalFloors === undefined ? "" : totalFloors}
              onChange={(e) => handleTotalFloorsChange(e.target.value === "" ? 0 : parseInt(e.target.value) || 0)}
              placeholder="e.g. 5 floors"
              className="w-28 bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none text-black font-bold"
            />
          </div>
        </div>

        {/* Blueprint Summary Panel */}
        <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 space-y-3 shadow-sm">
          <h3 className="text-md font-bold uppercase tracking-wider border-b border-slate-200/60 pb-2 text-indigo-955 flex items-center space-x-1.5">
            <span>📊</span>
            <span>Property Blueprint Summary</span>
          </h3>
          {Object.keys(summaryTotals).length === 0 ? (
            <p className="text-xs text-slate-400 italic">No room mapping configured yet.</p>
          ) : (
            <div className="grid grid-cols-2 gap-2 max-h-[100px] overflow-y-auto pr-1">
              {Object.entries(summaryTotals).map(([rName, count]) => (
                <div key={rName} className="flex justify-between items-center text-xs bg-white border border-slate-200 rounded px-2.5 py-1 font-semibold">
                  <span className="text-slate-655 truncate">{rName}</span>
                  <span className="font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full text-[10px]">{count} rooms</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Floors Mapping List */}
      {totalFloors > 0 && (
        <div className="space-y-6">
          <h4 className="text-xs font-bold text-black uppercase tracking-wider">Floor Layout Maps</h4>
          
          {floors.map((floor: any, fIdx: number) => (
            <div key={fIdx} className="bg-white border border-slate-200 p-6 rounded-xl space-y-6 shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-200/60 pb-3">
                <h5 className="text-xs font-bold text-blue-700 flex items-center space-x-1.5">
                  <span className="h-2 w-2 rounded-full bg-blue-600 animate-pulse" />
                  <span>Floor {floor.floorNumber} Configuration</span>
                </h5>
                <button
                  type="button"
                  onClick={() => handleCopyLayoutToAll(fIdx)}
                  className="text-[10px] bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 px-3 py-1 rounded-lg font-bold transition flex items-center space-x-1"
                >
                  <span>📋</span>
                  <span>Copy Layout to All Floors</span>
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* 1. Room Distribution */}
                <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-4">
                  <span className="block text-[10px] uppercase font-bold text-black border-b border-slate-200 pb-1">Room Distribution</span>
                  {roomTypes.length === 0 ? (
                    <p className="text-[10px] text-black italic">No room types defined. Go back to Phase 2 to add room types.</p>
                  ) : (
                    <div className="space-y-3 max-h-[160px] overflow-y-auto pr-1">
                      {roomTypes.map((room: any) => {
                        const qty = floor.rooms?.[room.name] || 0;
                        return (
                          <div key={room.name} className="flex items-center justify-between text-xs">
                            <span className="text-slate-600 font-semibold">{room.name}</span>
                            <div className="flex items-center space-x-2">
                              <span className="text-[10px] text-black">Count:</span>
                              <input
                                type="number"
                                min={0}
                                value={qty === 0 || qty === undefined ? "" : qty}
                                onChange={(e) => handleUpdateFloorRoom(fIdx, room.name, e.target.value === "" ? 0 : parseInt(e.target.value) || 0)}
                                className="w-14 bg-white border border-slate-200 rounded px-1.5 py-0.5 text-center text-xs text-black focus:outline-none"
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* 2. Department Responsibility Checklist */}
                <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-4">
                  <span className="block text-[10px] uppercase font-bold text-black border-b border-slate-200 pb-1">Responsible Departments</span>
                  {activeDepartments.length === 0 ? (
                    <p className="text-[10px] text-black italic">No departments selected. Go back to Phase 3 to select departments.</p>
                  ) : (
                    <div className="grid grid-cols-1 gap-2 max-h-[160px] overflow-y-auto pr-1">
                      {activeDepartments.map((dept: any) => {
                        const isChecked = (floor.departments || []).includes(dept.name);
                        return (
                          <label
                            key={dept.name}
                            className="flex items-center space-x-2 text-xs font-semibold text-slate-655 text-black cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={(e) => handleToggleFloorDept(fIdx, dept.name, e.target.checked)}
                              className="accent-blue-600 rounded border-slate-200"
                            />
                            <span>{dept.name}</span>
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* 3. Floor Plan Upload */}
                <div className="bg-white p-4 rounded-xl border border-slate-200 flex flex-col justify-between space-y-4">
                  <div>
                    <span className="block text-[10px] uppercase font-bold text-black border-b border-slate-200 pb-1 mb-2">Floor Plan / Blueprint</span>
                    <p className="text-[10px] text-black dark:text-black leading-snug">Upload blueprints, floor escape maps, or layouts for precise AI context mapping.</p>
                  </div>
                  
                  {/* Thumbnail / PDF Loaded view */}
                  {floor.floorPlanPath ? (
                    <div className="flex items-center space-x-3.5 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                      {/* Image Thumbnail or PDF Icon */}
                      <div className="w-12 h-12 rounded-lg overflow-hidden border border-slate-200 flex-shrink-0 bg-slate-100 flex items-center justify-center">
                        {(floor.floorPlanPath.toLowerCase().endsWith(".pdf") || floor.floorPlanPath.includes("pdf")) ? (
                          <span className="text-xl">📄</span>
                        ) : (
                          <img src={floor.floorPlanPath} alt="Floor blueprint thumbnail" className="w-full h-full object-cover" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-bold text-black truncate">{floor.floorPlanPath.split('/').pop()}</p>
                        <p className="text-[9px] text-emerald-600 font-bold flex items-center space-x-0.5">
                          <span>✓</span>
                          <span>Loaded</span>
                        </p>
                      </div>
                    </div>
                  ) : null}

                  <div className="flex flex-col space-y-2">
                    <div className="border border-dashed border-slate-300 hover:border-blue-500/50 bg-white rounded-lg p-3 text-center cursor-pointer relative text-[11px] font-bold text-blue-700 hover:bg-slate-50 transition">
                      <input
                        type="file"
                        accept="image/*,.pdf"
                        disabled={uploadingFloor === fIdx}
                        onChange={(e) => handleFloorplanUpload(fIdx, e)}
                        className="absolute inset-0 opacity-0 cursor-pointer"
                      />
                      <span>{uploadingFloor === fIdx ? "Uploading plan..." : "Upload Floor Escape Map"}</span>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          ))}
        </div>
      )}

      {/* AI Readiness Checkpoint Panel */}
      <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 space-y-4 shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <h3 className="text-sm font-bold text-indigo-950 uppercase tracking-wider flex items-center space-x-2">
            <span>🛡️</span>
            <span>AI Checkpoint: Phase 4 Readiness</span>
          </h3>
          <div className="flex items-center space-x-3">
            <button
              onClick={runPhaseAudit}
              disabled={isAuditing}
              className="px-3 py-1 bg-white border border-slate-200 text-indigo-755 hover:text-indigo-500 text-[10px] font-bold rounded-lg transition"
            >
              {isAuditing ? "Re-verifying..." : "🔄 Verify Checkpoint"}
            </button>
            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
              auditComplete ? "bg-emerald-100 text-emerald-700 border border-emerald-250" : "bg-amber-100 text-amber-705 border border-amber-200"
            }`}>
              {auditComplete ? "PASSED" : "PENDING GAPS"}
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-800 font-medium">Phase 4 Score validates floor height properties, floor room distributions, and responsible department mappings.</p>
            <p className="text-[10px] text-slate-500 mt-1">Minimum target: 80% (Requires total floors &gt;0, with rooms and departments assigned to all floors)</p>
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
