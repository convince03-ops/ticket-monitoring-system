import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export interface PortalIdentity {
  id: string;
  email: string;
  name: string;
  department: string | null;
  role: 'ADMINISTRATOR' | 'TECHNICIAN' | 'DESIGNER' | 'REQUESTOR';
  roles: Array<'ADMINISTRATOR' | 'TECHNICIAN' | 'DESIGNER' | 'REQUESTOR'>;
}

export type PortalAuthResult =
  | { identity: PortalIdentity; error?: never }
  | { identity?: never; error: NextResponse };

export async function authenticatePortalUser(request: Request): Promise<PortalAuthResult> {
  const authorization = request.headers.get('authorization');
  const token = authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) {
    return { error: NextResponse.json({ error: 'Authentication required.' }, { status: 401 }) };
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
    ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseKey) {
    console.error('Requestor authentication is missing Supabase public configuration.');
    return { error: NextResponse.json({ error: 'Authentication is temporarily unavailable.' }, { status: 503 }) };
  }

  const authClient = createClient(supabaseUrl, supabaseKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data, error } = await authClient.auth.getUser(token);
  if (error || !data.user?.email) {
    return { error: NextResponse.json({ error: 'Authentication required.' }, { status: 401 }) };
  }

  const user = await prisma.user.findFirst({
    where: { email: { equals: data.user.email, mode: 'insensitive' } },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      additionalRoles: true,
      department: { select: { name: true } },
    },
  });
  if (!user) {
    return { error: NextResponse.json({ error: 'This account is not registered in the ticket system.' }, { status: 403 }) };
  }

  return {
    identity: {
      id: user.id,
      email: user.email,
      name: user.name?.trim() || data.user.user_metadata?.full_name || user.email,
      department: user.department?.name ?? null,
      role: user.role,
      roles: [...new Set([user.role, ...user.additionalRoles])],
    },
  };
}

export async function authenticateRequestor(request: Request): Promise<PortalAuthResult> {
  const result = await authenticatePortalUser(request);
  if (result.error) return result;
  if (!result.identity.roles.includes('REQUESTOR')) {
    return { error: NextResponse.json({ error: 'Requestor portal access is not enabled for this account.' }, { status: 403 }) };
  }
  return result;
}

export function getPortalServiceConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) {
    throw new Error('Requestor portal data access requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY.');
  }
  return { url, key };
}

export function getPortalServiceHeaders() {
  const { key } = getPortalServiceConfig();
  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
    Accept: 'application/json',
    'Content-Type': 'application/json',
  };
}
