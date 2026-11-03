import { NextResponse } from 'next/server';
import { getPortalServiceConfig, getPortalServiceHeaders } from '@/lib/requestor-auth';
import { authenticateStaffTicket } from '@/lib/staff-portal';

const bucket = 'requestor-portal-files';
const previewTypes = new Set(['application/pdf', 'image/jpeg', 'image/png', 'image/webp']);

export async function GET(
  request: Request,
  context: { params: Promise<{ ticketId: string; fileId: string }> },
) {
  try {
    const { ticketId, fileId } = await context.params;
    const auth = await authenticateStaffTicket(request, ticketId);
    if ('error' in auth) return auth.error;
    const { url, key } = getPortalServiceConfig();
    const query = new URLSearchParams({
      select: 'file_name,mime_type,storage_path',
      id: `eq.${fileId}`,
      ticket_id: `eq.${auth.ticket.id}`,
      file_kind: 'eq.DELIVERABLE',
      limit: '1',
    });
    const response = await fetch(`${url}/rest/v1/ticket_portal_files?${query}`, {
      headers: getPortalServiceHeaders(),
      cache: 'no-store',
    });
    if (!response.ok) throw new Error(`Deliverable metadata query failed (${response.status}): ${await response.text()}`);
    const [file] = await response.json() as Array<{ file_name: string; mime_type: string; storage_path: string }>;
    if (!file) return NextResponse.json({ error: 'File not found.' }, { status: 404 });

    const objectResponse = await fetch(
      `${url}/storage/v1/object/${bucket}/${file.storage_path.split('/').map(encodeURIComponent).join('/')}`,
      { headers: { apikey: key, Authorization: `Bearer ${key}` }, cache: 'no-store' },
    );
    if (!objectResponse.ok) throw new Error(`Private deliverable download failed (${objectResponse.status}).`);
    const preview = new URL(request.url).searchParams.get('preview') === '1' && previewTypes.has(file.mime_type);
    return new Response(objectResponse.body, {
      headers: {
        'Content-Type': file.mime_type,
        'Content-Disposition': `${preview ? 'inline' : 'attachment'}; filename="${file.file_name.replace(/[\r\n"]/g, '')}"`,
        'X-Content-Type-Options': 'nosniff',
        'Cache-Control': 'private, no-store',
      },
    });
  } catch (error) {
    console.error('Failed to download staff deliverable:', error);
    return NextResponse.json({ error: 'Unable to download this deliverable.' }, { status: 500 });
  }
}
