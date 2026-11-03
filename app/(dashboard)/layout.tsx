import { ReactNode } from "react";
import { Header } from "@/components/layout/Header";
import { Sidebar } from "@/components/layout/Sidebar";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="dashboard-shell text-slate-950">
      <div className="mx-auto flex w-full max-w-[1800px] flex-col gap-3 px-4 py-4 sm:px-6 lg:gap-4 lg:px-8 lg:py-5">
        <Sidebar />
        <main className="dashboard-content min-w-0 flex-1">
          <Header />
          {children}
        </main>
      </div>
    </div>
  );
}
