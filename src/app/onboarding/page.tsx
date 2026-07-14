"use client";

import { useEffect, useState } from "react";
import Step1Foundation from "./components/Step1Foundation";
import Step2Services from "./components/Step2Services";
import Step3Rooms from "./components/Step3Rooms";
import Step4Blueprint from "./components/Step4Blueprint";
import Step5Readiness from "./components/Step5Readiness";
import Step6Blueprint from "./components/Step6Blueprint";

const stepNumberToKey: Record<number, string> = {
  1: "foundation",
  2: "services",
  3: "choose_depts",
  4: "blueprint",
  5: "policies",
  6: "ops_blueprint"
};

const stepKeyToNumber: Record<string, number> = {
  "foundation": 1,
  "services": 2,
  "choose_depts": 3,
  "blueprint": 4,
  "policies": 5,
  "ops_blueprint": 6
};

const getStepNumber = (stepKey: string): number => {
  if (stepKey.startsWith("dept_")) return 3;
  return stepKeyToNumber[stepKey] || 1;
};

export default function OnboardingChassis() {
  const [activeStep, setActiveStep] = useState<string>("foundation");
  const [hotelId, setHotelId] = useState<number>(0);
  const [isStepComplete, setIsStepComplete] = useState<boolean>(false);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [aiBypass, setAiBypass] = useState<boolean>(false);

  const [draftData, setDraftData] = useState<any>({
    foundation: {
      name: "",
      type: "Resort",
      totalRooms: 100,
      totalFloors: 4,
      timezone: "UTC",
      address: "",
      gmapsLocation: "",
    },
    departments: [],
    roomTypes: [],
    amenities: [],
    facilities: [],
    policies: [],
    faqs: [],
    emergencyProcedures: [],
    floors: [],
    blueprint: { routing: [], priority: [], sla: [], escalation: [] },
    operationalBlueprint: [],
  });

  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "error">("saved");

  const getStepsList = () => {
    const activeDepts = draftData.departments || [];
    const baseSteps = [
      { id: "foundation", name: "Phase 1: Hotel Profile", desc: "General settings & location" },
      { id: "services", name: "Phase 2: Rooms & Zones", desc: "Lodging options & facilities" },
      { id: "choose_depts", name: "Phase 3: Choose Departments", desc: "Select hotel divisions" }
    ];
    
    const deptSteps = activeDepts.map((d: any) => ({
      id: `dept_${d.name.toLowerCase()}`,
      name: `${d.name} Setup`,
      desc: `Configure ${d.name.toLowerCase()} workspace`
    }));

    const finalSteps = [
      ...baseSteps,
      ...deptSteps,
      { id: "blueprint", name: "Phase 4: Floor Layouts", desc: "Floors mapping & room slots" },
      { id: "policies", name: "Phase 5: Policies & Rules", desc: "Core and shift policy codes" },
      { id: "ops_blueprint", name: "Phase 6: Operations Blueprint", desc: "SLA matrices & task planning" }
    ];
    
    return finalSteps;
  };

  // Load theme, AI bypass configuration, and draft data
  useEffect(() => {
    // Theme setup forced to light mode
    setTheme("light");
    localStorage.setItem("theme", "light");
    document.documentElement.classList.remove("dark");

    // AI Bypass setup
    const savedBypass = localStorage.getItem("aiBypass") === "true";
    setAiBypass(savedBypass);

    // Load validated steps cache from localStorage
    const savedValidated = localStorage.getItem("onboarding_validated_steps");
    if (savedValidated) {
      try {
        setValidatedSteps(JSON.parse(savedValidated));
      } catch (e) {
        console.error("Failed to parse validated steps", e);
      }
    }

    // Fetch draft session
    fetch("/api/onboarding/session")
      .then((res) => res.json())
      .then((resData) => {
        setHotelId(resData.hotelId);
        const stepNum = resData.step || 1;
        const stepKey = stepNumberToKey[stepNum] || "foundation";
        setActiveStep(stepKey);
        if (resData.data) {
          setDraftData((prev: any) => ({
            ...prev,
            ...resData.data,
            foundation: resData.data.foundation || prev.foundation,
            operationalBlueprint: resData.data.operationalBlueprint || prev.operationalBlueprint,
          }));
        }
      })
      .catch(console.error);
  }, []);

  const toggleTheme = () => {
    setTheme("light");
    localStorage.setItem("theme", "light");
    document.documentElement.classList.remove("dark");
  };

  const toggleAiBypass = (val: boolean) => {
    setAiBypass(val);
    localStorage.setItem("aiBypass", String(val));
    if (val) {
      setIsStepComplete(true);
    }
  };

  const handlePrefillMockData = () => {
    const mockData = require("@/lib/mockOnboardingData").mockOnboardingData;
    setDraftData(mockData);
    triggerAutosave(mockData, activeStep);
    alert("⚡ Onboarding draft successfully pre-populated with mock data! Refreshing inputs.");
    window.location.reload();
  };

  const [validatedSteps, setValidatedSteps] = useState<Record<string, any>>({});

  const getStepDataForComparison = (stepKey: string, data: any) => {
    if (stepKey === "foundation") return data.foundation;
    if (stepKey === "services") return { roomTypes: data.roomTypes, amenities: data.amenities, facilities: data.facilities };
    if (stepKey === "choose_depts") return data.departments;
    if (stepKey.startsWith("dept_")) {
      const deptName = stepKey.replace("dept_", "");
      return data.departments?.find((d: any) => d.name.toLowerCase() === deptName);
    }
    if (stepKey === "blueprint") return { floors: data.floors, blueprint: data.blueprint };
    if (stepKey === "policies") return { policies: data.policies, faqs: data.faqs, emergencyProcedures: data.emergencyProcedures };
    if (stepKey === "ops_blueprint") return data.operationalBlueprint;
    return data;
  };

  const handleCheckpointUpdate = (score: number, isComplete: boolean, auditData?: any) => {
    setIsStepComplete(isComplete || aiBypass);
    if (isComplete) {
      const stepVal = {
        score,
        isComplete,
        warnings: auditData?.warnings || [],
        followUpQuestions: auditData?.followUpQuestions || [],
        templates: auditData?.templates || [],
        dataStr: JSON.stringify(getStepDataForComparison(activeStep, draftData))
      };
      setValidatedSteps(prev => {
        const copy = { ...prev, [activeStep]: stepVal };
        localStorage.setItem("onboarding_validated_steps", JSON.stringify(copy));
        return copy;
      });
    }
  };

  const handleDataChange = (updatedData: any) => {
    setDraftData(updatedData);
    triggerAutosave(updatedData, activeStep);
    
    // Check if the change invalidated the active step's complete status
    const stepVal = validatedSteps[activeStep];
    const currentDataStr = JSON.stringify(getStepDataForComparison(activeStep, updatedData));
    if (stepVal && stepVal.dataStr !== currentDataStr) {
      setIsStepComplete(false);
      setValidatedSteps(prev => {
        const copy = { ...prev };
        delete copy[activeStep];
        localStorage.setItem("onboarding_validated_steps", JSON.stringify(copy));
        return copy;
      });
    }
  };

  const triggerAutosave = async (dataToSave: any, stepToSave: string) => {
    setSaveStatus("saving");
    const stepNum = getStepNumber(stepToSave);
    try {
      const res = await fetch("/api/onboarding/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ step: stepNum, data: dataToSave }),
      });
      if (!res.ok) throw new Error("Autosave failed.");
      setSaveStatus("saved");
    } catch (err) {
      console.error(err);
      setSaveStatus("error");
    }
  };

  const navigateToStep = (targetStep: string) => {
    // Check if target step has been validated and did not change
    const stepVal = validatedSteps[targetStep];
    const currentDataStr = JSON.stringify(getStepDataForComparison(targetStep, draftData));
    
    if (stepVal && stepVal.dataStr === currentDataStr) {
      setIsStepComplete(true);
    } else {
      setIsStepComplete(false);
    }
    setActiveStep(targetStep);
    triggerAutosave(draftData, targetStep);
  };

  const isStepEnabled = (stepId: string, idx: number) => {
    if (aiBypass) return true;
    if (idx <= currentIdx) return true; // Can always click current or previous steps
    
    // Find the highest index of a validated step in the stepsList
    let maxValidatedIdx = -1;
    stepsList.forEach((s, i) => {
      if (validatedSteps[s.id]) {
        maxValidatedIdx = Math.max(maxValidatedIdx, i);
      }
    });
    
    // Allow clicking if this step has been validated, or is the next step to be configured
    return idx <= maxValidatedIdx + 1;
  };

  const stepsList = getStepsList();
  const currentIdx = stepsList.findIndex(s => s.id === activeStep);
  const prevStep = currentIdx > 0 ? stepsList[currentIdx - 1] : null;
  const nextStep = currentIdx < stepsList.length - 1 ? stepsList[currentIdx + 1] : null;

  return (
    <div className="min-h-screen bg-slate-50 text-black flex flex-col justify-between selection:bg-blue-500 selection:text-white relative overflow-hidden transition-colors duration-200">
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
              Setup Wizard
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
                <span>Bypass AI Checkpoints (Dev Mode)</span>
              </label>
            </div>

            {aiBypass && (
              <button
                onClick={handlePrefillMockData}
                type="button"
                className="px-3.5 py-1.5 bg-blue-50 border border-blue-200 text-blue-600 rounded-lg text-xs font-bold transition hover:bg-blue-100"
              >
                ⚡ Pre-fill Mock Data
              </button>
            )}

            <span className="text-xs text-black font-medium">
              {saveStatus === "saving" ? "Saving draft..." : 
               saveStatus === "error" ? "❌ Save Error" : 
               "✓ Autosaved"}
            </span>
          </div>
        </div>
      </header>

      {/* Wizard Layout */}
      <div className="flex-grow max-w-7xl mx-auto w-full px-6 py-12 flex flex-col lg:flex-row gap-10 relative z-10">
        
        {/* Sidebar navigation */}
        <aside className="w-full lg:w-[320px] flex-shrink-0">
          <div className="bg-slate-50/60 border border-slate-200 rounded-2xl p-8 sticky top-28 space-y-8 shadow-sm transition-colors duration-200">
            <div>
              <h3 className="text-lg font-bold text-black tracking-tight">Get started</h3>
              <p className="text-xs text-slate-500 mt-1">We can't wait to have you onboard.</p>
            </div>

            <div className="relative pl-10 space-y-8 before:absolute before:left-[20px] before:top-2 before:bottom-2 before:w-[2px] before:bg-slate-200">
              {stepsList.map((step, idx) => {
                const isActive = step.id === activeStep;
                const isCompleted = idx < currentIdx;

                return (
                  <div key={step.id} className="relative flex items-start">
                    {/* Circle indicator */}
                    <div className={`absolute left-[-30px] h-[20px] w-[20px] rounded-full flex items-center justify-center text-[10px] font-bold z-10 transition ${
                      isActive ? "bg-blue-600 text-white shadow-sm ring-4 ring-blue-100" :
                      validatedSteps[step.id] ? "bg-blue-600 text-white" :
                      "bg-white border-2 border-slate-300 text-slate-400"
                    }`}>
                      {validatedSteps[step.id] ? "✓" : idx + 1}
                    </div>
                    <button
                      onClick={() => isStepEnabled(step.id, idx) && navigateToStep(step.id)}
                      disabled={!isStepEnabled(step.id, idx)}
                      className={`text-left group transition focus:outline-none ${
                        isActive ? "text-blue-700 font-bold" :
                        isStepEnabled(step.id, idx) ? "text-slate-700 font-semibold hover:text-black" :
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
          {activeStep === "foundation" && (
            <Step1Foundation 
              data={draftData} 
              onChange={handleDataChange} 
              hotelId={hotelId} 
              onCheckpointUpdate={handleCheckpointUpdate}
              auditState={validatedSteps["foundation"]}
            />
          )}
          {activeStep === "services" && (
            <Step2Services 
              data={draftData} 
              onChange={handleDataChange} 
              onCheckpointUpdate={handleCheckpointUpdate}
              auditState={validatedSteps["services"]}
            />
          )}
          {activeStep === "choose_depts" && (
            <Step3Rooms 
              data={draftData} 
              onChange={handleDataChange} 
              onCheckpointUpdate={handleCheckpointUpdate}
              mode="choose"
              auditState={validatedSteps["choose_depts"]}
            />
          )}
          {typeof activeStep === "string" && activeStep.startsWith("dept_") && (
            <Step3Rooms 
              data={draftData} 
              onChange={handleDataChange} 
              onCheckpointUpdate={handleCheckpointUpdate}
              mode="configure"
              selectedDeptName={
                (draftData.departments || []).find((d: any) => d.name.toLowerCase() === activeStep.substring(5))?.name || ""
              }
              auditState={validatedSteps[activeStep]}
            />
          )}
          {activeStep === "blueprint" && (
            <Step4Blueprint 
              data={draftData} 
              onChange={handleDataChange} 
              onCheckpointUpdate={handleCheckpointUpdate}
              auditState={validatedSteps["blueprint"]}
            />
          )}
          {activeStep === "policies" && (
            <Step5Readiness 
              data={draftData} 
              onChange={handleDataChange} 
              onCheckpointUpdate={handleCheckpointUpdate}
              auditState={validatedSteps["policies"]}
            />
          )}
          {activeStep === "ops_blueprint" && (
            <Step6Blueprint 
              data={draftData} 
              onChange={handleDataChange} 
              onCheckpointUpdate={handleCheckpointUpdate}
              auditState={validatedSteps["ops_blueprint"]}
            />
          )}

          {/* Navigation Controls */}
          <div className="border-t border-slate-200 mt-12 pt-6 flex justify-between items-center">
            <button
              onClick={() => prevStep && navigateToStep(prevStep.id)}
              disabled={!prevStep}
              className="px-6 py-2.5 bg-white border border-slate-200 hover:border-slate-300 dark:hover:border-slate-700 text-xs font-bold rounded-xl text-black hover:text-slate-805 dark:text-black dark:hover:text-white transition disabled:opacity-30 disabled:pointer-events-none"
            >
              ← Back
            </button>

            {nextStep && (
              <button
                onClick={() => navigateToStep(nextStep.id)}
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
        <p>© {new Date().getFullYear()} READY - Scaled Filipino Hospitality. All configurations locked securely.</p>
      </footer>
    </div>
  );
}
