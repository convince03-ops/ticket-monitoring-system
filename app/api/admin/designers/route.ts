import { NextResponse } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const supabaseKey = process.env.SUPABASE_SECRET_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';
const tableName = 'designers';

const normalizeDesigner = (record: any) => ({
  id: String(record.id ?? ''),
  name: record.name ?? '',
  department: record.department ?? '',
  email: record.email ?? '',
  activeTickets: Number(record.active_tickets ?? record.activeTickets ?? 0),
  status: record.status ?? 'ACTIVE',
  createdAt: record.created_at ?? null,
  updatedAt: record.updated_at ?? null,
});

const getHeaders = () => ({
  apikey: supabaseKey,
  Authorization: `Bearer ${supabaseKey}`,
  Accept: 'application/json',
  'Content-Type': 'application/json',
});

const missingConfig = () => NextResponse.json(
  { error: 'Supabase configuration is missing' },
  { status: 500 }
);

const getWriteErrorMessage = (status: number, errorText: string, action: 'save' | 'update') => {
  let error: { code?: string; message?: string } = {};
  try {
    error = JSON.parse(errorText) as { code?: string; message?: string };
  } catch {
    // Keep database response details out of the client-facing error.
  }

  const code = error.code ?? '';
  if (code === '23505') return 'A designer with this email already exists.';
  if (code === '23502') {
    const column = error.message?.match(/column "([^"]+)"/)?.[1];
    const field = column === 'active_tickets' ? 'Active tickets' : column ? column.replaceAll('_', ' ') : 'A required field';
    return `${field} is required.`;
  }
  if (code === '22P02') return 'Active tickets must be a whole number.';
  if (code === '23514') return 'The designer status is invalid. Choose Active or Inactive.';
  if (code === 'PGRST204' || code === 'PGRST205' || code === '42P01') {
    return 'The designers table schema is out of date or missing. Refresh the database schema and try again.';
  }
  if (code === '42501' || status === 401 || status === 403) return 'The database denied this change. Check designer write permissions.';
  if (status === 404) return 'The designers table could not be found in the database.';
  if (status === 400) return `The database rejected the designer data${code ? ` (${code})` : ''}. Check the required fields.`;
  return `Unable to ${action} designer. Please try again.`;
};

export async function GET() {
  try {
    if (!supabaseUrl || !supabaseKey) {
      return missingConfig();
    }

    const response = await fetch(`${supabaseUrl}/rest/v1/${tableName}?select=*`, {
      headers: getHeaders(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      if (response.status === 404) {
        return NextResponse.json([]);
      }
      throw new Error(`Supabase request failed (${response.status}): ${errorText}`);
    }

    const records = (await response.json()) as any[];
    return NextResponse.json(records.map(normalizeDesigner));
  } catch (error) {
    console.error('Failed to fetch designers:', error);
    return NextResponse.json(
      { error: 'Failed to fetch designers', details: error instanceof Error ? error.message : 'Unknown database error' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    if (!supabaseUrl || !supabaseKey) {
      return missingConfig();
    }

    const body = await request.json();
    const payload = {
      name: body.name,
      department: body.department,
      email: body.email,
      active_tickets: Number(body.activeTickets ?? 0),
      status: body.status ?? 'ACTIVE',
    };

    const response = await fetch(`${supabaseUrl}/rest/v1/${tableName}`, {
      method: 'POST',
      headers: {
        ...getHeaders(),
        Prefer: 'return=representation',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Supabase designer insert failed (${response.status}):`, errorText);
      return NextResponse.json(
        { error: getWriteErrorMessage(response.status, errorText, 'save') },
        { status: response.status >= 400 && response.status < 500 ? response.status : 500 }
      );
    }

    const inserted = (await response.json()) as any[];
    const created = inserted[0] ?? inserted;
    return NextResponse.json(normalizeDesigner(created), { status: 201 });
  } catch (error) {
    console.error('Failed to create designer:', error);
    return NextResponse.json(
      { error: 'Unable to save designer. Check your connection and try again.' },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    if (!supabaseUrl || !supabaseKey) {
      return missingConfig();
    }

    const url = new URL(request.url);
    const id = url.searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Designer id is required' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const payload = {
      name: body.name,
      department: body.department,
      email: body.email,
      active_tickets: Number(body.activeTickets ?? 0),
      status: body.status,
    };

    const response = await fetch(`${supabaseUrl}/rest/v1/${tableName}?id=eq.${id}`, {
      method: 'PUT',
      headers: {
        ...getHeaders(),
        Prefer: 'return=representation',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Supabase designer update failed (${response.status}):`, errorText);
      return NextResponse.json(
        { error: getWriteErrorMessage(response.status, errorText, 'update') },
        { status: response.status >= 400 && response.status < 500 ? response.status : 500 }
      );
    }

    const updated = (await response.json()) as any[];
    const item = updated[0] ?? updated;
    return NextResponse.json(normalizeDesigner(item));
  } catch (error) {
    console.error('Failed to update designer:', error);
    return NextResponse.json(
      { error: 'Unable to update designer. Check your connection and try again.' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    if (!supabaseUrl || !supabaseKey) {
      return missingConfig();
    }

    const url = new URL(request.url);
    const id = url.searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Designer id is required' },
        { status: 400 }
      );
    }

    const response = await fetch(`${supabaseUrl}/rest/v1/${tableName}?id=eq.${id}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Supabase delete failed (${response.status}): ${errorText}`);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete designer:', error);
    return NextResponse.json(
      { error: 'Failed to delete designer' },
      { status: 500 }
    );
  }
}
