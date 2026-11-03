import { NextResponse } from 'next/server';
import { authenticateRequestor, getPortalServiceConfig, getPortalServiceHeaders } from '@/lib/requestor-auth';
import { getOwnedTicket } from '@/lib/requestor-data';
import { PortalFileValidationError, savePortalFile } from '@/lib/requestor-files';
import type { RequestorFile } from '@/features/requestor/types';

interface FileRow {
  id: string | number;
  file_name: string;
  mime_type: string;
  file_size: number;
  created_at: string;
  file_kind: 'SUPPORTING' | 'DELIVERABLE';
}

function toPortalFile(row: FileRow, ticketId: string): RequestorFile {
  return {
    id: String(row.id),
    fileName: row.file_name,
    mimeType: row.mime_type,
    fileSize: Number(row.file_size),
    createdAt: row.created_at,
    kind: row.file_kind,
    downloadUrl: `/api/requestor/tickets/${encodeURIComponent(ticketId)}/files/${encodeURIComponent(String(row.id))}`,
  };
}

export async function GET(request: Request, context: { params: Promise<{ ticketId: string }> }) {
  try {
    const auth = await authenticateRequestor(request);
    if (auth.error) return auth.error;
    const { ticketId } = await context.params;
    const ticket = await getOwnedTicket(auth.identity, ticketId);
    if (!ticket) return NextResponse.json({ error: 'Request not found.' }, { status: 404 });

    const { url } = getPortalServiceConfig();
    const query = new URLSearchParams({
      select: 'id,file_name,mime_type,file_size,created_at,file_kind',
      ticket_id: `eq.${ticket.id}`,
      order: 'created_at.desc',
      limit: '200',
    });
    const response = await fetch(`${url}/rest/v1/ticket_portal_files?${query}`, {
      headers: getPortalServiceHeaders(),
      cache: 'no-store',
    });
    if (!response.ok) throw new Error(`File query failed (${response.status}): ${await response.text()}`);
    const rows = await response.json() as FileRow[];
    return NextResponse.json(rows.map((row) => toPortalFile(row, ticket.id)), {
      headers: { 'Cache-Control': 'private, no-store' },
    });
  } catch (error) {
    console.error('Failed to list requestor files:', error);
    return NextResponse.json({ error: 'Unable to load ticket files.' }, { status: 500 });
  }
}

export async function POST(request: Request, context: { params: Promise<{ ticketId: string }> }) {
  try {
    const auth = await authenticateRequestor(request);
    if (auth.error) return auth.error;
    const { ticketId } = await context.params;
    const ticket = await getOwnedTicket(auth.identity, ticketId);
    if (!ticket) return NextResponse.json({ error: 'Request not found.' }, { status: 404 });

    const file = (await request.formData()).get('file');
    if (!(file instanceof File)) return NextResponse.json({ error: 'Select a file to upload.' }, { status: 400 });
    const created = await savePortalFile(file, ticket, auth.identity, 'SUPPORTING');
    return NextResponse.json(created, { status: 201, headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    console.error('Failed to upload requestor attachment:', error);
    if (error instanceof PortalFileValidationError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: 'Unable to upload this file.' }, { status: 500 });
  }
}
