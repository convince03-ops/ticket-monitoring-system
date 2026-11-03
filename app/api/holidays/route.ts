import { NextResponse } from 'next/server';
import Holidays from 'date-holidays';

export async function GET(request: Request) {
  const yearParam = new URL(request.url).searchParams.get('year');
  const year = Number(yearParam) || new Date().getFullYear();

  if (!Number.isInteger(year) || year < 1900 || year > 2200) {
    return NextResponse.json({ error: 'A valid year is required' }, { status: 400 });
  }

  try {
    const holidays = new Holidays('PH').getHolidays(year)
      .filter((holiday) => holiday.type === 'public' || holiday.type === 'bank')
      .map((holiday) => ({
        id: `public-${year}-${holiday.date.slice(0, 10)}-${holiday.name}`,
        name: holiday.name,
        date: holiday.date.slice(0, 10),
        source: 'public'
      }));

    return NextResponse.json(holidays);
  } catch (error) {
    console.error('Failed to load public holidays:', error);
    return NextResponse.json({ error: 'Failed to load public holidays' }, { status: 500 });
  }
}