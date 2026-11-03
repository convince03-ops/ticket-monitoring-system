'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { ArrowLeft, ArrowUpRight, CheckCircle2, Clock3, Download, FileText, MessageCircle, Paperclip, Send } from 'lucide-react';
import { formatRequestorDate, formatRelativeDate, requestorApi } from '@/features/requestor/api';
import { PriorityBadge, StatusBadge } from '@/features/requestor/components';
import type { PortalMessageType, RequestorActivity, RequestorFile, RequestorTicket } from '@/features/requestor/types';

interface TicketDetailResponse {
  ticket: RequestorTicket;
  activity: RequestorActivity[];
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function RequestDetailsPage() {
  const { ticketId } = useParams<{ ticketId: string }>();
  const id = Array.isArray(ticketId) ? ticketId[0] : ticketId;
  const basePath = `/api/requestor/tickets/${encodeURIComponent(id)}`;
  const [detail, setDetail] = useState<TicketDetailResponse | null>(null);
  const [messages, setMessages] = useState<RequestorActivity[]>([]);
  const [files, setFiles] = useState<RequestorFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<PortalMessageType>('REPLY');
  const [sending, setSending] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [feedback, setFeedback] = useState('');

  useEffect(() => {
    let active = true;
    Promise.all([
      requestorApi<TicketDetailResponse>(basePath),
      requestorApi<RequestorActivity[]>(`${basePath}/messages`),
      requestorApi<RequestorFile[]>(`${basePath}/files`),
    ])
      .then(([ticketData, conversation, attachments]) => {
        if (!active) return;
        setDetail(ticketData);
        setMessages(conversation);
        setFiles(attachments);
      })
      .catch((cause: unknown) => {
        if (active) setError(cause instanceof Error ? cause.message : 'Unable to load request details.');
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [basePath]);

  const activity = useMemo(() => [...(detail?.activity ?? []), ...messages]
    .sort((first, second) => first.createdAt.localeCompare(second.createdAt)), [detail, messages]);
  const deliverables = files.filter((file) => file.kind === 'DELIVERABLE');
  const supportingFiles = files.filter((file) => file.kind === 'SUPPORTING');

  const handleSend = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!message.trim()) return;
    setSending(true);
    setError('');
    setFeedback('');
    try {
      const created = await requestorApi<RequestorActivity>(`${basePath}/messages`, {
        method: 'POST',
        body: JSON.stringify({ message, type: messageType }),
      });
      setMessages((items) => [...items, created]);
      setMessage('');
      setFeedback(messageType === 'INFORMATION' ? 'Your information was sent.' : messageType === 'REVISION_REQUEST' ? 'Your revision request was sent.' : 'Your reply was sent.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to send your message.');
    } finally {
      setSending(false);
    }
  };

  const handleUpload = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedFile) return;
    const form = event.currentTarget;
    setUploading(true);
    setError('');
    setFeedback('');
    const formData = new FormData();
    formData.set('file', selectedFile);
    try {
      const uploaded = await requestorApi<RequestorFile>(`${basePath}/files`, { method: 'POST', body: formData });
      setFiles((items) => [uploaded, ...items]);
      setSelectedFile(null);
      form.reset();
      setFeedback('Attachment uploaded securely.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to upload this attachment.');
    } finally {
      setUploading(false);
    }
  };

  if (loading) return <div className="rounded-xl border border-slate-200 bg-white p-8 text-sm text-slate-500">Loading request details…</div>;
  if (error && !detail) {
    return (
      <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-800">
        <p className="font-semibold">Request unavailable</p><p className="mt-1">{error}</p>
        <Link href="/requestor/requests" className="mt-4 inline-flex items-center gap-2 font-medium"><ArrowLeft className="h-4 w-4" /> Back to My Requests</Link>
      </div>
    );
  }
  if (!detail) return null;

  const { ticket } = detail;
  const isClosed = ticket.status === 'CANCELLED' || ticket.status === 'REJECTED';

