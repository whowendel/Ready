"use client";

import { useState, useEffect } from "react";

interface Step3Props {
  data: any;
  onChange: (newData: any) => void;
  onCheckpointUpdate?: (score: number, isComplete: boolean, auditData?: any) => void;
  mode?: "choose" | "configure";
  selectedDeptName?: string;
  auditState?: any;
}

const foodImagePresets: Record<string, string> = {
  "Sandwich": "https://images.unsplash.com/photo-1567234607624-7eb631a78ccb?auto=format&fit=crop&w=120&h=80&q=80",
  "Pizza": "https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=120&h=80&q=80",
  "Salad": "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=120&h=80&q=80",
  "Burger": "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=120&h=80&q=80",
  "Pasta": "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=120&h=80&q=80",
  "Fruit Platter": "https://images.unsplash.com/photo-1519996529931-28324d5a630e?auto=format&fit=crop&w=120&h=80&q=80",
  "Coffee": "https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=120&h=80&q=80",
  "Soft Drink": "https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&w=120&h=80&q=80",
  "Dessert": "https://images.unsplash.com/photo-1587314168485-3236d6710814?auto=format&fit=crop&w=120&h=80&q=80"
};

const taskVariationsPreset: Record<string, string[]> = {
  "clean": ["Standard Clean", "Deep Clean", "Express Clean", "VIP Prep", "Checkout Clean", "Touch-up"],
  "linen": ["Bed Sheets", "Bath Towels", "Bath Robes", "Full Exchange"],
  "turndown": ["Standard Turndown", "VIP Special", "Eco-friendly Prep"],
  "trash": ["Regular Trash", "Recyclable Sorting", "Hazardous Waste"],
  "restock": ["Toiletries", "Coffee & Tea", "Mini-bar Restock", "Full Refresh"],
  "check-in": ["Standard Check-in", "VIP Priority", "Group Check-in", "Late Arrival"],
  "checkout": ["Express Checkout", "Detailed Audit", "Group Checkout"],
  "luggage": ["Room Delivery", "Storage Retrieval", "Bell Cart Transport"],
  "calls": ["Automated System", "Manual Desk Call", "VIP Personal Call"],
  "key": ["Guest Lost Key", "Staff Key Issue", "RFID tag reset"],
  "repair": ["Emergency Fix", "Preventive check", "Standard Repair", "Part Swap"],
  "light": ["Standard LED", "Chandelier Bulb", "Halogen Outdoor"],
  "plumb": ["Drain Unclog", "Leak Repair", "Fixture Install", "Pressure Check"],
  "lock": ["Battery swap", "RFID Program", "Strike Service"],
  "patrol": ["Corridor Patrol", "Parking Patrol", "Perimeter Perimeter"],
  "access": ["Visitor Log", "Staff ID Check", "Keycard Auth"],
  "incident": ["Minor damage log", "Guest complaint log", "Major Incident"],
  "washing": ["Cotton cycle", "Silk & Delicates", "Stain pre-treatment"],
  "ironing": ["Pressing", "Starch application", "Minor tailoring"],
  "dry": ["Suits & Blazers", "Dresses", "Leathers"],
  "folding": ["Standard fold", "Rolled towels", "Decorative shape"]
};

const getVariationPresets = (taskName: string): string[] => {
  const nameLower = taskName.toLowerCase();
  for (const [key, val] of Object.entries(taskVariationsPreset)) {
    if (nameLower.includes(key) || key.includes(nameLower)) {
      return val;
    }
  }
  return ["Standard", "Express", "VIP", "Detailed Check"];
};

const standardDepartments = [
  { name: "Housekeeping", desc: "Room cleaning, linen management, and aesthetic upkeep." },
  { name: "Front Desk", desc: "Check-in, checkout, guest relations, and key management." },
  { name: "Maintenance", desc: "Facilities repair, asset management, and safety checks." },
  { name: "Food & Beverage", desc: "Restaurants, bars, kitchen operations, and room service." },
  { name: "Security", desc: "Access control, patrols, and emergency assistance." },
  { name: "Laundry", desc: "Washing, drying, ironing, and distributing linens and uniforms." }
];

