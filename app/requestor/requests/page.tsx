'use client';

import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { formatRequestorDate, formatRelativeDate } from '@/features/requestor/api';
import { EmptyRequests, PriorityBadge, RequestLink, StatusBadge } from '@/features/requestor/components';
import { useRequestorTickets } from '@/features/requestor/useTickets';
import type { RequestorStatus } from '@/features/requestor/types';

type RequestTab = 'ALL' | RequestorStatus;
type SortMode = 'NEWEST' | 'OLDEST' | 'UPDATED' | 'TARGET';
const pageSize = 10;

const tabs: Array<{ value: RequestTab; label: string }> = [
  { value: 'ALL', label: 'All requests' },
  { value: 'PENDING_REVIEW', label: 'Pending review' },
  { value: 'IN_PROGRESS', label: 'In progress' },
  { value: 'NEEDS_ACTION', label: 'Needs action' },
  { value: 'COMPLETED', label: 'Completed' },
];

export default function MyRequestsPage() {
  const { tickets, loading, error } = useRequestorTickets();
  const [tab, setTab] = useState<RequestTab>('ALL');
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [priority, setPriority] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [sort, setSort] = useState<SortMode>('NEWEST');
  const [page, setPage] = useState(1);

  const categories = useMemo(() => [...new Set(tickets.map((ticket) => ticket.category))].sort(), [tickets]);
  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    const result = tickets.filter((ticket) => {
      if (tab !== 'ALL' && ticket.status !== tab) return false;
      if (query && !ticket.ticketNumber.toLowerCase().includes(query) && !ticket.title.toLowerCase().includes(query)) return false;
      if (category && ticket.category !== category) return false;
      if (priority && ticket.priority !== priority) return false;
      const submitted = ticket.submissionDate?.slice(0, 10) ?? '';
      if (fromDate && (!submitted || submitted < fromDate)) return false;
      if (toDate && (!submitted || submitted > toDate)) return false;
      return true;
    });
    result.sort((first, second) => {
      const date = (value: string | null) => value ? new Date(value).getTime() : 0;
      if (sort === 'OLDEST') return date(first.submissionDate) - date(second.submissionDate);
      if (sort === 'UPDATED') return date(second.updatedAt) - date(first.updatedAt);
      if (sort === 'TARGET') return date(first.targetDate) - date(second.targetDate);
      return date(second.submissionDate) - date(first.submissionDate);
    });
    return result;
  }, [tickets, tab, search, category, priority, fromDate, toDate, sort]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const visible = filtered.slice((page - 1) * pageSize, page * pageSize);

  const resetFilters = () => {
    setSearch('');
    setCategory('');
    setPriority('');
    setFromDate('');
    setToDate('');
    setSort('NEWEST');
    setPage(1);
  };

  return (
    <div className="space-y-6">
      <header>
        <p className="text-sm font-medium text-emerald-700">Request tracking</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">My Requests</h1>
        <p className="mt-2 text-sm text-slate-500">Search and monitor BrandCom tickets associated with your account.</p>
      </header>

      {error && <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>}

      <div className="overflow-x-auto border-b border-slate-200">
        <div role="tablist" aria-label="Filter requests by status" className="flex min-w-max gap-5">
          {tabs.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={tab === value}
              onClick={() => { setTab(value); setPage(1); }}
              className={`border-b-2 px-1 pb-3 text-sm font-medium transition ${
                tab === value ? 'border-emerald-700 text-emerald-800' : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              {label}
              <span className="ml-2 text-xs text-slate-400">
                {value === 'ALL' ? tickets.length : tickets.filter((ticket) => ticket.status === value).length}
              </span>
            </button>
          ))}
        </div>
      </div>

      <section aria-label="Search and filter requests" className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:grid-cols-2 xl:grid-cols-6">
        <label className="relative sm:col-span-2 xl:col-span-2">
          <span className="sr-only">Search ticket ID or title</span>
          <Search aria-hidden="true" className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Search ID or title" className="w-full rounded-lg border border-slate-200 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-emerald-600" />
        </label>
        <label>
          <span className="sr-only">Filter by category</span>
          <select value={category} onChange={(event) => { setCategory(event.target.value); setPage(1); }} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700">
            <option value="">All categories</option>
            {categories.map((option) => <option key={option} value={option}>{option}</option>)}
          </select>
        </label>
        <label>
          <span className="sr-only">Filter by priority</span>
          <select value={priority} onChange={(event) => { setPriority(event.target.value); setPage(1); }} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700">
            <option value="">All priorities</option>
            <option value="LOW">Low</option>
            <option value="NORMAL">Normal</option>
            <option value="HIGH">High</option>
          </select>
        </label>
        <label>
          <span className="sr-only">Sort requests</span>
          <select value={sort} onChange={(event) => { setSort(event.target.value as SortMode); setPage(1); }} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700">
            <option value="NEWEST">Newest</option>
            <option value="OLDEST">Oldest</option>
            <option value="UPDATED">Recently updated</option>
            <option value="TARGET">Target date</option>
          </select>
        </label>
        <div className="grid grid-cols-2 gap-2 sm:col-span-2 xl:col-span-6 xl:grid-cols-[1fr_1fr_auto]">
          <label>
            <span className="mb-1 block text-xs text-slate-500">Submitted from</span>
            <input aria-label="Submitted from" type="date" value={fromDate} onChange={(event) => { setFromDate(event.target.value); setPage(1); }} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
          </label>
          <label>
            <span className="mb-1 block text-xs text-slate-500">Submitted to</span>
            <input aria-label="Submitted to" type="date" value={toDate} onChange={(event) => { setToDate(event.target.value); setPage(1); }} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
          </label>
          <button type="button" onClick={resetFilters} className="self-end rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">Reset filters</button>
        </div>
      </section>

      <div className="flex items-center justify-between text-sm text-slate-500">
        <p>{loading ? 'Loading requests…' : `${filtered.length} matching request${filtered.length === 1 ? '' : 's'}`}</p>
        {!loading && filtered.length > 0 && <p>Page {page} of {pageCount}</p>}
      </div>

      {loading ? (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-sm text-slate-500">Loading your requests…</div>
      ) : tickets.length === 0 ? (
        <EmptyRequests />
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-10 text-center">
          <p className="font-medium text-slate-800">No matching requests</p>
          <p className="mt-1 text-sm text-slate-500">Try changing or clearing the selected filters.</p>
        </div>
      ) : (
        <>
          <div className="hidden overflow-x-auto rounded-xl border border-slate-200 bg-white md:block">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="bg-slate-50 text-xs font-medium uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Ticket ID</th><th className="px-4 py-3">Request title</th><th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Submitted</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Priority</th>
                  <th className="px-4 py-3">Updated</th><th className="px-4 py-3">Target</th><th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visible.map((ticket) => (
                  <tr key={ticket.id} className="hover:bg-slate-50/70">
                    <td className="whitespace-nowrap px-4 py-3 font-medium text-slate-700">{ticket.ticketNumber}</td>
                    <td className="max-w-64 truncate px-4 py-3 font-medium text-slate-900">{ticket.title}</td>
                    <td className="px-4 py-3 text-slate-600">{ticket.category}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-slate-600">{formatRequestorDate(ticket.submissionDate)}</td>
                    <td className="px-4 py-3"><StatusBadge status={ticket.status} /></td>
                    <td className="px-4 py-3"><PriorityBadge priority={ticket.priority} /></td>
                    <td className="whitespace-nowrap px-4 py-3 text-slate-600">{formatRelativeDate(ticket.updatedAt)}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-slate-600">{formatRequestorDate(ticket.targetDate)}</td>
                    <td className="px-4 py-3"><RequestLink ticket={ticket} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="space-y-3 md:hidden">
            {visible.map((ticket) => (
              <article key={ticket.id} className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-slate-500">{ticket.ticketNumber}</p>
                    <h2 className="mt-1 truncate font-semibold text-slate-900">{ticket.title}</h2>
                  </div>
                  <StatusBadge status={ticket.status} />
                </div>
                <div className="mt-4 grid grid-cols-2 gap-y-3 text-xs">
                  <span className="text-slate-500">Category</span><span className="text-right text-slate-700">{ticket.category}</span>
                  <span className="text-slate-500">Submitted</span><span className="text-right text-slate-700">{formatRequestorDate(ticket.submissionDate)}</span>
                  <span className="text-slate-500">Priority</span><span className="text-right"><PriorityBadge priority={ticket.priority} /></span>
                  <span className="text-slate-500">Last updated</span><span className="text-right text-slate-700">{formatRelativeDate(ticket.updatedAt)}</span>
                </div>
                <div className="mt-4 border-t border-slate-100 pt-3"><RequestLink ticket={ticket} /></div>
              </article>
            ))}
          </div>
          {pageCount > 1 && (
            <nav aria-label="Request pages" className="flex items-center justify-between">
              <button type="button" disabled={page <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 disabled:opacity-40">Previous</button>
              <span className="text-sm text-slate-500">{(page - 1) * pageSize + 1}–{Math.min(page * pageSize, filtered.length)} of {filtered.length}</span>
              <button type="button" disabled={page >= pageCount} onClick={() => setPage((value) => Math.min(pageCount, value + 1))} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 disabled:opacity-40">Next</button>
            </nav>
          )}
        </>
      )}
    </div>
  );
}
