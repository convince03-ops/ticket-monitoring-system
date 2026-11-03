'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ArrowRight, CheckCircle2, CircleAlert, Clock3, Files, RefreshCw } from 'lucide-react';
import { formatRelativeDate, requestorApi } from '@/features/requestor/api';
import { EmptyRequests, RequestLink, StatusBadge } from '@/features/requestor/components';
import { useRequestorTickets } from '@/features/requestor/useTickets';
import type { RequestorActivity, RequestorProfile, RequestorStatus } from '@/features/requestor/types';

const cards: Array<{ status: RequestorStatus | null; label: string; icon: typeof Files; tone: string }> = [
  { status: null, label: 'Total requests', icon: Files, tone: 'bg-slate-100 text-slate-600' },
  { status: 'PENDING_REVIEW', label: 'Pending review', icon: Clock3, tone: 'bg-amber-50 text-amber-700' },
  { status: 'IN_PROGRESS', label: 'In progress', icon: RefreshCw, tone: 'bg-blue-50 text-blue-700' },
  { status: 'NEEDS_ACTION', label: 'Needs action', icon: CircleAlert, tone: 'bg-orange-50 text-orange-700' },
  { status: 'COMPLETED', label: 'Completed', icon: CheckCircle2, tone: 'bg-emerald-50 text-emerald-700' },
];

export default function RequestorDashboardPage() {
  const { tickets, loading, error } = useRequestorTickets();
  const [profile, setProfile] = useState<RequestorProfile | null>(null);
  const [updates, setUpdates] = useState<Array<RequestorActivity & { ticketId: string; ticketNumber: string }>>([]);

  useEffect(() => {
    requestorApi<RequestorProfile>('/api/requestor/me').then(setProfile).catch(() => undefined);
    requestorApi<Array<RequestorActivity & { ticketId: string; ticketNumber: string }>>('/api/requestor/notifications')
      .then((items) => setUpdates(items.slice(0, 3)))
      .catch(() => undefined);
  }, []);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  const count = (status: RequestorStatus | null) => status ? tickets.filter((ticket) => ticket.status === status).length : tickets.length;

  return (
    <div className="space-y-6">
      <section>
        <p className="text-sm font-medium text-emerald-700">Request overview</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
          {greeting}{profile?.name ? `, ${profile.name.split(' ')[0]}` : ''}
        </h1>
        <p className="mt-2 text-sm text-slate-500">Track your BrandCom requests and stay up to date on their progress.</p>
      </section>

      {error && <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>}

      <section aria-label="Request summary" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {cards.map(({ status, label, icon: Icon, tone }) => (
          <div key={label} className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex items-center justify-between gap-3">
              <span className={`flex h-10 w-10 items-center justify-center rounded-full ${tone}`}>
                <Icon aria-hidden="true" className="h-5 w-5" />
              </span>
              <span className="text-2xl font-semibold tabular-nums text-slate-900">{loading ? '—' : count(status)}</span>
            </div>
            <p className="mt-3 text-sm text-slate-600">{label}</p>
          </div>
        ))}
      </section>

      <section className="rounded-xl border border-slate-200 bg-white">
        <div className="flex items-center justify-between gap-4 border-b border-slate-200 px-5 py-4">
          <div>
            <h2 className="font-semibold text-slate-900">Recent requests</h2>
            <p className="mt-1 text-xs text-slate-500">Your latest BrandCom tickets</p>
          </div>
          <Link href="/requestor/requests" className="inline-flex items-center gap-1 text-sm font-medium text-emerald-700 hover:text-emerald-900">
            View all <ArrowRight aria-hidden="true" className="h-4 w-4" />
          </Link>
        </div>
        {loading ? (
          <div className="p-6 text-sm text-slate-500">Loading your requests…</div>
        ) : tickets.length === 0 ? (
          <div className="p-5"><EmptyRequests /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="bg-slate-50 text-xs font-medium uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-3">Ticket ID</th>
                  <th className="px-5 py-3">Request title</th>
                  <th className="px-5 py-3">Category</th>
                  <th className="px-5 py-3">Submitted</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Priority</th>
                  <th className="px-5 py-3">Updated</th>
                  <th className="px-5 py-3"> </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {tickets.slice(0, 6).map((ticket) => (
                  <tr key={ticket.id} className="hover:bg-slate-50/70">
                    <td className="px-5 py-3 font-medium text-slate-700">{ticket.ticketNumber}</td>
                    <td className="max-w-56 truncate px-5 py-3 font-medium text-slate-900">{ticket.title}</td>
                    <td className="px-5 py-3 text-slate-600">{ticket.category}</td>
                    <td className="px-5 py-3 text-slate-600">{formatRelativeDate(ticket.submissionDate)}</td>
                    <td className="px-5 py-3"><StatusBadge status={ticket.status} /></td>
                    <td className="px-5 py-3 text-slate-600">{ticket.priority.charAt(0) + ticket.priority.slice(1).toLowerCase()}</td>
                    <td className="px-5 py-3 text-slate-600">{formatRelativeDate(ticket.updatedAt)}</td>
                    <td className="px-5 py-3"><RequestLink ticket={ticket} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="rounded-xl border border-slate-200 bg-white">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <div>
            <h2 className="font-semibold text-slate-900">Latest updates</h2>
            <p className="mt-1 text-xs text-slate-500">Recent changes to your requests</p>
          </div>
          <Link href="/requestor/notifications" className="text-sm font-medium text-emerald-700 hover:text-emerald-900">All updates</Link>
        </div>
        {updates.length === 0 ? (
          <p className="px-5 py-6 text-sm text-slate-500">No recent updates.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {updates.map((item) => (
              <li key={item.id}>
                <Link href={`/requestor/requests/${encodeURIComponent(item.ticketId)}`} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 hover:bg-slate-50">
                  <span>
                    <span className="block text-sm font-medium text-slate-800">{item.title} · {item.ticketNumber}</span>
                    <span className="mt-1 block line-clamp-1 text-sm text-slate-500">{item.message}</span>
                  </span>
                  <time className="text-xs text-slate-500">{formatRelativeDate(item.createdAt)}</time>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
