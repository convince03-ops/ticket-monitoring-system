import { NextResponse } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const supabaseKey = process.env.SUPABASE_SECRET_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';

export async function GET() {
  try {
    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ error: 'Supabase configuration is missing' }, { status: 500 });
    }

    const response = await fetch(`${supabaseUrl}/rest/v1/ticket_activity_log?select=id,ticket_id,ticket_number,actor,action,details,created_at&order=created_at.desc&limit=1000`, {
      headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}`, Accept: 'application/json' },
      cache: 'no-store',
    });
    if (!response.ok) throw new Error(`Supabase activity log request failed (${response.status}): ${await response.text()}`);

    const events = await response.json() as Array<Record<string, unknown>>;
    return NextResponse.json(events.map((event) => ({
      id: String(event.id ?? ''),
      user: String(event.actor ?? 'System'),
      action: String(event.action ?? 'Ticket Updated'),
      details: String(event.details ?? ''),
      timestamp: String(event.created_at ?? ''),
      ticketNumber: String(event.ticket_number ?? ''),
    })));
  } catch (error) {
    console.error('Failed to fetch activity log:', error);
    return NextResponse.json({ error: 'Failed to fetch activity log', details: error instanceof Error ? error.message : 'Unknown database error' }, { status: 500 });
  }
}