import { NextResponse } from 'next/server';
import type { PortalMessageType, RequestorActivity } from '@/features/requestor/types';
import { authenticateRequestor, getPortalServiceConfig, getPortalServiceHeaders } from '@/lib/requestor-auth';
import { getOwnedTicket } from '@/lib/requestor-data';

const messageTypes: PortalMessageType[] = ['REPLY', 'INFORMATION', 'REVISION_REQUEST'];

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

    const { url } = getPortalServiceConfig();
    const query = new URLSearchParams({
      select: 'id,author_email,author_name,author_role,message_type,message,created_at',
      ticket_id: `eq.${ticket.id}`,
      order: 'created_at.asc',
      limit: '500',
    });
    const response = await fetch(`${url}/rest/v1/ticket_portal_messages?${query}`, {
      headers: getPortalServiceHeaders(),
      cache: 'no-store',
    });
    if (!response.ok) throw new Error(`Message query failed (${response.status}): ${await response.text()}`);

    const rows = await response.json() as Array<{
      id: string | number;
      author_email: string;
      author_name: string;
      author_role: 'REQUESTOR' | 'STAFF';
      message_type: PortalMessageType;
      message: string;
      created_at: string;
    }>;
    const messages: RequestorActivity[] = rows.map((row) => ({
      id: String(row.id),
      kind: 'MESSAGE',
      title: row.message_type === 'INFORMATION'
        ? 'Information provided'
        : row.message_type === 'REVISION_REQUEST'
          ? 'Revision requested'
          : row.author_role === 'STAFF' ? 'BrandCom update' : 'Message sent',
      message: row.message,
      createdAt: row.created_at,
      author: row.author_role === 'STAFF' ? row.author_name || 'BrandCom team' : 'You',
      messageType: row.message_type,
    }));
    return NextResponse.json(messages, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    console.error('Failed to load requestor conversation:', error);
    return NextResponse.json({ error: 'Unable to load ticket updates.' }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  context: { params: Promise<{ ticketId: string }> },
) {
  try {
    const auth = await authenticateRequestor(request);
    if (auth.error) return auth.error;
    const { ticketId } = await context.params;
    const ticket = await getOwnedTicket(auth.identity, ticketId);
    if (!ticket) return NextResponse.json({ error: 'Request not found.' }, { status: 404 });

    const body = await request.json() as { message?: unknown; type?: unknown };
    const message = typeof body.message === 'string' ? body.message.trim() : '';
    const type = body.type;
    if (!message || message.length > 5000) {
      return NextResponse.json({ error: 'Message must be between 1 and 5,000 characters.' }, { status: 400 });
    }
    if (typeof type !== 'string' || !messageTypes.includes(type as PortalMessageType)) {
      return NextResponse.json({ error: 'Choose a valid message type.' }, { status: 400 });
    }
    if (type === 'REVISION_REQUEST' && ticket.status !== 'COMPLETED') {
      return NextResponse.json({ error: 'Revision requests are available after a ticket is completed.' }, { status: 400 });
    }
    if (ticket.status === 'CANCELLED' || ticket.status === 'REJECTED') {
      return NextResponse.json({ error: 'This request is closed and can no longer receive messages.' }, { status: 400 });
    }

    const { url } = getPortalServiceConfig();
    const response = await fetch(`${url}/rest/v1/ticket_portal_messages`, {
      method: 'POST',
      headers: { ...getPortalServiceHeaders(), Prefer: 'return=representation' },
      body: JSON.stringify({
        ticket_id: ticket.id,
        ticket_number: ticket.ticketNumber,
        author_email: auth.identity.email,
        author_name: auth.identity.name,
        author_role: 'REQUESTOR',
        message_type: type,
        message,
      }),
    });
    if (!response.ok) throw new Error(`Message insert failed (${response.status}): ${await response.text()}`);
    const [created] = await response.json() as Array<{ id: string | number; created_at: string }>;
    const result: RequestorActivity = {
      id: String(created.id),
      kind: 'MESSAGE',
      title: type === 'INFORMATION' ? 'Information provided' : type === 'REVISION_REQUEST' ? 'Revision requested' : 'Message sent',
      message,
      createdAt: created.created_at,
      author: 'You',
      messageType: type as PortalMessageType,
    };
    return NextResponse.json(result, { status: 201, headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    console.error('Failed to save requestor message:', error);
    return NextResponse.json({ error: 'Unable to send your message.' }, { status: 500 });
  }
}
