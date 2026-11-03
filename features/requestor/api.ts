import { supabase } from '@/lib/auth';

export async function requestorApi<T>(path: string, init?: RequestInit): Promise<T> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error('Your session has expired. Sign in again to continue.');

  const headers = new Headers(init?.headers);
  headers.set('Authorization', `Bearer ${session.access_token}`);
  if (init?.body && !(init.body instanceof FormData)) headers.set('Content-Type', 'application/json');

  const response = await fetch(path, { ...init, headers, cache: 'no-store' });
  if (!response.ok) {
    let body: { error?: string } | null = null;
    try {
      body = await response.json() as { error?: string };
    } catch {
      body = null;
    }
    if (response.status === 401) throw new Error('Your session has expired. Sign in again to continue.');
    throw new Error(body?.error || 'Something went wrong. Please try again.');
  }
  return await response.json() as T;
}

export function formatRequestorDate(value: string | null, options?: Intl.DateTimeFormatOptions) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString(undefined, options ?? { month: 'short', day: 'numeric', year: 'numeric' });
}

export function formatRelativeDate(value: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  const days = Math.floor((Date.now() - date.getTime()) / 86400000);
  if (days <= 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  return formatRequestorDate(value);
}
