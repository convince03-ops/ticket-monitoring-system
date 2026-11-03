'use client';

import { FormEvent, useEffect, useState } from 'react';
import { Download, MessageCircle, Paperclip, Send } from 'lucide-react';
import { formatRequestorDate } from '@/features/requestor/api';
import type { PortalMessageType, RequestorActivity, RequestorFile } from '@/features/requestor/types';
import { requestorApi } from '@/features/requestor/api';

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function PortalConversationPanel({ ticketId }: { ticketId: string }) {
  const path = `/api/staff/tickets/${encodeURIComponent(ticketId)}`;
  const [messages, setMessages] = useState<RequestorActivity[]>([]);
  const [files, setFiles] = useState<RequestorFile[]>([]);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<PortalMessageType>('REPLY');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    let active = true;
    Promise.all([
      requestorApi<RequestorActivity[]>(`${path}/messages`),
      requestorApi<RequestorFile[]>(`${path}/files`),
    ])
      .then(([conversation, deliverables]) => {
        if (!active) return;
        setMessages(conversation);
        setFiles(deliverables);
      })
      .catch((cause: unknown) => {
        if (active) setError(cause instanceof Error ? cause.message : 'Unable to load requestor portal tools.');
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [path]);

  const sendMessage = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!message.trim()) return;
    setSending(true);
    setError('');
    setSuccess('');
    try {
      const created = await requestorApi<RequestorActivity>(`${path}/messages`, {
        method: 'POST',
        body: JSON.stringify({ message, type: messageType }),
      });
      setMessages((items) => [...items, created]);
      setMessage('');
      setSuccess(messageType === 'INFORMATION' ? 'Information request sent.' : messageType === 'REVISION_REQUEST' ? 'Revision update sent.' : 'Reply sent.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to send this update.');
    } finally {
      setSending(false);
    }
  };

  const uploadFile = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedFile) return;
    const form = event.currentTarget;
    const body = new FormData();
    body.set('file', selectedFile);
    setUploading(true);
    setError('');
    setSuccess('');
    try {
      const created = await requestorApi<RequestorFile>(`${path}/files`, { method: 'POST', body });
      setFiles((items) => [created, ...items]);
      setSelectedFile(null);
      form.reset();
      setSuccess('Deliverable uploaded and shared with the requestor.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to upload this deliverable.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <section className="mt-7 border-t border-slate-200 pt-6">
      <div className="flex items-center gap-2">
        <MessageCircle aria-hidden="true" className="h-4 w-4 text-slate-500" />
        <h3 className="text-sm font-semibold text-slate-900">Requestor portal updates</h3>
      </div>
      {error && <p role="alert" className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}
      {success && <p role="status" className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{success}</p>}

      {loading ? <p className="mt-4 text-sm text-slate-500">Loading portal updates…</p> : (
        <div className="mt-4 grid gap-6 lg:grid-cols-2">
          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">Public conversation</p>
            <div className="max-h-64 space-y-3 overflow-y-auto rounded-lg bg-slate-50 p-3">
              {messages.length === 0 ? <p className="text-sm text-slate-500">No portal messages yet.</p> : messages.map((item) => (
                <article key={item.id} className="rounded-lg border border-slate-200 bg-white p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-semibold text-slate-800">{item.author} · {item.title}</p>
                    <time className="shrink-0 text-[11px] text-slate-500">{formatRequestorDate(item.createdAt, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</time>
                  </div>
                  <p className="mt-2 whitespace-pre-wrap break-words text-sm text-slate-600">{item.message}</p>
                </article>
              ))}
            </div>
            <form onSubmit={sendMessage} className="mt-3 space-y-2">
              <select aria-label="Message type" value={messageType} onChange={(event) => setMessageType(event.target.value as PortalMessageType)} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm">
                <option value="REPLY">Reply to requestor</option>
                <option value="INFORMATION">Request information</option>
                <option value="REVISION_REQUEST">Revision update</option>
              </select>
              <textarea aria-label="Public message" value={message} onChange={(event) => setMessage(event.target.value)} maxLength={5000} rows={3} placeholder="Write an update visible to the requestor…" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
              <div className="flex justify-end">
                <button type="submit" disabled={!message.trim() || sending} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
                  <Send aria-hidden="true" className="h-4 w-4" /> {sending ? 'Sending…' : 'Send update'}
                </button>
              </div>
            </form>
          </div>

          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">Approved deliverables</p>
            {files.length === 0 ? <p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-500">No deliverables uploaded.</p> : (
              <ul className="divide-y divide-slate-200 rounded-lg border border-slate-200 px-3">
                {files.map((file) => (
                  <li key={file.id} className="flex items-center justify-between gap-3 py-2.5">
                    <span className="min-w-0"><span className="block truncate text-sm font-medium text-slate-800">{file.fileName}</span><span className="text-xs text-slate-500">{formatBytes(file.fileSize)} · {formatRequestorDate(file.createdAt)}</span></span>
                    <a href={file.downloadUrl} className="inline-flex shrink-0 items-center gap-1 text-sm font-medium text-emerald-700 hover:text-emerald-900"><Download className="h-4 w-4" /> Download</a>
                  </li>
                ))}
              </ul>
            )}
            <form onSubmit={uploadFile} className="mt-3 space-y-2">
              <label className="block text-xs font-medium text-slate-600">
                Upload a deliverable (10 MB max)
                <input type="file" accept=".pdf,.jpg,.jpeg,.png,.webp,.txt,.csv,.docx,.xlsx,.pptx" onChange={(event) => setSelectedFile(event.target.files?.[0] ?? null)} className="mt-1 block w-full rounded-lg border border-slate-200 bg-white px-2 py-2 text-xs file:mr-2 file:rounded-md file:border-0 file:bg-slate-100 file:px-2 file:py-1 file:text-xs" />
              </label>
              <div className="flex justify-end">
                <button type="submit" disabled={!selectedFile || uploading} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50">
                  <Paperclip aria-hidden="true" className="h-4 w-4" /> {uploading ? 'Uploading…' : 'Upload deliverable'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
