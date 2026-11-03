'use client';

import { useEffect, useRef, useState } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { ChevronLeft, ChevronRight, Calendar, Plus } from 'lucide-react';

interface Holiday {
  id: string;
  name: string;
  date: string;
  source?: 'public' | 'manual';
}

export function CalendarPage() {
  const calendarRef = useRef<FullCalendar>(null);
  const [view, setView] = useState<'dayGridMonth' | 'timeGridWeek' | 'timeGridDay'>('dayGridMonth');
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [showHolidayForm, setShowHolidayForm] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [holidayName, setHolidayName] = useState('');

  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();
  const yearOptions = Array.from({ length: 11 }, (_, index) => currentYear - 5 + index);

  useEffect(() => {
    const loadPublicHolidays = async () => {
      try {
        const response = await fetch(`/api/holidays?year=${currentYear}`, { cache: 'no-store' });
        if (!response.ok) throw new Error('Failed to load public holidays');
        const publicHolidays = (await response.json()) as Holiday[];
        setHolidays((existing) => [
          ...existing.filter((holiday) => holiday.source === 'manual'),
          ...publicHolidays,
        ]);
      } catch (error) {
        console.warn('Public holidays are unavailable:', error);
      }
    };

    void loadPublicHolidays();
  }, [currentYear]);

  // Mock ticket data by date
  const ticketsByDate: Record<string, number> = {
    '2024-04-01': 3,
    '2024-04-02': 5,
    '2024-04-03': 2,
    '2024-04-04': 8,
    '2024-04-05': 4,
    '2024-04-08': 6,
    '2024-04-09': 3,
    '2024-04-10': 7,
    '2024-04-11': 2
  };

  // Create events for calendar
  const events = [
    // Ticket count events
    ...Object.entries(ticketsByDate).map(([date, count]) => ({
      id: `ticket-${date}`,
      title: `${count} tickets`,
      date,
      start: date,
      display: 'block' as const,
      backgroundColor: '#e8f3f0',
      borderColor: 'transparent',
      textColor: '#087c68',
      extendedProps: { type: 'ticket' }
    })),
    // Holiday events
    ...holidays.map((holiday) => ({
      id: holiday.id,
      title: `${holiday.name} · No SLA`,
      date: holiday.date,
      start: holiday.date,
      display: 'block' as const,
      backgroundColor: '#fff1ed',
      borderColor: 'transparent',
      textColor: '#b54732',
      extendedProps: { type: 'holiday' }
    }))
  ];

  const handleMonthChange = (month: number, year = currentYear) => {
    const nextDate = new Date(year, month, 1);
    setCurrentDate(nextDate);
    calendarRef.current?.getApi().gotoDate(nextDate);
  };

  const handleAddHoliday = () => {
    if (!selectedDate || !holidayName) return;

    const newHoliday: Holiday = {
      id: Date.now().toString(),
      name: holidayName,
      date: selectedDate,
      source: 'manual'
    };

    setHolidays([...holidays, newHoliday]);
    setHolidayName('');
    setSelectedDate(null);
    setShowHolidayForm(false);
  };

  const handleDateClick = (info: any) => {
    setSelectedDate(info.dateStr);
    setShowHolidayForm(true);
  };

  return (
    <div className="calendar-page">
      <div className="mb-6 flex flex-col gap-2 sm:mb-8">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">Scheduling</p>
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#e8f3f0] text-[#087c68]">
            <Calendar aria-hidden="true" className="h-5 w-5" />
          </span>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">Calendar</h1>
        </div>
        <p className="max-w-2xl text-sm leading-6 text-slate-600">
          Plan around ticket activity and holidays across the team.
        </p>
      </div>

      <section aria-label="Calendar controls" className="calendar-toolbar mb-4 grid gap-4 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 xl:grid-cols-[1fr_auto_1fr] xl:items-center">
        <div className="flex w-fit rounded-xl bg-slate-100 p-1">
          <button
            onClick={() => {
              setView('dayGridMonth');
              calendarRef.current?.getApi().changeView('dayGridMonth');
            }}
            aria-pressed={view === 'dayGridMonth'}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
              view === 'dayGridMonth'
                ? 'bg-white text-emerald-800 shadow-sm'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Month
          </button>
          <button
            onClick={() => {
              setView('timeGridWeek');
              calendarRef.current?.getApi().changeView('timeGridWeek');
            }}
            aria-pressed={view === 'timeGridWeek'}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
              view === 'timeGridWeek'
                ? 'bg-white text-emerald-800 shadow-sm'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Week
          </button>
          <button
            onClick={() => {
              setView('timeGridDay');
              calendarRef.current?.getApi().changeView('timeGridDay');
            }}
            aria-pressed={view === 'timeGridDay'}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
              view === 'timeGridDay'
                ? 'bg-white text-emerald-800 shadow-sm'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Day
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2 xl:justify-center">
          <p className="mr-1 min-w-36 text-lg font-semibold tracking-tight text-slate-900">
            {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </p>
          <select
            aria-label="Select month"
            value={currentMonth}
            onChange={(event) => handleMonthChange(Number(event.target.value))}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-emerald-600 focus:outline-none"
          >
            {Array.from({ length: 12 }, (_, month) => (
              <option key={month} value={month}>
                {new Date(2000, month, 1).toLocaleDateString('en-US', { month: 'long' })}
              </option>
            ))}
          </select>
          <select
            aria-label="Select year"
            value={currentYear}
            onChange={(event) => handleMonthChange(currentMonth, Number(event.target.value))}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-emerald-600 focus:outline-none"
          >
            {yearOptions.map((year) => <option key={year} value={year}>{year}</option>)}
          </select>
        </div>

        <div className="flex flex-wrap items-center gap-2 xl:justify-self-end">
          <button
            onClick={() => setShowHolidayForm(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-[#0e806d] px-3.5 py-2.5 text-sm font-medium text-white transition hover:bg-[#096b5b]"
          >
            <Plus className="h-4 w-4" />
            Add Holiday
          </button>
          <button
            aria-label="Previous period"
            onClick={() => {
              calendarRef.current?.getApi().prev();
              setCurrentDate(calendarRef.current?.getApi().getDate() ?? currentDate);
            }}
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:border-slate-300 hover:bg-slate-50"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            aria-label="Next period"
            onClick={() => {
              calendarRef.current?.getApi().next();
              setCurrentDate(calendarRef.current?.getApi().getDate() ?? currentDate);
            }}
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:border-slate-300 hover:bg-slate-50"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
          <button
            onClick={() => {
              calendarRef.current?.getApi().today();
              setCurrentDate(new Date());
            }}
            className="rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
          >
            Today
          </button>
        </div>
      </section>

      <div className="mb-4 flex flex-wrap items-center gap-x-5 gap-y-2 px-1 text-xs font-medium">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-[#9bd2c2]" />
          <span className="text-slate-600">Tickets</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-[#e9a18f]" />
          <span className="text-slate-600">Holiday · No SLA</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full border border-slate-300 bg-slate-100" />
          <span className="text-slate-600">Weekend · No SLA</span>
        </div>
      </div>

      <div className="calendar-surface overflow-hidden rounded-2xl border border-slate-200 bg-white p-3 sm:p-5">
        <FullCalendar
          ref={calendarRef}
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          initialView={view}
          initialDate={currentDate}
          headerToolbar={false}
          height="auto"
          events={events}
          eventClick={(info) => {
            if (info.event.extendedProps.type === 'ticket') {
              // Handle ticket click - show drawer with tickets for that day
            }
          }}
          dateClick={handleDateClick}
          datesSet={(info) => setCurrentDate(info.view.currentStart)}
          weekends={true}
          dayCellClassNames={(info) => (
            info.date.getDay() === 0 || info.date.getDay() === 6 ? ['calendar-weekend'] : []
          )}
          eventDisplay="block"
        />
      </div>

      {/* Holidays List */}
      {holidays.filter((holiday) => holiday.source !== 'public').length > 0 && (
        <div className="mt-6 rounded-[22px] border border-slate-200 bg-white p-6 shadow-soft">
          <h3 className="mb-4 text-lg font-semibold text-slate-950">Configured Holidays</h3>
          <div className="space-y-2">
            {holidays.filter((holiday) => holiday.source !== 'public').map((holiday) => (
              <div
                key={holiday.id}
                className="flex items-center justify-between rounded-lg bg-slate-50 p-4"
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl">🎉</span>
                  <div>
                    <p className="font-medium text-slate-900">{holiday.name}</p>
                    <p className="text-sm text-slate-600">{holiday.date}</p>
                  </div>
                </div>
                <button
                  onClick={() => setHolidays(holidays.filter((h) => h.id !== holiday.id))}
                  className="text-sm text-red-600 hover:text-red-700 transition"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add Holiday Modal */}
      {showHolidayForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-[22px] border border-slate-200 bg-white p-6 shadow-lg">
            <h3 className="mb-4 text-lg font-semibold text-slate-950">Add Holiday</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-900 mb-2">Holiday Name</label>
                <input
                  type="text"
                  placeholder="e.g., Independence Day"
                  value={holidayName}
                  onChange={(e) => setHolidayName(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-900 mb-2">Date</label>
                <input
                  type="date"
                  value={selectedDate || ''}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => {
                    setShowHolidayForm(false);
                    setHolidayName('');
                    setSelectedDate(null);
                  }}
                  className="flex-1 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddHoliday}
                  className="flex-1 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition disabled:opacity-50"
                  disabled={!holidayName || !selectedDate}
                >
                  Add Holiday
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
