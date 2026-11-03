import { NextResponse } from 'next/server';
import type { TicketRecord, TicketLevel, TicketStatus, TicketType } from '@/features/tickets/types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const supabaseKey = process.env.SUPABASE_SECRET_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';
const tableName = 'ticket-monitoring';
const activityTable = 'ticket_activity_log';

const formatDate = (value: string | null | undefined) => {
  if (!value) return null;
  return new Date(value).toISOString().slice(0, 10);
};

const normalizeStatus = (value: string | null | undefined): TicketStatus => {
  if (value === 'IN_PROGRESS' || value === 'COMPLETED' || value === 'CANCELLED') {
    return value;
  }
  return 'OPEN';
};

const normalizeTicket = (ticket: any): TicketRecord => ({
  id: String(ticket.id ?? ''),
  ticketNumber: ticket.ticketNumber ?? ticket.ticket_number ?? '',
  description: ticket.description ?? '',
  department: ticket.department ?? ticket.departmentId ?? ticket.department_id ?? 'Unknown',
  requestor: ticket.requestor ?? ticket.requestorId ?? ticket.requestor_id ?? 'Unknown',
  requestorEmail: ticket.requestorEmail ?? ticket.requestor_email ?? null,
  material: (ticket.material ?? ticket.materialId ?? ticket.material_id ?? 'PROMO') as TicketType,
  ticketLevel: (ticket.ticketLevel ?? ticket.ticket_level ?? ticket.level ?? 'MINOR') as TicketLevel,
  designer: ticket.designer ?? ticket.designerId ?? ticket.designer_id ?? 'Unassigned',
  status: normalizeStatus(ticket.status),
  ticketRequestDate: formatDate(ticket.ticketRequestDate ?? ticket.ticket_request_date ?? ticket.createdAt ?? ticket.created_at),
  dateReceivedByArtist: formatDate(ticket.dateReceivedByArtist ?? ticket.date_received_by_artist),
  workingDays: Number(ticket.workingDays ?? ticket.working_days ?? 0),
  deadline: formatDate(ticket.deadline),
  count: Number(ticket.count ?? 0),
  dateOfSubmission: formatDate(ticket.dateOfSubmission ?? ticket.date_of_submission),
  remarks: ticket.remarks ?? '',
  others: ticket.others ?? '',
  createdAt: formatDate(ticket.createdAt ?? ticket.created_at),
  updatedAt: formatDate(ticket.updatedAt ?? ticket.updated_at),
  month: new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(
    new Date(ticket.ticket_request_date ?? ticket.created_at ?? Date.now())
  ),
});

const getSupabaseHeaders = () => ({
  apikey: supabaseKey,
  Authorization: `Bearer ${supabaseKey}`,
  Accept: 'application/json',
  'Content-Type': 'application/json',
});

const statusLabel = (status: string) => ({
  OPEN: 'Pending',
  IN_PROGRESS: 'Working',
  COMPLETED: 'Done',
  CANCELLED: 'Cancel'
}[status] ?? status);

