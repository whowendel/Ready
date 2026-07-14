"use client";

import { useState, useEffect } from "react";

interface Step4Props {
  data: any;
  onChange: (newData: any) => void;
  onCheckpointUpdate?: (score: number, isComplete: boolean, auditData?: any) => void;
  auditState?: any;
}

export default function Step4Blueprint({ data, onChange, onCheckpointUpdate, auditState }: Step4Props) {
  // Checkpoint State
  const [isAuditing, setIsAuditing] = useState(false);
  const [auditScore, setAuditScore] = useState<number>(0);
  const [auditComplete, setAuditComplete] = useState(false);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [uploadingFloor, setUploadingFloor] = useState<number | null>(null);

  // Layout Designer State
  const [activeCellConfig, setActiveCellConfig] = useState<{ floorIdx: number, x: number, y: number } | null>(null);
  const [configBlockType, setConfigBlockType] = useState<"room" | "facility">("room");
  const [configRoomType, setConfigRoomType] = useState<string>("");
  const [configFacilityName, setConfigFacilityName] = useState<string>("");
  const [configBlockName, setConfigBlockName] = useState<string>("");
  const [expandedFloorLayout, setExpandedFloorLayout] = useState<number | null>(null);

  // Sync with parent auditState
  useEffect(() => {
    if (auditState) {
      setAuditScore(auditState.score || 0);
      setAuditComplete(auditState.isComplete || false);
      setWarnings(auditState.warnings || []);
    } else {
      setAuditScore(0);
      setAuditComplete(false);
      setWarnings([]);
    }
  }, [auditState]);

  // Trigger phase audit on mount (only if no cached auditState)
  useEffect(() => {
    if (!auditState) {
      runPhaseAudit();
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
        body: JSON.stringify({ phase: 4 }),
      });
      if (res.ok) {
        const resData = await res.json();
        setAuditScore(resData.score);
        setAuditComplete(resData.isComplete);
        setWarnings(resData.warnings || []);
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
      list[floorIndex] = { ...list[floorIndex], floorPlanPath: resData.url || `/uploads/${resData.name}` };
      onChange({ ...data, floors: list });
      alert(`Floor ${floorIndex + 1} plan uploaded successfully!`);
    } catch (err: any) {
      alert(err.message || String(err));
    } finally {
      setUploadingFloor(null);
    }
  };

  // Save or update a block in the grid layout
  const handleSaveBlock = () => {
    if (!activeCellConfig) return;
    const { floorIdx, x, y } = activeCellConfig;
    const updatedFloors = [...(data.floors || [])];
    const floor = { ...updatedFloors[floorIdx] };
    const currentLayout = [...(floor.layout || [])];

    // Find if a block already exists in this cell
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
    onChange({ ...data, floors: updatedFloors });

    // Reset config states
    setActiveCellConfig(null);
    setConfigBlockName("");
  };

  // Remove a block from the grid layout
  const handleClearCell = (floorIdx: number, x: number, y: number) => {
    const updatedFloors = [...(data.floors || [])];
    const floor = { ...updatedFloors[floorIdx] };
    const currentLayout = [...(floor.layout || [])];

    const filteredLayout = currentLayout.filter((b: any) => !(b.x === x && b.y === y));

    floor.layout = filteredLayout;
    updatedFloors[floorIdx] = floor;
    onChange({ ...data, floors: updatedFloors });
  };

  const getBlockDetails = (block: any) => {
    if (!block) return { emoji: "➕", bg: "bg-slate-50 border-dashed border-slate-350 hover:bg-slate-100", textColor: "text-slate-400" };
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

              {/* Visual Layout Map Designer Expandable */}
              <div className="border-t border-slate-100 pt-6 mt-6">
                <div className="flex justify-between items-center mb-4">
                  <span className="text-[11px] uppercase font-black text-slate-800 tracking-wider">Visual Map Layout designer</span>
                  <button
                    type="button"
                    onClick={() => setExpandedFloorLayout(expandedFloorLayout === fIdx ? null : fIdx)}
                    className="text-xs bg-slate-100 hover:bg-slate-200 border border-slate-200 px-3 py-1.5 rounded-lg text-black font-bold transition flex items-center space-x-1"
                  >
                    <span>{expandedFloorLayout === fIdx ? "Hide Grid Designer ✕" : "🛠️ Open Grid Designer"}</span>
                  </button>
                </div>

                {expandedFloorLayout === fIdx && (
                  <div className="bg-slate-50 border border-slate-200 p-6 rounded-xl space-y-6">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200/60 pb-3">
                      <div>
                        <h6 className="text-xs font-black text-black">Interactive 6x6 Layout Grid</h6>
                        <p className="text-[10px] text-slate-500 mt-0.5">Click cells below to place configured rooms and facilities.</p>
                      </div>
                      <span className="text-[10px] bg-indigo-50 border border-indigo-200 text-indigo-700 px-2.5 py-1 rounded-full font-bold">
                        Blocks Placed: {(floor.layout || []).length}
                      </span>
                    </div>

                    {/* Designer Workspace */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
                      {/* Grid View */}
                      <div className="md:col-span-2 bg-white border border-slate-200 p-4 rounded-xl shadow-sm">
                        <div className="grid grid-cols-6 gap-2 aspect-[4/3] max-w-[480px] mx-auto">
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
                                        setConfigRoomType(roomTypes[0]?.name || "");
                                        setConfigFacilityName(data.facilities?.[0]?.name || "");
                                        setConfigBlockName("");
                                      }
                                    }}
                                    className={`w-full h-full rounded-lg border-2 flex flex-col items-center justify-center p-1 transition cursor-pointer ${details.bg}`}
                                  >
                                    <span className="text-lg">{details.emoji}</span>
                                    {block ? (
                                      <span className="text-[9px] font-bold text-black truncate w-full text-center mt-1">
                                        {block.name}
                                      </span>
                                    ) : (
                                      <span className="text-[8px] font-bold text-slate-400 mt-1 opacity-0 group-hover:opacity-100 transition">
                                        ({x},{y})
                                      </span>
                                    )}
                                  </button>
                                  {block && (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleClearCell(fIdx, x, y);
                                      }}
                                      className="absolute -top-1.5 -right-1.5 h-4 w-4 rounded-full bg-rose-500 text-white flex items-center justify-center text-[10px] font-bold border border-rose-600 shadow-sm opacity-0 group-hover:opacity-100 transition cursor-pointer z-20"
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

                      {/* Cell Block Configurator Panel */}
                      <div className="bg-white border border-slate-200 p-4 rounded-xl space-y-4 shadow-sm h-full">
                        <span className="block text-[10px] uppercase font-bold text-slate-800 border-b border-slate-200 pb-1.5">
                          Configure Block
                        </span>

                        {activeCellConfig ? (
                          <div className="space-y-3.5">
                            <p className="text-[10px] font-bold text-black">
                              Position: Column {activeCellConfig.x + 1}, Row {activeCellConfig.y + 1}
                            </p>

                            <div className="space-y-1">
                              <label className="text-[9px] font-bold text-slate-700 uppercase block">Block Type</label>
                              <div className="flex gap-2">
                                <button
                                  type="button"
                                  onClick={() => setConfigBlockType("room")}
                                  className={`flex-1 py-1.5 rounded-lg text-xs font-bold border transition ${
                                    configBlockType === "room" ? "bg-blue-600 border-blue-600 text-white" : "bg-white border-slate-200 text-black hover:bg-slate-50"
                                  }`}
                                >
                                  Guestroom
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setConfigBlockType("facility")}
                                  className={`flex-1 py-1.5 rounded-lg text-xs font-bold border transition ${
                                    configBlockType === "facility" ? "bg-purple-600 border-purple-600 text-white" : "bg-white border-slate-200 text-black hover:bg-slate-50"
                                  }`}
                                >
                                  Facility
                                </button>
                              </div>
                            </div>

                            {configBlockType === "room" ? (
                              <div className="space-y-1">
                                <label className="text-[9px] font-bold text-slate-700 uppercase block">Room Type Profile</label>
                                <select
                                  value={configRoomType}
                                  onChange={(e) => setConfigRoomType(e.target.value)}
                                  className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs font-semibold focus:outline-none"
                                >
                                  {roomTypes.map((rt: any) => (
                                    <option key={rt.name} value={rt.name}>{rt.name}</option>
                                  ))}
                                </select>
                              </div>
                            ) : (
                              <div className="space-y-1">
                                <label className="text-[9px] font-bold text-slate-700 uppercase block">Select Facility</label>
                                <select
                                  value={configFacilityName}
                                  onChange={(e) => setConfigFacilityName(e.target.value)}
                                  className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs font-semibold focus:outline-none"
                                >
                                  {(data.facilities || []).map((fc: any) => (
                                    <option key={fc.name} value={fc.name}>{fc.name}</option>
                                  ))}
                                </select>
                              </div>
                            )}

                            <div className="space-y-1">
                              <label className="text-[9px] font-bold text-slate-700 uppercase block">Label / Room Number</label>
                              <input
                                type="text"
                                placeholder={configBlockType === "room" ? "e.g. 101" : "e.g. Lobby"}
                                value={configBlockName}
                                onChange={(e) => setConfigBlockName(e.target.value)}
                                className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs font-bold text-black focus:outline-none"
                              />
                            </div>

                            <div className="flex gap-2 pt-2">
                              <button
                                type="button"
                                onClick={handleSaveBlock}
                                className="flex-1 py-2 bg-[#2563EB] hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-sm cursor-pointer"
                              >
                                Save Block
                              </button>
                              <button
                                type="button"
                                onClick={() => setActiveCellConfig(null)}
                                className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-black text-xs font-bold rounded-lg cursor-pointer"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center justify-center py-10 text-center text-slate-400 space-y-1">
                            <span className="text-2xl">🖱️</span>
                            <p className="text-[10px] font-medium leading-snug">Click any grid cell to begin laying out rooms and facilities.</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
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