  return (
    <div className="space-y-6">
      <Link href="/requestor/requests" className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-900">
        <ArrowLeft aria-hidden="true" className="h-4 w-4" /> My Requests
      </Link>

      {error && <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>}
      {feedback && <p role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{feedback}</p>}

      <section className="rounded-xl border border-slate-200 bg-white p-5 sm:p-7">
        <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-start">
          <div className="min-w-0">
            <p className="text-sm font-medium text-slate-500">{ticket.ticketNumber}</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">{ticket.title}</h1>
            <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-600">{ticket.description}</p>
          </div>
          <StatusBadge status={ticket.status} />
        </div>
        <dl className="mt-6 grid gap-4 border-t border-slate-100 pt-5 sm:grid-cols-2 lg:grid-cols-3">
          <div><dt className="text-xs text-slate-500">Category</dt><dd className="mt-1 text-sm font-medium text-slate-800">{ticket.category}</dd></div>
          <div><dt className="text-xs text-slate-500">Priority</dt><dd className="mt-1"><PriorityBadge priority={ticket.priority} /></dd></div>
          <div><dt className="text-xs text-slate-500">Submitted</dt><dd className="mt-1 text-sm font-medium text-slate-800">{formatRequestorDate(ticket.submissionDate)}</dd></div>
          <div><dt className="text-xs text-slate-500">Last updated</dt><dd className="mt-1 text-sm font-medium text-slate-800">{formatRequestorDate(ticket.updatedAt)}</dd></div>
          <div><dt className="text-xs text-slate-500">Target completion</dt><dd className="mt-1 text-sm font-medium text-slate-800">{formatRequestorDate(ticket.targetDate)}</dd></div>
          <div><dt className="text-xs text-slate-500">Assigned BrandCom staff</dt><dd className="mt-1 text-sm font-medium text-slate-800">{ticket.assignedTo ?? 'Not assigned yet'}</dd></div>
        </dl>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5 sm:p-7">
        <div className="flex items-start gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
            <Clock3 aria-hidden="true" className="h-4 w-4" />
          </span>
          <div>
            <h2 className="font-semibold text-slate-900">Progress history</h2>
            <p className="mt-1 text-sm text-slate-500">Status changes recorded for this request.</p>
          </div>
        </div>
        {detail.activity.length === 0 ? (
          <p className="mt-5 rounded-lg bg-slate-50 p-4 text-sm text-slate-500">No status history has been recorded yet.</p>
        ) : (
          <ol className="mt-6 space-y-0">
            {detail.activity.map((item, index) => (
              <li key={item.id} className="relative flex gap-4 pb-6 last:pb-0">
                {index < detail.activity.length - 1 && <span aria-hidden="true" className="absolute left-[13px] top-7 h-[calc(100%-1rem)] w-px bg-slate-200" />}
                <span className={`relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
                  index === detail.activity.length - 1 ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
                }`}>
                  <CheckCircle2 aria-hidden="true" className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1 pt-0.5">
                  <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                    <p className="text-sm font-medium text-slate-900">{item.title}</p>
                    <time className="text-xs text-slate-500">{formatRequestorDate(item.createdAt, { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })}</time>
                  </div>
                  <p className="mt-1 text-sm leading-5 text-slate-600">{item.message}</p>
                </div>
              </li>
            ))}
          </ol>
        )}
      </section>

      <section className="rounded-xl border border-slate-200 bg-white">
        <div className="flex items-center gap-3 border-b border-slate-200 px-5 py-4">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-600"><MessageCircle aria-hidden="true" className="h-4 w-4" /></span>
          <div><h2 className="font-semibold text-slate-900">Updates & messages</h2><p className="mt-1 text-sm text-slate-500">Updates visible to you and the BrandCom team.</p></div>
        </div>
        <div className="divide-y divide-slate-100">
          {activity.length === 0 ? (
            <p className="px-5 py-6 text-sm text-slate-500">No updates have been recorded for this request.</p>
          ) : activity.map((item) => (
            <article key={`${item.kind}-${item.id}`} className="flex gap-3 px-5 py-4">
              <span className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                item.author === 'You' ? 'bg-blue-100 text-blue-700' : 'bg-slate-900 text-white'
              }`}>
                {item.author === 'You' ? 'You' : 'BC'}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-medium text-slate-900">{item.author} <span className="font-normal text-slate-500">· {item.title}</span></p>
                  <time className="text-xs text-slate-500">{formatRelativeDate(item.createdAt)}</time>
                </div>
                <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-5 text-slate-600">{item.message}</p>
              </div>
            </article>
          ))}
        </div>

        {!isClosed && (
          <form onSubmit={handleSend} className="border-t border-slate-200 p-5">
            <label htmlFor="requestor-message-type" className="mb-2 block text-sm font-medium text-slate-700">Message type</label>
            <select id="requestor-message-type" value={messageType} onChange={(event) => setMessageType(event.target.value as PortalMessageType)} className="mb-3 w-full max-w-xs rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm">
              <option value="REPLY">Reply to BrandCom</option>
              <option value="INFORMATION">Provide information</option>
              {ticket.status === 'COMPLETED' && <option value="REVISION_REQUEST">Request a revision</option>}
            </select>
            <label htmlFor="requestor-message" className="sr-only">Your message</label>
            <textarea id="requestor-message" value={message} onChange={(event) => setMessage(event.target.value)} maxLength={5000} rows={4} placeholder="Write an update for the BrandCom team…" className="w-full resize-y rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-emerald-600" />
            <div className="mt-3 flex items-center justify-between gap-3">
              <span className="text-xs text-slate-400">{message.length}/5000</span>
              <button type="submit" disabled={!message.trim() || sending} className="inline-flex items-center gap-2 rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50">
                <Send aria-hidden="true" className="h-4 w-4" /> {sending ? 'Sending…' : 'Send message'}
              </button>
            </div>
          </form>
        )}
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5 sm:p-7">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-600"><FileText aria-hidden="true" className="h-4 w-4" /></span>
          <div><h2 className="font-semibold text-slate-900">Deliverables</h2><p className="mt-1 text-sm text-slate-500">Approved files shared by the BrandCom team.</p></div>
        </div>
        {ticket.status !== 'COMPLETED' ? (
          <p className="mt-5 rounded-lg bg-slate-50 p-4 text-sm text-slate-500">Final deliverables will be available here when this request is completed.</p>
        ) : deliverables.length === 0 ? (
          <p className="mt-5 rounded-lg bg-slate-50 p-4 text-sm text-slate-500">No deliverables have been attached yet.</p>
        ) : (
          <ul className="mt-5 divide-y divide-slate-100">
            {deliverables.map((file) => (
              <li key={file.id} className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                <span className="flex min-w-0 items-center gap-3">
                  <FileText aria-hidden="true" className="h-5 w-5 shrink-0 text-slate-400" />
                  <span className="min-w-0"><span className="block truncate text-sm font-medium text-slate-800">{file.fileName}</span><span className="text-xs text-slate-500">{file.mimeType} · {formatBytes(file.fileSize)} · {formatRequestorDate(file.createdAt)}</span></span>
                </span>
                <span className="flex items-center gap-3">
                  {['application/pdf', 'image/jpeg', 'image/png', 'image/webp'].includes(file.mimeType) && <a href={`${file.downloadUrl}?preview=1`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sm font-medium text-slate-600 hover:text-slate-900">Preview <ArrowUpRight className="h-3.5 w-3.5" /></a>}
                  <a href={file.downloadUrl} className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-700 hover:text-emerald-900"><Download className="h-4 w-4" /> Download</a>
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5 sm:p-7">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-600"><Paperclip aria-hidden="true" className="h-4 w-4" /></span>
          <div><h2 className="font-semibold text-slate-900">Supporting attachments</h2><p className="mt-1 text-sm text-slate-500">Share a file with the BrandCom team. Maximum size 10 MB.</p></div>
        </div>
        {supportingFiles.length > 0 && (
          <ul className="mt-4 divide-y divide-slate-100 rounded-lg border border-slate-100 px-3">
            {supportingFiles.map((file) => <li key={file.id} className="flex items-center justify-between gap-3 py-3 text-sm"><span className="truncate text-slate-700">{file.fileName}</span><a href={file.downloadUrl} className="shrink-0 text-emerald-700 hover:text-emerald-900">Download</a></li>)}
          </ul>
        )}
        {!isClosed && (
          <form onSubmit={handleUpload} className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
            <label className="min-w-0 flex-1 text-sm font-medium text-slate-700">
              Choose a file
              <input type="file" accept=".pdf,.jpg,.jpeg,.png,.webp,.txt,.csv,.docx,.xlsx,.pptx" onChange={(event) => setSelectedFile(event.target.files?.[0] ?? null)} className="mt-2 block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-slate-700" />
            </label>
            <button type="submit" disabled={!selectedFile || uploading} className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50">
              <Paperclip aria-hidden="true" className="h-4 w-4" /> {uploading ? 'Uploading…' : 'Upload attachment'}
            </button>
          </form>
        )}
      </section>
    </div>
  );
}
