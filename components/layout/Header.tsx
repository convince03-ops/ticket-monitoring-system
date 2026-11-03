"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, LogOut, X } from "lucide-react";
import { supabase } from "@/lib/auth";
import { RequestorAssistant } from "@/features/requestor/RequestorAssistant";

export function Header() {
  const router = useRouter();
  const [showNotifications, setShowNotifications] = useState(false);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  return (
    <>
      <header className="dashboard-header relative mb-5 flex items-center justify-between gap-4 border-b border-slate-200/80 pb-3">
        <p className="text-sm font-medium text-slate-500">Ticket Monitoring <span className="mx-1.5 text-slate-300">/</span> Workspace</p>
        <div className="flex items-center gap-3">
          <button
            aria-label="Show notifications"
            onClick={() => setShowNotifications((current) => !current)}
            className="rounded-lg border border-slate-200 bg-white p-2.5 text-slate-600 transition hover:bg-slate-50"
          >
            <Bell className="h-5 w-5" />
          </button>
          <button
            onClick={() => void handleSignOut()}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </div>
        {showNotifications && (
          <div className="absolute right-0 top-14 z-20 w-80 rounded-xl border border-slate-200 bg-white p-4 shadow-[0_12px_30px_rgba(31,41,55,0.12)]">
            <div className="flex items-center justify-between">
              <p className="font-semibold text-slate-950">Notifications</p>
              <button aria-label="Close notifications" onClick={() => setShowNotifications(false)} className="text-slate-400 hover:text-slate-700">
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="mt-3 text-sm text-slate-600">You are all caught up.</p>
          </div>
        )}
      </header>
      <RequestorAssistant />
    </>
  );
}
