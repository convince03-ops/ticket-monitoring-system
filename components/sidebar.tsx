import { Clock3, LayoutDashboard, ListChecks, Palette, Settings, ShieldCheck, Sparkles, Users, Zap } from "lucide-react";
import Link from "next/link";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/tickets", label: "Ticket Monitoring", icon: ListChecks },
  { href: "/calendar", label: "Calendar", icon: Clock3 },
  { href: "/designers", label: "Designers", icon: Users },
  { href: "/departments", label: "Departments", icon: ShieldCheck },
  { href: "/sla", label: "Materials & SLA", icon: Sparkles },
  { href: "/reports", label: "Reports", icon: Zap },
  { href: "/activity", label: "Activity Log", icon: Palette },
  { href: "/settings", label: "Settings", icon: Settings }
];

export function Sidebar() {
  return (
    <aside className="sticky top-0 h-screen w-72 border-r border-slate-200 bg-slate-50 px-6 py-8">
      <div className="mb-10 flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-500 text-white shadow-soft">
          T
        </div>
        <div>
          <p className="text-sm uppercase tracking-[0.24em] text-slate-500">Multimedia</p>
          <h1 className="text-lg font-semibold text-slate-950">Ticket Monitor</h1>
        </div>
      </div>

      <nav className="space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className="group flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-100 hover:text-brand-600"
            >
              <Icon className="h-4 w-4 transition group-hover:text-brand-600" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
