import { NextResponse } from 'next/server';
import type { PortalMessageType, RequestorActivity } from '@/features/requestor/types';
import { getPortalServiceConfig, getPortalServiceHeaders } from '@/lib/requestor-auth';
import { authenticateStaffTicket } from '@/lib/staff-portal';

const messageTypes: PortalMessageType[] = ['REPLY', 'INFORMATION', 'REVISION_REQUEST'];

export async function GET(request: Request, context: { params: Promise<{ ticketId: string }> }) {
  try {
    const { ticketId } = await context.params;
    const auth = await authenticateStaffTicket(request, ticketId);
    if ('error' in auth) return auth.error;

    const { url } = getPortalServiceConfig();
    const query = new URLSearchParams({
      select: 'id,author_name,author_role,message_type,message,created_at',
      ticket_id: `eq.${auth.ticket.id}`,
      order: 'created_at.asc',
      limit: '500',
    });
    const response = await fetch(`${url}/rest/v1/ticket_portal_messages?${query}`, {
      headers: getPortalServiceHeaders(),
      cache: 'no-store',
    });
    if (!response.ok) throw new Error(`Conversation query failed (${response.status}): ${await response.text()}`);
    const rows = await response.json() as Array<{
      id: string | number;
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
        ? row.author_role === 'STAFF' ? 'Information requested' : 'Information provided'
        : row.message_type === 'REVISION_REQUEST'
          ? row.author_role === 'STAFF' ? 'Revision update' : 'Revision requested'
          : 'Message',
      message: row.message,
      createdAt: row.created_at,
      author: row.author_role === 'STAFF' ? row.author_name : 'Requestor',
      messageType: row.message_type,
    }));
    return NextResponse.json(messages, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    console.error('Failed to load staff conversation:', error);
    return NextResponse.json({ error: 'Unable to load ticket conversation.' }, { status: 500 });
  }
}

export async function POST(request: Request, context: { params: Promise<{ ticketId: string }> }) {
  try {
    const { ticketId } = await context.params;
    const auth = await authenticateStaffTicket(request, ticketId);
    if ('error' in auth) return auth.error;

    const body = await request.json() as { message?: unknown; type?: unknown };
    const message = typeof body.message === 'string' ? body.message.trim() : '';
    if (!message || message.length > 5000) {
      return NextResponse.json({ error: 'Message must be between 1 and 5,000 characters.' }, { status: 400 });
    }
    if (typeof body.type !== 'string' || !messageTypes.includes(body.type as PortalMessageType)) {
      return NextResponse.json({ error: 'Choose a valid message type.' }, { status: 400 });
    }
    const type = body.type as PortalMessageType;

    const { url } = getPortalServiceConfig();
    const response = await fetch(`${url}/rest/v1/ticket_portal_messages`, {
      method: 'POST',
      headers: { ...getPortalServiceHeaders(), Prefer: 'return=representation' },
      body: JSON.stringify({
        ticket_id: auth.ticket.id,
        ticket_number: auth.ticket.ticketNumber,
        author_email: auth.identity.email,
        author_name: auth.identity.name,
        author_role: 'STAFF',
        message_type: type,
        message,
      }),
    });
    if (!response.ok) throw new Error(`Message insert failed (${response.status}): ${await response.text()}`);
    const [created] = await response.json() as Array<{ id: number | string; created_at: string }>;
    return NextResponse.json({
      id: String(created.id),
      kind: 'MESSAGE',
      title: type === 'INFORMATION' ? 'Information requested' : type === 'REVISION_REQUEST' ? 'Revision requested' : 'Message',
      message,
      createdAt: created.created_at,
      author: auth.identity.name,
      messageType: type,
    } satisfies RequestorActivity, { status: 201, headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    console.error('Failed to save staff message:', error);
    return NextResponse.json({ error: 'Unable to send ticket update.' }, { status: 500 });
  }
}
