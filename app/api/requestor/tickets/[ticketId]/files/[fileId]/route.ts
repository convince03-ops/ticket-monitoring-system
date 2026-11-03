import { NextResponse } from 'next/server';
import { authenticateRequestor, getPortalServiceConfig, getPortalServiceHeaders } from '@/lib/requestor-auth';
import { getOwnedTicket } from '@/lib/requestor-data';

const bucket = 'requestor-portal-files';
const previewTypes = new Set(['application/pdf', 'image/jpeg', 'image/png', 'image/webp']);

export async function GET(
  request: Request,
  context: { params: Promise<{ ticketId: string; fileId: string }> },
) {
  try {
    const auth = await authenticateRequestor(request);
    if (auth.error) return auth.error;
    const { ticketId, fileId } = await context.params;
    const ticket = await getOwnedTicket(auth.identity, ticketId);
    if (!ticket) return NextResponse.json({ error: 'File not found.' }, { status: 404 });

    const { url, key } = getPortalServiceConfig();
    const query = new URLSearchParams({
      select: 'file_name,mime_type,storage_path,file_kind',
      id: `eq.${fileId}`,
      ticket_id: `eq.${ticket.id}`,
      limit: '1',
    });
    const metadataResponse = await fetch(`${url}/rest/v1/ticket_portal_files?${query}`, {
      headers: getPortalServiceHeaders(),
      cache: 'no-store',
    });
    if (!metadataResponse.ok) throw new Error(`File metadata query failed (${metadataResponse.status}): ${await metadataResponse.text()}`);
    const [file] = await metadataResponse.json() as Array<{
      file_name: string;
      mime_type: string;
      storage_path: string;
      file_kind: 'SUPPORTING' | 'DELIVERABLE';
    }>;
    if (!file) return NextResponse.json({ error: 'File not found.' }, { status: 404 });

    const objectResponse = await fetch(
      `${url}/storage/v1/object/${bucket}/${file.storage_path.split('/').map(encodeURIComponent).join('/')}`,
      { headers: { apikey: key, Authorization: `Bearer ${key}` }, cache: 'no-store' },
    );
    if (!objectResponse.ok) throw new Error(`Private file download failed (${objectResponse.status}).`);

    const preview = new URL(request.url).searchParams.get('preview') === '1' && previewTypes.has(file.mime_type);
    const disposition = preview ? 'inline' : 'attachment';
    const safeFileName = file.file_name.replace(/[\r\n"]/g, '');
    return new Response(objectResponse.body, {
      headers: {
        'Content-Type': file.mime_type,
        'Content-Disposition': `${disposition}; filename="${safeFileName}"`,
        'X-Content-Type-Options': 'nosniff',
        'Cache-Control': 'private, no-store',
      },
    });
  } catch (error) {
    console.error('Failed to download requestor file:', error);
    return NextResponse.json({ error: 'Unable to download this file.' }, { status: 500 });
  }
}
