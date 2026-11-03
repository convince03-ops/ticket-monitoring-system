import { NextResponse } from 'next/server';
import { getPortalServiceConfig, getPortalServiceHeaders } from '@/lib/requestor-auth';
import { PortalFileValidationError, savePortalFile } from '@/lib/requestor-files';
import { authenticateStaffTicket } from '@/lib/staff-portal';
import type { RequestorFile } from '@/features/requestor/types';

interface StaffFileRow {
  id: string | number;
  file_name: string;
  mime_type: string;
  file_size: number;
  created_at: string;
  file_kind: 'DELIVERABLE';
}

function toDeliverable(row: StaffFileRow, ticketId: string): RequestorFile {
  return {
    id: String(row.id),
    fileName: row.file_name,
    mimeType: row.mime_type,
    fileSize: Number(row.file_size),
    createdAt: row.created_at,
    kind: 'DELIVERABLE',
    downloadUrl: `/api/staff/tickets/${encodeURIComponent(ticketId)}/files/${encodeURIComponent(String(row.id))}`,
  };
}

export async function GET(request: Request, context: { params: Promise<{ ticketId: string }> }) {
  try {
    const { ticketId } = await context.params;
    const auth = await authenticateStaffTicket(request, ticketId);
    if ('error' in auth) return auth.error;
    const { url } = getPortalServiceConfig();
    const query = new URLSearchParams({
      select: 'id,file_name,mime_type,file_size,created_at,file_kind',
      ticket_id: `eq.${auth.ticket.id}`,
      file_kind: 'eq.DELIVERABLE',
      order: 'created_at.desc',
      limit: '200',
    });
    const response = await fetch(`${url}/rest/v1/ticket_portal_files?${query}`, {
      headers: getPortalServiceHeaders(),
      cache: 'no-store',
    });
    if (!response.ok) throw new Error(`Deliverable query failed (${response.status}): ${await response.text()}`);
    const rows = await response.json() as StaffFileRow[];
    return NextResponse.json(rows.map((row) => toDeliverable(row, auth.ticket.id)), {
      headers: { 'Cache-Control': 'private, no-store' },
    });
  } catch (error) {
    console.error('Failed to list staff deliverables:', error);
    return NextResponse.json({ error: 'Unable to load ticket deliverables.' }, { status: 500 });
  }
}

export async function POST(request: Request, context: { params: Promise<{ ticketId: string }> }) {
  try {
    const { ticketId } = await context.params;
    const auth = await authenticateStaffTicket(request, ticketId);
    if ('error' in auth) return auth.error;
    const file = (await request.formData()).get('file');
    if (!(file instanceof File)) return NextResponse.json({ error: 'Select a file to upload.' }, { status: 400 });
    const created = await savePortalFile(file, auth.ticket, auth.identity, 'DELIVERABLE');
    return NextResponse.json({
      ...created,
      downloadUrl: `/api/staff/tickets/${encodeURIComponent(auth.ticket.id)}/files/${encodeURIComponent(created.id)}`,
    }, { status: 201, headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    console.error('Failed to upload staff deliverable:', error);
    if (error instanceof PortalFileValidationError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: 'Unable to upload this deliverable.' }, { status: 500 });
  }
}
