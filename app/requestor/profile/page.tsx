'use client';

import { useEffect, useState } from 'react';
import { Building2, Mail, UserRound } from 'lucide-react';
import { requestorApi } from '@/features/requestor/api';
import type { RequestorProfile } from '@/features/requestor/types';

export default function RequestorProfilePage() {
  const [profile, setProfile] = useState<RequestorProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    requestorApi<RequestorProfile>('/api/requestor/me')
      .then((value) => { if (active) setProfile(value); })
      .catch((cause: unknown) => {
        if (active) setError(cause instanceof Error ? cause.message : 'Unable to load your profile.');
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  return (
    <div className="space-y-6">
      <header>
        <p className="text-sm font-medium text-emerald-700">Account</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">My Profile</h1>
        <p className="mt-2 text-sm text-slate-500">Profile details used to associate BrandCom requests with your account.</p>
      </header>
      {error && <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>}
      {loading ? (
        <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-500">Loading profile…</div>
      ) : profile ? (
        <section className="max-w-2xl rounded-xl border border-slate-200 bg-white">
          <div className="border-b border-slate-200 px-5 py-4">
            <h2 className="font-semibold text-slate-900">Account information</h2>
            <p className="mt-1 text-sm text-slate-500">To update these details, contact your system administrator.</p>
          </div>
          <dl className="divide-y divide-slate-100 px-5">
            <div className="flex items-center gap-4 py-4">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-500"><UserRound className="h-4 w-4" /></span>
              <div><dt className="text-xs text-slate-500">Name</dt><dd className="mt-1 text-sm font-medium text-slate-800">{profile.name}</dd></div>
            </div>
            <div className="flex items-center gap-4 py-4">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-500"><Mail className="h-4 w-4" /></span>
              <div><dt className="text-xs text-slate-500">Company email</dt><dd className="mt-1 text-sm font-medium text-slate-800">{profile.email}</dd></div>
            </div>
            <div className="flex items-center gap-4 py-4">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-500"><Building2 className="h-4 w-4" /></span>
              <div><dt className="text-xs text-slate-500">Department</dt><dd className="mt-1 text-sm font-medium text-slate-800">{profile.department ?? 'Not set'}</dd></div>
            </div>
          </dl>
        </section>
      ) : null}
    </div>
  );
}
