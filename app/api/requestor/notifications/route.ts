import { NextResponse } from 'next/server';
import { authenticateRequestor, getPortalServiceConfig, getPortalServiceHeaders } from '@/lib/requestor-auth';
import { getRequestorTickets, getTicketActivityBatch } from '@/lib/requestor-data';
import type { RequestorActivity, RequestorTicket } from '@/features/requestor/types';

function safeStatusEvent(event: {
  id: number | string;
  action?: string;
  details?: string;
  created_at?: string;
}, ticket: RequestorTicket): RequestorActivity | null {
  if (event.action !== 'Ticket Created' && event.action !== 'Status Changed') return null;
  const isCreated = event.action === 'Ticket Created';
  return {
    id: `${ticket.id}-${event.id}`,
    kind: 'STATUS',
    title: isCreated ? 'Request submitted' : 'Request status updated',
    message: isCreated ? 'Your request was submitted.' : 'The status of your request was updated.',
    createdAt: event.created_at ?? '',
    author: 'BrandCom',
  };
}

export async function GET(request: Request) {
  try {
    const auth = await authenticateRequestor(request);
    if (auth.error) return auth.error;
    const tickets = await getRequestorTickets(auth.identity);
    const notifications: Array<RequestorActivity & { ticketId: string; ticketNumber: string }> = [];
    const { url } = getPortalServiceConfig();
    const [activityByTicket, messageRows] = await Promise.all([
      getTicketActivityBatch(tickets.map((ticket) => ticket.id)),
      getStaffMessages(url, tickets.map((ticket) => ticket.id)),
    ]);
    const messagesByTicket = new Map<string, typeof messageRows>();
    for (const message of messageRows) {
      const current = messagesByTicket.get(message.ticket_id) ?? [];
      current.push(message);
      messagesByTicket.set(message.ticket_id, current);
    }

    for (const ticket of tickets) {
      const activity = activityByTicket.get(ticket.id) ?? [];
      for (const event of activity) {
        const safeEvent = safeStatusEvent(event, ticket);
        if (safeEvent) notifications.push({ ...safeEvent, ticketId: ticket.id, ticketNumber: ticket.ticketNumber });
      }
      for (const message of messagesByTicket.get(ticket.id) ?? []) {
        notifications.push({
          id: `${ticket.id}-message-${message.id}`,
          kind: 'MESSAGE',
          title: message.message_type === 'INFORMATION'
            ? 'Information requested'
            : message.message_type === 'REVISION_REQUEST'
              ? 'Revision update'
              : 'BrandCom replied',
          message: message.message,
          createdAt: message.created_at,
          author: 'BrandCom',
          ticketId: ticket.id,
          ticketNumber: ticket.ticketNumber,
        });
      }
    }

    notifications.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return NextResponse.json(notifications.slice(0, 100), { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    console.error('Failed to load requestor notifications:', error);
    return NextResponse.json({ error: 'Unable to load your notifications.' }, { status: 500 });
  }
}

async function getStaffMessages(url: string, ticketIds: string[]) {
  const messages: Array<{
    id: string | number;
    ticket_id: string;
    author_role: 'STAFF';
    message_type: string;
    message: string;
    created_at: string;
  }> = [];
  for (let index = 0; index < ticketIds.length; index += 100) {
    const batch = ticketIds.slice(index, index + 100);
    if (batch.some((id) => !/^\d+$/.test(id))) throw new Error('Invalid ticket identifier in notification query.');
    const query = new URLSearchParams({
      select: 'id,ticket_id,author_role,message_type,message,created_at',
      ticket_id: `in.(${batch.join(',')})`,
      author_role: 'eq.STAFF',
      order: 'created_at.desc',
      limit: '5000',
    });
    const response = await fetch(`${url}/rest/v1/ticket_portal_messages?${query}`, {
      headers: getPortalServiceHeaders(),
      cache: 'no-store',
    });
    if (!response.ok) throw new Error(`Notification query failed (${response.status}): ${await response.text()}`);
    messages.push(...await response.json() as typeof messages);
  }
  return messages;
}
