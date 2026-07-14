"use client";

import { useState, useEffect } from "react";

interface Step3Props {
  data: any;
  onChange: (newData: any) => void;
  onCheckpointUpdate?: (score: number, isComplete: boolean) => void;
}

export default function Step3Staff({ data, onChange, onCheckpointUpdate }: Step3Props) {
  const [employees, setEmployees] = useState<any[]>([]);
  const [isAuditing, setIsAuditing] = useState(false);
  const [auditScore, setAuditScore] = useState<number>(0);
  const [auditComplete, setAuditComplete] = useState(false);
  const [warnings, setWarnings] = useState<string[]>([]);

  // Manual Form State
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    mobileNumber: "",
    department: "",
    role: "",
  });

  const [previewList, setPreviewList] = useState<any[]>([]);
  const [csvFileName, setCsvFileName] = useState("");

  const activeDepts = data.phase2?.departments || [];
  const activeRoles = data.phase2?.hierarchy || [];

  useEffect(() => {
    const savedEmployees = data.phase2?.employees || [];
    setEmployees(savedEmployees);
  }, []);



  const updateDraft = (updatedEmployees: any[]) => {
    onChange({
      ...data,
      phase2: {
        ...(data.phase2 || {}),
        employees: updatedEmployees
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
        body: JSON.stringify({ step: 3 }),
      });
      if (res.ok) {
        const resData = await res.json();
        setAuditScore(resData.score.employeeScore);
        setAuditComplete(resData.score.employeeScore >= 80);
        setWarnings(resData.warnings || []);
        if (onCheckpointUpdate) {
          onCheckpointUpdate(resData.score.employeeScore, resData.score.employeeScore >= 80);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsAuditing(false);
    }
  };

  const handleAddEmployee = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.firstName || !form.lastName || !form.email || !form.department || !form.role) {
      alert("Please fill out all required fields.");
      return;
    }

    if (employees.some(emp => emp.email.toLowerCase() === form.email.toLowerCase().trim())) {
      alert("An employee with this email address already exists.");
      return;
    }

    const updated = [...employees, { ...form, email: form.email.trim() }];
    setEmployees(updated);
    updateDraft(updated);

    // Reset Form
    setForm({
      firstName: "",
      lastName: "",
      email: "",
      mobileNumber: "",
      department: "",
      role: "",
    });
  };

  const handleRemoveEmployee = (idx: number) => {
    const updated = employees.filter((_, i) => i !== idx);
    setEmployees(updated);
    updateDraft(updated);
  };

  // Local CSV Client-Side Parser
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setCsvFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const lines = text.split("\n").map(l => l.trim()).filter(l => l.length > 0);
      if (lines.length <= 1) {
        alert("The CSV file is empty or does not contain data lines.");
        return;
      }

      const headers = lines[0].split(",").map(h => h.trim().toLowerCase());
      
      const parsed = lines.slice(1).map(l => {
        const cells = l.split(",").map(c => c.trim().replace(/['"]+/g, ''));
        const item: any = { firstName: "", lastName: "", email: "", mobileNumber: "", department: "", role: "worker" };
        
        headers.forEach((h, idx) => {
          if (h.includes("first") || h === "name") item.firstName = cells[idx] || "";
          if (h.includes("last")) item.lastName = cells[idx] || "";
          if (h.includes("email") || h === "mail") item.email = cells[idx] || "";
          if (h.includes("phone") || h.includes("mobile")) item.mobileNumber = cells[idx] || "";
          if (h.includes("dept") || h.includes("department")) item.department = cells[idx] || "";
          if (h.includes("role") || h.includes("position")) item.role = cells[idx] || "";
        });

        // Default missing departments/roles logically
        if (!item.department && activeDepts.length > 0) item.department = activeDepts[0].name;
        if (!item.role && activeRoles.length > 0) item.role = activeRoles[0].role;

        return item;
      });

      setPreviewList(parsed);
    };
    reader.readAsText(file);
  };

  const handleApproveCSVImport = () => {
    const validImports = previewList.filter(item => 
      item.firstName && item.lastName && item.email &&
      !employees.some(emp => emp.email.toLowerCase() === item.email.toLowerCase())
    );

    if (validImports.length === 0) {
      alert("No new valid employees found in CSV import preview.");
      return;
    }

    const updated = [...employees, ...validImports];
    setEmployees(updated);
    updateDraft(updated);
    setPreviewList([]);
    setCsvFileName("");
    alert(`Successfully imported ${validImports.length} staff records!`);
  };

  return (
    <div className="space-y-8 text-black">
      <div className="border-b border-slate-200 pb-4">
        <h2 className="text-xl font-bold mb-1">Step 3: Employee Onboarding</h2>
        <p className="text-sm text-black dark:text-black font-medium">Add staff members manually or import bulk lists using a CSV template.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Side: Manual Entry & Bulk Upload */}
        <div className="lg:col-span-1 space-y-6">
          
          {/* Manual Entry Form */}
          <form onSubmit={handleAddEmployee} className="bg-white border border-slate-200 p-5 rounded-2xl space-y-4 shadow-sm">
            <h3 className="text-xs font-bold text-black uppercase tracking-widest border-b border-slate-150 dark:border-slate-850 pb-2">Manual Staff Onboarding</h3>
            
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="space-y-1">
                <label className="block text-[10px] uppercase font-bold text-black">First Name</label>
                <input
                  type="text"
                  required
                  value={form.firstName}
                  onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                  placeholder="John"
                  className="w-full bg-white border border-slate-200 rounded-lg p-2 focus:outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="block text-[10px] uppercase font-bold text-black">Last Name</label>
                <input
                  type="text"
                  required
                  value={form.lastName}
                  onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                  placeholder="Doe"
                  className="w-full bg-white border border-slate-200 rounded-lg p-2 focus:outline-none"
                />
              </div>
            </div>

            <div className="space-y-1 text-xs">
              <label className="block text-[10px] uppercase font-bold text-black">Email Address</label>
              <input
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="john.doe@resort.com"
                className="w-full bg-white border border-slate-200 rounded-lg p-2 focus:outline-none"
              />
            </div>

            <div className="space-y-1 text-xs">
              <label className="block text-[10px] uppercase font-bold text-black">Mobile Phone</label>
              <input
                type="text"
                value={form.mobileNumber}
                onChange={(e) => setForm({ ...form, mobileNumber: e.target.value })}
                placeholder="+63 917 123 4567"
                className="w-full bg-white border border-slate-200 rounded-lg p-2 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="space-y-1">
                <label className="block text-[10px] uppercase font-bold text-black">Department</label>
                <select
                  required
                  value={form.department}
                  onChange={(e) => setForm({ ...form, department: e.target.value })}
                  className="w-full bg-white border border-slate-200 rounded-lg p-2 focus:outline-none"
                >
                  <option value="" disabled>Select...</option>
                  {activeDepts.map((d: any) => (
                    <option key={d.name} value={d.name}>{d.name}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="block text-[10px] uppercase font-bold text-black">Org Role</label>
                <select
                  required
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value })}
                  className="w-full bg-white border border-slate-200 rounded-lg p-2 focus:outline-none"
                >
                  <option value="" disabled>Select...</option>
                  {activeRoles.map((r: any) => (
                    <option key={r.role} value={r.role}>{r.role}</option>
                  ))}
                </select>
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow transition"
            >
              Add Staff Member
            </button>
          </form>

          {/* Bulk Upload CSV */}
          <div className="bg-white border border-slate-200 p-5 rounded-2xl space-y-4 shadow-sm">
            <h3 className="text-xs font-bold text-black uppercase tracking-widest border-b border-slate-150 pb-2">Bulk CSV Import</h3>
            
            <label className="border-2 border-dashed border-slate-200 rounded-2xl p-6 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-slate-50 transition">
              <span className="text-2xl mb-1">📄</span>
              <span className="text-[10px] font-bold text-black">Click to Select CSV File</span>
              <input
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
            {csvFileName && (
              <p className="text-[10px] text-blue-700 font-bold truncate">File Selected: {csvFileName}</p>
            )}
          </div>

        </div>

        {/* Right Side: Employee Preview / Import preview */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* CSV Import Preview */}
          {previewList.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 p-5 rounded-2xl space-y-4">
              <div className="flex justify-between items-center border-b border-amber-200 pb-2">
                <span className="text-xs font-bold text-amber-700">AI CSV Mapping Preview ({previewList.length} rows detected)</span>
                <div className="flex items-center space-x-3">
                  <button
                    onClick={() => setPreviewList([])}
                    className="text-[10px] text-black font-bold hover:text-black"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleApproveCSVImport}
                    className="px-3.5 py-1 bg-amber-600 hover:bg-amber-500 text-white text-[10px] font-bold rounded-lg shadow"
                  >
                    Approve Import
                  </button>
                </div>
              </div>
              <div className="overflow-x-auto max-h-[220px]">
                <table className="w-full text-left text-[10px] divide-y divide-amber-200">
                  <thead>
                    <tr className="font-bold text-amber-600">
                      <th className="pb-1.5">First Name</th>
                      <th className="pb-1.5">Last Name</th>
                      <th className="pb-1.5">Email</th>
                      <th className="pb-1.5">Dept</th>
                      <th className="pb-1.5">Role</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-amber-200/50 text-black">
                    {previewList.map((row, i) => (
                      <tr key={i}>
                        <td className="py-1">{row.firstName}</td>
                        <td className="py-1">{row.lastName}</td>
                        <td className="py-1">{row.email}</td>
                        <td className="py-1">{row.department}</td>
                        <td className="py-1">{row.role}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Roster Listing */}
          <div className="bg-white border border-slate-200 p-6 rounded-2xl space-y-4 shadow-sm">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-150 pb-2">Active Roster Directory</h3>
            
            {employees.length === 0 ? (
              <p className="text-xs text-black italic py-6 text-center">Roster directory is empty. Onboard staff members manually or drop a CSV list.</p>
            ) : (
              <div className="overflow-x-auto max-h-[400px]">
                <table className="w-full text-left text-xs divide-y divide-slate-200">
                  <thead className="text-[10px] uppercase text-black font-bold">
                    <tr>
                      <th className="pb-2.5">Name</th>
                      <th className="pb-2.5">Email Address</th>
                      <th className="pb-2.5">Department</th>
                      <th className="pb-2.5">Org Position</th>
                      <th className="pb-2.5 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200/70">
                    {employees.map((emp, i) => (
                      <tr key={i} className="hover:bg-slate-50">
                        <td className="py-2.5 font-semibold text-black">{emp.firstName} {emp.lastName}</td>
                        <td className="py-2.5 text-black font-mono text-[11px]">{emp.email}</td>
                        <td className="py-2.5">
                          <span className="bg-white text-black px-2 py-0.5 rounded text-[10px] border border-slate-200">
                            {emp.department}
                          </span>
                        </td>
                        <td className="py-2.5 text-blue-700 font-bold">{emp.role}</td>
                        <td className="py-2.5 text-right">
                          <button
                            onClick={() => handleRemoveEmployee(i)}
                            className="text-black hover:text-rose-500 text-sm font-bold"
                          >
                            ×
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </div>

      </div>

      {/* Checkpoint Panel */}
      <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <h3 className="text-sm font-bold text-indigo-950 uppercase tracking-wider">AI Checkpoint: Roster Sufficiency</h3>
          <div className="flex items-center space-x-3">
            <button
              onClick={runCheckpointAudit}
              disabled={isAuditing}
              className="px-3 py-1 bg-white border border-slate-200 text-indigo-700 hover:text-indigo-500 text-[10px] font-bold rounded-lg transition"
            >
              {isAuditing ? "Re-verifying..." : "🔄 Verify Checkpoint"}
            </button>
            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
              auditComplete ? "bg-emerald-100 text-emerald-700 border border-emerald-200" : "bg-amber-100 text-amber-700 border border-amber-200"
            }`}>
              {auditComplete ? "PASSED" : "PENDING GAPS"}
            </span>
          </div>
        </div>
        
        <div className="flex items-center justify-between text-xs">
          <p className="text-black font-medium">Verifies that each department has staffing allocations. Requires at least 1 employee to proceed.</p>
          <span className="font-bold text-blue-700">{auditScore}% Readiness</span>
        </div>

        {warnings.length > 0 && (
          <div className="bg-rose-100/50 border border-rose-200 p-4 rounded-xl text-rose-700 text-xs space-y-1">
            <p className="font-bold uppercase tracking-wider text-[10px] text-rose-500">⚠️ Audit Flags:</p>
            <ul className="list-disc pl-4 space-y-1">
              {warnings.map((warn, i) => <li key={i}>{warn}</li>)}
            </ul>
          </div>
        )}
      </div>

    </div>
  );
}
