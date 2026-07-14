"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function SignupPage() {
  const router = useRouter();
  const [hotelName, setHotelName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hotelName, email, password })
      });

      const data = await res.json();

      if (res.ok && data.success) {
        router.push("/onboarding");
      } else {
        setError(data.error || "Signup failed. Please try again.");
      }
    } catch (err: any) {
      console.error(err);
      setError("An error occurred. Please check database connection and try again.");
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

      {/* Main Signup Card */}
      <main className="max-w-md w-full mx-auto px-6 py-12 flex-grow flex flex-col justify-center">
        <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-md space-y-6">
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-black text-black tracking-tight">Register Hotel Property</h1>
            <p className="text-xs text-slate-800 font-semibold font-medium">Create a manager account and initialize the onboarding wizard.</p>
          </div>

          {error && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-blue-700 text-xs font-bold text-center">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-800 uppercase tracking-wider block">Hotel / Property Name</label>
              <input
                type="text"
                required
                value={hotelName}
                onChange={(e) => setHotelName(e.target.value)}
                placeholder="Grand Horizon Resort"
                className="w-full bg-white border border-slate-200 rounded-xl p-3 text-xs text-black font-semibold focus:outline-none focus:border-blue-400"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-800 uppercase tracking-wider block">Admin Email Address</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="manager@horizon.com"
                className="w-full bg-white border border-slate-200 rounded-xl p-3 text-xs text-black font-semibold focus:outline-none focus:border-blue-400"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-800 uppercase tracking-wider block">Account Password</label>
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
              {loading ? "Registering Property..." : "Create Account & Start Setup"}
            </button>
          </form>

          <div className="text-center pt-2 text-xs text-slate-800 border-t border-slate-100 font-semibold">
            Already have an account?{" "}
            <Link href="/login" className="text-blue-600 font-bold hover:underline">
              Sign In
            </Link>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 py-6 text-center text-xs text-slate-400">
        <p>© {new Date().getFullYear()} READY. Operational Dashboard. Disconnected by Design.</p>
      </footer>
    </div>
  );
}
