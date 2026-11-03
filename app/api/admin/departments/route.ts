import { NextResponse } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const supabaseKey = process.env.SUPABASE_SECRET_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';
const tableName = 'departments';

const normalizeDepartment = (record: any) => ({
  id: String(record.id ?? ''),
  name: record.name ?? '',
  description: record.description ?? '',
  status: record.status ?? 'ACTIVE',
  ticketCount: Number(record.ticket_count ?? record.ticketCount ?? 0),
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
    return NextResponse.json(records.map(normalizeDepartment));
  } catch (error) {
    console.error('Failed to fetch departments:', error);
    return NextResponse.json(
      { error: 'Failed to fetch departments', details: error instanceof Error ? error.message : 'Unknown database error' },
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
      description: body.description ?? '',
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
      throw new Error(`Supabase insert failed (${response.status}): ${errorText}`);
    }

    const inserted = (await response.json()) as any[];
    const created = inserted[0] ?? inserted;
    return NextResponse.json(normalizeDepartment(created), { status: 201 });
  } catch (error) {
    console.error('Failed to create department:', error);
    return NextResponse.json(
      { error: 'Failed to create department' },
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
        { error: 'Department id is required' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const payload = {
      name: body.name,
      description: body.description,
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
      throw new Error(`Supabase update failed (${response.status}): ${errorText}`);
    }

    const updated = (await response.json()) as any[];
    const item = updated[0] ?? updated;
    return NextResponse.json(normalizeDepartment(item));
  } catch (error) {
    console.error('Failed to update department:', error);
    return NextResponse.json(
      { error: 'Failed to update department' },
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
        { error: 'Department id is required' },
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
    console.error('Failed to delete department:', error);
    return NextResponse.json(
      { error: 'Failed to delete department' },
      { status: 500 }
    );
  }
}
