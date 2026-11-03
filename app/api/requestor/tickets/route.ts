import { NextResponse } from 'next/server';
import { authenticateRequestor } from '@/lib/requestor-auth';
import { getRequestorTickets } from '@/lib/requestor-data';

export async function GET(request: Request) {
  try {
    const auth = await authenticateRequestor(request);
    if (auth.error) return auth.error;
    const tickets = await getRequestorTickets(auth.identity);
    return NextResponse.json(tickets, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    console.error('Failed to load requestor tickets:', error);
    return NextResponse.json({ error: 'Unable to load your requests.' }, { status: 500 });
  }
}
