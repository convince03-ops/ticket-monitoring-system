import Link from 'next/link';
import { ArrowRight, Inbox } from 'lucide-react';
import type { RequestorStatus, RequestorTicket } from '@/features/requestor/types';

const statusLabels: Record<RequestorStatus, string> = {
  PENDING_REVIEW: 'Pending review',
  IN_PROGRESS: 'In progress',
  NEEDS_ACTION: 'Needs action',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
  ON_HOLD: 'On hold',
  REJECTED: 'Rejected',
};

const statusStyles: Record<RequestorStatus, string> = {
  PENDING_REVIEW: 'bg-amber-50 text-amber-700 ring-amber-200',
  IN_PROGRESS: 'bg-blue-50 text-blue-700 ring-blue-200',
  NEEDS_ACTION: 'bg-orange-50 text-orange-700 ring-orange-200',
  COMPLETED: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  CANCELLED: 'bg-slate-100 text-slate-600 ring-slate-200',
  ON_HOLD: 'bg-violet-50 text-violet-700 ring-violet-200',
  REJECTED: 'bg-rose-50 text-rose-700 ring-rose-200',
};

export function StatusBadge({ status }: { status: RequestorStatus }) {
  return (
    <span className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${statusStyles[status]}`}>
      {statusLabels[status]}
    </span>
  );
}

export function PriorityBadge({ priority }: { priority: RequestorTicket['priority'] }) {
  const styles = {
    LOW: 'bg-slate-100 text-slate-600',
    NORMAL: 'bg-blue-50 text-blue-700',
    HIGH: 'bg-rose-50 text-rose-700',
  };
  const label = priority.charAt(0) + priority.slice(1).toLowerCase();
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${styles[priority]}`}>{label}</span>;
}

export function EmptyRequests() {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
      <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-500">
        <Inbox aria-hidden="true" className="h-6 w-6" />
      </span>
      <h2 className="mt-4 text-base font-semibold text-slate-900">No requests to monitor</h2>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
        There are no BrandCom tickets associated with your account yet. Requests assigned to your account will appear here.
      </p>
    </div>
  );
}

export function RequestLink({ ticket }: { ticket: RequestorTicket }) {
  return (
    <Link
      href={`/requestor/requests/${encodeURIComponent(ticket.id)}`}
      className="inline-flex items-center gap-1.5 whitespace-nowrap text-sm font-medium text-emerald-700 hover:text-emerald-900"
    >
      View details <ArrowRight aria-hidden="true" className="h-4 w-4" />
    </Link>
  );
}
