"use client";

import { useEffect, useState } from "react";
import Step1Departments from "./components/Step1Departments";
import Step2Hierarchy from "./components/Step2Hierarchy";
import Step3Staff from "./components/Step3Staff";
import Step4Permissions from "./components/Step4Permissions";
import Step5Validation from "./components/Step5Validation";

const phase2Steps = [
  { id: 1, name: "Step 1: Department Shifts", desc: "Shift rosters and review" },
  { id: 2, name: "Step 2: Role Hierarchies", desc: "Reporting structures chart" },
  { id: 3, name: "Step 3: Staff Directory", desc: "Employee list and CSV parser" },
  { id: 4, name: "Step 4: Access Permissions", desc: "Role permission matrix" },
  { id: 5, name: "Step 5: Activate Launch", desc: "Workforce validation audits" }
];

export default function Phase2OnboardingChassis() {
  const [activeStep, setActiveStep] = useState<number>(1);
  const [hotelId, setHotelId] = useState<number>(0);
  const [isStepComplete, setIsStepComplete] = useState<boolean>(false);
  const [theme, setTheme] = useState<"light" | "dark">("dark");
  const [aiBypass, setAiBypass] = useState<boolean>(false);
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "error">("saved");

  const [draftData, setDraftData] = useState<any>({
    foundation: {},
    departments: [],
    roomTypes: [],
    amenities: [],
    facilities: [],
    policies: [],
    operationalBlueprint: [],
    phase2: {
      step: 1,
      departments: [],
      hierarchy: [],
      employees: [],
      permissions: {}
    }
  });

  // Load theme and session drafts
  useEffect(() => {
    // Force light mode
    setTheme("light");
    localStorage.setItem("theme", "light");
    document.documentElement.classList.remove("dark");
    document.documentElement.classList.remove("dark");

    // AI Bypass setup
    const savedBypass = localStorage.getItem("aiBypass") === "true";
    setAiBypass(savedBypass);

    // Fetch session data
    fetch("/api/onboarding/session")
      .then((res) => res.json())
      .then((resData) => {
        setHotelId(resData.hotelId);
        if (resData.data) {
          setDraftData((prev: any) => ({
            ...prev,
            ...resData.data,
            phase2: resData.data.phase2 || prev.phase2
          }));
          setActiveStep(resData.data.phase2?.step || 1);
        }
      })
      .catch(console.error);
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === "dark" ? "light" : "dark";
    setTheme(newTheme);
    localStorage.setItem("theme", newTheme);
    if (newTheme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  };

  const toggleAiBypass = (val: boolean) => {
    setAiBypass(val);
    localStorage.setItem("aiBypass", String(val));
    if (val) {
      setIsStepComplete(true);
    }
  };

  const handlePrefillMockWorkforce = () => {
    const mockData = require("@/lib/mockOnboardingData").mockOnboardingData;
    
    // Generate clean workforce employees list
    const mockEmployees = mockData.departments.flatMap((d: any, dIdx: number) => {
      return [
        {
          firstName: d.name.replace(/ /g, ''),
          lastName: "Manager",
          email: `${d.name.toLowerCase().replace(/ & /g, '').replace(/ /g, '')}.manager@resort.com`,
          mobileNumber: `+63 917 111 000${dIdx}`,
          department: d.name,
          role: `${d.name} Manager`
        },
        {
          firstName: d.name.replace(/ /g, ''),
          lastName: "Staff",
          email: `${d.name.toLowerCase().replace(/ & /g, '').replace(/ /g, '')}.staff@resort.com`,
          mobileNumber: `+63 917 222 000${dIdx}`,
          department: d.name,
          role: d.name === "Housekeeping" ? "Room Attendant" : (d.name === "Front Desk" ? "Receptionist" : "Technician")
        }
      ];
    });

    // Add Executive Hotel Manager
    mockEmployees.push({
      firstName: "Amihan",
      lastName: "GM",
      email: "admin@nexus.com",
      mobileNumber: "+63 917 000 9999",
      department: "Front Desk",
      role: "Hotel Manager"
    });

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

    const updatedPhase2 = {
      step: activeStep,
      departments: mockData.departments.map((d: any) => ({
        name: d.name,
        description: d.description,
        workerCount: d.workerCount,
        shifts: d.shifts,
        tasks: d.tasks
      })),
      hierarchy: defaultHierarchy,
      employees: mockEmployees,
      permissions: {}
    };

    const finalDraft = { ...draftData, phase2: updatedPhase2 };
    setDraftData(finalDraft);
    triggerAutosave(finalDraft, activeStep);
    alert("⚡ Phase 2 draft pre-filled with mock workforce roster! Refreshing view.");
    window.location.reload();
  };

  const handleCheckpointUpdate = (score: number, isComplete: boolean) => {
    setIsStepComplete(isComplete || aiBypass);
  };

  const handleDataChange = (updatedData: any) => {
    setDraftData(updatedData);
    triggerAutosave(updatedData, activeStep);
  };

  const triggerAutosave = async (dataToSave: any, stepToSave: number) => {
    setSaveStatus("saving");
    try {
      // Ensure step is saved in phase2 draft metadata
      const payload = {
        ...dataToSave,
        phase2: {
          ...(dataToSave.phase2 || {}),
          step: stepToSave
        }
      };

      const res = await fetch("/api/onboarding/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ step: 6, data: payload }), // Step 6 locks Phase 1, holds Phase 2 drafts
      });
      if (!res.ok) throw new Error("Autosave failed.");
      setSaveStatus("saved");
    } catch (err) {
      console.error(err);
      setSaveStatus("error");
    }
  };

  const navigateToStep = (targetStep: number) => {
    if (targetStep < 1 || targetStep > 5) return;
    setIsStepComplete(false);
    setActiveStep(targetStep);
    
    const updatedDraft = {
      ...draftData,
      phase2: {
        ...(draftData.phase2 || {}),
        step: targetStep
      }
    };
    setDraftData(updatedDraft);
    triggerAutosave(updatedDraft, targetStep);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-black flex flex-col justify-between relative overflow-hidden transition-colors duration-200">
      {/* Background Glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-blue-900/5 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-blue-950/5 blur-[120px] pointer-events-none" />
      
      {/* Header */}
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur-md sticky top-0 z-50 px-6 py-4 transition-colors duration-200">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <div className="h-9 w-20 bg-blue-600 flex items-center justify-center font-black text-white text-[11px] rounded-lg tracking-wider shadow-md select-none">
              READY.
            </div>
            <span className="text-xs font-bold text-black uppercase tracking-widest pl-3 border-l border-slate-200 ml-1">
              STAFFING SETUP
            </span>
            <span className="text-[10px] bg-blue-50 text-blue-705 text-blue-700 font-bold px-2 py-0.5 rounded border border-blue-100">
              PHASE 2
            </span>
          </div>

          <div className="flex items-center space-x-4">
            {/* Dev AI Bypass toggles */}
            <div className="flex items-center space-x-2 bg-slate-100 border border-slate-200 px-3 py-1.5 rounded-lg text-xs">
              <label className="flex items-center space-x-2 cursor-pointer font-bold text-black">
                <input
                  type="checkbox"
                  checked={aiBypass}
                  onChange={(e) => toggleAiBypass(e.target.checked)}
                  className="accent-blue-600 rounded"
                />
                <span>Bypass Checkpoints (Dev Mode)</span>
              </label>
            </div>

            {aiBypass && (
              <button
                onClick={handlePrefillMockWorkforce}
                type="button"
                className="px-3.5 py-1.5 bg-blue-50 border border-blue-200 text-blue-600 rounded-lg text-xs font-bold transition hover:bg-blue-100"
              >
                ⚡ Pre-fill Workforce
              </button>
            )}

            <span className="text-xs text-black font-medium">
              {saveStatus === "saving" ? "Saving..." : 
               saveStatus === "error" ? "❌ Save Error" : 
               "✓ Autosaved"}
            </span>
          </div>
        </div>
      </header>

      {/* Wizard Steps */}
      <div className="flex-grow max-w-7xl mx-auto w-full px-6 py-12 flex flex-col lg:flex-row gap-10 relative z-10">
        
        {/* Sidebar Nav */}
        <aside className="w-full lg:w-[320px] flex-shrink-0">
          <div className="bg-slate-50/60 border border-slate-200 rounded-2xl p-8 sticky top-28 space-y-8 shadow-sm transition-colors duration-200">
            <div>
              <h3 className="text-lg font-bold text-black tracking-tight">Staffing Setup</h3>
              <p className="text-xs text-slate-500 mt-1">Configure your workforce structure.</p>
            </div>

            <div className="relative pl-10 space-y-8 before:absolute before:left-[20px] before:top-2 before:bottom-2 before:w-[2px] before:bg-slate-200">
              {phase2Steps.map((step) => {
                const isActive = step.id === activeStep;
                const isCompleted = step.id < activeStep;

                return (
                  <div key={step.id} className="relative flex items-start">
                    {/* Circle indicator */}
                    <div className={`absolute left-[-30px] h-[20px] w-[20px] rounded-full flex items-center justify-center text-[10px] font-bold z-10 transition ${
                      isActive ? "bg-blue-600 text-white shadow-sm ring-4 ring-blue-100" :
                      isCompleted ? "bg-blue-600 text-white" :
                      "bg-white border-2 border-slate-300 text-slate-400"
                    }`}>
                      {isCompleted ? "✓" : step.id}
                    </div>
                    <button
                      onClick={() => (step.id <= activeStep || aiBypass) && navigateToStep(step.id)}
                      disabled={step.id > activeStep && !aiBypass}
                      className={`text-left group transition focus:outline-none ${
                        isActive ? "text-blue-700 font-bold" :
                        isCompleted ? "text-slate-700 font-semibold hover:text-black" :
                        "text-slate-400 cursor-not-allowed"
                      }`}
                    >
                      <p className="text-xs leading-none">{step.name}</p>
                      <p className="text-[9px] text-slate-500 mt-1 font-normal">{step.desc}</p>
                    </button>
                  </div>
                );
              })}
            </div>

            <div className="pt-4 border-t border-slate-200/60">
              <a href="/login" className="text-xs font-bold text-slate-500 hover:text-blue-600 transition flex items-center space-x-1.5">
                <span>🚪</span>
                <span>Log out</span>
              </a>
            </div>
          </div>
        </aside>

        {/* Content Box */}
        <main className="flex-grow bg-white border border-slate-200 rounded-2xl p-8 shadow-md transition-colors duration-200">
          {activeStep === 1 && (
            <Step1Departments 
              data={draftData} 
              onChange={handleDataChange} 
              onCheckpointUpdate={handleCheckpointUpdate}
            />
          )}
          {activeStep === 2 && (
            <Step2Hierarchy 
              data={draftData} 
              onChange={handleDataChange} 
              onCheckpointUpdate={handleCheckpointUpdate}
            />
          )}
          {activeStep === 3 && (
            <Step3Staff 
              data={draftData} 
              onChange={handleDataChange} 
              onCheckpointUpdate={handleCheckpointUpdate}
            />
          )}
          {activeStep === 4 && (
            <Step4Permissions 
              data={draftData} 
              onChange={handleDataChange} 
              onCheckpointUpdate={handleCheckpointUpdate}
            />
          )}
          {activeStep === 5 && (
            <Step5Validation 
              data={draftData} 
              onChange={handleDataChange} 
              onCheckpointUpdate={handleCheckpointUpdate}
            />
          )}

          {/* Navigation Controls */}
          <div className="border-t border-slate-200 mt-12 pt-6 flex justify-between items-center">
            <button
              onClick={() => navigateToStep(activeStep - 1)}
              disabled={activeStep === 1}
              className="px-6 py-2.5 bg-white border border-slate-200 hover:border-slate-300 dark:hover:border-slate-700 text-xs font-bold rounded-xl text-black hover:text-black dark:text-black dark:hover:text-white transition disabled:opacity-30 disabled:pointer-events-none"
            >
              ← Back
            </button>

            {activeStep < 5 && (
              <button
                onClick={() => navigateToStep(activeStep + 1)}
                disabled={!isStepComplete && !aiBypass}
                className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-xs font-bold rounded-xl text-white shadow-lg transition disabled:opacity-40 disabled:pointer-events-none"
              >
                Save & Continue →
              </button>
            )}
          </div>
        </main>
      </div>

      {/* Footer */}
      <footer className="border-t border-slate-200/50 py-8 px-6 text-center text-xs text-black dark:text-slate-655 mt-20 transition-colors duration-200">
        <p>© {new Date().getFullYear()} READY - Staffing Ecosystem. All rights reserved.</p>
      </footer>
    </div>
  );
}
