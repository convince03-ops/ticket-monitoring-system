'use client';

import { useParams } from 'next/navigation';
import { CheckCircle2, Clock, AlertCircle, FileText } from 'lucide-react';

interface PublicTicket {
  ticketNumber: string;
  description: string;
  designer: string;
  status: string;
  deadline: string;
  remarks: string;
  attachments: Array<{ name: string; url: string }>;
  timeline: Array<{ date: string; status: string }>;
}

const publicTicket: PublicTicket | null = null;

export default function PublicTicketStatusPage() {
  const params = useParams();
  const token = params.token;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'bg-green-100 text-green-700';
      case 'IN_PROGRESS':
        return 'bg-blue-100 text-blue-700';
      case 'OPEN':
        return 'bg-slate-100 text-slate-700';
      case 'CANCELLED':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-slate-100 text-slate-700';
    }
  };

  const getStatusLabel = (status: string) => {
    if (status === 'IN_PROGRESS') return 'Working';
    if (status === 'COMPLETED') return 'Done';
    if (status === 'CANCELLED') return 'Cancel';
    return 'Pending';
  };

  return (
    <div className="ticket-status-shell">
      <div className="border-b border-slate-200 bg-white shadow-sm">
        <div className="mx-auto max-w-2xl px-6 py-8">
          <div className="text-center">
            <p className="text-sm font-medium uppercase tracking-[0.24em] text-slate-500">Ticket Status</p>
            <h1 className="mt-2 text-3xl font-bold text-slate-950">Track Your Request</h1>
            <p className="mt-2 text-sm text-slate-600">Monitor the progress of your multimedia request in real-time.</p>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-2xl px-6 py-8">
        {publicTicket ? (
          <div className="rounded-[22px] border border-slate-200 bg-white p-8 shadow-soft">
            <div className="mb-6 border-b border-slate-200 pb-6">
              <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
                <div>
                  <p className="text-sm font-medium text-slate-600">Ticket Number</p>
                  <h2 className="text-2xl font-bold text-slate-950">{publicTicket.ticketNumber}</h2>
                </div>
                <span className={`inline-flex rounded-full px-4 py-2 text-sm font-medium ${getStatusColor(publicTicket.status)}`}>
                  {getStatusLabel(publicTicket.status)}
                </span>
              </div>
            </div>

            <div className="mb-8">
              <h3 className="mb-3 font-semibold text-slate-950">Request Description</h3>
              <p className="text-slate-700">{publicTicket.description}</p>
            </div>

            <div className="mb-8 grid gap-4 sm:grid-cols-2">
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm font-medium text-slate-600">Assigned Designer</p>
                <p className="mt-2 text-lg font-semibold text-slate-950">{publicTicket.designer}</p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm font-medium text-slate-600">Expected Deadline</p>
                <p className="mt-2 text-lg font-semibold text-slate-950">{publicTicket.deadline}</p>
              </div>
            </div>

            {publicTicket.remarks && (
              <div className="mb-8 rounded-lg border border-blue-200 bg-blue-50 p-4">
                <div className="flex gap-3">
                  <AlertCircle className="h-5 w-5 flex-shrink-0 text-blue-600" />
                  <div>
                    <h4 className="font-medium text-blue-900">Latest Update</h4>
                    <p className="mt-1 text-sm text-blue-800">{publicTicket.remarks}</p>
                  </div>
                </div>
              </div>
            )}

            {publicTicket.attachments.length > 0 && (
              <div className="mb-8">
                <h3 className="mb-4 font-semibold text-slate-950">Deliverables & Files</h3>
                <div className="space-y-2">
                  {publicTicket.attachments.map((attachment, index) => (
                    <a
                      key={index}
                      href={attachment.url}
                      className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4 transition hover:bg-slate-100"
                    >
                      <FileText className="h-5 w-5 text-slate-600" />
                      <span className="font-medium text-slate-700">{attachment.name}</span>
                    </a>
                  ))}
                </div>
              </div>
            )}

            <div>
              <h3 className="mb-4 font-semibold text-slate-950">Progress Timeline</h3>
              <div className="space-y-4">
                {publicTicket.timeline.map((entry, index) => (
                  <div key={index} className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className="h-3 w-3 rounded-full bg-blue-600" />
                      {index < publicTicket.timeline.length - 1 && (
                        <div className="mt-2 h-8 w-0.5 bg-slate-200" />
                      )}
                    </div>
                    <div className="pt-1 pb-4">
                      <p className="font-medium text-slate-950">{entry.status}</p>
                      <p className="text-sm text-slate-600">{entry.date}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-[22px] border border-slate-200 bg-white p-8 text-center shadow-soft">
            <p className="text-lg font-semibold text-slate-900">No live ticket data is available yet.</p>
            <p className="mt-2 text-sm text-slate-600">
              This status page is ready, but the ticket details for token {String(token)} have not been connected yet.
            </p>
          </div>
        )}

        <div className="mt-8 rounded-[22px] border border-slate-200 bg-white p-6 text-center shadow-soft">
          <p className="text-sm text-slate-600">
            Questions about your request? Contact the multimedia department for support.
          </p>
          <a href="mailto:multimedia@brandcom.com" className="mt-4 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700">
            Contact Support
          </a>
        </div>
      </div>
    </div>
  );
}
