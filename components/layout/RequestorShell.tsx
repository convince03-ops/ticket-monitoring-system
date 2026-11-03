'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Bell, LayoutDashboard, LogOut, Menu, UserRound, X, ClipboardList } from 'lucide-react';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/auth';
import { requestorApi } from '@/features/requestor/api';
import type { RequestorProfile } from '@/features/requestor/types';
import { RequestorAssistant } from '@/features/requestor/RequestorAssistant';

const navigation = [
  { href: '/requestor/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/requestor/requests', label: 'My Requests', icon: ClipboardList },
  { href: '/requestor/notifications', label: 'Notifications', icon: Bell },
  { href: '/requestor/profile', label: 'My Profile', icon: UserRound },
];

export function RequestorShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [profile, setProfile] = useState<RequestorProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    let active = true;
    requestorApi<RequestorProfile>('/api/requestor/me')
      .then((value) => {
        if (active) setProfile(value);
      })
      .catch((cause: unknown) => {
        if (!active) return;
        const message = cause instanceof Error ? cause.message : 'Unable to verify your account.';
        if (message.includes('session has expired')) {
          router.replace('/login');
        } else {
          setError(message);
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => { active = false; };
  }, [router]);

  const signOut = async () => {
    const { error: signOutError } = await supabase.auth.signOut();
    if (signOutError) {
      setError('Unable to sign out. Please try again.');
      return;
    }
    router.replace('/login');
  };

  const links = navigation.map(({ href, label, icon: Icon }) => {
    const active = pathname === href || (href === '/requestor/requests' && pathname.startsWith(`${href}/`));
    return (
      <Link
        key={href}
        href={href}
        onClick={() => setMenuOpen(false)}
        aria-current={active ? 'page' : undefined}
        className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
          active ? 'bg-emerald-50 text-emerald-800' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
        }`}
      >
        <Icon aria-hidden="true" className="h-4 w-4" />
        {label}
      </Link>
    );
  });

  return (
    <div className="min-h-screen bg-[#f5f7fa] text-slate-900">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur-sm">
        <div className="mx-auto flex h-16 max-w-[1440px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMenuOpen((open) => !open)}
              aria-label={menuOpen ? 'Close navigation' : 'Open navigation'}
              aria-expanded={menuOpen}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 lg:hidden"
            >
              {menuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </button>
            <Link href="/requestor/dashboard" className="text-sm font-bold tracking-tight text-slate-900">
              BrandCom <span className="font-medium text-slate-500">· Requestor Portal</span>
            </Link>
          </div>
          <div className="flex items-center gap-3">
            {!loading && profile && (
              <span className="hidden max-w-48 truncate text-sm text-slate-600 sm:inline">{profile.name}</span>
            )}
            <button
              type="button"
              onClick={() => void signOut()}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
            >
              <LogOut aria-hidden="true" className="h-4 w-4" />
              <span className="hidden sm:inline">Sign out</span>
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-[1440px] gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[220px_minmax(0,1fr)] lg:px-8 lg:py-8">
        <aside className="hidden lg:block">
          <nav aria-label="Requestor navigation" className="sticky top-24 space-y-1">
            {links}
          </nav>
          <p className="mt-8 border-t border-slate-200 pt-4 text-xs leading-5 text-slate-500">
            Follow the progress of your BrandCom requests and keep up with team updates.
          </p>
        </aside>

        {menuOpen && (
          <nav aria-label="Mobile requestor navigation" className="grid gap-1 rounded-xl border border-slate-200 bg-white p-2 lg:hidden">
            {links}
          </nav>
        )}

        <main className="min-w-0">
          {loading ? (
            <div className="rounded-xl border border-slate-200 bg-white p-8 text-sm text-slate-500">Verifying your account…</div>
          ) : error ? (
            <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-800">
              <p className="font-semibold">Portal unavailable</p>
              <p className="mt-1">{error}</p>
            </div>
          ) : profile ? children : null}
        </main>
      </div>
      {profile && !loading && !error && <RequestorAssistant endpoint="/api/requestor/assistant" scope="requestor" />}
    </div>
  );
}
