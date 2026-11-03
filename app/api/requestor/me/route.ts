import { NextResponse } from 'next/server';
import { authenticateRequestor } from '@/lib/requestor-auth';

export async function GET(request: Request) {
  try {
    const auth = await authenticateRequestor(request);
    if (auth.error) return auth.error;
    return NextResponse.json({
      name: auth.identity.name,
      email: auth.identity.email,
      department: auth.identity.department,
      roles: auth.identity.roles,
    }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    console.error('Failed to load requestor profile:', error);
    return NextResponse.json({ error: 'Unable to load your profile.' }, { status: 500 });
  }
}
