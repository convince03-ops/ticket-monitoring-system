'use client';

import { FormEvent, useEffect, useRef, useState } from 'react';
import { Bot, MessageCircle, Send, Sparkles, X } from 'lucide-react';
import { requestorApi } from '@/features/requestor/api';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

const suggestedQuestions = [
  "What's the status of my ticket?",
  'Which of my tickets need action?',
  'Summarize my latest updates.',
  'How do I request a revision?',
];

export function RequestorAssistant({ endpoint = '/api/assistant' }: { endpoint?: string }) {
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, sending]);

  const ask = async (value: string) => {
    const text = value.trim();
    if (!text || sending) return;
    const priorMessages = messages;
    setMessages((items) => [...items, { role: 'user', content: text }]);
    setQuestion('');
    setSending(true);
    setError('');
    try {
      const result = await requestorApi<{ answer: string }>(endpoint, {
        method: 'POST',
        body: JSON.stringify({ question: text, history: priorMessages.slice(-8) }),
      });
      setMessages((items) => [...items, { role: 'assistant', content: result.answer }]);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'The assistant is temporarily unavailable.');
      setMessages((items) => items.filter((_, index) => index !== items.length - 1));
    } finally {
      setSending(false);
    }
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void ask(question);
  };

  return (
    <div className="fixed bottom-5 right-5 z-40 sm:bottom-7 sm:right-7">
      {open && (
        <section
          aria-label="BrandCom AI assistant"
          className="mb-3 flex h-[min(620px,calc(100dvh-120px))] w-[min(380px,calc(100vw-32px))] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl"
        >
          <header className="flex items-center justify-between border-b border-slate-200 px-4 py-3.5">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                <Bot aria-hidden="true" className="h-5 w-5" />
              </span>
              <div>
                <h2 className="text-sm font-semibold text-slate-900">BrandCom assistant</h2>
                <p className="text-xs text-slate-500">Questions about your tickets</p>
              </div>
            </div>
            <button type="button" onClick={() => setOpen(false)} aria-label="Close assistant" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100">
              <X aria-hidden="true" className="h-4 w-4" />
            </button>
          </header>

          <div ref={listRef} aria-live="polite" className="flex-1 space-y-3 overflow-y-auto bg-slate-50/70 p-4">
            <div className="max-w-[90%] rounded-xl border border-slate-200 bg-white p-3 text-sm leading-5 text-slate-700">
              Hi! I can help you check ticket status and summarize updates. I only use tickets your account is authorized to see.
            </div>
            {messages.map((message, index) => (
              <div key={`${message.role}-${index}`} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <p className={`max-w-[90%] whitespace-pre-wrap break-words rounded-xl px-3 py-2.5 text-sm leading-5 ${
                  message.role === 'user' ? 'bg-emerald-700 text-white' : 'border border-slate-200 bg-white text-slate-700'
                }`}>{message.content}</p>
              </div>
            ))}
            {sending && <p className="text-xs text-slate-500">Checking your ticket updates…</p>}
            {error && <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">{error}</p>}
            {messages.length === 0 && (
              <div className="space-y-2 pt-1">
                {suggestedQuestions.map((suggestion) => (
                  <button key={suggestion} type="button" onClick={() => void ask(suggestion)} disabled={sending} className="block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-left text-xs text-slate-600 hover:border-emerald-300 hover:text-emerald-800 disabled:opacity-50">
                    {suggestion}
                  </button>
                ))}
              </div>
            )}
          </div>

          <form onSubmit={submit} className="border-t border-slate-200 bg-white p-3">
            <label htmlFor="requestor-assistant-question" className="sr-only">Ask about your tickets</label>
            <div className="flex items-end gap-2">
              <textarea
                id="requestor-assistant-question"
                value={question}
                onChange={(event) => setQuestion(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault();
                    void ask(question);
                  }
                }}
                maxLength={2000}
                rows={1}
                placeholder="Ask about your tickets…"
                className="max-h-24 min-h-10 flex-1 resize-y rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-emerald-500"
              />
              <button type="submit" disabled={!question.trim() || sending} aria-label="Send question" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-700 text-white hover:bg-emerald-800 disabled:opacity-50">
                <Send aria-hidden="true" className="h-4 w-4" />
              </button>
            </div>
            <p className="mt-2 text-[10px] leading-4 text-slate-400">
              Ticket information is sent to Groq to generate answers. The assistant can be wrong; verify important details on the ticket page.
            </p>
          </form>
        </section>
      )}
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-label={open ? 'Close BrandCom assistant' : 'Open BrandCom assistant'}
        className="ml-auto flex h-12 items-center gap-2 rounded-full border border-emerald-800 bg-emerald-700 px-4 text-sm font-medium text-white shadow-lg hover:bg-emerald-800 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:ring-offset-2"
      >
        {open ? <X aria-hidden="true" className="h-4 w-4" /> : <><Sparkles aria-hidden="true" className="h-4 w-4" /><span>Ask BrandCom AI</span><MessageCircle aria-hidden="true" className="h-4 w-4" /></>}
      </button>
    </div>
  );
}
