"use client";

import { useState, useEffect } from "react";

interface Step2Props {
  data: any;
  onChange: (newData: any) => void;
  onCheckpointUpdate?: (score: number, isComplete: boolean, auditData?: any) => void;
  auditState?: any;
}

const standardAmenities = ["WiFi", "Air Conditioning", "Smart TV", "Mini Bar", "Safe", "Balcony", "Coffee Maker", "Bathtub"];
const standardFacilities = ["Swimming Pool", "Restaurant", "Gym", "Bar", "Spa", "Conference Hall"];
const standardBeds = ["King Bed", "Queen Bed", "Double Bed", "Single Bed"];

export default function Step2Services({ data, onChange, onCheckpointUpdate, auditState }: Step2Props) {
  // Checkpoint State
  const [isAuditing, setIsAuditing] = useState(false);
  const [auditScore, setAuditScore] = useState<number>(0);
  const [auditComplete, setAuditComplete] = useState(false);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [customAmenityInputs, setCustomAmenityInputs] = useState<Record<number, string>>({});

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
        body: JSON.stringify({ phase: 2 }),
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

  // --- Rooms Management ---
  const handleAddRoomType = () => {
    const newRoom = {
      name: "New Room Category",
      capacity: 2,
      beds: { "King Bed": 1 }, // Map of bed types and their count
      bedTypes: "1 King Bed",
      amenities: ["WiFi"],
    };
    onChange({
      ...data,
      roomTypes: [...(data.roomTypes || []), newRoom],
    });
  };

  const handleUpdateRoomField = (index: number, field: string, val: any) => {
    const list = (data.roomTypes || []).map((r: any, idx: number) => {
      if (idx === index) {
        const updated = { ...r, [field]: val };
        // If updating beds, re-generate bedTypes summary string
        if (field === "beds") {
          const bedSummary = Object.entries(val)
            .filter(([_, count]) => Number(count) > 0)
            .map(([type, count]) => `${count} ${type}${Number(count) > 1 ? "s" : ""}`)
            .join(", ");
          updated.bedTypes = bedSummary || "No beds defined";
        }
        return updated;
      }
      return r;
    });
    onChange({ ...data, roomTypes: list });
  };

  const handleToggleBedCheckbox = (roomIndex: number, bedType: string, isChecked: boolean) => {
    const room = (data.roomTypes || [])[roomIndex];
    const currentBeds = { ...(room.beds || {}) };

    if (isChecked) {
      currentBeds[bedType] = currentBeds[bedType] || 1;
    } else {
      delete currentBeds[bedType];
    }
    handleUpdateRoomField(roomIndex, "beds", currentBeds);
  };

  const handleBedCountChange = (roomIndex: number, bedType: string, count: number) => {
    const room = (data.roomTypes || [])[roomIndex];
    const currentBeds = { ...(room.beds || {}) };
    if (count <= 0) {
      delete currentBeds[bedType];
    } else {
      currentBeds[bedType] = count;
    }
    handleUpdateRoomField(roomIndex, "beds", currentBeds);
  };

  const handleToggleRoomAmenity = (roomIndex: number, amenityName: string) => {
    const room = (data.roomTypes || [])[roomIndex];
    const currentAmenities = room.amenities || [];
    let updated;
    if (currentAmenities.includes(amenityName)) {
      updated = currentAmenities.filter((a: string) => a !== amenityName);
    } else {
      updated = [...currentAmenities, amenityName];
    }

    const list = (data.roomTypes || []).map((r: any, idx: number) => 
      idx === roomIndex ? { ...r, amenities: updated } : r
    );

    // Save globally to data.amenities if not already there
    const globalAmenities = data.amenities || [];
    const updatedGlobal = [...globalAmenities];
    if (!updatedGlobal.some((ga: any) => ga.name.toLowerCase() === amenityName.toLowerCase())) {
      updatedGlobal.push({ name: amenityName, description: "Standard Room Amenity" });
    }

    onChange({
      ...data,
      roomTypes: list,
      amenities: updatedGlobal,
    });
  };

  const handleAddCustomAmenity = (roomIndex: number) => {
    const text = customAmenityInputs[roomIndex]?.trim();
    if (!text) return;

    const room = (data.roomTypes || [])[roomIndex];
    const currentAmenities = room.amenities || [];
    if (!currentAmenities.includes(text)) {
      const updated = [...currentAmenities, text];
      const list = (data.roomTypes || []).map((r: any, idx: number) => 
        idx === roomIndex ? { ...r, amenities: updated } : r
      );

      const globalAmenities = data.amenities || [];
      const updatedGlobal = [...globalAmenities];
      if (!updatedGlobal.some((ga: any) => ga.name.toLowerCase() === text.toLowerCase())) {
        updatedGlobal.push({ name: text, description: "Custom Room Amenity" });
      }

      onChange({
        ...data,
        roomTypes: list,
        amenities: updatedGlobal,
      });
    }
    setCustomAmenityInputs({ ...customAmenityInputs, [roomIndex]: "" });
  };

  const handleRemoveRoomType = (index: number) => {
    const list = [...(data.roomTypes || [])];
    list.splice(index, 1);
    onChange({ ...data, roomTypes: list });
  };

  // --- Facilities Management ---
  const handleToggleFacility = (facilityName: string) => {
    const currentFacs = data.facilities || [];
    const existsIndex = currentFacs.findIndex((f: any) => f.name.toLowerCase() === facilityName.toLowerCase());

    if (existsIndex >= 0) {
      const filtered = currentFacs.filter((f: any) => f.name.toLowerCase() !== facilityName.toLowerCase());
      onChange({ ...data, facilities: filtered });
    } else {
      const added = [...currentFacs, {
        name: facilityName,
        description: `Property ${facilityName} zone.`,
        capacity: 50, // Default capacity
        operatingHours: { open: "08:00", close: "22:00" },
        details: { menu: "" } // Extra details (menu, heated, etc.)
      }];
      onChange({ ...data, facilities: added });
    }
  };

  const handleUpdateFacilityDetail = (facName: string, field: string, val: any) => {
    const list = (data.facilities || []).map((f: any) => {
      if (f.name.toLowerCase() === facName.toLowerCase()) {
        if (field === "open" || field === "close") {
          return {
            ...f,
            operatingHours: {
              ...f.operatingHours,
              [field]: val,
            }
          };
        }
        return {
          ...f,
          [field]: val,
        };
      }
      return f;
    });
    onChange({ ...data, facilities: list });
  };

  const handleUpdateFacilitySubDetail = (facName: string, detailKey: string, val: any) => {
    const list = (data.facilities || []).map((f: any) => {
      if (f.name.toLowerCase() === facName.toLowerCase()) {
        return {
          ...f,
          details: {
            ...(f.details || {}),
            [detailKey]: val,
          }
        };
      }
      return f;
    });
    onChange({ ...data, facilities: list });
  };

  const roomTypes = data.roomTypes || [];
  const facilities = data.facilities || [];

  return (
    <div className="space-y-8 animate-fade-in text-black">
      <div className="border-b border-slate-200 pb-4">
        <h2 className="text-xl font-bold mb-1">Phase 2: Lodging Profiles & Property Facilities</h2>
        <p className="text-sm text-black dark:text-black font-medium">Define lodging configurations, room amenities, and active property facilities.</p>
      </div>

      {/* 1. Room Profiles Section */}
      <div className="bg-slate-100/50 bg-white p-6 rounded-2xl border border-slate-200 space-y-6">
        <div className="flex justify-between items-center border-b border-slate-200 pb-3">
          <h3 className="text-md font-bold uppercase tracking-wider">Room Configurations</h3>
          <button
            onClick={handleAddRoomType}
            className="text-xs text-blue-600 hover:text-blue-700 font-bold"
          >
            + Add Room Type
          </button>
        </div>

        {roomTypes.length === 0 ? (
          <p className="text-xs text-black italic">No room types defined yet. Click "Add Room Type" to create one.</p>
        ) : (
          <div className="space-y-8">
            {roomTypes.map((room: any, rIdx: number) => (
              <div key={rIdx} className="bg-white/35 border border-slate-200 p-6 rounded-xl space-y-5 relative group shadow-sm">
                <button
                  onClick={() => handleRemoveRoomType(rIdx)}
                  className="absolute top-6 right-6 text-black hover:text-rose-500 text-xs font-bold transition"
                >
                  🗑️ Delete Room
                </button>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-black mb-1">Room Category Name</label>
                    <input
                      type="text"
                      value={room.name}
                      onChange={(e) => handleUpdateRoomField(rIdx, "name", e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none text-black"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-[10px] uppercase font-bold text-black mb-1">Guest Capacity</label>
                    <input
                      type="number"
                      value={room.capacity === 0 || room.capacity === undefined ? "" : room.capacity}
                      onChange={(e) => handleUpdateRoomField(rIdx, "capacity", e.target.value === "" ? "" : parseInt(e.target.value) || 0)}
                      className="w-[120px] bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none text-black"
                    />
                  </div>
                </div>

                {/* Bed Configuration Matrix */}
                <div className="space-y-3 pt-2 border-t border-slate-200/50">
                  <label className="block text-[10px] uppercase font-bold text-black">Bed Configuration</label>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-white p-4 rounded-xl border border-slate-200">
                    {standardBeds.map((bed) => {
                      const bedCounts = room.beds || {};
                      const isChecked = bedCounts[bed] !== undefined;
                      const count = bedCounts[bed] || 0;

                      return (
                        <div key={bed} className="flex flex-col space-y-2">
                          <label className="flex items-center space-x-2 text-xs font-semibold text-black cursor-pointer">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={(e) => handleToggleBedCheckbox(rIdx, bed, e.target.checked)}
                              className="accent-blue-600 rounded border-slate-300 border-slate-200"
                            />
                            <span>{bed}</span>
                          </label>
                          {isChecked && (
                            <div className="flex items-center space-x-2 pl-5">
                              <span className="text-[10px] text-black">Qty:</span>
                              <input
                                type="number"
                                min={1}
                                value={count === 0 || count === undefined ? "" : count}
                                onChange={(e) => handleBedCountChange(rIdx, bed, e.target.value === "" ? 0 : parseInt(e.target.value) || 0)}
                                className="w-14 bg-white border border-slate-200 rounded px-1.5 py-0.5 text-center text-xs text-black"
                              />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  <p className="text-[10px] text-black italic mt-1">Compiled Configuration: <span className="font-semibold text-black">{room.bedTypes || "None"}</span></p>
                </div>

                {/* Amenity Checklist */}
                <div className="space-y-3 pt-2 border-t border-slate-200/50">
                  <label className="block text-[10px] uppercase font-bold text-black">Room Amenities</label>
                  <div className="flex flex-wrap gap-2">
                    {standardAmenities.map((amenity) => {
                      const isChecked = (room.amenities || []).includes(amenity);
                      return (
                        <button
                          key={amenity}
                          type="button"
                          onClick={() => handleToggleRoomAmenity(rIdx, amenity)}
                          className={`px-3 py-1.5 rounded-lg border text-xs font-semibold transition ${
                            isChecked 
                              ? "bg-blue-50 border-blue-200 text-blue-700" 
                              : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50 hover:border-slate-300"
                          }`}
                        >
                          {isChecked ? "✓ " : ""}{amenity}
                        </button>
                      );
                    })}
                    {/* Add Custom Amenity Inline */}
                    {(room.amenities || []).filter((a: string) => !standardAmenities.includes(a)).map((customAmen: string) => (
                      <button
                        key={customAmen}
                        type="button"
                        onClick={() => handleToggleRoomAmenity(rIdx, customAmen)}
                        className="px-3 py-1.5 rounded-lg border text-xs font-semibold transition bg-blue-50 text-blue-700 border-blue-200"
                      >
                        ✓ {customAmen}
                      </button>
                    ))}
                  </div>

                  {/* Add Custom Amenity Field */}
                  <div className="flex items-center space-x-2 pt-1.5 max-w-sm">
                    <input
                      type="text"
                      placeholder="Add custom amenity (e.g. Jacuzzi)..."
                      value={customAmenityInputs[rIdx] || ""}
                      onChange={(e) => setCustomAmenityInputs({ ...customAmenityInputs, [rIdx]: e.target.value })}
                      className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none text-black"
                    />
                    <button
                      onClick={() => handleAddCustomAmenity(rIdx)}
                      className="px-3.5 py-2 bg-white hover:bg-slate-200 border border-slate-200 rounded-lg text-xs font-bold text-blue-600 hover:text-blue-700"
                    >
                      + Add
                    </button>
                  </div>
                </div>

              </div>
            ))}
          </div>
        )}
      </div>

      {/* 2. Property Facilities Section */}
      <div className="bg-slate-100/50 bg-white p-6 rounded-2xl border border-slate-200 space-y-6">
        <div className="border-b border-slate-200 pb-3">
          <h3 className="text-md font-bold uppercase tracking-wider">Property Facilities Checklist</h3>
          <p className="text-xs text-black mt-1">Select the active facility zones available on-site at your hotel:</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {standardFacilities.map((facName) => {
            const isChecked = facilities.some((f: any) => f.name.toLowerCase() === facName.toLowerCase());
            return (
              <label 
                key={facName} 
                onClick={() => handleToggleFacility(facName)}
                className={`flex items-center space-x-3 p-3.5 rounded-xl border transition cursor-pointer select-none ${
                  isChecked 
                    ? "bg-blue-50 text-blue-700 border-blue-200" 
                    : "bg-white text-black border-slate-200 hover:border-slate-300"
                }`}
              >
                <input
                  type="checkbox"
                  checked={isChecked}
                  readOnly
                  className="accent-blue-600 rounded border-slate-300 border-slate-200"
                />
                <span className="text-xs font-bold">{facName}</span>
              </label>
            );
          })}
        </div>

        {/* Dynamic Facility Context Questionnaire - FIX CONGESTED UI */}
        {facilities.length > 0 && (
          <div className="space-y-8 pt-6 border-t border-slate-200">
            <h4 className="text-xs font-bold text-black uppercase tracking-wider">Facility Context Questionnaires</h4>
            
            <div className="grid grid-cols-1 gap-6">
              {facilities.map((fac: any, idx: number) => {
                const isFoodZone = ["bar", "restaurant", "kitchen"].includes(fac.name.toLowerCase());
                
                return (
                  <div key={idx} className="bg-white border border-slate-200 p-6 rounded-xl space-y-5 shadow-sm">
                    <div className="flex items-center justify-between border-b border-slate-200/60 pb-3">
                      <h5 className="text-xs font-bold text-blue-700 flex items-center space-x-1.5">
                        <span className="h-2 w-2 rounded-full bg-blue-600" />
                        <span>{fac.name} Profile</span>
                      </h5>
                      <span className="text-[10px] text-black">Zone #{idx + 1}</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-3">
                        <div>
                          <label className="block text-[10px] uppercase font-bold text-black mb-1">Zone Description</label>
                          <textarea
                            rows={3}
                            value={fac.description}
                            onChange={(e) => handleUpdateFacilityDetail(fac.name, "description", e.target.value)}
                            placeholder={`e.g. Describe ${fac.name} location, rules, and dress codes...`}
                            className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-xs text-black focus:outline-none resize-none"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-[10px] uppercase font-bold text-black mb-1">Maximum Capacity</label>
                            <input
                              type="number"
                              value={fac.capacity === 0 || fac.capacity === undefined ? "" : fac.capacity}
                              onChange={(e) => handleUpdateFacilityDetail(fac.name, "capacity", e.target.value === "" ? "" : parseInt(e.target.value) || 0)}
                              placeholder="Max guests"
                              className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none text-black"
                            />
                          </div>

                          <div>
                            <label className="block text-[10px] uppercase font-bold text-black mb-1">Operating Hours</label>
                            <div className="flex items-center space-x-2 text-xs text-black mt-1">
                              <input
                                type="text"
                                value={fac.operatingHours?.open || "08:00"}
                                onChange={(e) => handleUpdateFacilityDetail(fac.name, "open", e.target.value)}
                                className="w-14 bg-white border border-slate-200 rounded px-2 py-1 text-center text-black"
                              />
                              <span>to</span>
                              <input
                                type="text"
                                value={fac.operatingHours?.close || "22:00"}
                                onChange={(e) => handleUpdateFacilityDetail(fac.name, "close", e.target.value)}
                                className="w-14 bg-white border border-slate-200 rounded px-2 py-1 text-center text-black"
                              />
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Right Column: Custom & Conditional Fields */}
                      <div className="space-y-3">
                        {isFoodZone && (
                          <div>
                            <label className="block text-[10px] uppercase font-bold text-black mb-1">Menu Items & Highlight Description</label>
                            <textarea
                              rows={3}
                              placeholder="e.g. Signature cocktails, Breakfast items, Dessert highlights..."
                              value={fac.details?.menu || ""}
                              onChange={(e) => handleUpdateFacilitySubDetail(fac.name, "menu", e.target.value)}
                              className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-xs text-black focus:outline-none resize-none"
                            />
                          </div>
                        )}

                        {fac.name.toLowerCase() === "swimming pool" && (
                          <div className="bg-white p-4 rounded-xl border border-slate-200/80 space-y-3 text-xs">
                            <label className="flex items-center space-x-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={fac.details?.isHeated || false}
                                onChange={(e) => handleUpdateFacilitySubDetail("swimming pool", "isHeated", e.target.checked)}
                                className="accent-blue-600 rounded border-slate-300 border-slate-200"
                              />
                              <span className="text-black">Is Swimming Pool Heated?</span>
                            </label>
                            <label className="flex items-center space-x-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={fac.details?.towelsProvided || false}
                                onChange={(e) => handleUpdateFacilitySubDetail("swimming pool", "towelsProvided", e.target.checked)}
                                className="accent-blue-600 rounded border-slate-300 border-slate-200"
                              />
                              <span className="text-black">Are Towels Provided?</span>
                            </label>
                          </div>
                        )}

                        {fac.name.toLowerCase() === "gym" && (
                          <div className="bg-white p-4 rounded-xl border border-slate-200/80 space-y-3 text-xs">
                            <label className="flex items-center space-x-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={fac.details?.trainerOnsite || false}
                                onChange={(e) => handleUpdateFacilitySubDetail("gym", "trainerOnsite", e.target.checked)}
                                className="accent-blue-600 rounded border-slate-300 border-slate-200"
                              />
                              <span className="text-black">Professional Trainer Onsite?</span>
                            </label>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* AI Readiness Checkpoint Panel */}
      <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 space-y-4 shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <h3 className="text-sm font-bold text-indigo-950 uppercase tracking-wider flex items-center space-x-2">
            <span>🛡️</span>
            <span>AI Checkpoint: Phase 2 Readiness</span>
          </h3>
          <div className="flex items-center space-x-3">
            <button
              onClick={runPhaseAudit}
              disabled={isAuditing}
              className="px-3 py-1 bg-white border border-slate-200 text-indigo-700 hover:text-indigo-500 text-[10px] font-bold rounded-lg transition"
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
            <p className="text-xs text-slate-800 font-medium">Phase 2 Score validates lodging room profiles, room amenities, and facility questionnaires.</p>
            <p className="text-[10px] text-slate-500 mt-1">Minimum target: 80% (Requires &gt;=1 room type, complete facility hours &amp; capacity)</p>
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
