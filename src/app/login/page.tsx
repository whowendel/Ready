"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const [roleType, setRoleType] = useState<"hotel" | "worker">("hotel");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, roleType })
      });

      const contentType = res.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        const data = await res.json();

        if (res.ok && data.success) {
          if (data.role === "worker") {
            router.push("/worker");
          } else {
            if (data.onboardingCompleted) {
              router.push("/dashboard");
            } else {
              router.push("/onboarding");
            }
          }
        } else {
          setError(data.error || "Login failed. Please check your credentials.");
        }
      } else {
        setError(`Server error (${res.status}). Please make sure you have run 'npx prisma generate' and 'npx prisma db push'.`);
      }
    } catch (err: any) {
      console.error(err);
      setError("An error occurred during login. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col justify-between selection:bg-blue-500 selection:text-white">
      
      {/* Header */}
      <header className="border-b border-slate-200 bg-white px-6 py-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <div className="h-9 w-20 bg-blue-600 flex items-center justify-center font-black text-white text-[11px] rounded-lg tracking-wider shadow-md select-none">
              READY.
            </div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest pl-3 border-l border-slate-200 ml-1">
              Operational Gate
            </span>
          </div>
          <Link
            href="/"
            className="text-xs font-bold text-slate-655 hover:text-black transition"
          >
            Back to Home
          </Link>
        </div>
      </header>

      {/* Main Login Card Container */}
      <main className="max-w-md w-full mx-auto px-6 py-12 flex-grow flex flex-col justify-center">
        <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-md space-y-6">
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-black text-black tracking-tight">Sign In to Ready</h1>
            <p className="text-xs text-slate-800 font-semibold">Enter your credentials to access the operational network.</p>
          </div>

          {/* Role Switcher tabs */}
          <div className="flex bg-slate-100 p-1.5 rounded-xl border border-slate-200">
            <button
              onClick={() => {
                setRoleType("hotel");
                setError(null);
              }}
              className={`flex-1 py-2.5 text-center text-xs font-bold rounded-lg transition-all ${
                roleType === "hotel"
                  ? "bg-white text-black shadow-sm"
                  : "text-slate-800 hover:text-black"
              }`}
            >
              Hotel Management
            </button>
            <button
              onClick={() => {
                setRoleType("worker");
                setError(null);
              }}
              className={`flex-1 py-2.5 text-center text-xs font-bold rounded-lg transition-all ${
                roleType === "worker"
                  ? "bg-white text-black shadow-sm"
                  : "text-slate-800 hover:text-black"
              }`}
            >
              Hotel Worker
            </button>
          </div>

          {error && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-blue-700 text-xs font-bold text-center">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-800 uppercase tracking-wider block">Email Address</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={roleType === "worker" ? "worker@hotel.com" : "admin@nexus.com"}
                className="w-full bg-white border border-slate-200 rounded-xl p-3 text-xs text-black font-semibold focus:outline-none focus:border-blue-400"
              />
            </div>

            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <label className="text-[10px] font-bold text-slate-800 uppercase tracking-wider block">Password</label>
              </div>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-white border border-slate-200 rounded-xl p-3 text-xs text-black font-semibold focus:outline-none focus:border-blue-400"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md transition disabled:opacity-50 uppercase tracking-wider mt-2 cursor-pointer"
            >
              {loading ? "Authorizing..." : "Log In"}
            </button>
          </form>

          {roleType === "hotel" && (
            <div className="text-center pt-2 text-xs text-slate-800 border-t border-slate-100 font-semibold">
              New property owner?{" "}
              <Link href="/signup" className="text-blue-600 font-bold hover:underline">
                Register Hotel
              </Link>
            </div>
          )}
          
          {roleType === "worker" && (
            <div className="text-center pt-2 text-[10px] text-slate-400 border-t border-slate-100 font-medium italic">
              Note: Worker accounts are created and configured by your Hotel Administrator in the Staff & Roster tab.
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 py-6 text-center text-xs text-slate-400">
        <p>© {new Date().getFullYear()} READY. Operational Dashboard. Disconnected by Design.</p>
      </footer>
    </div>
  );
}
