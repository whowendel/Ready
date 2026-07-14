"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function Home() {
  const [dbStatus, setDbStatus] = useState<"checking" | "connected" | "disconnected">("checking");
  const [dbError, setDbError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/health")
      .then(async (res) => {
        if (res.ok) {
          setDbStatus("connected");
        } else {
          setDbStatus("disconnected");
          const contentType = res.headers.get("content-type");
          if (contentType && contentType.includes("application/json")) {
            const data = await res.json();
            setDbError(data.error || "Unknown error");
          } else {
            setDbError(`Server error (${res.status}). Please make sure you have run 'npx prisma generate' and 'npx prisma db push'.`);
          }
        }
      })
      .catch((err) => {
        setDbStatus("disconnected");
        setDbError(err.message || String(err));
      });
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between selection:bg-indigo-500 selection:text-white relative overflow-hidden">
      {/* Background Glows */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-900/20 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-violet-950/20 blur-[120px] pointer-events-none" />

      {/* Header */}
      <header className="border-b border-slate-900/80 backdrop-blur-md sticky top-0 z-50 px-6 py-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <div className="h-9 w-9 rounded-lg bg-indigo-600 flex items-center justify-center font-bold text-white shadow-lg shadow-indigo-500/20">
              R
            </div>
            <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
              READY
            </span>
          </div>
          
          <div className="flex items-center space-x-4">
            {/* Database Health Badge */}
            <div className="flex items-center space-x-2 bg-slate-900/60 px-3.5 py-1.5 rounded-full border border-slate-800 text-xs">
              <span className={`h-2 w-2 rounded-full ${
                dbStatus === "connected" ? "bg-emerald-500 animate-pulse" :
                dbStatus === "disconnected" ? "bg-rose-500" :
                "bg-amber-500"
              }`} />
              <span className="text-slate-400 font-medium">
                {dbStatus === "connected" ? "DB Active" :
                 dbStatus === "disconnected" ? "DB Offline" :
                 "Checking DB..."}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-6 py-20 flex-grow flex flex-col justify-center relative z-10">
        <div className="max-w-3xl">
          <div className="inline-flex items-center space-x-2 bg-indigo-950/40 border border-indigo-900/50 text-indigo-400 px-4 py-1.5 rounded-full text-xs font-semibold tracking-wide uppercase mb-6">
            ✨ Silent Service Ecosystem
          </div>
          
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight leading-[1.1] mb-8 bg-gradient-to-br from-white via-slate-100 to-slate-500 bg-clip-text text-transparent">
            Freedom to disconnect.<br />
            Focus to deliver.
          </h1>
          
          <p className="text-slate-400 text-lg md:text-xl leading-relaxed mb-12 max-w-2xl">
            READY is an AI-driven, closed-loop task orchestration platform for modern hospitality.
            We eliminate operational noise, shield workers from notification fatigue, and restore digital boundaries.
          </p>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
            <Link 
              href="/login"
              className="px-8 py-4 bg-[#FF2E2E] hover:bg-red-500 text-white font-bold rounded-xl text-center shadow-lg shadow-red-600/20 hover:shadow-red-650/30 transition duration-200 transform hover:-translate-y-0.5"
            >
              Sign In to Ready
            </Link>
            
            <Link 
              href="/signup"
              className="px-8 py-4 bg-slate-900/80 hover:bg-slate-800 text-slate-350 hover:text-white font-bold rounded-xl text-center border border-slate-800 hover:border-slate-700 transition duration-200"
            >
              Register Hotel
            </Link>
          </div>

          {dbStatus === "disconnected" && (
            <div className="mt-8 p-4 bg-rose-950/30 border border-rose-900/50 rounded-xl text-rose-300 text-sm max-w-md">
              <p className="font-bold mb-1">Database Connection Warning</p>
              <p className="text-xs text-rose-400/90 leading-relaxed font-mono">
                {dbError || "Please ensure your PostgreSQL database is running via Docker Compose."}
              </p>
            </div>
          )}
        </div>

        {/* Feature Grid */}
        <section id="architecture" className="mt-32 grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Guest Card */}
          <div className="bg-slate-900/30 border border-slate-900 rounded-2xl p-8 hover:border-indigo-900/40 transition duration-300 group">
            <div className="h-12 w-12 rounded-xl bg-slate-900 flex items-center justify-center text-xl mb-6 group-hover:scale-110 transition duration-300">
              📱
            </div>
            <h3 className="text-lg font-bold text-white mb-3">1. Guest Interface</h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              No app downloads. Frictionless mobile WebApp triggered by scanning physical NTAG215 tokens in rooms. 
              Offers dynamic, location-contextual service choices.
            </p>
          </div>

          {/* Worker Card */}
          <div className="bg-slate-900/30 border border-slate-900 rounded-2xl p-8 hover:border-indigo-900/40 transition duration-300 group">
            <div className="h-12 w-12 rounded-xl bg-slate-900 flex items-center justify-center text-xl mb-6 group-hover:scale-110 transition duration-300">
              🛡️
            </div>
            <h3 className="text-lg font-bold text-white mb-3">2. Focus Shield</h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              Protects staff from technostress. Mutes non-urgent alerts during physical tasks,
              routing requests to idle workers, and utilizes Gemini for visual Quality Assurance.
            </p>
          </div>

          {/* Management Card */}
          <div className="bg-slate-900/30 border border-slate-900 rounded-2xl p-8 hover:border-indigo-900/40 transition duration-300 group">
            <div className="h-12 w-12 rounded-xl bg-slate-900 flex items-center justify-center text-xl mb-6 group-hover:scale-110 transition duration-300">
              📊
            </div>
            <h3 className="text-lg font-bold text-white mb-3">3. Management Console</h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              Human-in-the-loop override capabilities. Aggregated, real-time productivity analytics
              and shift handover scheduling logs without needing live micro-dispatching.
            </p>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900/50 py-8 px-6 text-center text-xs text-slate-600">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <p>© {new Date().getFullYear()} READY - Scaled Filipino Hospitality.</p>
          <div className="flex space-x-6 text-slate-500">
            <a href="https://nextjs.org" className="hover:text-slate-400">Next.js</a>
            <a href="https://prisma.io" className="hover:text-slate-400">Prisma</a>
            <a href="https://vercel.com" className="hover:text-slate-400">Vercel</a>
            <a href="https://docker.com" className="hover:text-slate-400">Docker</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
