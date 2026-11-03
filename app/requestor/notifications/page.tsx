'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Bell, CheckCircle2, MessageCircle } from 'lucide-react';
import { formatRelativeDate, requestorApi } from '@/features/requestor/api';
import type { RequestorActivity } from '@/features/requestor/types';

interface NotificationItem extends RequestorActivity {
  ticketId: string;
  ticketNumber: string;
}

export default function RequestorNotificationsPage() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    requestorApi<NotificationItem[]>('/api/requestor/notifications')
      .then((items) => { if (active) setNotifications(items); })
      .catch((cause: unknown) => {
        if (active) setError(cause instanceof Error ? cause.message : 'Unable to load notifications.');
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  return (
    <div className="space-y-6">
      <header>
        <p className="text-sm font-medium text-emerald-700">Updates</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">Notifications</h1>
        <p className="mt-2 text-sm text-slate-500">Status changes and public messages related to your requests.</p>
      </header>
      {error && <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>}
      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        {loading ? (
          <p className="p-6 text-sm text-slate-500">Loading notifications…</p>
        ) : notifications.length === 0 ? (
          <div className="px-6 py-14 text-center">
            <Bell aria-hidden="true" className="mx-auto h-8 w-8 text-slate-300" />
            <h2 className="mt-3 font-semibold text-slate-800">You’re all caught up</h2>
            <p className="mt-1 text-sm text-slate-500">New status updates and team messages will appear here.</p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {notifications.map((item) => {
              const Icon = item.kind === 'MESSAGE' ? MessageCircle : CheckCircle2;
              return (
                <li key={item.id}>
                  <Link href={`/requestor/requests/${encodeURIComponent(item.ticketId)}`} className="flex items-start gap-4 px-5 py-4 hover:bg-slate-50 sm:px-6">
                    <span className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${item.kind === 'MESSAGE' ? 'bg-blue-50 text-blue-700' : 'bg-emerald-50 text-emerald-700'}`}>
                      <Icon aria-hidden="true" className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-sm font-semibold text-slate-900">{item.title}</span>
                        <time className="text-xs text-slate-500">{formatRelativeDate(item.createdAt)}</time>
                      </span>
                      <span className="mt-1 block text-xs font-medium text-emerald-700">{item.ticketNumber}</span>
                      <span className="mt-1 block whitespace-pre-wrap break-words text-sm text-slate-600">{item.message}</span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>
      <p className="text-xs leading-5 text-slate-500">Notifications are based on recorded ticket activity and portal messages. Email notification delivery is not configured in this portal.</p>
    </div>
  );
}
