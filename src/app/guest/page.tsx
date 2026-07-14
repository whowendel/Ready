"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";

function GuestDashboardContent() {
  const searchParams = useSearchParams();
  const tagId = searchParams.get("tagId");

  const [tagConfig, setTagConfig] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Guest order states
  const [cart, setCart] = useState<Record<string, number>>({});
  const [customText, setCustomText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Active task tracker states
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [activeTask, setActiveTask] = useState<any>(null);
  const [showClosedSuccess, setShowClosedSuccess] = useState(false);

  // FAQ & Policies local search states
  const [searchQuery, setSearchQuery] = useState("");
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<{ faqs: any[]; policies: any[]; facilities: any[] } | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim() || !tagConfig?.hotel?.id) return;
    setSearchLoading(true);
    setHasSearched(true);
    try {
      const res = await fetch(`/api/guest/search?query=${encodeURIComponent(searchQuery.trim())}&hotelId=${tagConfig.hotel.id}`);
      if (res.ok) {
        const data = await res.json();
        setSearchResults(data);
      } else {
        console.error("Search failed");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSearchLoading(false);
    }
  };

  // Load tag configuration
  useEffect(() => {
    if (!tagId) {
      setError("Please scan a valid NFC tag to access the Guest Dashboard.");
      setLoading(false);
      return;
    }

    const fetchTagConfig = async () => {
      try {
        const res = await fetch(`/api/guest/nfc?tagId=${tagId}`);
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || "Failed to load NFC configurator.");
        }
        const data = await res.json();
        setTagConfig(data.tag);
      } catch (err: any) {
        setError(err.message || String(err));
      } finally {
        setLoading(false);
      }
    };

    fetchTagConfig();

    // Check if there is an active task in localStorage
    const savedTaskId = localStorage.getItem(`ready_active_task_${tagId}`);
    if (savedTaskId) {
      setActiveTaskId(savedTaskId);
    }
  }, [tagId]);

  // Poll active task status
  useEffect(() => {
    if (!activeTaskId) return;

    let isSubscribed = true;

    const pollTaskStatus = async () => {
      try {
        const res = await fetch(`/api/guest/task?taskId=${activeTaskId}`);
        if (!res.ok) return;
        const data = await res.json();
        if (isSubscribed) {
          setActiveTask(data.task);
          // If task completed, don't auto-remove from localStorage yet, let them rate it or close it
        }
      } catch (err) {
        console.error("Error polling task:", err);
      }
    };

    pollTaskStatus();
    const interval = setInterval(pollTaskStatus, 3000);

    return () => {
      isSubscribed = false;
      clearInterval(interval);
    };
  }, [activeTaskId]);

  const handleServiceRequest = async (service: any) => {
    if (submitting || activeTaskId) return;
    setSubmitting(true);

    try {
      const res = await fetch("/api/guest/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tagId,
          requestType: "service",
          serviceName: service.name,
          deptName: service.dept,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data.error || "Failed to submit request.");
        return;
      }

      const data = await res.json();
      setActiveTaskId(data.task.id);
      localStorage.setItem(`ready_active_task_${tagId}`, data.task.id);
    } catch (err) {
      console.error(err);
      alert("Error submitting request.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCustomRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting || !customText.trim() || activeTaskId) return;
    setSubmitting(true);

    try {
      const res = await fetch("/api/guest/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tagId,
          requestType: "others",
          text: customText.trim(),
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data.error || "Failed to submit request.");
        return;
      }

      const data = await res.json();
      setActiveTaskId(data.task.id);
      localStorage.setItem(`ready_active_task_${tagId}`, data.task.id);
      setCustomText("");
    } catch (err) {
      console.error(err);
      alert("Error submitting request.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleFoodOrder = async () => {
    const items = Object.entries(cart)
      .filter(([_, qty]) => qty > 0)
      .map(([name, qty]) => ({ name, quantity: qty }));

    if (items.length === 0 || submitting || activeTaskId) return;
    setSubmitting(true);

    try {
      const res = await fetch("/api/guest/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tagId,
          requestType: "order",
          items,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data.error || "Failed to submit food order.");
        return;
      }

      const data = await res.json();
      setActiveTaskId(data.task.id);
      localStorage.setItem(`ready_active_task_${tagId}`, data.task.id);
      setCart({});
    } catch (err) {
      console.error(err);
      alert("Error submitting food order.");
    } finally {
      setSubmitting(false);
    }
  };

  const updateCartQty = (itemName: string, delta: number) => {
    setCart((prev) => {
      const current = prev[itemName] || 0;
      const next = Math.max(0, current + delta);
      return { ...prev, [itemName]: next };
    });
  };

  const closeTaskLoop = () => {
    // Scrub active task from guest screen and local storage
    if (tagId) {
      localStorage.removeItem(`ready_active_task_${tagId}`);
    }
    setActiveTaskId(null);
    setActiveTask(null);
    setShowClosedSuccess(true);
    setTimeout(() => setShowClosedSuccess(false), 4000);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-350 text-xs font-bold font-mono">
        LOADING CONTEXTUAL SERVICE GUEST PORTAL...
      </div>
    );
  }

  if (error || !tagConfig) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 space-y-4 text-center">
        <p className="text-sm font-bold text-red-500">{error || "Invalid tag scan."}</p>
        <p className="text-xs text-slate-400">Please scan a physical NTAG215 tag placed in your room or facility area.</p>
      </div>
    );
  }

  const brandColor = tagConfig.hotel.brandColor || "#4F46E5";

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      {/* Smartphone Device Frame Container */}
      <div className="w-[375px] h-[780px] bg-slate-900 rounded-[48px] shadow-2xl p-3 border-4 border-slate-950 flex flex-col relative overflow-hidden">
        
        {/* Device Notch Speaker */}
        <div className="absolute top-3 left-1/2 transform -translate-x-1/2 w-32 h-4.5 bg-slate-950 rounded-b-xl z-50 flex items-center justify-center">
          <div className="w-12 h-1 bg-slate-800 rounded-full" />
        </div>

        {/* Inner Screen */}
        <div className="flex-grow bg-slate-950 rounded-[38px] overflow-hidden flex flex-col relative text-slate-100 justify-between">
          
          {/* Header Banner */}
          <div className="bg-slate-900/80 border-b border-slate-800/60 pt-6 px-4 pb-3 flex justify-between items-center z-40">
            <div>
              <span className="text-[9px] uppercase font-bold text-slate-500 tracking-wider block">{tagConfig.hotel.name}</span>
              <span className="text-xs font-black tracking-widest text-white">READY GUEST</span>
            </div>
            
            <div className="flex items-center space-x-1">
              <span className="text-[9px] font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                Room {tagConfig.roomNumber}
              </span>
            </div>
          </div>

          {/* Context Title Info Block */}
          <div className="px-4 py-3 bg-slate-900/40 border-b border-slate-800/40 flex justify-between items-center text-xs">
            <div>
              <p className="font-extrabold text-white text-[10px] uppercase tracking-wider">{tagConfig.location} Console</p>
              <h2 className="text-sm font-black text-slate-200">{tagConfig.displayName}</h2>
            </div>
          </div>

          {/* Main Scrollable Content */}
          <div className="flex-grow overflow-y-auto p-4 space-y-4">
            
            {/* Loop Closing Notification */}
            {showClosedSuccess && (
              <div className="p-3 bg-emerald-950/40 border border-emerald-800/50 rounded-xl text-center text-xs text-emerald-300 font-bold animate-pulse">
                👍 Thank you! Loop closed successfully. Enjoy your silent rest.
              </div>
            )}

            {/* TASK TRACKER (Loop Closing Module) */}
            {activeTaskId && (
              <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl space-y-3 shadow-md">
                <div className="flex justify-between items-center">
                  <span className="text-[9px] uppercase font-bold text-slate-500 tracking-widest">Active Request Status</span>
                  {activeTask?.isOverloaded ? (
                    <span className="text-[9px] bg-red-500/10 text-red-400 border border-red-500/20 px-2 py-0.5 rounded font-black animate-pulse">
                      Focus Shield Clamp Active
                    </span>
                  ) : (
                    <span className="text-[9px] bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-2 py-0.5 rounded font-bold">
                      In Queue
                    </span>
                  )}
                </div>

                <div className="space-y-1.5">
                  <h4 className="text-xs font-bold text-white">{activeTask?.name || "Initializing..."}</h4>
                  <p className="text-[10px] text-slate-400">ID: {activeTaskId} • {activeTask?.dept || tagConfig.location}</p>
                </div>

                {/* Progress Visual Tracker */}
                <div className="pt-2 border-t border-slate-800/55 space-y-3">
                  <div className="grid grid-cols-3 text-center text-[9px] font-bold">
                    <span className={activeTask?.status === "backlog" || activeTask?.status === "in_progress" || activeTask?.status === "completed" ? "text-indigo-400" : "text-slate-600"}>
                      ● Sent
                    </span>
                    <span className={activeTask?.status === "in_progress" || activeTask?.status === "completed" ? "text-indigo-400" : "text-slate-600"}>
                      ● Assigned
                    </span>
                    <span className={activeTask?.status === "completed" ? "text-emerald-400" : "text-slate-600"}>
                      ● Resolved
                    </span>
                  </div>

                  <div className="w-full bg-slate-800 h-1 rounded-full overflow-hidden">
                    <div 
                      className="bg-indigo-500 h-full transition-all duration-500" 
                      style={{ 
                        width: activeTask?.status === "completed" ? "100%" : 
                               activeTask?.status === "in_progress" ? "66%" : "33%" 
                      }} 
                    />
                  </div>

                  {activeTask?.workerName && activeTask.status === "in_progress" && (
                    <p className="text-[10px] text-slate-350 text-center italic">
                      Worker assigned: <strong className="text-white">{activeTask.workerName}</strong>
                    </p>
                  )}

                  {activeTask?.isOverloaded && (
                    <p className="text-[9px] text-red-400 text-center leading-relaxed">
                      ⚠️ Staff is currently at peak capacity. To protect them from digital burnout, your task is queued in backlog and will be dispatched once staff is idle.
                    </p>
                  )}
                </div>

                {activeTask?.status === "completed" && (
                  <button
                    onClick={closeTaskLoop}
                    className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-600/10 transition mt-2 flex items-center justify-center space-x-1"
                  >
                    <span>👍 Tap to Confirm Satisfaction & Close Loop</span>
                  </button>
                )}
              </div>
            )}

            {/* CONTEXTUAL ACTION BUTTONS */}
            {!activeTaskId && tagConfig.services && tagConfig.services.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">Context Requests</h3>
                <div className="grid grid-cols-1 gap-2">
                  {tagConfig.services.map((svc: any, idx: number) => (
                    <button
                      key={idx}
                      onClick={() => handleServiceRequest(svc)}
                      disabled={submitting}
                      className="w-full p-3 bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-xl text-left text-xs font-bold text-slate-200 transition flex justify-between items-center group active:scale-95"
                    >
                      <div>
                        <span>{svc.name}</span>
                        <span className="block text-[8px] text-slate-500 font-medium uppercase mt-0.5">{svc.dept}</span>
                      </div>
                      <span 
                        className="text-xs transition group-hover:translate-x-1" 
                        style={{ color: brandColor }}
                      >
                        →
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* FOOD ORDER MENU (If F&B Context) */}
            {!activeTaskId && tagConfig.menuItems && tagConfig.menuItems.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">F&B Menu Ordering</h3>
                <div className="space-y-2 max-h-[240px] overflow-y-auto pr-1">
                  {tagConfig.menuItems.map((item: any, idx: number) => {
                    const qty = cart[item.name] || 0;
                    return (
                      <div key={idx} className="p-3 bg-slate-900 border border-slate-800 rounded-xl text-xs flex justify-between items-center shadow-sm">
                        <div>
                          <p className="font-bold text-white">{item.name}</p>
                          <p className="text-[10px] text-slate-400 font-bold mt-0.5">${Number(item.price).toFixed(2)}</p>
                        </div>
                        <div className="flex items-center space-x-2.5">
                          <button
                            onClick={() => updateCartQty(item.name, -1)}
                            className="w-6 h-6 rounded-lg bg-slate-800 text-white flex items-center justify-center font-black active:bg-slate-700"
                          >
                            -
                          </button>
                          <span className="w-4 text-center font-bold text-white text-xs">{qty}</span>
                          <button
                            onClick={() => updateCartQty(item.name, 1)}
                            className="w-6 h-6 rounded-lg bg-slate-800 text-white flex items-center justify-center font-black active:bg-slate-700"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {Object.values(cart).some(q => q > 0) && (
                  <button
                    onClick={handleFoodOrder}
                    disabled={submitting}
                    className="w-full py-3 text-white font-bold text-xs rounded-xl shadow-lg transition duration-200"
                    style={{ backgroundColor: brandColor }}
                  >
                    Place Food Order (${Object.entries(cart).reduce((sum, [name, qty]) => {
                      const item = tagConfig.menuItems.find((m: any) => m.name === name);
                      return sum + (item ? item.price * qty : 0);
                    }, 0).toFixed(2)})
                  </button>
                )}
              </div>
            )}

            {/* HOTEL RULES & FAQ SEARCH (Deterministic API lookup) */}
            {!activeTaskId && (
              <div className="space-y-2">
                <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">Hotel Rules & FAQ Search</h3>
                <div className="bg-slate-900 border border-slate-800 p-3 rounded-2xl space-y-3">
                  <form onSubmit={handleSearch} className="flex space-x-2">
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Ask about checkout, pool, smoking penalties..."
                      className="flex-grow bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-slate-700"
                    />
                    <button
                      type="submit"
                      disabled={searchLoading || !searchQuery.trim()}
                      className="px-3 py-2 bg-indigo-650 hover:bg-indigo-550 disabled:bg-slate-800 text-white font-bold text-xs rounded-xl transition active:scale-95"
                    >
                      {searchLoading ? "..." : "Search"}
                    </button>
                  </form>

                  {/* Search Results Accordion */}
                  {hasSearched && searchResults && (
                    <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-1 text-xs">
                      {searchResults.faqs.length === 0 && searchResults.policies.length === 0 && searchResults.facilities.length === 0 ? (
                        <p className="text-[10px] text-slate-450 italic text-center py-2">No matching rules or FAQs found.</p>
                      ) : (
                        <>
                          {/* Policies */}
                          {searchResults.policies.length > 0 && (
                            <div className="space-y-1.5">
                              <p className="text-[9px] uppercase font-bold text-indigo-400 tracking-wider">Policies</p>
                              {searchResults.policies.map((p: any, idx: number) => (
                                <div key={idx} className="p-2 bg-slate-950 rounded-lg border border-slate-800/60">
                                  <p className="font-extrabold text-white text-[11px]">{p.topic}</p>
                                  <p className="text-[10px] text-slate-350 mt-0.5 leading-relaxed">{p.rule}</p>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* FAQs */}
                          {searchResults.faqs.length > 0 && (
                            <div className="space-y-1.5 mt-2">
                              <p className="text-[9px] uppercase font-bold text-emerald-400 tracking-wider">FAQs</p>
                              {searchResults.faqs.map((f: any, idx: number) => (
                                <div key={idx} className="p-2 bg-slate-950 rounded-lg border border-slate-800/60">
                                  <p className="font-extrabold text-white text-[11px]">Q: {f.question}</p>
                                  <p className="text-[10px] text-slate-350 mt-0.5 leading-relaxed">A: {f.answer}</p>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Facilities */}
                          {searchResults.facilities.length > 0 && (
                            <div className="space-y-1.5 mt-2">
                              <p className="text-[9px] uppercase font-bold text-amber-400 tracking-wider">Facility Hours</p>
                              {searchResults.facilities.map((fac: any, idx: number) => (
                                <div key={idx} className="p-2 bg-slate-950 rounded-lg border border-slate-800/60">
                                  <p className="font-extrabold text-white text-[11px]">{fac.name}</p>
                                  {fac.description && <p className="text-[10px] text-slate-350 mt-0.5">{fac.description}</p>}
                                  {fac.operatingHours && (
                                    <p className="text-[10px] text-amber-300 font-bold mt-0.5">
                                      Hours: {(fac.operatingHours as any).open} - {(fac.operatingHours as any).close}
                                    </p>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* OTHERS: AI DISPATCHER INPUT */}
            {!activeTaskId && (
              <div className="space-y-2">
                <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">Other Assistance</h3>
                <form onSubmit={handleCustomRequest} className="bg-slate-900 border border-slate-800 p-3 rounded-2xl space-y-2">
                  <textarea
                    rows={2}
                    required
                    value={customText}
                    onChange={(e) => setCustomText(e.target.value)}
                    placeholder="Describe what you need in natural language (e.g. 'My room AC is leaking water...')"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-slate-700 resize-none"
                  />
                  <button
                    type="submit"
                    disabled={submitting || !customText.trim()}
                    className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl transition duration-150 active:scale-95"
                  >
                    Route to AI Dispatcher
                  </button>
                </form>
              </div>
            )}

          </div>

          {/* Footer Branding */}
          <div className="bg-slate-900/60 p-3 text-center border-t border-slate-800/40 text-[8px] text-slate-655 uppercase tracking-widest font-mono rounded-b-[38px] sticky bottom-0 z-40">
            Powered by READY Silent Service Ecosystem
          </div>

        </div>
      </div>
    </div>
  );
}

export default function GuestDashboard() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-350 text-xs font-bold font-mono">
        LOADING CONTEXTUAL SERVICE GUEST PORTAL...
      </div>
    }>
      <GuestDashboardContent />
    </Suspense>
  );
}
