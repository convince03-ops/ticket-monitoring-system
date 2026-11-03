import { getPortalServiceConfig, getPortalServiceHeaders, type PortalIdentity } from '@/lib/requestor-auth';
import type { RequestorFile, RequestorTicket } from '@/features/requestor/types';

const maxFileSize = 10 * 1024 * 1024;
const allowedTypes = new Map([
  ['application/pdf', new Set(['.pdf'])],
  ['image/jpeg', new Set(['.jpg', '.jpeg'])],
  ['image/png', new Set(['.png'])],
  ['image/webp', new Set(['.webp'])],
  ['text/plain', new Set(['.txt'])],
  ['text/csv', new Set(['.csv'])],
  ['application/vnd.openxmlformats-officedocument.wordprocessingml.document', new Set(['.docx'])],
  ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', new Set(['.xlsx'])],
  ['application/vnd.openxmlformats-officedocument.presentationml.presentation', new Set(['.pptx'])],
]);
const bucket = 'requestor-portal-files';

export class PortalFileValidationError extends Error {
  constructor(message: string, readonly status: 400 | 413 | 415) {
    super(message);
    this.name = 'PortalFileValidationError';
  }
}

interface PortalFileRow {
  id: string | number;
  file_name: string;
  mime_type: string;
  file_size: number;
  created_at: string;
  file_kind: 'SUPPORTING' | 'DELIVERABLE';
}

function isValidFileContent(mimeType: string, bytes: Uint8Array) {
  if (mimeType === 'application/pdf') return new TextDecoder().decode(bytes.slice(0, 5)) === '%PDF-';
  if (mimeType === 'image/png') return bytes.length >= 8 && [137, 80, 78, 71, 13, 10, 26, 10].every((byte, index) => bytes[index] === byte);
  if (mimeType === 'image/jpeg') return bytes.length >= 3 && bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
  if (mimeType === 'image/webp') return bytes.length >= 12 && new TextDecoder().decode(bytes.slice(0, 4)) === 'RIFF' && new TextDecoder().decode(bytes.slice(8, 12)) === 'WEBP';
  if (mimeType.startsWith('application/vnd.openxmlformats-officedocument.')) return bytes.length >= 4 && bytes[0] === 80 && bytes[1] === 75 && bytes[2] === 3 && bytes[3] === 4;
  if (mimeType === 'text/plain' || mimeType === 'text/csv') {
    try {
      new TextDecoder('utf-8', { fatal: true }).decode(bytes);
      return !bytes.includes(0);
    } catch {
      return false;
    }
  }
  return false;
}

export async function savePortalFile(
  file: File,
  ticket: RequestorTicket,
  identity: PortalIdentity,
  kind: 'SUPPORTING' | 'DELIVERABLE',
): Promise<RequestorFile> {
  if (!file.size) throw new PortalFileValidationError('The selected file is empty.', 400);
  if (file.size > maxFileSize) throw new PortalFileValidationError('Files must be 10 MB or smaller.', 413);
  const fileName = file.name.replaceAll('\\', '/').split('/').pop()?.replace(/[\u0000-\u001f\u007f]/g, '').trim() ?? '';
  const extension = fileName.match(/\.[a-z0-9]{1,10}$/i)?.[0].toLowerCase();
  const allowedExtensions = allowedTypes.get(file.type);
  if (!fileName || fileName.length > 180 || !extension || !allowedExtensions?.has(extension)) {
    throw new PortalFileValidationError('That file type is not supported.', 415);
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  if (!isValidFileContent(file.type, bytes)) {
    throw new PortalFileValidationError('The file content does not match its file type.', 415);
  }

  const storagePath = `${ticket.id}/${crypto.randomUUID()}-${fileName}`;
  const { url, key } = getPortalServiceConfig();
  const storageUrl = `${url}/storage/v1/object/${bucket}/${storagePath.split('/').map(encodeURIComponent).join('/')}`;
  const uploadResponse = await fetch(storageUrl, {
    method: 'POST',
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': file.type,
      'x-upsert': 'false',
    },
    body: bytes,
  });
  if (!uploadResponse.ok) {
    const errorText = await uploadResponse.text();
    throw new Error(`Private file upload failed (${uploadResponse.status}): ${errorText}`);
  }

  const recordResponse = await fetch(`${url}/rest/v1/ticket_portal_files`, {
    method: 'POST',
    headers: { ...getPortalServiceHeaders(), Prefer: 'return=representation' },
    body: JSON.stringify({
      ticket_id: ticket.id,
      ticket_number: ticket.ticketNumber,
      uploaded_by_email: identity.email,
      file_name: fileName,
      mime_type: file.type,
      file_size: file.size,
      storage_path: storagePath,
      file_kind: kind,
    }),
  });
  if (!recordResponse.ok) {
    const errorText = await recordResponse.text();
    const cleanupResponse = await fetch(storageUrl, {
      method: 'DELETE',
      headers: { apikey: key, Authorization: `Bearer ${key}` },
    });
    if (!cleanupResponse.ok) console.error('Failed to remove orphaned portal upload:', await cleanupResponse.text());
    throw new Error(`File record insert failed (${recordResponse.status}): ${errorText}`);
  }
  const [created] = await recordResponse.json() as PortalFileRow[];
  return {
    id: String(created.id),
    fileName: created.file_name,
    mimeType: created.mime_type,
    fileSize: Number(created.file_size),
    createdAt: created.created_at,
    kind: created.file_kind,
    downloadUrl: `/api/requestor/tickets/${encodeURIComponent(ticket.id)}/files/${encodeURIComponent(String(created.id))}`,
  };
}
