import { prisma } from '@/lib/prisma';
import {
  getPortalServiceConfig,
  getPortalServiceHeaders,
  type PortalIdentity,
} from '@/lib/requestor-auth';
import type { RequestorStatus, RequestorTicket } from '@/features/requestor/types';

interface TicketRow {
  id: string | number;
  ticket_number?: string | null;
  description?: string | null;
  requestor?: string | null;
  requestor_email?: string | null;
  department?: string | null;
  material?: string | null;
  ticket_level?: string | null;
  status?: string | null;
  designer?: string | null;
  ticket_request_date?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  deadline?: string | null;
}

const ticketColumns = [
  'id', 'ticket_number', 'description', 'requestor', 'requestor_email', 'department',
  'material', 'ticket_level', 'status', 'designer', 'ticket_request_date', 'created_at',
  'updated_at', 'deadline',
].join(',');

function requestorNameFilter(value: string) {
  const escaped = value.replaceAll('\\', '\\\\').replaceAll('"', '\\"');
  return `eq."${escaped}"`;
}

async function fetchTicketRows(filter: { field: 'requestor_email' | 'requestor'; value: string }) {
  const { url } = getPortalServiceConfig();
  const rows: TicketRow[] = [];
  const pageSize = 500;
  let offset = 0;
  while (true) {
    const query = new URLSearchParams({
      select: ticketColumns,
      order: 'created_at.desc',
      limit: String(pageSize),
      offset: String(offset),
      [filter.field]: filter.field === 'requestor'
        ? requestorNameFilter(filter.value)
        : `eq.${filter.value}`,
    });
    const response = await fetch(`${url}/rest/v1/ticket-monitoring?${query}`, {
      headers: getPortalServiceHeaders(),
      cache: 'no-store',
    });
    if (!response.ok) {
      throw new Error(`Ticket query failed (${response.status}): ${await response.text()}`);
    }
    const page = await response.json() as TicketRow[];
    rows.push(...page);
    if (page.length < pageSize) return rows;
    offset += pageSize;
  }
}

function toRequestorTicket(row: TicketRow): RequestorTicket {
  const status = (row.status ?? 'OPEN').toUpperCase();
  let requestorStatus: RequestorStatus = 'PENDING_REVIEW';
  if (status === 'IN_PROGRESS') requestorStatus = 'IN_PROGRESS';
  else if (status === 'COMPLETED') requestorStatus = 'COMPLETED';
  else if (status === 'CANCELLED') requestorStatus = 'CANCELLED';

  const level = (row.ticket_level ?? '').toUpperCase();
  return {
    id: String(row.id),
    ticketNumber: row.ticket_number ?? String(row.id),
    title: row.description?.split(/\r?\n/)[0]?.trim() || 'Untitled request',
    description: row.description ?? '',
    category: row.material ?? 'Uncategorized',
    priority: level === 'MAJOR' ? 'HIGH' : level === 'MINOR' ? 'LOW' : 'NORMAL',
    status: requestorStatus,
    submissionDate: row.ticket_request_date ?? row.created_at ?? null,
    updatedAt: row.updated_at ?? row.created_at ?? null,
    targetDate: row.deadline ?? null,
    assignedTo: row.designer && row.designer !== 'Unassigned' ? row.designer : null,
  };
}

