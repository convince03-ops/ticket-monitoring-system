'use client';

import { useState, useMemo, useEffect } from 'react';
import { Search, Download, Filter, Plus, X, Eye, Pencil } from 'lucide-react';
import { AddTicketDrawer } from '@/features/tickets/components/AddTicketDrawer';
import { PortalConversationPanel } from '@/features/tickets/components/PortalConversationPanel';
import { TicketRecord, TicketStatus } from '@/features/tickets/types';
import { CreateTicketFormData } from '@/features/tickets/schemas/createTicket';
import { getTicketTimeliness } from '@/features/tickets/services/timeliness';
import type { TicketTimeliness } from '@/features/tickets/services/timeliness';

const statusColors: Record<TicketStatus, string> = {
  OPEN: 'bg-slate-100 text-slate-700',
  IN_PROGRESS: 'bg-blue-100 text-blue-700',
  COMPLETED: 'bg-green-100 text-green-700',
  CANCELLED: 'bg-red-100 text-red-700'
};

const statusLabels: Record<TicketStatus, string> = {
  OPEN: 'Pending',
  IN_PROGRESS: 'Working',
  COMPLETED: 'Done',
  CANCELLED: 'Cancel'
};

const levelColors: Record<string, string> = {
  MINOR: 'bg-green-100 text-green-700',
  MODERATE: 'bg-yellow-100 text-yellow-700',
  MAJOR: 'bg-red-100 text-red-700'
};

const formatDate = (value: string | null) => value ? new Date(`${value}T00:00:00`).toLocaleDateString('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric'
}) : 'Not recorded';

const getCounterDays = (dateReceivedByArtist: string | null) => {
  if (!dateReceivedByArtist) return 0;

  const received = new Date(`${dateReceivedByArtist}T00:00:00`);
  const today = new Date();
  const currentDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.max(0, Math.floor((currentDay.getTime() - received.getTime()) / 86400000));
};

const getTodayDate = () => {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
};

const PAGE_SIZE = 50;

const getTicketRequestDateValue = (ticket: TicketRecord) => ticket.ticketRequestDate ?? ticket.createdAt ?? null;

const getWeekStart = (value: Date) => {
  const date = new Date(value);
  const day = date.getDay();
  const diff = (day === 0 ? -6 : 1) - day;
  date.setDate(date.getDate() + diff);
  date.setHours(0, 0, 0, 0);
  return date;
};

