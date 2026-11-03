import { NextResponse } from 'next/server';
import type { RequestorActivity, RequestorStatus } from '@/features/requestor/types';
import { authenticateRequestor } from '@/lib/requestor-auth';
import { getOwnedTicket, getTicketActivity } from '@/lib/requestor-data';

const statusNames: Record<string, RequestorStatus> = {
  OPEN: 'PENDING_REVIEW',
  PENDING: 'PENDING_REVIEW',
  IN_PROGRESS: 'IN_PROGRESS',
  WORKING: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
  DONE: 'COMPLETED',
  CANCELLED: 'CANCELLED',
  CANCEL: 'CANCELLED',
};

const statusTitles: Record<RequestorStatus, string> = {
  PENDING_REVIEW: 'Pending review',
  IN_PROGRESS: 'In progress',
  NEEDS_ACTION: 'Needs action',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
  ON_HOLD: 'On hold',
  REJECTED: 'Rejected',
};

function publicStatusActivity(event: {
  id: number | string;
  action?: string;
  details?: string;
  created_at?: string;
  actor?: string;
}): RequestorActivity | null {
  if (event.action === 'Ticket Created') {
    return {
      id: String(event.id),
      kind: 'STATUS',
      title: 'Submitted',
      message: 'Your request was submitted.',
      createdAt: event.created_at ?? '',
      author: 'BrandCom',
    };
  }
  if (event.action !== 'Status Changed') return null;

  const changedTo = event.details?.match(/^Status changed from (OPEN|PENDING|IN_PROGRESS|WORKING|COMPLETED|DONE|CANCELLED|CANCEL) to (OPEN|PENDING|IN_PROGRESS|WORKING|COMPLETED|DONE|CANCELLED|CANCEL)\.?$/i)?.[2].toUpperCase();
  const status = changedTo ? statusNames[changedTo] : null;
  return {
    id: String(event.id),
    kind: 'STATUS',
    title: status ? statusTitles[status] : 'Status updated',
    message: status ? `Your request is now ${statusTitles[status].toLowerCase()}.` : 'The status of your request was updated.',
    createdAt: event.created_at ?? '',
    author: 'BrandCom',
  };
}

export async function GET(
  request: Request,
  context: { params: Promise<{ ticketId: string }> },
) {
  try {
    const auth = await authenticateRequestor(request);
    if (auth.error) return auth.error;
    const { ticketId } = await context.params;
    const ticket = await getOwnedTicket(auth.identity, ticketId);
    if (!ticket) return NextResponse.json({ error: 'Request not found.' }, { status: 404 });

    const events = await getTicketActivity(ticket.id);
    const activity = events
      .map(publicStatusActivity)
      .filter((entry): entry is RequestorActivity => entry !== null);
    return NextResponse.json({ ticket, activity }, {
      headers: { 'Cache-Control': 'private, no-store' },
    });
  } catch (error) {
    console.error('Failed to load requestor ticket details:', error);
    return NextResponse.json({ error: 'Unable to load request details.' }, { status: 500 });
  }
}