export async function getRequestorTickets(identity: PortalIdentity) {
  const emailRows = await fetchTicketRows({ field: 'requestor_email', value: identity.email });
  let nameRows: TicketRow[] = [];
  if (identity.name && identity.name.toLowerCase() !== identity.email.toLowerCase()) {
    const matchingRequestors = await prisma.user.count({
      where: {
        name: { equals: identity.name, mode: 'insensitive' },
        OR: [{ role: 'REQUESTOR' }, { additionalRoles: { has: 'REQUESTOR' } }],
      },
    });
    if (matchingRequestors === 1) {
      nameRows = await fetchTicketRows({ field: 'requestor', value: identity.name });
    }
  }

  const uniqueRows = new Map<string, TicketRow>();
  for (const row of [...emailRows, ...nameRows]) uniqueRows.set(String(row.id), row);
  const tickets = [...uniqueRows.values()]
    .map(toRequestorTicket)
    .sort((a, b) => (b.submissionDate ?? '').localeCompare(a.submissionDate ?? ''));
  if (tickets.length === 0) return tickets;

  const ticketIds = tickets.map((ticket) => ticket.id);
  if (ticketIds.some((id) => !/^\d+$/.test(id))) {
    throw new Error('Requestor ticket ownership data contains an invalid ticket identifier.');
  }
  const { url } = getPortalServiceConfig();
  const messages: Array<{ ticket_id: string; author_role: 'REQUESTOR' | 'STAFF'; message_type: string }> = [];
  for (let index = 0; index < ticketIds.length; index += 100) {
    const batch = ticketIds.slice(index, index + 100);
    const messagesQuery = new URLSearchParams({
      select: 'ticket_id,author_role,message_type',
      ticket_id: `in.(${batch.join(',')})`,
      order: 'created_at.desc',
      limit: '5000',
    });
    const messagesResponse = await fetch(`${url}/rest/v1/ticket_portal_messages?${messagesQuery}`, {
      headers: getPortalServiceHeaders(),
      cache: 'no-store',
    });
    if (!messagesResponse.ok) {
      throw new Error(`Requestor action query failed (${messagesResponse.status}): ${await messagesResponse.text()}`);
    }
    messages.push(...await messagesResponse.json() as typeof messages);
  }
  const latestMessage = new Map<string, typeof messages[number]>();
  for (const message of messages) {
    if (!latestMessage.has(message.ticket_id)) latestMessage.set(message.ticket_id, message);
  }
  return tickets.map((ticket) => {
    const latest = latestMessage.get(ticket.id);
    if (latest?.author_role === 'STAFF' && ['INFORMATION', 'REVISION_REQUEST'].includes(latest.message_type)) {
      return { ...ticket, status: 'NEEDS_ACTION' as const };
    }
    return ticket;
  });
}

export async function getOwnedTicket(identity: PortalIdentity, ticketId: string) {
  const tickets = await getRequestorTickets(identity);
  return tickets.find((ticket) => ticket.id === ticketId || ticket.ticketNumber === ticketId) ?? null;
}

export async function getPortalTicketById(ticketId: string) {
  if (!/^\d+$/.test(ticketId)) return null;
  const { url } = getPortalServiceConfig();
  const query = new URLSearchParams({
    select: ticketColumns,
    id: `eq.${ticketId}`,
    limit: '1',
  });
  const response = await fetch(`${url}/rest/v1/ticket-monitoring?${query}`, {
    headers: getPortalServiceHeaders(),
    cache: 'no-store',
  });
  if (!response.ok) throw new Error(`Ticket query failed (${response.status}): ${await response.text()}`);
  const [row] = await response.json() as TicketRow[];
  return row ? toRequestorTicket(row) : null;
}

export async function getTicketActivity(ticketId: string) {
  const { url } = getPortalServiceConfig();
  const query = new URLSearchParams({
    select: 'id,actor,action,details,created_at',
    ticket_id: `eq.${ticketId}`,
    order: 'created_at.asc',
    limit: '500',
  });
  const response = await fetch(`${url}/rest/v1/ticket_activity_log?${query}`, {
    headers: getPortalServiceHeaders(),
    cache: 'no-store',
  });
  if (!response.ok) throw new Error(`Ticket activity query failed (${response.status}): ${await response.text()}`);
  return await response.json() as Array<{
    id: number | string;
    actor?: string;
    action?: string;
    details?: string;
    created_at?: string;
  }>;
}

export async function getTicketActivityBatch(ticketIds: string[]) {
  const result = new Map<string, Array<{
    id: number | string;
    ticket_id: string;
    actor?: string;
    action?: string;
    details?: string;
    created_at?: string;
  }>>();
  if (ticketIds.some((id) => !/^\d+$/.test(id))) {
    throw new Error('Requestor ticket ownership data contains an invalid ticket identifier.');
  }
  const { url } = getPortalServiceConfig();
  for (let index = 0; index < ticketIds.length; index += 100) {
    const batch = ticketIds.slice(index, index + 100);
    const query = new URLSearchParams({
      select: 'id,ticket_id,actor,action,details,created_at',
      ticket_id: `in.(${batch.join(',')})`,
      order: 'created_at.desc',
      limit: '5000',
    });
    const response = await fetch(`${url}/rest/v1/ticket_activity_log?${query}`, {
      headers: getPortalServiceHeaders(),
      cache: 'no-store',
    });
    if (!response.ok) throw new Error(`Ticket activity query failed (${response.status}): ${await response.text()}`);
    const rows = await response.json() as Array<{
      id: number | string;
      ticket_id: string;
      actor?: string;
      action?: string;
      details?: string;
      created_at?: string;
    }>;
    for (const row of rows) {
      const current = result.get(row.ticket_id) ?? [];
      current.push(row);
      result.set(row.ticket_id, current);
    }
  }
  return result;
}