const recordTicketActivity = async (event: {
  ticketId: string;
  ticketNumber: string;
  actor: string;
  action: string;
  details: string;
}) => {
  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/${activityTable}`, {
      method: 'POST',
      headers: { ...getSupabaseHeaders(), Prefer: 'return=minimal' },
      body: JSON.stringify({
        ticket_id: event.ticketId,
        ticket_number: event.ticketNumber,
        actor: event.actor,
        action: event.action,
        details: event.details,
      }),
    });
    if (!response.ok) console.error('Ticket saved but audit event failed:', await response.text());
  } catch (error) {
    console.error('Ticket saved but audit event failed:', error);
  }
};

export async function GET() {
  try {
    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json(
        { error: 'Supabase configuration is missing' },
        { status: 500 }
      );
    }

    const pageSize = 1000;
    const tickets: any[] = [];
    let offset = 0;

    while (true) {
      const response = await fetch(`${supabaseUrl}/rest/v1/${tableName}?select=*&order=id.asc&limit=${pageSize}&offset=${offset}`, {
        headers: getSupabaseHeaders(),
        cache: 'no-store',
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Supabase REST request failed (${response.status}): ${errorText}`);
      }

      const page = (await response.json()) as any[];
      tickets.push(...page);
      if (page.length < pageSize) break;
      offset += pageSize;
    }

    return NextResponse.json(tickets.map(normalizeTicket));
  } catch (error) {
    console.error('Failed to fetch tickets:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tickets' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json(
        { error: 'Supabase configuration is missing' },
        { status: 500 }
      );
    }

    const body = await request.json();

    const payload = {
      ticket_number: body.ticketNumber,
      description: body.description,
      department: body.department,
      requestor: body.requestor,
      requestor_email: typeof body.requestorEmail === 'string' ? body.requestorEmail.trim().toLowerCase() || null : null,
      material: body.material,
      designer: body.designer,
      ticket_request_date: body.ticketRequestDate || null,
      date_received_by_artist: body.dateReceivedByArtist || null,
      working_days: Number(body.workingDays ?? 0),
      deadline: body.deadline || null,
      date_of_submission: body.dateOfSubmission || null,
      ticket_level: body.level || 'MINOR',
      status: body.status ?? 'OPEN',
      remarks: body.remarks ?? '',
      others: body.others ?? '',
    };

    const response = await fetch(`${supabaseUrl}/rest/v1/${tableName}`, {
      method: 'POST',
      headers: {
        ...getSupabaseHeaders(),
        Prefer: 'return=representation',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Supabase REST insert failed (${response.status}): ${errorText}`);
    }

    const inserted = (await response.json()) as any[];
    const createdTicket = inserted[0] ?? inserted;

    await recordTicketActivity({
      ticketId: String(createdTicket.id ?? ''),
      ticketNumber: String(createdTicket.ticket_number ?? body.ticketNumber ?? ''),
      actor: String(body.requestor ?? 'System'),
      action: 'Ticket Created',
      details: `Ticket ${String(body.ticketNumber ?? '')} was created.`,
    });

    return NextResponse.json(normalizeTicket(createdTicket), { status: 201 });
  } catch (error) {
    console.error('Failed to create ticket:', error);
    return NextResponse.json(
      {
        error: 'Failed to create ticket',
        details: error instanceof Error ? error.message : 'Unknown database error'
      },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ error: 'Supabase configuration is missing' }, { status: 500 });
    }

    const url = new URL(request.url);
    const id = url.searchParams.get('id');
    const body = await request.json();
    const allowedStatuses: TicketStatus[] = ['OPEN', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'];

    if (!id) return NextResponse.json({ error: 'Ticket id is required' }, { status: 400 });
    if (body.status && !allowedStatuses.includes(body.status)) return NextResponse.json({ error: 'Invalid ticket status' }, { status: 400 });

    const beforeResponse = await fetch(`${supabaseUrl}/rest/v1/${tableName}?id=eq.${encodeURIComponent(id)}&select=*`, {
      headers: getSupabaseHeaders(),
    });
    const beforeRows = beforeResponse.ok ? await beforeResponse.json() as any[] : [];
    const previous = beforeRows[0] ?? null;

    const statusOnlyUpdate = body.status && Object.keys(body).every((key) => key === 'status' || key === 'dateOfSubmission');
    const payload = statusOnlyUpdate
      ? {
          status: body.status,
          ...(body.dateOfSubmission ? { date_of_submission: body.dateOfSubmission } : {}),
        }
      : {
          ticket_number: body.ticketNumber,
          description: body.description,
          department: body.department,
          requestor: body.requestor,
          requestor_email: typeof body.requestorEmail === 'string' ? body.requestorEmail.trim().toLowerCase() || null : null,
          material: body.material,
          designer: body.designer,
          ticket_request_date: body.ticketRequestDate || null,
          date_received_by_artist: body.dateReceivedByArtist || null,
          working_days: Number(body.workingDays ?? 0),
          deadline: body.deadline || null,
          date_of_submission: body.dateOfSubmission || null,
          ticket_level: body.level || 'MINOR',
          status: body.status ?? 'OPEN',
          remarks: body.remarks ?? '',
          others: body.others ?? '',
        };

    const response = await fetch(`${supabaseUrl}/rest/v1/${tableName}?id=eq.${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: { ...getSupabaseHeaders(), Prefer: 'return=representation' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Supabase status update failed (${response.status}): ${errorText}`);
    }

    const updated = (await response.json()) as any[];
    if (!updated[0]) return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    const updatedTicket = updated[0];
    const statusChanged = previous && previous.status !== updatedTicket.status;
    let details: string;
    if (statusChanged) {
      details = `Status changed from ${statusLabel(String(previous.status ?? ''))} to ${statusLabel(String(updatedTicket.status ?? ''))}.`;
    } else if (previous && Object.keys(payload).length > 1) {
      const fieldNames: Record<string, string> = {
        ticket_number: 'ticket number',
        description: 'description',
        department: 'department',
        requestor: 'requestor',
        requestor_email: 'requestor email',
        material: 'material',
        designer: 'designer',
        ticket_request_date: 'ticket request date',
        date_received_by_artist: 'artist receipt date',
        working_days: 'working days',
        deadline: 'deadline',
        date_of_submission: 'submission date',
        ticket_level: 'ticket level',
        status: 'status',
        remarks: 'remarks',
        others: 'other notes',
      };
      const changed = Object.entries(payload).filter(([key, value]) => String(previous[key] ?? '') !== String(value ?? '')).map(([key]) => fieldNames[key] ?? key);
      details = changed.length ? `Updated ${changed.join(', ')}.` : 'Ticket details were saved.';
    } else {
      details = `Status is now ${statusLabel(String(updatedTicket.status ?? ''))}.`;
    }
    await recordTicketActivity({
      ticketId: String(updatedTicket.id ?? id),
      ticketNumber: String(updatedTicket.ticket_number ?? ''),
      actor: 'Admin',
      action: statusChanged ? 'Status Changed' : 'Ticket Updated',
      details,
    });
    return NextResponse.json(normalizeTicket(updatedTicket));
  } catch (error) {
    console.error('Failed to update ticket status:', error);
    return NextResponse.json(
      { error: 'Failed to update ticket status', details: error instanceof Error ? error.message : 'Unknown database error' },
      { status: 500 }
    );
  }
}