const predefinedTasksMap: Record<string, Array<{ name: string; description: string; rules: string }>> = {
  "housekeeping": [
    { name: "Room Deep Clean", description: "Regular deep cleaning of guest suites.", rules: "Wear gloves, use eco-friendly cleaners, complete within 35 mins." },
    { name: "Linen Exchange", description: "Delivery of fresh bedsheets and bath towels.", rules: "Verify guest occupancy, place soiled sheets in bins." },
    { name: "Turndown Service", description: "Evening bed prep and room freshening.", rules: "Perform between 6 PM and 8 PM, leave a chocolate on the pillow." },
    { name: "Trash Collection", description: "Emptying room and corridor disposal bins.", rules: "Ensure proper sorting of recyclables." },
    { name: "Restock Amenities", description: "Replenishing coffee, tea, soaps, and shampoos.", rules: "Ensure all items are neatly aligned facing forward." }
  ],
  "front desk": [
    { name: "Guest Check-in", description: "Registering arrivals and handing over keycards.", rules: "Check government IDs, verify payment card details." },
    { name: "Guest Checkout", description: "Processing checkout invoices and billing.", rules: "Inquire about guest experience, confirm keycard return." },
    { name: "Luggage Assistance", description: "Delivering guest bags to room locations.", rules: "Knock three times before entering guest rooms." },
    { name: "Wake-up Calls", description: "Phoning guest rooms at requested timings.", rules: "Always follow standard greeting protocol." },
    { name: "Key Card Replacement", description: "Issuing replacement room keys.", rules: "Confirm guests identity before programming new card." }
  ],
  "maintenance": [
    { name: "HVAC Repair", description: "Fixing air conditioning or ventilation issues.", rules: "Turn off breaker before electrical repairs, wear safety goggles." },
    { name: "Lightbulb Replacement", description: "Replacing broken or flickering lights.", rules: "Dispose of fluorescent tubes in hazard containers." },
    { name: "Plumbing Fix", description: "Clearing clogs or repairing leaky faucets.", rules: "Place dry towels around workspace, verify leaks are fully sealed." },
    { name: "Lock Maintenance", description: "Repairing electronic guestroom door locks.", rules: "Verify master lock keycard logs before disassembling." }
  ],
  "food & beverage": [
    { name: "Table Service", description: "Serving dining guests in the restaurant.", rules: "Verify allergies before dispatching food orders." },
    { name: "Bar Service", description: "Preparing drinks and serving at the bar.", rules: "Check age validation documents for guest orders." },
    { name: "Kitchen Prep", description: "Washing, cutting, and prepping ingredients.", rules: "Sanitize workspace every 2 hours, wear hairnets." },
    { name: "Room Service Delivery", description: "Delivering food orders directly to guestrooms.", rules: "Secure hot food covers, verify guest signature on bill." }
  ],
  "security": [
    { name: "Patrol Lobby", description: "Walking corridors to monitor property safety.", rules: "Keep radio communication active, wear safety vest." },
    { name: "CCTV Monitoring", description: "Checking surveillance monitor feeds.", rules: "Log any suspicious activity immediately in security database." },
    { name: "Access Log Verification", description: "Checking employee and visitor access badges.", rules: "Do not let unregistered visitors pass lobby gates after 10 PM." }
  ],
  "laundry": [
    { name: "Wash Sheets", description: "Washing hotel linens, towels, and sheets.", rules: "Keep whites and colors separate, use standard detergent volume." },
    { name: "Iron Uniforms", description: "Pressing and folding staff uniforms.", rules: "Set correct heat settings, hang pressed shirts immediately." },
    { name: "Stain Removal", description: "Treating stains on fabrics and tablecloths.", rules: "Use pre-treat solutions on stained linens before washing." }
  ]
};

