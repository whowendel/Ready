"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const categories = [
  { id: "all", name: "Show All Sections", icon: "" },
  { id: "profile", name: "Hotel Profile", icon: "" },
  { id: "facilities", name: "Rooms & Facilities", icon: "" },
  { id: "floors", name: "Floor Layouts", icon: "" },
  { id: "policies", name: "Hotel Policies", icon: "" },
  { id: "blueprint", name: "Operational Blueprint", icon: "" },
  { id: "download", name: "Download Hub", icon: "" }
];

export default function OnboardingSummaryPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("all");
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [theme, setTheme] = useState<"light" | "dark">("dark");

  useEffect(() => {
    // Force light mode
    setTheme("light");
    localStorage.setItem("theme", "light");
    document.documentElement.classList.remove("dark");
    document.documentElement.classList.remove("dark");

    // Fetch summary
    fetch("/api/onboarding/summary")
      .then((res) => res.json())
      .then((resData) => {
        setSummary(resData.summary);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
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

  const handlePrint = () => {
    window.print();
  };

  const handleBackToOnboarding = async () => {
    try {
      const res = await fetch("/api/onboarding/reset", { method: "POST" });
      if (res.ok) {
        router.push("/onboarding");
      } else {
        alert("Failed to reset onboarding session.");
      }
    } catch (err) {
      console.error(err);
      alert("Error resetting session.");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center text-black">
        <div className="flex flex-col items-center space-y-4">
          <div className="h-10 w-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-semibold tracking-wider animate-pulse">Loading finalized summary...</p>
        </div>
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center text-black">
        <p className="text-sm font-bold text-blue-500">Failed to load summary dataset.</p>
      </div>
    );
  }

  const f = summary.foundation || {};
  const roomTypes = summary.roomTypes || [];
  const facilities = summary.facilities || [];
  const departments = summary.departments || [];
  const floors = summary.floors || [];
  const policies = summary.policies || [];
  const operationalBlueprint = summary.operationalBlueprint || [];

  // Group operational blueprint tasks by department
  const tasksByDept: Record<string, any[]> = {};
  operationalBlueprint.forEach((task: any) => {
    const dept = task.dept || "Unassigned";
    if (!tasksByDept[dept]) {
      tasksByDept[dept] = [];
    }
    tasksByDept[dept].push(task);
  });

  return (
    <div className="min-h-screen bg-slate-50 text-black flex flex-col justify-between transition-colors duration-200 print:bg-white print:text-black">
      
      {/* Header (Hidden on Print) */}
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur-md sticky top-0 z-50 px-6 py-4 flex justify-between items-center transition-colors duration-200 print:hidden">
        <div className="flex flex-col">
          <div className="flex items-center space-x-3">
            <div className="h-9 w-20 bg-blue-600 flex items-center justify-center font-black text-white text-[11px] rounded-lg tracking-wider shadow-md select-none">
              READY.
            </div>
            <span className="text-xs font-bold text-black uppercase tracking-widest pl-3 border-l border-slate-200 ml-1">
              COMPILATION PROFILE
            </span>
          </div>
          <button
            onClick={handleBackToOnboarding}
            className="text-xs font-bold text-black hover:text-blue-600 mt-1 flex items-center space-x-1 pl-24 text-left transition"
          >
            <span>← Back to Onboarding Wizard</span>
          </button>
        </div>

        <div className="flex items-center space-x-4">
          <button
            onClick={handlePrint}
            className="px-4 py-2 bg-slate-100 border border-slate-200 text-xs font-bold rounded-lg transition hover:bg-slate-200"
          >
            Download Report (PDF)
          </button>
          <button
            onClick={() => router.push("/dashboard")}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition shadow-md"
          >
            Enter Operations Dashboard
          </button>
        </div>
      </header>

      {/* Main Layout Area */}
      <div className="max-w-7xl mx-auto w-full px-6 py-10 space-y-8 flex-grow print:block print:p-0 print:m-0 print:max-w-none">
        
        {/* Navigation Bar Above Content (Hidden on Print) */}
        <nav className="bg-white border border-slate-200 p-2.5 rounded-2xl flex flex-wrap justify-center gap-1.5 shadow-sm sticky top-[76px] z-40 backdrop-blur-md print:hidden">
          {categories.map((cat) => {
            const isActive = activeTab === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setActiveTab(cat.id)}
                className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl border text-xs font-bold transition ${
                  isActive 
                    ? "bg-blue-600 text-white border-blue-600 shadow-sm" 
                    : "border-transparent text-black hover:bg-slate-100"
                }`}
              >
                <span className="text-sm">{cat.icon}</span>
                <span>{cat.name}</span>
              </button>
            );
          })}
        </nav>

        {/* Content Box */}
        <div className="bg-white border border-slate-200 rounded-2xl p-8 lg:p-10 shadow-md print:border-none print:shadow-none print:p-0">
          
          {/* Print Only Header Banner */}
          <div className="hidden print:block border-b-2 border-slate-900 pb-6 mb-8">
            <h1 className="text-3xl font-extrabold uppercase tracking-wide text-slate-900">READY Hotel Configuration & Operations Blueprint</h1>
            <p className="text-sm text-black mt-1 font-medium">Finalized compiled profile generated on {new Date().toLocaleDateString()}</p>
          </div>

          {/* Section 1: Hotel Profile */}
          {(activeTab === "profile" || activeTab === "all" || typeof window === "undefined") && (
            <section className="space-y-6 mb-12 print:block print:mb-12">
              <div className="border-b-2 border-slate-200 pb-3 flex items-center">
                <h3 className="text-base font-extrabold text-black uppercase tracking-wider">1. Hotel Profile & General Information</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-white p-6 rounded-xl border border-slate-200 print:bg-white print:border-slate-300">
                <div>
                  <span className="text-[10px] uppercase font-bold text-black tracking-wider">Hotel Name</span>
                  <p className="text-sm font-bold text-black">{f.name || "None"}</p>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-black tracking-wider">Hotel Type</span>
                  <p className="text-sm font-bold text-black">{f.type || "None"}</p>
                </div>
                <div className="col-span-1 md:col-span-2">
                  <span className="text-[10px] uppercase font-bold text-black tracking-wider">Hotel Address</span>
                  <p className="text-sm font-medium text-black">{f.address || "None"}</p>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-black tracking-wider">Google Maps Location Link</span>
                  <p className="text-xs text-blue-700 truncate mt-0.5 font-semibold">
                    <a href={f.gmapsLocation} target="_blank" rel="noopener noreferrer">{f.gmapsLocation || "None"}</a>
                  </p>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-black tracking-wider">Local Timezone</span>
                  <p className="text-sm font-bold text-black">{f.timezone || "None"}</p>
                </div>
              </div>

              {/* Branding Sub-Card */}
              <div className="bg-white p-6 rounded-xl border border-slate-200 space-y-4 print:bg-white print:border-slate-300">
                <h4 className="text-xs font-bold text-black uppercase tracking-widest">Brand Aesthetics & Service Tone</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-black">Brand Color Accent</span>
                    <div className="flex items-center space-x-3 mt-1">
                      <div className="h-6 w-6 rounded border border-slate-300 bg-blue-600" />
                      <span className="text-xs font-mono font-bold">#2563EB</span>
                    </div>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-black">Primary Tone / Voice Style</span>
                    <p className="text-xs font-bold text-black mt-1.5">Warm Hospitality, Premium, & Attentive</p>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-black">Service Standards Target</span>
                    <p className="text-xs font-bold text-black mt-1.5">5-Star Luxury Resort standards</p>
                  </div>
                </div>
                <div className="pt-4 border-t border-slate-200 text-xs">
                  <span className="text-[10px] uppercase font-bold text-black">Corporate Values Statement</span>
                  <p className="text-xs text-black mt-1.5 leading-relaxed">
                    Committed to presenting traditional hospitality paired with modern efficiency, creating unforgettable tropical experiences for guests.
                  </p>
                </div>
              </div>
            </section>
          )}

          {/* Section 2: Rooms & Property Facilities */}
          {(activeTab === "facilities" || activeTab === "all" || typeof window === "undefined") && (
            <section className="space-y-6 mb-12 print:block print:mb-12">
              <div className="border-b-2 border-slate-200 pb-3 flex items-center">
                <h3 className="text-base font-extrabold text-black uppercase tracking-wider">2. Rooms & Property Facilities</h3>
              </div>

              {/* Room Types */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold text-black uppercase tracking-widest">Lodging Room Profiles</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {roomTypes.map((room: any, idx: number) => (
                    <div key={idx} className="bg-white p-6 rounded-xl border border-slate-200 space-y-4 print:bg-white print:border-slate-300">
                      <h4 className="text-xs font-bold text-blue-700 border-b border-slate-200 pb-1.5">{room.name}</h4>
                      <div className="grid grid-cols-2 gap-4 text-xs">
                        <div>
                          <span className="text-[10px] uppercase font-bold text-black">Guest Capacity:</span>
                          <p className="font-bold text-black mt-0.5">{room.capacity} guests</p>
                        </div>
                        <div>
                          <span className="text-[10px] uppercase font-bold text-black">Beds configuration:</span>
                          <p className="font-bold text-black mt-0.5">{room.bedTypes || "None"}</p>
                        </div>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-bold text-black block mb-1">Included Amenities:</span>
                        <div className="flex flex-wrap gap-1">
                          {(room.amenities || []).map((amen: string) => (
                            <span key={amen} className="text-[9px] bg-white px-2 py-0.5 rounded text-black font-semibold border border-slate-200">
                              {amen}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Property Facilities */}
              <div className="space-y-4 pt-6 border-t border-slate-200">
                <h4 className="text-xs font-bold text-black uppercase tracking-widest">Property Facilities Details</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {facilities.map((fac: any, idx: number) => (
                    <div key={idx} className="bg-white p-5 rounded-xl border border-slate-200 text-xs space-y-2.5 print:bg-white print:border-slate-300">
                      <div className="flex justify-between items-center border-b border-slate-200 pb-1.5">
                        <span className="font-bold text-black">{fac.name}</span>
                        <span className="text-[10px] text-black font-bold">Capacity: {fac.capacity} guests</span>
                      </div>
                      <p className="text-black leading-relaxed">{fac.description}</p>
                      <div className="flex items-center space-x-4 text-black font-semibold">
                        <span>Operating Hours: {fac.operatingHours?.open} to {fac.operatingHours?.close}</span>
                      </div>
                      {fac.details?.menu && (
                        <p className="text-[10px] text-black italic mt-1.5 pt-1.5 border-t border-slate-200/60 font-medium">Menu Highlights: {fac.details.menu}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )}

          {/* Section 3: Floor Layouts */}
          {(activeTab === "floors" || activeTab === "all" || typeof window === "undefined") && (
            <section className="space-y-6 mb-12 print:block print:mb-12">
              <div className="border-b-2 border-slate-200 pb-3 flex items-center">
                <h3 className="text-base font-extrabold text-black uppercase tracking-wider">3. Floor Layouts & Mappings</h3>
              </div>

              <div className="space-y-4">
                {floors.map((floor: any, idx: number) => (
                  <div key={idx} className="bg-white p-5 rounded-xl border border-slate-200 text-xs grid grid-cols-1 md:grid-cols-3 gap-6 print:bg-white print:border-slate-300">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-black block mb-1">Floor Level</span>
                      <p className="text-sm font-bold text-black">Floor #{floor.floorNumber}</p>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-black block mb-1">Rooms Inventory Distribution</span>
                      <div className="space-y-0.5 font-semibold text-slate-600">
                        {Object.entries(floor.rooms || {}).map(([rType, count]) => (
                          <div key={rType}>{rType}: {count as number} rooms</div>
                        ))}
                      </div>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-black block mb-1">Responsible Teams</span>
                      <div className="flex flex-wrap gap-1 mt-0.5">
                        {(floor.departments || []).map((d: string) => (
                          <span key={d} className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded font-bold border border-blue-100 text-[10px]">
                            {d}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Section 4: Hotel Operating Policies */}
          {(activeTab === "policies" || activeTab === "all" || typeof window === "undefined") && (
            <section className="space-y-6 mb-12 print:block print:mb-12">
              <div className="border-b-2 border-slate-200 pb-3 flex items-center">
                <h3 className="text-base font-extrabold text-black uppercase tracking-wider">4. Hotel Operating Policies</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {policies.map((p: any, idx: number) => (
                  <div key={idx} className="bg-white p-5 rounded-xl border border-slate-200 space-y-2 print:bg-white print:border-slate-300">
                    <span className="text-xs font-bold text-black border-b border-slate-200 pb-1 block">{(p.topic || "").toUpperCase()} Policy</span>
                    <p className="text-xs text-black leading-relaxed pt-1">{p.rule}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Section 5: Operational Blueprint (Grouped by Department) */}
          {(activeTab === "blueprint" || activeTab === "all" || typeof window === "undefined") && (
            <section className="space-y-8 mb-12 print:block print:mb-12">
              <div className="border-b-2 border-slate-200 pb-3 flex items-center">
                <h3 className="text-base font-extrabold text-black uppercase tracking-wider">5. Operational Blueprint (Tasks Grouped by Department)</h3>
              </div>

              {Object.keys(tasksByDept).length === 0 ? (
                <p className="text-xs text-black italic">No tasks compiled in the operational blueprint.</p>
              ) : (
                <div className="space-y-8">
                  {Object.entries(tasksByDept).map(([deptName, deptTasks]) => {
                    // Find matching department details (staff count, shifts)
                    const deptInfo = departments.find((d: any) => d.name.toLowerCase() === deptName.toLowerCase()) || {};
                    const staffCount = deptInfo.workerCount || "N/A";
                    const shifts = deptInfo.shifts || [];

                    return (
                      <div key={deptName} className="bg-white p-6 rounded-2xl border border-slate-200 space-y-4 print:bg-white print:border-slate-300">
                        {/* Department header summary banner */}
                        <div className="flex justify-between items-center border-b border-slate-200 pb-3">
                          <div>
                            <h4 className="text-sm font-extrabold text-blue-700 uppercase tracking-wider">{deptName} Department</h4>
                            {shifts.length > 0 && (
                              <p className="text-[10px] text-black mt-1">
                                Shifts: {shifts.map((s: any) => `${s.name} (${s.open}-${s.close})`).join(", ")}
                              </p>
                            )}
                          </div>
                          <div className="bg-white px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-bold text-black text-right">
                            Staff Capacity: {staffCount} workers
                          </div>
                        </div>

                        {/* Tasks list table */}
                        <div className="overflow-x-auto border border-slate-200 rounded-xl bg-white print:border-slate-300">
                          <table className="w-full text-left text-xs divide-y divide-slate-200">
                            <thead className="bg-slate-50 font-bold text-black">
                              <tr>
                                <th className="px-4 py-3">Task Name</th>
                                <th className="px-4 py-3">Responsible Role</th>
                                <th className="px-4 py-3 text-center">Manpower</th>
                                <th className="px-4 py-3">Frequency & Window</th>
                                <th className="px-4 py-3">Classification</th>
                                <th className="px-4 py-3 text-right">SLA response</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200">
                              {deptTasks.map((task: any, index: number) => (
                                <tr key={index} className="hover:bg-slate-50">
                                  <td className="px-4 py-3 font-semibold text-black">{task.name}</td>
                                  <td className="px-4 py-3 font-medium text-black">{task.role}</td>
                                  <td className="px-4 py-3 text-center font-bold">{task.manpower} workers</td>
                                  <td className="px-4 py-3">
                                    <span className="capitalize font-semibold block">{task.frequency}</span>
                                    <span className="text-[10px] text-black mt-0.5 block">{task.timeWindow || "All Shift"}</span>
                                  </td>
                                  <td className="px-4 py-3">
                                    <span className={`px-2 py-0.5 rounded text-[9px] font-bold border ${
                                      task.classification === "mandatory" 
                                        ? "bg-emerald-50 text-emerald-700 border-emerald-100" 
                                        : "bg-blue-50 text-blue-700 border-blue-100"
                                    }`}>
                                      {task.classification === "mandatory" ? "Mandatory" : "Guest-Requested"}
                                    </span>
                                  </td>
                                  <td className="px-4 py-3 text-right font-mono font-bold">
                                    <div className="text-black">{task.adjustedSLA} mins</div>
                                    <div className="text-[9px] text-slate-500 font-medium mt-0.5">(Rec: {task.recommendedSLA}m)</div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>

                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          )}

          {/* Section 6: Download & Review Hub */}
          {(activeTab === "download" || activeTab === "all" || typeof window === "undefined") && (
            <section className="space-y-6 print:hidden">
              <div className="border-b-2 border-slate-200 pb-3 flex items-center">
                <h3 className="text-base font-extrabold uppercase tracking-wider">6. Download & Review Hub</h3>
              </div>

              <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center space-y-4">
                <h4 className="text-sm font-bold text-black">Onboarding Configuration Report Ready</h4>
                <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                  Generate a complete corporate PDF summary detailing rooms, active zones, workforce timetables, shift matrices, policies, and blueprint SLA routing trees.
                </p>
                <div className="pt-3">
                  <button
                    onClick={handlePrint}
                    className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-lg transition"
                  >
                    Download Compiled Document (PDF)
                  </button>
                </div>
              </div>
            </section>
          )}

        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-slate-200/50 py-8 px-6 text-center text-xs text-black mt-20 print:hidden transition-colors duration-200">
        <p>© {new Date().getFullYear()} READY - Scaled Hospitality Blueprint. All configurations locked securely.</p>
      </footer>
    </div>
  );
}