export function TicketMonitoringPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDepartment, setFilterDepartment] = useState('');
  const [filterDesigner, setFilterDesigner] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterMaterial, setFilterMaterial] = useState('');
  const [filterLevel, setFilterLevel] = useState('');
  const [filterTimeliness, setFilterTimeliness] = useState<TicketTimeliness | ''>('');
  const [dateFilterMode, setDateFilterMode] = useState<'ALL' | 'MONTH' | 'WEEK' | 'DAY'>('ALL');
  const [dateFilterValue, setDateFilterValue] = useState(() => new Date().toISOString().slice(0, 7));
  const [departmentOptions, setDepartmentOptions] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState('ticketRequestDate');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [tickets, setTickets] = useState<TicketRecord[]>([]);
  const [selectedTicketId, setSelectedTicketId] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [editingTicket, setEditingTicket] = useState<TicketRecord | null>(null);
  const [statusDraft, setStatusDraft] = useState<TicketStatus>('OPEN');
  const [savingStatus, setSavingStatus] = useState(false);

  const handleResetFilters = () => {
    setSearchTerm('');
    setFilterDepartment('');
    setFilterDesigner('');
    setFilterStatus('');
    setFilterMaterial('');
    setFilterLevel('');
    setFilterTimeliness('');
    setDateFilterMode('ALL');
    setDateFilterValue(new Date().toISOString().slice(0, 7));
  };

  const handleDateFilterModeChange = (mode: 'ALL' | 'MONTH' | 'WEEK' | 'DAY') => {
    setDateFilterMode(mode);
    const now = new Date();
    if (mode === 'MONTH') {
      setDateFilterValue(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`);
    } else if (mode === 'WEEK' || mode === 'DAY') {
      setDateFilterValue(now.toISOString().slice(0, 10));
    }
  };

  const showSuccessMessage = (message: string) => {
    setSuccessMessage(message);
    window.setTimeout(() => setSuccessMessage(''), 4000);
  };

  const handleExport = () => {
    if (filteredTickets.length === 0) {
      return;
    }

    const csvRows = [
      ['Ticket #', 'Description', 'Department', 'Requestor', 'Month', 'Ticket Request Date', 'Level / Type', 'Date Received by Artist', 'Working Days', 'Deadline', 'Counter', 'Status', 'Date of Submission', 'Timeliness', 'Designer', 'Ticket Level', 'Remarks', 'Others'],
      ...filteredTickets.map((ticket) => [
        ticket.ticketNumber,
        ticket.description,
        ticket.department,
        ticket.requestor,
        ticket.month ?? '',
        ticket.ticketRequestDate ?? ticket.createdAt ?? '',
        ticket.material,
        ticket.dateReceivedByArtist ?? '',
        ticket.workingDays,
        ticket.deadline ?? '',
        getCounterDays(ticket.dateReceivedByArtist),
        ticket.status,
        ticket.dateOfSubmission ?? '',
        getTicketTimeliness(ticket),
        ticket.designer,
        ticket.ticketLevel,
        ticket.remarks,
        ticket.others
      ])
    ];

    const csvContent = csvRows
      .map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'ticket-monitoring-export.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  useEffect(() => {
    const loadTickets = async () => {
      try {
        const response = await fetch('/api/tickets');

        if (!response.ok) {
          throw new Error('Failed to load tickets');
        }

        const data = (await response.json()) as TicketRecord[];
        setTickets(data);

        if (data.length > 0) {
          setSelectedTicketId(data[0].id);
        }
      } catch (error) {
        console.error('Failed to load tickets:', error);
        setTickets([]);
      }
    };

    const loadDepartments = async () => {
      try {
        const response = await fetch('/api/admin/departments', { cache: 'no-store' });
        if (!response.ok) {
          const errorBody = await response.text();
          throw new Error(`Failed to load departments (${response.status}): ${errorBody || 'Unknown error'}`);
        }
        const departments = (await response.json()) as Array<{ name: string }>;
        setDepartmentOptions((departments || []).map((item) => item.name));
      } catch (error) {
        console.warn('Departments are unavailable for ticket filters:', error);
      }
    };

    void loadTickets();
    void loadDepartments();
  }, []);

  const filteredTickets = useMemo(() => {
    let filtered = [...tickets];

    if (searchTerm) {
      filtered = filtered.filter(
        (ticket) =>
          ticket.ticketNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
          ticket.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
          ticket.designer.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (filterDepartment) {
      filtered = filtered.filter((ticket) => ticket.department === filterDepartment);
    }

    if (filterDesigner) {
      filtered = filtered.filter((ticket) => ticket.designer === filterDesigner);
    }

    if (filterStatus) {
      filtered = filtered.filter((ticket) => ticket.status === filterStatus);
    }

    if (filterMaterial) {
      filtered = filtered.filter((ticket) => ticket.material === filterMaterial);
    }

    if (filterLevel) {
      filtered = filtered.filter((ticket) => ticket.ticketLevel === filterLevel);
    }

    if (filterTimeliness) {
      filtered = filtered.filter((ticket) => getTicketTimeliness(ticket) === filterTimeliness);
    }

    if (dateFilterMode !== 'ALL' && dateFilterValue) {
      filtered = filtered.filter((ticket) => {
        const requestDate = getTicketRequestDateValue(ticket);
        if (!requestDate) return false;

        const ticketDate = new Date(`${requestDate}T00:00:00`);

        if (dateFilterMode === 'MONTH') {
          return requestDate.startsWith(dateFilterValue);
        }

        if (dateFilterMode === 'WEEK') {
          const selectedDate = new Date(`${dateFilterValue}T00:00:00`);
          const weekStart = getWeekStart(selectedDate);
          const weekEnd = new Date(weekStart);
          weekEnd.setDate(weekEnd.getDate() + 6);
          return ticketDate >= weekStart && ticketDate <= weekEnd;
        }

        return requestDate === dateFilterValue;
      });
    }

    filtered.sort((a, b) => {
      const aVal = String((sortBy === 'ticketRequestDate' ? getTicketRequestDateValue(a) : a[sortBy as keyof TicketRecord]) ?? '');
      const bVal = String((sortBy === 'ticketRequestDate' ? getTicketRequestDateValue(b) : b[sortBy as keyof TicketRecord]) ?? '');

      if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [searchTerm, filterDepartment, filterDesigner, filterStatus, filterMaterial, filterLevel, filterTimeliness, dateFilterMode, dateFilterValue, sortBy, sortOrder, tickets]);

  const pageCount = Math.max(1, Math.ceil(filteredTickets.length / PAGE_SIZE));
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterDepartment, filterDesigner, filterStatus, filterMaterial, filterLevel, filterTimeliness, dateFilterMode, dateFilterValue]);

  const paginatedTickets = filteredTickets.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const designerOptions = [...new Set(tickets.map((ticket) => ticket.designer).filter(Boolean))].sort((a, b) => a.localeCompare(b));
  const materialOptions = [...new Set(tickets.map((ticket) => ticket.material).filter(Boolean))].sort((a, b) => a.localeCompare(b));

  const selectedTicket = filteredTickets.find((ticket) => ticket.id === selectedTicketId) ?? filteredTickets[0] ?? null;
  useEffect(() => {
    if (selectedTicket) setStatusDraft(selectedTicket.status);
  }, [selectedTicket]);

  useEffect(() => {
    if (!isDetailsOpen) return;

    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsDetailsOpen(false);
    };

    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isDetailsOpen]);

  const handleStatusUpdate = async () => {
    if (!selectedTicket || statusDraft === selectedTicket.status) return;

    setSavingStatus(true);
    const submissionDate = statusDraft === 'COMPLETED' && !selectedTicket.dateOfSubmission
      ? getTodayDate()
      : selectedTicket.dateOfSubmission;
    try {
      const response = await fetch(`/api/tickets?id=${encodeURIComponent(selectedTicket.id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: statusDraft,
          ...(statusDraft === 'COMPLETED' && submissionDate ? { dateOfSubmission: submissionDate } : {}),
        }),
      });
      const result = await response.json() as { error?: string; details?: string };
      if (!response.ok) throw new Error(result.details || result.error || 'Failed to update ticket status');

      setTickets((current) => current.map((ticket) => ticket.id === selectedTicket.id
        ? { ...ticket, status: statusDraft, dateOfSubmission: submissionDate }
        : ticket));
      showSuccessMessage(`Ticket ${selectedTicket.ticketNumber} status updated.`);
    } catch (error) {
      console.error('Failed to update ticket status:', error);
      setStatusDraft(selectedTicket.status);
      showSuccessMessage(error instanceof Error ? error.message : 'Failed to update ticket status');
    } finally {
      setSavingStatus(false);
    }
  };
  const statusTotals = useMemo(() => (['OPEN', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'] as TicketStatus[]).map((status) => ({
    status,
    total: tickets.filter((ticket) => ticket.status === status).length
  })), [tickets]);

  return (
    <div>
      {successMessage && (
        <div role="status" className="fixed right-6 top-6 z-[70] flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm font-medium text-emerald-800 shadow-lg">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-600 text-white">✓</span>
          {successMessage}
        </div>
      )}
      <div className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 border-b border-slate-200 pb-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Tickets</p>
            <h1 className="mt-1 text-2xl font-bold text-slate-900 sm:text-3xl">Ticket Monitoring</h1>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleExport}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              <Download className="h-4 w-4" />
              Export
            </button>
            <button
              onClick={() => setIsDrawerOpen(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700"
            >
              <Plus className="h-4 w-4" />
              Add Ticket
            </button>
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {statusTotals.map(({ status, total }) => (
            <button
              key={status}
              onClick={() => setFilterStatus(status === filterStatus ? '' : status)}
              className={`rounded-2xl border p-4 text-left transition hover:border-blue-300 ${filterStatus === status ? 'border-blue-500 bg-blue-50' : 'border-slate-200 bg-slate-50'}`}
            >
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">{statusLabels[status]}</p>
              <p className="mt-2 text-2xl font-semibold text-slate-950">{total}</p>
              <p className="mt-1 text-xs text-slate-500">Total tickets</p>
            </button>
          ))}
        </div>

        <div className="mt-5 grid gap-3">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search tickets..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm text-slate-700 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div className="grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 sm:grid-cols-2 xl:grid-cols-4">
            <div className="min-w-0">
              <label htmlFor="ticket-filter-date-mode" className="text-xs font-medium text-slate-600">Date range</label>
              <div className={`mt-1 grid gap-2 ${dateFilterMode === 'ALL' ? 'grid-cols-1' : 'grid-cols-2'}`}>
                <select
                  id="ticket-filter-date-mode"
                  value={dateFilterMode}
                  onChange={(e) => handleDateFilterModeChange(e.target.value as 'ALL' | 'MONTH' | 'WEEK' | 'DAY')}
                  className="h-10 min-w-0 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 focus:outline-none"
                >
                  <option value="ALL">All time</option>
                  <option value="MONTH">Per month</option>
                  <option value="WEEK">Per week</option>
                  <option value="DAY">Per day</option>
                </select>
                {dateFilterMode !== 'ALL' && (
                  <input
                    aria-label="Date range value"
                    type={dateFilterMode === 'MONTH' ? 'month' : 'date'}
                    value={dateFilterValue}
                    onChange={(e) => setDateFilterValue(e.target.value)}
                    className="h-10 min-w-0 w-full rounded-lg border border-slate-200 bg-white px-2 text-sm text-slate-700 focus:outline-none"
                  />
                )}
              </div>
            </div>

            <div className="min-w-0">
              <label htmlFor="ticket-filter-department" className="text-xs font-medium text-slate-600">Department</label>
              <select
                id="ticket-filter-department"
                value={filterDepartment}
                onChange={(e) => setFilterDepartment(e.target.value)}
                className="mt-1 block h-10 w-full min-w-0 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 focus:outline-none"
              >
                <option value="">All Departments</option>
                {departmentOptions.map((department) => <option key={department} value={department}>{department}</option>)}
              </select>
            </div>

            <div className="min-w-0">
              <label htmlFor="ticket-filter-designer" className="text-xs font-medium text-slate-600">Designer</label>
              <select
                id="ticket-filter-designer"
                value={filterDesigner}
                onChange={(e) => setFilterDesigner(e.target.value)}
                className="mt-1 block h-10 w-full min-w-0 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 focus:outline-none"
              >
                <option value="">All Designers</option>
                {designerOptions.map((designer) => <option key={designer} value={designer}>{designer}</option>)}
              </select>
            </div>

            <div className="min-w-0">
              <label htmlFor="ticket-filter-status" className="text-xs font-medium text-slate-600">Status</label>
              <select
                id="ticket-filter-status"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="mt-1 block h-10 w-full min-w-0 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 focus:outline-none"
              >
                <option value="">All Statuses</option>
                <option value="OPEN">Pending</option>
                <option value="IN_PROGRESS">Working</option>
                <option value="COMPLETED">Done</option>
                <option value="CANCELLED">Cancel</option>
              </select>
            </div>

            <div className="min-w-0">
              <label htmlFor="ticket-filter-material" className="text-xs font-medium text-slate-600">Material</label>
              <select
                id="ticket-filter-material"
                value={filterMaterial}
                onChange={(e) => setFilterMaterial(e.target.value)}
                className="mt-1 block h-10 w-full min-w-0 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 focus:outline-none"
              >
                <option value="">All Materials</option>
                {materialOptions.map((material) => <option key={material} value={material}>{material}</option>)}
              </select>
            </div>

            <div className="min-w-0">
              <label htmlFor="ticket-filter-level" className="text-xs font-medium text-slate-600">Ticket level</label>
              <select
                id="ticket-filter-level"
                value={filterLevel}
                onChange={(e) => setFilterLevel(e.target.value)}
                className="mt-1 block h-10 w-full min-w-0 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 focus:outline-none"
              >
                <option value="">All Ticket Levels</option>
                <option value="MINOR">Minor</option>
                <option value="MODERATE">Moderate</option>
                <option value="MAJOR">Major</option>
              </select>
            </div>

            <div className="min-w-0">
              <label htmlFor="ticket-filter-timeliness" className="text-xs font-medium text-slate-600">Timeliness</label>
              <select
                id="ticket-filter-timeliness"
                value={filterTimeliness}
                onChange={(e) => setFilterTimeliness(e.target.value as TicketTimeliness | '')}
                className="mt-1 block h-10 w-full min-w-0 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 focus:outline-none"
              >
                <option value="">All Results</option>
                <option value="DELAYED">Delayed</option>
                <option value="ON-TIME">On Time</option>
                <option value="CANCEL">Cancel</option>
                <option value="PENDING">Pending / Not Due</option>
                <option value="UNRECORDED">Submission Not Recorded</option>
              </select>
            </div>

            <div className="flex items-end">
              <button
                onClick={handleResetFilters}
                className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 transition hover:bg-slate-100"
              >
                <Filter className="h-4 w-4" />
                Reset Filters
              </button>
            </div>
          </div>
        </div>

        <div className="mt-5 overflow-hidden rounded-[20px] border border-slate-200 bg-white">
          <div className="w-full">
            <table className="w-full table-fixed text-sm">
              <colgroup>
                <col className="w-[7%]" />
                <col className="w-[18%]" />
                <col className="w-[10%]" />
                <col className="w-[8%]" />
                <col className="w-[8%]" />
                <col className="w-[13%]" />
                <col className="w-[7%]" />
                <col className="w-[7%]" />
                <col className="w-[8%]" />
                <col className="w-[7%]" />
                <col className="w-[7%]" />
              </colgroup>
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="sticky top-0 z-10 bg-slate-50 px-2 py-3 text-left font-semibold text-slate-800">Ticket #</th>
                  <th className="sticky top-0 z-10 bg-slate-50 px-2 py-3 text-left font-semibold text-slate-800">Description</th>
                  <th className="sticky top-0 z-10 bg-slate-50 px-2 py-3 text-left font-semibold text-slate-800">Requestor</th>
                  <th className="sticky top-0 z-10 bg-slate-50 px-2 py-3 text-left font-semibold text-slate-800">Department</th>
                  <th className="sticky top-0 z-10 bg-slate-50 px-2 py-3 text-left font-semibold text-slate-800">Month</th>
                  <th className="sticky top-0 z-10 bg-slate-50 px-2 py-3 text-left font-semibold text-slate-800">Level / Type</th>
                  <th className="sticky top-0 z-10 bg-slate-50 px-2 py-3 text-left font-semibold text-slate-800">Designer</th>
                  <th className="sticky top-0 z-10 bg-slate-50 px-2 py-3 text-left font-semibold text-slate-800">Status</th>
                  <th className="sticky top-0 z-10 bg-slate-50 px-2 py-3 text-left font-semibold text-slate-800">Deadline</th>
                  <th className="sticky top-0 z-10 bg-slate-50 px-2 py-3 text-left font-semibold text-slate-800">Working Days</th>
                  <th className="sticky top-0 z-10 bg-slate-50 px-2 py-3 text-right font-semibold text-slate-800">Action</th>
                </tr>
              </thead>

              <tbody>
                {paginatedTickets.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="px-6 py-10 text-center text-slate-500">
                      No tickets found matching your criteria
                    </td>
                  </tr>
                ) : (
                  paginatedTickets.map((ticket) => (
                    <tr
                      key={ticket.id}
                      className={`border-b border-slate-100 transition ${selectedTicket?.id === ticket.id ? 'bg-blue-50/70' : 'hover:bg-slate-50'}`}
                    >
                      <td className="overflow-hidden px-2 py-3 font-medium text-blue-600 whitespace-nowrap">
                        <button onClick={() => setSelectedTicketId(ticket.id)} className="max-w-full overflow-hidden text-ellipsis text-left hover:underline" title={ticket.ticketNumber}>
                          {ticket.ticketNumber}
                        </button>
                      </td>
                      <td className="overflow-hidden text-ellipsis whitespace-nowrap px-2 py-3 text-slate-700" title={ticket.description}>{ticket.description}</td>
                      <td className="overflow-hidden text-ellipsis whitespace-nowrap px-2 py-3 text-slate-700" title={ticket.requestor}>{ticket.requestor}</td>
                      <td className="overflow-hidden text-ellipsis whitespace-nowrap px-2 py-3 text-slate-700" title={ticket.department}>{ticket.department}</td>
                      <td className="overflow-hidden text-ellipsis whitespace-nowrap px-2 py-3 text-slate-700" title={ticket.month ?? 'Not recorded'}>{ticket.month ?? 'Not recorded'}</td>
                      <td className="overflow-hidden whitespace-nowrap px-2 py-3"><span title={`${ticket.ticketLevel} / ${ticket.material}`} className={`inline-flex max-w-full overflow-hidden text-ellipsis rounded-full px-2 py-1 text-xs font-medium ${levelColors[ticket.ticketLevel]}`}>{ticket.ticketLevel} / {ticket.material}</span></td>
                      <td className="overflow-hidden text-ellipsis whitespace-nowrap px-2 py-3 text-slate-700" title={ticket.designer}>{ticket.designer}</td>
                      <td className="overflow-hidden whitespace-nowrap px-2 py-3">
                        <span className={`inline-flex max-w-full overflow-hidden text-ellipsis rounded-full px-3 py-1 text-xs font-medium ${statusColors[ticket.status]}`}>
                          {statusLabels[ticket.status]}
                        </span>
                      </td>
                      <td className="overflow-hidden text-ellipsis whitespace-nowrap px-2 py-3 text-slate-700">{formatDate(ticket.deadline)}</td>
                      <td className="overflow-hidden text-ellipsis whitespace-nowrap px-2 py-3 text-slate-700">{ticket.workingDays} days</td>
                      <td className="overflow-hidden px-1 py-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => {
                              setSelectedTicketId(ticket.id);
                              setStatusDraft(ticket.status);
                              setIsDetailsOpen(true);
                            }}
                            aria-label={`View ticket ${ticket.ticketNumber}`}
                            title="View details"
                            className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-50"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              setEditingTicket(ticket);
                              setIsDrawerOpen(true);
                            }}
                            aria-label={`Edit ticket ${ticket.ticketNumber}`}
                            title="Edit ticket"
                            className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 bg-white text-blue-700 transition hover:bg-blue-50"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-2 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between">
          <div>
            Showing {filteredTickets.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1}-{Math.min(currentPage * PAGE_SIZE, filteredTickets.length)} of {filteredTickets.length} tickets
          </div>

          <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                disabled={currentPage === 1 || filteredTickets.length <= PAGE_SIZE}
                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Prev
              </button>
              <span className="text-sm text-slate-700">
                Page {currentPage} of {pageCount}
              </span>
              <button
                type="button"
                onClick={() => setCurrentPage((page) => Math.min(pageCount, page + 1))}
                disabled={currentPage >= pageCount || filteredTickets.length <= PAGE_SIZE}
                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Next
              </button>
          </div>
        </div>

      </div>

      {isDetailsOpen && selectedTicket && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center overflow-y-auto bg-slate-950/50 p-5 sm:p-10"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setIsDetailsOpen(false);
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="ticket-details-title"
            className="flex max-h-[calc(100vh-2.5rem)] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl sm:max-h-[calc(100vh-5rem)]"
          >
            <header className="shrink-0 border-b border-slate-200 px-5 pb-4 pt-5 sm:px-7">
              <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-700">Ticket details</p>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <h2 id="ticket-details-title" className="text-xl font-semibold text-slate-950">{selectedTicket.ticketNumber}</h2>
                    <span className={`inline-flex w-fit rounded-full px-2.5 py-1 text-xs font-medium ${statusColors[selectedTicket.status]}`}>
                      {statusLabels[selectedTicket.status]}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-slate-600">{selectedTicket.description}</p>
              </div>
              <button
                type="button"
                onClick={() => setIsDetailsOpen(false)}
                aria-label="Close ticket details"
                title="Close"
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition hover:bg-slate-100"
              >
                <X className="h-4 w-4" />
              </button>
              </div>
            </header>

            <div className="min-h-0 overflow-y-auto px-5 py-5 sm:px-7">
              <div className="grid gap-7 sm:grid-cols-2">
                <section>
                  <h3 className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Request</h3>
                  <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-4">
                    <div><dt className="text-xs text-slate-500">Department</dt><dd className="mt-1 break-words text-sm font-medium text-slate-900">{selectedTicket.department}</dd></div>
                    <div><dt className="text-xs text-slate-500">Requestor</dt><dd className="mt-1 break-words text-sm font-medium text-slate-900">{selectedTicket.requestor}</dd></div>
                    <div><dt className="text-xs text-slate-500">Month</dt><dd className="mt-1 text-sm font-medium text-slate-900">{selectedTicket.month || 'Not recorded'}</dd></div>
                    <div><dt className="text-xs text-slate-500">Requested</dt><dd className="mt-1 text-sm font-medium text-slate-900">{formatDate(selectedTicket.ticketRequestDate ?? selectedTicket.createdAt)}</dd></div>
                  </dl>
                </section>

                <section>
                  <h3 className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Production</h3>
                  <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-4">
                    <div><dt className="text-xs text-slate-500">Level / type</dt><dd className="mt-1 break-words text-sm font-medium text-slate-900">{selectedTicket.ticketLevel} / {selectedTicket.material}</dd></div>
                    <div><dt className="text-xs text-slate-500">Designer</dt><dd className="mt-1 text-sm font-medium text-slate-900">{selectedTicket.designer}</dd></div>
                    <div><dt className="text-xs text-slate-500">Received by artist</dt><dd className="mt-1 text-sm font-medium text-slate-900">{formatDate(selectedTicket.dateReceivedByArtist)}</dd></div>
                    <div><dt className="text-xs text-slate-500">Working days</dt><dd className="mt-1 text-sm font-medium text-slate-900">{selectedTicket.workingDays}</dd></div>
                    <div><dt className="text-xs text-slate-500">Deadline</dt><dd className="mt-1 text-sm font-medium text-slate-900">{formatDate(selectedTicket.deadline)}</dd></div>
                    <div><dt className="text-xs text-slate-500">Submitted</dt><dd className="mt-1 text-sm font-medium text-slate-900">{formatDate(selectedTicket.dateOfSubmission)}</dd></div>
                  </dl>
                </section>

                <section className="border-t border-slate-200 pt-5 sm:col-span-2">
                  <h3 className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Timing</h3>
                  <dl className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
                    <div><dt className="text-xs text-slate-500">Counter</dt><dd className="mt-1 text-sm font-medium text-slate-900">{getCounterDays(selectedTicket.dateReceivedByArtist)} days</dd></div>
                    <div><dt className="text-xs text-slate-500">Timeliness</dt><dd className="mt-1 text-sm font-medium text-slate-900">{getTicketTimeliness(selectedTicket)}</dd></div>
                  </dl>
                </section>

                <section className="border-t border-slate-200 pt-5 sm:col-span-2">
                  <h3 className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Notes</h3>
                  <dl className="mt-4 grid gap-4 sm:grid-cols-2">
                    <div><dt className="text-xs text-slate-500">Remarks</dt><dd className="mt-1 whitespace-pre-wrap break-words text-sm text-slate-900">{selectedTicket.remarks || 'None'}</dd></div>
                    <div><dt className="text-xs text-slate-500">Others</dt><dd className="mt-1 whitespace-pre-wrap break-words text-sm text-slate-900">{selectedTicket.others || 'None'}</dd></div>
                  </dl>
                </section>
              </div>
              <PortalConversationPanel ticketId={selectedTicket.id} />
            </div>

            <footer className="shrink-0 border-t border-slate-200 bg-slate-50 px-5 py-4 sm:px-7">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <label htmlFor="ticket-status" className="text-sm font-medium text-slate-700">Update status</label>
                <div className="flex items-center gap-2">
                  <select
                    id="ticket-status"
                    value={statusDraft}
                    onChange={(event) => setStatusDraft(event.target.value as TicketStatus)}
                    className="min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:border-blue-500 focus:outline-none sm:flex-none"
                  >
                    <option value="OPEN">Pending</option>
                    <option value="IN_PROGRESS">Working</option>
                    <option value="COMPLETED">Done</option>
                    <option value="CANCELLED">Cancel</option>
                  </select>
                  <button
                    type="button"
                    onClick={() => void handleStatusUpdate()}
                    disabled={savingStatus || statusDraft === selectedTicket.status}
                    className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {savingStatus ? 'Saving...' : 'Save status'}
                  </button>
                </div>
              </div>
            </footer>
          </section>
        </div>
      )}

      <AddTicketDrawer
        isOpen={isDrawerOpen}
        initialTicket={editingTicket}
        onClose={() => {
          setIsDrawerOpen(false);
          setEditingTicket(null);
        }}
        onSubmit={async (data: CreateTicketFormData) => {
          try {
            const isEditing = Boolean(editingTicket);
            const response = await fetch(isEditing ? `/api/tickets?id=${encodeURIComponent(editingTicket!.id)}` : '/api/tickets', {
              method: isEditing ? 'PATCH' : 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify(data)
            });

            if (!response.ok) {
              const errorBody = (await response.json().catch(() => null)) as { error?: string; details?: string } | null;
              throw new Error(errorBody?.details || errorBody?.error || 'Failed to create ticket');
            }

            const createdTicket = (await response.json()) as TicketRecord;
            setTickets((current) => isEditing
              ? current.map((ticket) => ticket.id === createdTicket.id ? createdTicket : ticket)
              : [createdTicket, ...current]);
            setSelectedTicketId(createdTicket.id);
            showSuccessMessage(`Ticket ${createdTicket.ticketNumber} was ${isEditing ? 'updated' : 'created'} successfully.`);
          } catch (error) {
            console.error('Failed to create ticket:', error);
            throw error;
          }
        }}
      />
    </div>
  );
}