export default function Step3Rooms({ data, onChange, onCheckpointUpdate, mode = "choose", selectedDeptName, auditState }: Step3Props) {
  // Checkpoint State
  const [isAuditing, setIsAuditing] = useState(false);
  const [auditScore, setAuditScore] = useState<number>(0);
  const [auditComplete, setAuditComplete] = useState(false);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [isLoadingAI, setIsLoadingAI] = useState<Record<string, boolean>>({});
  const [customTaskInputs, setCustomTaskInputs] = useState<Record<string, string>>({});
  const [activeDeptTab, setActiveDeptTab] = useState<string>("");

  useEffect(() => {
    const activeDepts = data.departments || [];
    if (activeDepts.length > 0) {
      if (!activeDepts.some((d: any) => d.name === activeDeptTab)) {
        setActiveDeptTab(activeDepts[0].name);
      }
    } else {
      setActiveDeptTab("");
    }
  }, [data.departments, activeDeptTab]);

  const isDeptValid = (d: any) => {
    if (!d) return false;
    const wc = Number(d.workerCount) || 0;
    const hasShifts = Array.isArray(d.shifts) && d.shifts.length > 0;
    const hasTasks = Array.isArray(d.tasks) && d.tasks.length > 0;
    return d.name?.trim().length > 0 && wc > 0 && hasShifts && hasTasks;
  };

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

  // Trigger phase audit on mount and dependencies change (only if no cached auditState)
  useEffect(() => {
    if (!auditState) {
      runPhaseAudit();
    }
  }, [data.departments, selectedDeptName, mode, auditState]);

  const runPhaseAudit = async () => {
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

    if (mode === "choose") {
      const hasDepts = (data.departments || []).length > 0;
      setAuditScore(hasDepts ? 100 : 0);
      setAuditComplete(hasDepts);
      setWarnings([]);
      if (onCheckpointUpdate) {
        onCheckpointUpdate(hasDepts ? 100 : 0, hasDepts, {
          warnings: [],
          followUpQuestions: [],
          templates: []
        });
      }
      return;
    }

    if (mode === "configure" && selectedDeptName) {
      const dept = (data.departments || []).find((d: any) => d.name.toLowerCase() === selectedDeptName.toLowerCase());
      const valid = isDeptValid(dept);
      setAuditScore(valid ? 100 : 0);
      setAuditComplete(valid);
      
      const missing = [];
      if (!dept) {
        missing.push("Department data not initialized.");
      } else {
        if (!dept.workerCount) missing.push("No active positions configured. Headcount must be greater than 0.");
        if ((dept.shifts || []).length === 0) missing.push("No shift rosters configured. Add at least one shift.");
        if ((dept.tasks || []).length === 0) missing.push("No tasks selected or custom tasks added.");
      }
      setWarnings(missing);

      if (onCheckpointUpdate) {
        onCheckpointUpdate(valid ? 100 : 0, valid, {
          warnings: missing,
          followUpQuestions: [],
          templates: []
        });
      }
      return;
    }

    setIsAuditing(true);
    try {
      const res = await fetch("/api/onboarding/readiness", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phase: 3 }),
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

  const handleToggleDepartment = (deptName: string, deptDesc: string) => {
    const currentDepts = data.departments || [];
    const exists = currentDepts.some((d: any) => d.name.toLowerCase() === deptName.toLowerCase());

    if (exists) {
      const filteredDepts = currentDepts.filter((d: any) => d.name.toLowerCase() !== deptName.toLowerCase());
      onChange({ ...data, departments: filteredDepts });
    } else {
      // Setup default positions
      let defaultPositions: Array<{ name: string; count: number }> = [];
      const dName = deptName.toLowerCase();
      if (dName === "housekeeping") {
        defaultPositions = [{ name: "Room Attendant", count: 12 }, { name: "Supervisor", count: 2 }, { name: "Runner", count: 2 }];
      } else if (dName === "front desk" || dName === "front office") {
        defaultPositions = [{ name: "Receptionist", count: 4 }, { name: "Bellhop", count: 2 }, { name: "Concierge", count: 1 }];
      } else if (dName === "maintenance") {
        defaultPositions = [{ name: "Technician", count: 3 }, { name: "Electrician", count: 1 }, { name: "Plumber", count: 1 }];
      } else if (dName === "food & beverage" || dName === "food and beverage") {
        defaultPositions = [{ name: "Waiter/Server", count: 5 }, { name: "Chef/Cook", count: 3 }, { name: "Bartender", count: 2 }];
      } else if (dName === "security") {
        defaultPositions = [{ name: "Guard", count: 4 }, { name: "Supervisor", count: 1 }];
      } else if (dName === "laundry") {
        defaultPositions = [{ name: "Laundry Attendant", count: 4 }];
      } else {
        defaultPositions = [{ name: "Staff Member", count: 5 }];
      }

      // Default F&B menu
      let menu: Array<{ name: string; prepTime: number; price: string; imageType?: string; image?: string; allergens?: string }> = [];
      if (dName === "food & beverage" || dName === "food and beverage") {
        menu = [
          { name: "Club Sandwich", prepTime: 15, price: "320.00", imageType: "Sandwich", image: foodImagePresets["Sandwich"], allergens: "Gluten, Dairy" },
          { name: "Margherita Pizza", prepTime: 20, price: "450.00", imageType: "Pizza", image: foodImagePresets["Pizza"], allergens: "Gluten, Dairy" },
          { name: "Fresh Fruit Platter", prepTime: 10, price: "250.00", imageType: "Fruit Platter", image: foodImagePresets["Fruit Platter"], allergens: "" }
        ];
      }

      // Default Laundry variations
      let laundryVariations: Array<{ clothType: string; prepTime: number }> = [];
      if (dName === "laundry") {
        laundryVariations = [
          { clothType: "Bed Sheets & Linens", prepTime: 90 },
          { clothType: "Bath Towels", prepTime: 60 },
          { clothType: "Guest Suits / Dry Clean", prepTime: 180 },
          { clothType: "Uniforms", prepTime: 120 }
        ];
      }

      const added = [...currentDepts, {
        name: deptName,
        description: deptDesc,
        workerCount: defaultPositions.reduce((acc, p) => acc + p.count, 0),
        positions: defaultPositions,
        menu: menu.length > 0 ? menu : undefined,
        laundryVariations: laundryVariations.length > 0 ? laundryVariations : undefined,
        shifts: [
          { name: "Day Shift", open: "06:00", close: "14:00" },
          { name: "Night Shift", open: "14:00", close: "22:00" }
        ],
        tasks: [] // Holds standard tasks + custom tasks
      }];
      onChange({ ...data, departments: added });
    }
  };

  const handleUpdateDeptFields = (deptName: string, fields: Record<string, any>) => {
    const updated = (data.departments || []).map((d: any) => {
      if (d.name.toLowerCase() === deptName.toLowerCase()) {
        return { ...d, ...fields };
      }
      return d;
    });
    onChange({ ...data, departments: updated });
  };

  const handleUpdateDeptField = (deptName: string, field: string, val: any) => {
    handleUpdateDeptFields(deptName, { [field]: val });
  };

  // Shifts
  const handleAddShift = (deptName: string) => {
    const dept = (data.departments || []).find((d: any) => d.name.toLowerCase() === deptName.toLowerCase());
    if (!dept) return;

    const currentShifts = dept.shifts || [];
    const newShift = { name: `Shift ${currentShifts.length + 1}`, open: "08:00", close: "16:00" };
    handleUpdateDeptField(deptName, "shifts", [...currentShifts, newShift]);
  };

  const handleRemoveShift = (deptName: string, shiftIndex: number) => {
    const dept = (data.departments || []).find((d: any) => d.name.toLowerCase() === deptName.toLowerCase());
    if (!dept) return;

    const currentShifts = [...(dept.shifts || [])];
    currentShifts.splice(shiftIndex, 1);
    handleUpdateDeptField(deptName, "shifts", currentShifts);
  };

  const handleUpdateShiftField = (deptName: string, shiftIndex: number, field: string, val: string) => {
    const dept = (data.departments || []).find((d: any) => d.name.toLowerCase() === deptName.toLowerCase());
    if (!dept) return;

    const currentShifts = [...(dept.shifts || [])];
    currentShifts[shiftIndex] = { ...currentShifts[shiftIndex], [field]: val };
    handleUpdateDeptField(deptName, "shifts", currentShifts);
  };

  // Predefined Tasks Toggle
  const updateDeptTasksAndSync = (deptName: string, updatedTasks: any[]) => {
    const updatedDepartments = (data.departments || []).map((d: any) => {
      if (d.name.toLowerCase() === deptName.toLowerCase()) {
        return { ...d, tasks: updatedTasks };
      }
      return d;
    });

    const currentServices = data.services || [];
    const filteredServices = currentServices.filter((s: any) => s.department.toLowerCase() !== deptName.toLowerCase());
    const services = updatedTasks.map((t: any) => ({
      name: t.name,
      description: t.description,
      rules: t.rules || "",
      workersNeeded: t.workersNeeded || 1,
      duration: t.duration || 30,
      variations: t.variations || ""
    }));

    onChange({
      ...data,
      departments: updatedDepartments,
      services: [...filteredServices, { department: deptName, services }]
    });
  };

  const handleTogglePredefinedTask = (deptName: string, taskObj: any, isChecked: boolean) => {
    const dept = (data.departments || []).find((d: any) => d.name.toLowerCase() === deptName.toLowerCase());
    if (!dept) return;

    const currentTasks = dept.tasks || [];
    let updated;
    if (isChecked) {
      updated = [...currentTasks, { 
        ...taskObj, 
        workersNeeded: 1, 
        duration: 30, 
        variations: "" 
      }];
    } else {
      updated = currentTasks.filter((t: any) => t.name.toLowerCase() !== taskObj.name.toLowerCase());
    }

    updateDeptTasksAndSync(deptName, updated);
  };

  const handleAddCustomTask = (deptName: string) => {
    const text = customTaskInputs[deptName]?.trim();
    if (!text) return;

    const dept = (data.departments || []).find((d: any) => d.name.toLowerCase() === deptName.toLowerCase());
    if (!dept) return;

    const currentTasks = dept.tasks || [];
    if (!currentTasks.some((t: any) => t.name.toLowerCase() === text.toLowerCase())) {
      const updated = [...currentTasks, { 
        name: text, 
        description: "Custom task.", 
        rules: "Follow manager SOP instructions.",
        workersNeeded: 1,
        duration: 30,
        variations: ""
      }];
      updateDeptTasksAndSync(deptName, updated);
    }
    setCustomTaskInputs({ ...customTaskInputs, [deptName]: "" });
  };

  const handleRemoveTask = (deptName: string, taskName: string) => {
    const dept = (data.departments || []).find((d: any) => d.name.toLowerCase() === deptName.toLowerCase());
    if (!dept) return;

    const currentTasks = dept.tasks || [];
    const updated = currentTasks.filter((t: any) => t.name.toLowerCase() !== taskName.toLowerCase());
    updateDeptTasksAndSync(deptName, updated);
  };

  const handleUpdateTaskDetailField = (deptName: string, taskName: string, field: string, value: any) => {
    const dept = (data.departments || []).find((d: any) => d.name.toLowerCase() === deptName.toLowerCase());
    if (!dept) return;

    const currentTasks = (dept.tasks || []).map((t: any) => 
      t.name.toLowerCase() === taskName.toLowerCase() ? { ...t, [field]: value } : t
    );
    updateDeptTasksAndSync(deptName, currentTasks);
  };

  // Tailored AI Discover Tasks
  const handleFetchAIDiscovery = async (deptName: string) => {
    setIsLoadingAI((prev) => ({ ...prev, [deptName]: true }));
    try {
      const res = await fetch("/api/onboarding/recommendations", {
        method: "POST",
      });
      if (res.ok) {
        const resData = await res.json();
        const recommendedForDept = resData.recommendations?.find(
          (r: any) => r.department.toLowerCase() === deptName.toLowerCase()
        )?.services || [];

        const dept = (data.departments || []).find((d: any) => d.name.toLowerCase() === deptName.toLowerCase());
        if (!dept) return;

        const currentTasks = [...(dept.tasks || [])];
        recommendedForDept.forEach((rSvc: any) => {
          if (!currentTasks.some((t: any) => t.name.toLowerCase() === rSvc.name.toLowerCase())) {
            currentTasks.push({
              name: rSvc.name,
              description: rSvc.description,
              rules: rSvc.rules || "Follow standard hotel timing regulations."
            });
          }
        });

        updateDeptTasksAndSync(deptName, currentTasks);
        alert(`AI Recommended ${recommendedForDept.length} tailored tasks based on your Facilities configuration!`);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingAI((prev) => ({ ...prev, [deptName]: false }));
    }
  };

  const activeDepartments = data.departments || [];

  if (mode === "choose") {
    return (
      <div className="space-y-8 animate-fade-in text-black">
        <div className="border-b border-slate-200 pb-4">
          <h2 className="text-xl font-bold mb-1">Phase 3: Operational Departments</h2>
          <p className="text-sm text-slate-500 font-medium">Select the active operational divisions running in your hotel property.</p>
        </div>

        {/* Departments Checklist */}
        <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 space-y-4 shadow-sm">
          <h3 className="text-md font-bold uppercase tracking-wider border-b border-slate-200 pb-2 text-indigo-950">Operational Departments Checklist</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {standardDepartments.map((dItem) => {
              const isChecked = (data.departments || []).some((d: any) => d.name.toLowerCase() === dItem.name.toLowerCase());
              return (
                <div
                  key={dItem.name}
                  onClick={() => handleToggleDepartment(dItem.name, dItem.desc)}
                  className={`flex items-start space-x-3.5 p-4 rounded-xl border transition cursor-pointer select-none ${
                    isChecked 
                      ? "bg-blue-50 border-blue-200 text-blue-900 shadow-sm" 
                      : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50 hover:border-slate-300"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => {}}
                    className="accent-blue-600 rounded border-slate-300 mt-1"
                  />
                  <div>
                    <p className="text-xs font-bold text-black">{dItem.name}</p>
                    <p className="text-[10px] text-slate-500 mt-0.5 leading-snug">{dItem.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Local Checklist Audit Panel */}
        <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 space-y-4 shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-200/60 pb-3">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Department Selection Audit</h3>
            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
              auditComplete ? "bg-emerald-100 text-emerald-700 border border-emerald-250" : "bg-amber-100 text-amber-700 border border-amber-200"
            }`}>
              {auditComplete ? "PASSED" : "PENDING"}
            </span>
          </div>
          <p className="text-xs text-slate-600 font-medium">Select at least one department above to proceed to operational workspaces setup.</p>
        </div>
      </div>
    );
  }

  // mode === "configure"
  const dept = (data.departments || []).find((d: any) => d.name.toLowerCase() === (selectedDeptName || "").toLowerCase());
  if (!dept) {
    return (
      <div className="p-8 text-center text-xs text-slate-500 italic bg-white border border-slate-200 rounded-2xl">
        Department "{selectedDeptName}" is not selected. Go back to Phase 3 to select it.
      </div>
    );
  }
  const deptKey = dept.name.toLowerCase();
  const predefined = predefinedTasksMap[deptKey] || [];
  const selectedTasks = dept.tasks || [];

  return (
    <div className="space-y-8 animate-fade-in text-black">
      <div className="border-b border-slate-200 pb-4">
        <div className="flex items-center space-x-3">
          <span className="text-2xl">⚙️</span>
          <div>
            <h2 className="text-xl font-bold mb-1">{dept.name} Workspace</h2>
            <p className="text-sm text-slate-500 font-medium">Establish roles, shifts, and task checklists for {dept.name} operations.</p>
          </div>
        </div>
      </div>

      {/* CARD 1: Workforce Positions & Headcounts */}
      <div className="bg-white p-8 rounded-2xl border border-slate-200 space-y-6 shadow-sm">
        <div className="flex justify-between items-center border-b border-slate-100 pb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center space-x-2">
              <span>👥</span>
              <span>Workforce Positions & Headcounts</span>
            </h3>
            <p className="text-xs text-slate-500 mt-1">Define the specific job roles and planned staffing levels for this division.</p>
          </div>
          <button
            type="button"
            onClick={() => {
              const currentPositions = dept.positions || [{ name: "Staff", count: dept.workerCount || 5 }];
              const updated = [...currentPositions, { name: "New Position", count: 1 }];
              const newTotal = updated.reduce((acc: number, p: any) => acc + (parseInt(p.count) || 0), 0);
              handleUpdateDeptFields(dept.name, {
                positions: updated,
                workerCount: newTotal
              });
            }}
            className="px-4 py-2 bg-blue-50 border border-blue-200 hover:bg-blue-100 text-blue-600 text-xs font-bold rounded-xl shadow-sm transition"
          >
            ➕ Add Position
          </button>
        </div>

        <div className="space-y-3 bg-slate-50 p-5 border border-slate-200 rounded-xl">
          {((dept.positions && dept.positions.length > 0) ? dept.positions : [{ name: "Staff", count: dept.workerCount || 5 }]).map((pos: any, pIdx: number) => (
            <div key={pIdx} className="flex items-center space-x-3">
              <input
                type="text"
                value={pos.name}
                onChange={(e) => {
                  const currentPositions = dept.positions || [{ name: "Staff", count: dept.workerCount || 5 }];
                  const updated = [...currentPositions];
                  updated[pIdx] = { ...updated[pIdx], name: e.target.value };
                  handleUpdateDeptField(dept.name, "positions", updated);
                }}
                placeholder="Position Name (e.g. Room Attendant)"
                className="flex-1 bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-black focus:outline-none"
              />
              <input
                type="number"
                min={0}
                value={pos.count === 0 && pos.count !== "" ? "" : pos.count}
                onChange={(e) => {
                  const val = e.target.value;
                  const countVal = val === "" ? "" : parseInt(val) || 0;
                  const currentPositions = dept.positions || [{ name: "Staff", count: dept.workerCount || 5 }];
                  const updated = [...currentPositions];
                  updated[pIdx] = { ...updated[pIdx], count: countVal };
                  const newTotal = updated.reduce((acc: number, p: any) => acc + (parseInt(p.count) || 0), 0);
                  handleUpdateDeptFields(dept.name, {
                    positions: updated,
                    workerCount: newTotal
                  });
                }}
                placeholder="Qty"
                className="w-24 bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-black text-center focus:outline-none"
              />
              <button
                type="button"
                onClick={() => {
                  const currentPositions = dept.positions || [{ name: "Staff", count: dept.workerCount || 5 }];
                  const updated = [...currentPositions];
                  updated.splice(pIdx, 1);
                  const newTotal = updated.reduce((acc: number, p: any) => acc + (parseInt(p.count) || 0), 0);
                  handleUpdateDeptFields(dept.name, {
                    positions: updated,
                    workerCount: newTotal
                  });
                }}
                className="text-slate-400 hover:text-rose-500 text-sm p-1 ml-1"
              >
                🗑️
              </button>
            </div>
          ))}
          <div className="pt-4 border-t border-slate-200 flex justify-between items-center text-xs font-bold text-slate-800">
            <span>Total Calculated Headcount:</span>
            <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full">{dept.workerCount || 0} active workers</span>
          </div>
        </div>
      </div>

      {/* CARD 2: Operating Shifts & Rosters */}
      <div className="bg-white p-8 rounded-2xl border border-slate-200 space-y-6 shadow-sm">
        <div className="flex justify-between items-center border-b border-slate-100 pb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center space-x-2">
              <span>🕒</span>
              <span>Operating Shifts & Rosters</span>
            </h3>
            <p className="text-xs text-slate-500 mt-1">Set the operating hours and shifts during which staff are active.</p>
          </div>
          <button
            onClick={() => handleAddShift(dept.name)}
            className="px-4 py-2 bg-blue-50 border border-blue-200 hover:bg-blue-100 text-blue-600 text-xs font-bold rounded-xl shadow-sm transition"
          >
            ➕ Add Shift
          </button>
        </div>

        <div className="space-y-3 bg-slate-50 p-5 border border-slate-200 rounded-xl">
          {(dept.shifts || []).length === 0 ? (
            <p className="text-xs text-slate-450 italic py-2">No shifts configured. Add a shift roster.</p>
          ) : (
            (dept.shifts || []).map((shift: any, sIdx: number) => (
              <div key={sIdx} className="flex items-center space-x-3 bg-white border border-slate-200 rounded-xl p-3.5 shadow-sm">
                <input
                  type="text"
                  value={shift.name}
                  onChange={(e) => handleUpdateShiftField(dept.name, sIdx, "name", e.target.value)}
                  placeholder="Shift Name"
                  className="flex-1 bg-transparent text-xs font-bold text-black focus:outline-none"
                />
                <div className="flex items-center space-x-2 text-xs text-slate-700">
                  <input
                    type="time"
                    value={shift.open}
                    onChange={(e) => handleUpdateShiftField(dept.name, sIdx, "open", e.target.value)}
                    className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-black"
                  />
                  <span>to</span>
                  <input
                    type="time"
                    value={shift.close}
                    onChange={(e) => handleUpdateShiftField(dept.name, sIdx, "close", e.target.value)}
                    className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-black"
                  />
                </div>
                <button
                  onClick={() => handleRemoveShift(dept.name, sIdx)}
                  className="text-slate-400 hover:text-rose-500 text-sm p-1 ml-2"
                >
                  🗑️
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* CARD 3: Operational Tasks Checklist & SOPs */}
      <div className="bg-white p-8 rounded-2xl border border-slate-200 space-y-6 shadow-sm">
        <div className="flex justify-between items-center border-b border-slate-100 pb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center space-x-2">
              <span>📋</span>
              <span>Operational Tasks & SOPs</span>
            </h3>
            <p className="text-xs text-slate-500 mt-1">Select standard operational tasks, define service level agreements (SLAs), and write SOP guidelines.</p>
          </div>
          <button
            onClick={() => handleFetchAIDiscovery(dept.name)}
            disabled={isLoadingAI[dept.name]}
            className="px-4 py-2 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 text-indigo-700 text-xs font-bold rounded-xl shadow-sm transition flex items-center space-x-1.5 disabled:opacity-50"
          >
            <span>🤖</span>
            <span>{isLoadingAI[dept.name] ? "Tailoring..." : "Tailored AI Discovery"}</span>
          </button>
        </div>

        {predefined.length > 0 && (
          <div className="bg-slate-50 p-5 border border-slate-200 rounded-xl space-y-3">
            <span className="block text-[10px] uppercase font-bold text-slate-805 tracking-wider">Predefined Tasks Directory</span>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {predefined.map((pTask) => {
                const isChecked = selectedTasks.some((t: any) => t.name.toLowerCase() === pTask.name.toLowerCase());
                return (
                  <div 
                    key={pTask.name}
                    onClick={() => handleTogglePredefinedTask(dept.name, pTask, !isChecked)}
                    className={`flex items-start space-x-2.5 text-xs text-slate-850 cursor-pointer p-2.5 rounded-xl border transition ${
                      isChecked 
                        ? "bg-indigo-50/70 border-indigo-200 font-semibold text-indigo-900" 
                        : "bg-white border-slate-200 hover:bg-slate-55 hover:border-slate-350"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => {}}
                      className="accent-indigo-600 rounded border-slate-305 mt-0.5"
                    />
                    <span>{pTask.name}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Add Custom Task field */}
        <div className="space-y-2">
          <label className="block text-[10px] uppercase font-bold text-slate-850 tracking-wider">Add Custom Operational Task</label>
          <div className="flex items-center space-x-3">
            <input
              type="text"
              placeholder="e.g. Pool Towel patrol, VIP Welcome greeting..."
              value={customTaskInputs[dept.name] || ""}
              onChange={(e) => setCustomTaskInputs({ ...customTaskInputs, [dept.name]: e.target.value })}
              className="flex-1 bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs focus:outline-none text-black"
            />
            <button
              onClick={() => handleAddCustomTask(dept.name)}
              className="px-5 py-2.5 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-indigo-750 shadow-sm transition"
            >
              ➕ Add Task
            </button>
          </div>
        </div>

        {/* Configured Tasks List with Details, Rules & SOPs */}
        <div className="space-y-4 pt-4 border-t border-slate-105">
          <span className="block text-[10px] uppercase font-bold text-slate-850 tracking-wider">Active Tasks Specifications ({selectedTasks.length})</span>
          {selectedTasks.length === 0 ? (
            <p className="text-xs text-slate-450 italic py-4 bg-slate-55 rounded-xl text-center border border-dashed border-slate-200">No tasks selected yet. Choose from the directory or create a custom task.</p>
          ) : (
            <div className="space-y-4">
              {selectedTasks.map((task: any, tIdx: number) => (
                <div key={tIdx} className="bg-white border border-slate-200 p-6 rounded-2xl space-y-4 relative group shadow-sm">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveTask(dept.name, task.name);
                    }}
                    className="absolute top-6 right-6 text-slate-400 hover:text-rose-500 text-xs font-bold transition"
                  >
                    🗑️ Remove
                  </button>
                  <div className="w-[85%]">
                    <p className="text-xs font-bold text-black">{task.name}</p>
                    <p className="text-[10px] text-slate-500 mt-1">{task.description}</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 border-t border-slate-100">
                    <div>
                      <label className="block text-[9px] uppercase font-bold text-slate-700 mb-1">Workers Required</label>
                      <input
                        type="number"
                        min={1}
                        value={task.workersNeeded === 0 || task.workersNeeded === undefined ? "" : task.workersNeeded}
                        onChange={(e) => handleUpdateTaskDetailField(dept.name, task.name, "workersNeeded", e.target.value === "" ? "" : parseInt(e.target.value) || 0)}
                        placeholder="Staff count"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-xs text-black focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] uppercase font-bold text-slate-700 mb-1">Standard Duration (Minutes)</label>
                      <input
                        type="number"
                        min={1}
                        value={task.duration === 0 || task.duration === undefined ? "" : task.duration}
                        onChange={(e) => handleUpdateTaskDetailField(dept.name, task.name, "duration", e.target.value === "" ? "" : parseInt(e.target.value) || 0)}
                        placeholder="Target minutes"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-xs text-black focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-[9px] uppercase font-bold text-slate-705">Task Variations (Select options or type custom)</label>
                    <div className="flex flex-wrap gap-1.5 bg-slate-50 p-3 border border-slate-200 rounded-xl">
                      {getVariationPresets(task.name).map((vOpt) => {
                        const selectedList = (task.variations || "").split(",").map((s: string) => s.trim()).filter(Boolean);
                        const isSelected = selectedList.includes(vOpt);
                        return (
                          <button
                            key={vOpt}
                            type="button"
                            onClick={() => {
                              let newList;
                              if (isSelected) {
                                newList = selectedList.filter((x: string) => x !== vOpt);
                              } else {
                                newList = [...selectedList, vOpt];
                              }
                              handleUpdateTaskDetailField(dept.name, task.name, "variations", newList.join(", "));
                            }}
                            className={`px-3 py-1 rounded-lg text-[10px] border font-bold transition ${
                              isSelected
                                ? "bg-indigo-55 border-indigo-200 text-indigo-700 shadow-sm"
                                : "bg-white border-slate-200 text-slate-650 hover:bg-slate-100"
                            }`}
                          >
                            {isSelected ? "✓ " : ""}{vOpt}
                          </button>
                        );
                      })}
                    </div>
                    <input
                      type="text"
                      value={task.variations || ""}
                      onChange={(e) => handleUpdateTaskDetailField(dept.name, task.name, "variations", e.target.value)}
                      placeholder="Or type custom variations (comma separated)..."
                      className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-xs text-black focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[9px] uppercase font-bold text-indigo-700 font-bold">Standard Operating Procedures (SOPs)</label>
                    <textarea
                      rows={2.5}
                      value={task.rules || ""}
                      onChange={(e) => handleUpdateTaskDetailField(dept.name, task.name, "rules", e.target.value)}
                      placeholder="Specify safety gear, step-by-step checklists, or validation criteria..."
                      className="w-full bg-white border border-slate-200 rounded-xl p-3.5 text-xs text-black focus:outline-none resize-none"
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* CARD 4: Food & Beverage specific Restaurant Menu Config */}
      {deptKey === "food & beverage" && (
        <div className="bg-white p-8 rounded-2xl border border-slate-200 space-y-6 shadow-sm">
          <div className="flex justify-between items-center border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center space-x-2">
                <span>🍽️</span>
                <span>Food & Beverage Menu Directory</span>
              </h3>
              <p className="text-xs text-slate-500 mt-1">Configure restaurant and room service items, pricing, prep times, and allergy warnings.</p>
            </div>
            <button
              type="button"
              onClick={() => {
                const currentMenu = dept.menu || [];
                const updated = [...currentMenu, { name: "New Menu Item", prepTime: 15, price: "300.00", imageType: "Sandwich", image: foodImagePresets["Sandwich"], allergens: "" }];
                handleUpdateDeptField(dept.name, "menu", updated);
              }}
              className="px-4 py-2 bg-blue-50 border border-blue-200 hover:bg-blue-100 text-blue-600 text-xs font-bold rounded-xl shadow-sm transition"
            >
              ➕ Add Menu Item
            </button>
          </div>

          <div className="space-y-4">
            {(dept.menu || []).map((item: any, mIdx: number) => (
              <div key={mIdx} className="bg-slate-50 border border-slate-200 p-6 rounded-2xl space-y-4 relative shadow-sm">
                <button
                  type="button"
                  onClick={() => {
                    const updated = [...(dept.menu || [])];
                    updated.splice(mIdx, 1);
                    handleUpdateDeptField(dept.name, "menu", updated);
                  }}
                  className="absolute top-6 right-6 text-slate-400 hover:text-rose-500 text-xs font-bold"
                >
                  🗑️ Delete Item
                </button>
                
                <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-4 sm:space-y-0 sm:space-x-4">
                  {/* Food Thumbnail Image */}
                  <div className="w-20 h-20 rounded-xl overflow-hidden border border-slate-250 bg-slate-100 flex items-center justify-center flex-shrink-0 shadow-inner">
                    {item.image ? (
                      <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-2xl">🍔</span>
                    )}
                  </div>
                  
                  <div className="flex-1 space-y-2 w-full">
                    <input
                      type="text"
                      value={item.name}
                      onChange={(e) => {
                        const updated = [...(dept.menu || [])];
                        updated[mIdx] = { ...updated[mIdx], name: e.target.value };
                        handleUpdateDeptField(dept.name, "menu", updated);
                      }}
                      placeholder="Menu Item Name"
                      className="w-full bg-transparent border-b border-slate-200 focus:border-indigo-500 text-sm font-bold text-black focus:outline-none pb-1"
                    />

                    {/* Food Image File Uploader */}
                    <div className="flex items-center space-x-2 text-[10px]">
                      <label className="bg-indigo-50 border border-indigo-200 text-indigo-700 px-3 py-1 rounded-lg cursor-pointer hover:bg-indigo-100 font-bold transition">
                        <span>Upload Image File</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const reader = new FileReader();
                              reader.onloadend = () => {
                                const updated = [...(dept.menu || [])];
                                updated[mIdx] = { 
                                  ...updated[mIdx], 
                                  image: reader.result as string 
                                };
                                handleUpdateDeptField(dept.name, "menu", updated);
                              };
                              reader.readAsDataURL(file);
                            }
                          }}
                        />
                      </label>
                      {item.image && (
                        <button
                          type="button"
                          onClick={() => {
                            const updated = [...(dept.menu || [])];
                            updated[mIdx] = { ...updated[mIdx], image: "" };
                            handleUpdateDeptField(dept.name, "menu", updated);
                          }}
                          className="text-rose-500 font-bold px-2 py-1"
                        >
                          Clear Image
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-slate-200/50">
                  <div className="flex items-center space-x-2 text-xs text-slate-800">
                    <span className="w-24">Prep Time:</span>
                    <input
                      type="number"
                      value={item.prepTime === 0 && item.prepTime !== "" ? "" : item.prepTime}
                      onChange={(e) => {
                        const val = e.target.value;
                        const updated = [...(dept.menu || [])];
                        updated[mIdx] = { ...updated[mIdx], prepTime: val === "" ? "" : parseInt(val) || 0 };
                        handleUpdateDeptField(dept.name, "menu", updated);
                      }}
                      placeholder="Mins"
                      className="w-20 bg-white border border-slate-200 rounded-lg text-center px-3 py-1.5 text-xs text-black focus:outline-none"
                    />
                    <span>minutes</span>
                  </div>
                  <div className="flex items-center space-x-2 text-xs text-slate-800">
                    <span className="w-24">Price (₱):</span>
                    <input
                      type="text"
                      value={item.price}
                      onChange={(e) => {
                        const updated = [...(dept.menu || [])];
                        updated[mIdx] = { ...updated[mIdx], price: e.target.value };
                        handleUpdateDeptField(dept.name, "menu", updated);
                      }}
                      placeholder="PHP"
                      className="w-28 bg-white border border-slate-200 rounded-lg text-center px-3 py-1.5 text-xs text-black focus:outline-none font-bold"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="block text-[9px] uppercase font-bold text-amber-800">Food Allergens Warning</label>
                  <input
                    type="text"
                    value={item.allergens || ""}
                    onChange={(e) => {
                      const updated = [...(dept.menu || [])];
                      updated[mIdx] = { ...updated[mIdx], allergens: e.target.value };
                      handleUpdateDeptField(dept.name, "menu", updated);
                    }}
                    placeholder="e.g. Peanuts, Milk, Egg, Soy, Gluten (Leave empty if none)"
                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-black focus:outline-none"
                  />
                </div>

                {item.allergens && (
                  <div className="bg-amber-50 border border-amber-200 p-3 rounded-xl text-amber-900 text-xs font-bold flex items-center space-x-1.5 shadow-sm">
                    <span>⚠️ Allergy Alert:</span>
                    <span className="font-semibold">{item.allergens}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* CARD 5: Laundry specific Fabric Processing Config */}
      {deptKey === "laundry" && (
        <div className="bg-white p-8 rounded-2xl border border-slate-200 space-y-6 shadow-sm">
          <div className="flex justify-between items-center border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center space-x-2">
                <span>🧺</span>
                <span>Linens & Fabric Processing Times</span>
              </h3>
              <p className="text-xs text-slate-500 mt-1">Define processing timelines for various hotel textiles and guest laundry service orders.</p>
            </div>
            <button
              type="button"
              onClick={() => {
                const currentVars = dept.laundryVariations || [];
                const updated = [...currentVars, { clothType: "New Cloth Type", prepTime: 60 }];
                handleUpdateDeptField(dept.name, "laundryVariations", updated);
              }}
              className="px-4 py-2 bg-blue-50 border border-blue-200 hover:bg-blue-100 text-blue-600 text-xs font-bold rounded-xl shadow-sm transition"
            >
              ➕ Add Cloth Type
            </button>
          </div>

          <div className="space-y-4">
            {(dept.laundryVariations || []).map((v: any, vIdx: number) => (
              <div key={vIdx} className="bg-slate-50 border border-slate-200 p-6 rounded-2xl space-y-3 relative shadow-sm">
                <button
                  type="button"
                  onClick={() => {
                    const updated = [...(dept.laundryVariations || [])];
                    updated.splice(vIdx, 1);
                    handleUpdateDeptField(dept.name, "laundryVariations", updated);
                  }}
                  className="absolute top-6 right-6 text-slate-400 hover:text-rose-500 text-xs font-bold"
                >
                  🗑/ Delete
                </button>
                <div className="space-y-3">
                  <input
                    type="text"
                    value={v.clothType}
                    onChange={(e) => {
                      const updated = [...(dept.laundryVariations || [])];
                      updated[vIdx] = { ...updated[vIdx], clothType: e.target.value };
                      handleUpdateDeptField(dept.name, "laundryVariations", updated);
                    }}
                    placeholder="Cloth/Fabric Type (e.g. Guest Linens)"
                    className="w-full bg-transparent border-b border-slate-200 focus:border-indigo-500 text-xs font-bold text-black focus:outline-none pb-1"
                  />
                  <div className="flex items-center space-x-2 text-xs text-slate-705 pt-1">
                    <span>Est. Processing Duration:</span>
                    <input
                      type="number"
                      value={v.prepTime === 0 && v.prepTime !== "" ? "" : v.prepTime}
                      onChange={(e) => {
                        const val = e.target.value;
                        const updated = [...(dept.laundryVariations || [])];
                        updated[vIdx] = { ...updated[vIdx], prepTime: val === "" ? "" : parseInt(val) || 0 };
                        handleUpdateDeptField(dept.name, "laundryVariations", updated);
                      }}
                      placeholder="Mins"
                      className="w-16 bg-white border border-slate-200 rounded-lg text-center px-3 py-1.5 text-xs text-black focus:outline-none"
                    />
                    <span>minutes</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* AI Readiness Checkpoint Panel */}
      <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 space-y-4 shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <h3 className="text-sm font-bold text-indigo-950 uppercase tracking-wider flex items-center space-x-2">
            <span>🛡️</span>
            <span>AI Checkpoint: {dept.name} Setup Readiness</span>
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
            <p className="text-xs text-slate-800 font-medium">Verify staff roles, shift rosters, and task allocations for {dept.name} operations.</p>
            <p className="text-[10px] text-slate-500 mt-1">Status: {auditComplete ? "Complete" : "Incomplete (requires worker count >0, shift roster, and tasks selected)"}</p>
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
