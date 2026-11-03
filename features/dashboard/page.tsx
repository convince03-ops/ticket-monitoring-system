'use client';

import { useEffect, useMemo, useState } from 'react';
import { Activity, ArrowLeft, ArrowUpRight, BarChart3, CheckCircle2, Layers, Sparkles, TrendingUp, X } from 'lucide-react';
import { BarChart, Bar, PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import type { TicketLevel, TicketRecord, TicketStatus } from '@/features/tickets/types';
import { getTicketTimeliness } from '@/features/tickets/services/timeliness';

const levelColors: Record<string, string> = {
  MINOR: '#10b981',
  MODERATE: '#3b82f6',
  MAJOR: '#ef4444'
};

const statusIcons = {
  OPEN: Activity,
  IN_PROGRESS: BarChart3,
  COMPLETED: CheckCircle2,
  CANCELLED: Activity
};

const departmentColors = ['#3b82f6', '#8b5cf6', '#ec4899', '#6366f1', '#14b8a6', '#f97316'];
const levelOptions: TicketLevel[] = ['MAJOR', 'MINOR', 'MODERATE'];
const statusLabels: Record<TicketStatus, string> = {
  OPEN: 'Pending',
  IN_PROGRESS: 'Working',
  COMPLETED: 'Done',
  CANCELLED: 'Cancel'
};

export function DashboardPage() {
  const [tickets, setTickets] = useState<TicketRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [periodFilter, setPeriodFilter] = useState('ALL');
  const [designerFilter, setDesignerFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [materialFilter, setMaterialFilter] = useState('ALL');
  const [levelFilter, setLevelFilter] = useState('ALL');
  const [timelinessFilter, setTimelinessFilter] = useState('ALL');
  const [isDelayedModalOpen, setIsDelayedModalOpen] = useState(false);
  const [selectedDelayedTicket, setSelectedDelayedTicket] = useState<TicketRecord | null>(null);
  const [selectedMaterialDesigner, setSelectedMaterialDesigner] = useState<string | null>(null);

  useEffect(() => {
    const loadTickets = async () => {
      try {
        const response = await fetch('/api/tickets');

        if (!response.ok) {
          throw new Error('Failed to load dashboard data');
        }

        const data = (await response.json()) as TicketRecord[];
        setTickets(data);
      } catch (error) {
        console.error('Failed to load tickets for dashboard:', error);
        setTickets([]);
      } finally {
        setLoading(false);
      }
    };

    loadTickets();
  }, []);

  useEffect(() => {
    if (!isDelayedModalOpen) return;

    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsDelayedModalOpen(false);
        setSelectedDelayedTicket(null);
      }
    };

    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isDelayedModalOpen]);

  useEffect(() => {
    if (!selectedMaterialDesigner) return;

    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setSelectedMaterialDesigner(null);
    };

    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [selectedMaterialDesigner]);

  const periodOptions = useMemo(() => {
    const monthKeys = new Set<string>();
    const quarterKeys = new Set<string>();

    tickets.forEach((ticket) => {
      const requestDate = ticket.ticketRequestDate ?? ticket.createdAt;
      if (!requestDate) return;
      const date = new Date(`${requestDate}T00:00:00`);
      if (Number.isNaN(date.getTime())) return;
      const year = date.getFullYear();
      const month = date.getMonth() + 1;
      monthKeys.add(`${year}-${String(month).padStart(2, '0')}`);
      quarterKeys.add(`${year}-Q${Math.ceil(month / 3)}`);
    });

    return [
      { value: 'ALL', label: 'All time' },
      ...Array.from(monthKeys).sort().reverse().map((value) => {
        const [year, month] = value.split('-');
        return {
          value: `MONTH-${value}`,
          label: new Date(Number(year), Number(month) - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
        };
      }),
      ...Array.from(quarterKeys).sort().reverse().map((value) => ({
        value: `QUARTER-${value}`,
        label: value.replace('-', ' ')
      }))
    ];
  }, [tickets]);

  const periodTickets = useMemo(() => {
    if (periodFilter === 'ALL') return tickets;

    const period = periodFilter.replace(/^(MONTH|QUARTER)-/, '');
    return tickets.filter((ticket) => {
      const requestDate = ticket.ticketRequestDate ?? ticket.createdAt;
      if (!requestDate) return false;
      const date = new Date(`${requestDate}T00:00:00`);
      if (Number.isNaN(date.getTime())) return false;
      const year = date.getFullYear();
      const month = date.getMonth() + 1;

      if (periodFilter.startsWith('MONTH-')) {
        return `${year}-${String(month).padStart(2, '0')}` === period;
      }

      return `${year}-Q${Math.ceil(month / 3)}` === period;
    });
  }, [periodFilter, tickets]);

  const filterOptions = useMemo(() => ({
    designers: Array.from(new Set(tickets.map((ticket) => ticket.designer || 'Unassigned'))).sort(),
    materials: Array.from(new Set(tickets.map((ticket) => ticket.material).filter(Boolean))).sort(),
  }), [tickets]);

  const filteredTickets = useMemo(() => periodTickets.filter((ticket) => (
    (designerFilter === 'ALL' || (ticket.designer || 'Unassigned') === designerFilter) &&
    (statusFilter === 'ALL' || ticket.status === statusFilter) &&
    (materialFilter === 'ALL' || ticket.material === materialFilter) &&
    (levelFilter === 'ALL' || ticket.ticketLevel === levelFilter) &&
    (timelinessFilter === 'ALL' || getTicketTimeliness(ticket) === timelinessFilter)
  )), [periodTickets, designerFilter, statusFilter, materialFilter, levelFilter, timelinessFilter]);

  const dashboard = useMemo(() => {
    const total = filteredTickets.length;
    const completed = filteredTickets.filter((ticket) => ticket.status === 'COMPLETED').length;
    const inProgress = filteredTickets.filter((ticket) => ticket.status === 'IN_PROGRESS').length;
    const pending = filteredTickets.filter((ticket) => ticket.status === 'OPEN').length;
    const delayedTickets = filteredTickets.filter((ticket) => getTicketTimeliness(ticket) === 'DELAYED');
    const completedWithDates = filteredTickets.filter((ticket) => (
      ticket.status === 'COMPLETED' && ticket.deadline && ticket.dateOfSubmission
    ));
    const completedOnTime = completedWithDates.filter((ticket) => getTicketTimeliness(ticket) === 'ON-TIME').length;
    const compliance = completedWithDates.length > 0 ? Math.round((completedOnTime / completedWithDates.length) * 100) : 0;
    const avgCompletion = total > 0
      ? (filteredTickets.reduce((sum, ticket) => sum + (ticket.workingDays || 0), 0) / total).toFixed(1)
      : '0.0';

    const ticketLevelData = Object.entries(
      filteredTickets.reduce<Record<string, number>>((acc, ticket) => {
        acc[ticket.ticketLevel] = (acc[ticket.ticketLevel] ?? 0) + 1;
        return acc;
      }, {})
    ).map(([name, value]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1).toLowerCase(),
      value,
      fill: levelColors[name] ?? '#64748b'
    }));

    const departmentData = Object.entries(
      filteredTickets.reduce<Record<string, number>>((acc, ticket) => {
        acc[ticket.department] = (acc[ticket.department] ?? 0) + 1;
        return acc;
      }, {})
    ).map(([name, value], index) => ({
      name,
      value,
      fill: departmentColors[index % departmentColors.length]
    }));

    const monthlyTrendData = Object.entries(
      filteredTickets.reduce<Record<string, number>>((acc, ticket) => {
        const month = (ticket.ticketRequestDate ?? ticket.createdAt)?.slice(0, 7) ?? 'N/A';
        acc[month] = (acc[month] ?? 0) + 1;
        return acc;
      }, {})
    ).sort(([first], [second]) => first.localeCompare(second)).map(([month, ticketsCount]) => ({
      month: month === 'N/A' ? month : new Date(`${month}-01T00:00:00`).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
      tickets: ticketsCount
    }));

    const designerWorkload = Object.entries(
      filteredTickets.reduce<Record<string, number>>((acc, ticket) => {
        const designer = ticket.designer || 'Unassigned';
        acc[designer] = (acc[designer] ?? 0) + 1;
        return acc;
      }, {})
    ).map(([name, workload]) => ({
      name,
      workload
    }));

    const designerSla = Object.entries(
      filteredTickets.reduce<Record<string, { assigned: number; completed: number; onTime: number; eligible: number; delayed: number }>>((acc, ticket) => {
        const name = ticket.designer || 'Unassigned';
        const metrics = acc[name] ?? { assigned: 0, completed: 0, onTime: 0, eligible: 0, delayed: 0 };
        metrics.assigned += 1;
        if (ticket.status === 'COMPLETED') {
          metrics.completed += 1;
          if (ticket.dateOfSubmission && ticket.deadline) {
            metrics.eligible += 1;
            if (getTicketTimeliness(ticket) === 'ON-TIME') metrics.onTime += 1;
          }
        }
        if (getTicketTimeliness(ticket) === 'DELAYED') metrics.delayed += 1;
        acc[name] = metrics;
        return acc;
      }, {})
    ).map(([name, metrics]) => ({
      name,
      assigned: metrics.assigned,
      completed: metrics.completed,
      delayed: metrics.delayed,
      timeliness: metrics.eligible > 0 ? Math.round((metrics.onTime / metrics.eligible) * 100) : null,
    }));

    const monthlyTimeliness = Object.entries(
      filteredTickets.reduce<Record<string, { delayed: number; onTime: number; cancelled: number }>>((acc, ticket) => {
        const month = (ticket.ticketRequestDate ?? ticket.createdAt)?.slice(0, 7) ?? 'Unknown';
        const metrics = acc[month] ?? { delayed: 0, onTime: 0, cancelled: 0 };
        const result = getTicketTimeliness(ticket);
        if (result === 'DELAYED') metrics.delayed += 1;
        if (result === 'ON-TIME') metrics.onTime += 1;
        if (result === 'CANCEL') metrics.cancelled += 1;
        acc[month] = metrics;
        return acc;
      }, {})
    ).sort(([first], [second]) => first.localeCompare(second)).map(([period, metrics]) => ({
      period: period === 'Unknown' ? period : new Date(`${period}-01T00:00:00`).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
      ...metrics,
      timeliness: metrics.onTime + metrics.delayed > 0 ? Math.round((metrics.onTime / (metrics.onTime + metrics.delayed)) * 100) : null,
    }));

    const designerTicketLevels = Object.entries(
      filteredTickets.reduce<Record<string, Record<string, number>>>((acc, ticket) => {
        const name = ticket.designer || 'Unassigned';
        const levels = acc[name] ?? {};
        levels[ticket.ticketLevel] = (levels[ticket.ticketLevel] ?? 0) + 1;
        acc[name] = levels;
        return acc;
      }, {})
    ).map(([name, levels]) => ({ name, levels }));

    const designerMaterials = Object.entries(
      filteredTickets.reduce<Record<string, Record<string, number>>>((acc, ticket) => {
        const name = ticket.designer || 'Unassigned';
        const materials = acc[name] ?? {};
        materials[ticket.material] = (materials[ticket.material] ?? 0) + 1;
        acc[name] = materials;
        return acc;
      }, {})
    ).flatMap(([name, materials]) => Object.entries(materials).map(([material, count]) => ({ name, material, count })));

    const kpis = [
      { label: 'Total Tickets', value: total.toString(), icon: Layers, tone: 'bg-slate-50 text-slate-900' },
      { label: 'Done', value: completed.toString(), icon: CheckCircle2, tone: 'bg-emerald-50 text-emerald-700' },
      { label: 'Working', value: inProgress.toString(), icon: BarChart3, tone: 'bg-sky-50 text-sky-700' },
      { label: 'Pending', value: pending.toString(), icon: Activity, tone: 'bg-amber-50 text-amber-700' },
      { label: 'Delayed', value: delayedTickets.length.toString(), icon: Activity, tone: 'bg-red-50 text-red-700' },
      { label: 'SLA Compliance', value: `${compliance}%`, icon: TrendingUp, tone: 'bg-emerald-50 text-emerald-700' },
      { label: 'Avg Completion', value: `${avgCompletion} days`, icon: Sparkles, tone: 'bg-slate-50 text-slate-900' }
    ];

    return {
      kpis,
      ticketLevelData,
      departmentData,
      monthlyTrendData,
      designerWorkload,
      designerSla,
      monthlyTimeliness,
      designerTicketLevels,
      designerMaterials,
      delayedTickets,
      hasTickets: total > 0
    };
  }, [filteredTickets]);

  const designerMaterialCards = useMemo(() => {
    const grouped = dashboard.designerMaterials.reduce<Record<string, Array<{ material: string; count: number }>>>((acc, row) => {
      acc[row.name] ??= [];
      acc[row.name].push({ material: row.material, count: row.count });
      return acc;
    }, {});

    return Object.entries(grouped).map(([name, materials]) => ({
      name,
      materials: materials.sort((first, second) => second.count - first.count),
      total: materials.reduce((sum, item) => sum + item.count, 0)
    })).sort((first, second) => second.total - first.total || first.name.localeCompare(second.name));
  }, [dashboard.designerMaterials]);

  const selectedDesignerMaterialCard = designerMaterialCards.find((designer) => designer.name === selectedMaterialDesigner);

  if (loading) {
    return (
      <div className="flex min-h-[320px] items-center justify-center rounded-[24px] border border-slate-200 bg-white p-8 text-slate-500 shadow-sm">
        Loading dashboard...
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8 flex flex-col gap-2">
        <p className="text-sm font-medium uppercase tracking-[0.24em] text-slate-500">Welcome back</p>
        <h1 className="text-4xl font-bold text-slate-950">Dashboard</h1>
        <p className="max-w-2xl text-sm leading-6 text-slate-600">
          Monitor ticket performance and workload from the live ticket data in your workspace.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <label className="text-xs font-medium text-slate-600">
            Period
            <select value={periodFilter} onChange={(event) => setPeriodFilter(event.target.value)} className="mt-1 block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
              {periodOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </label>
          <label className="text-xs font-medium text-slate-600">
            Designer
            <select value={designerFilter} onChange={(event) => setDesignerFilter(event.target.value)} className="mt-1 block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
              <option value="ALL">All designers</option>
              {filterOptions.designers.map((designer) => <option key={designer} value={designer}>{designer}</option>)}
            </select>
          </label>
          <label className="text-xs font-medium text-slate-600">
            Status
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="mt-1 block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
              <option value="ALL">All statuses</option>
              {(Object.keys(statusLabels) as TicketStatus[]).map((status) => <option key={status} value={status}>{statusLabels[status]}</option>)}
            </select>
          </label>
          <label className="text-xs font-medium text-slate-600">
            Material
            <select value={materialFilter} onChange={(event) => setMaterialFilter(event.target.value)} className="mt-1 block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
              <option value="ALL">All materials</option>
              {filterOptions.materials.map((material) => <option key={material} value={material}>{material}</option>)}
            </select>
          </label>
          <label className="text-xs font-medium text-slate-600">
            Ticket level
            <select value={levelFilter} onChange={(event) => setLevelFilter(event.target.value)} className="mt-1 block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
              <option value="ALL">All levels</option>
              {levelOptions.map((level) => <option key={level} value={level}>{level}</option>)}
            </select>
          </label>
          <label className="text-xs font-medium text-slate-600">
            Timeliness
            <select value={timelinessFilter} onChange={(event) => setTimelinessFilter(event.target.value)} className="mt-1 block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
              <option value="ALL">All results</option>
              <option value="DELAYED">Delayed</option>
              <option value="ON-TIME">On time</option>
              <option value="CANCEL">Cancel</option>
              <option value="PENDING">Pending / not due</option>
              <option value="UNRECORDED">Submission not recorded</option>
            </select>
          </label>
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <span className="text-sm text-slate-500">{filteredTickets.length} ticket{filteredTickets.length === 1 ? '' : 's'} in selected period</span>
          <button
            type="button"
            onClick={() => {
              setPeriodFilter('ALL');
              setDesignerFilter('ALL');
              setStatusFilter('ALL');
              setMaterialFilter('ALL');
              setLevelFilter('ALL');
              setTimelinessFilter('ALL');
            }}
            className="text-sm font-medium text-blue-700 hover:text-blue-900"
          >
            Reset filters
          </button>
        </div>
      </div>

      <div className="dashboard-kpi-grid mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {dashboard.kpis.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <div key={kpi.label} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-slate-500">{kpi.label}</p>
                  <p className="mt-3 text-3xl font-semibold text-slate-950">{kpi.value}</p>
                </div>
                <div className={`flex h-12 w-12 items-center justify-center rounded-3xl ${kpi.tone}`}>
                  <Icon className="h-5 w-5" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {!dashboard.hasTickets ? (
        <div className="rounded-[24px] border border-dashed border-slate-300 bg-white p-12 text-center shadow-sm">
          <p className="text-lg font-semibold text-slate-900">No live ticket data yet</p>
          <p className="mt-2 text-sm text-slate-600">
            Add a ticket from the Ticket Monitoring page and the dashboard stats and charts will update automatically.
          </p>
        </div>
      ) : (
        <>
          <div className="mb-6 rounded-[22px] border border-red-200 bg-red-50 p-6 shadow-soft">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium uppercase tracking-[0.24em] text-red-700">SLA Monitoring</p>
                <h3 className="text-xl font-semibold text-slate-950">Delayed Tickets</h3>
              </div>
              <div className="flex items-center gap-4">
                {dashboard.delayedTickets.length > 8 && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedDelayedTicket(null);
                      setIsDelayedModalOpen(true);
                    }}
                    className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-white px-3 py-2 text-sm font-medium text-red-800 transition hover:bg-red-100"
                  >
                    See all <ArrowUpRight className="h-4 w-4" />
                  </button>
                )}
                <p className="text-3xl font-bold text-red-700">{dashboard.delayedTickets.length}</p>
              </div>
            </div>
            {dashboard.delayedTickets.length > 0 ? (
              <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                {dashboard.delayedTickets.slice(0, 8).map((ticket) => (
                  <button
                    key={ticket.id}
                    type="button"
                    onClick={() => {
                      setSelectedDelayedTicket(ticket);
                      setIsDelayedModalOpen(true);
                    }}
                    className="rounded-xl border border-red-100 bg-white p-3 text-left text-sm transition hover:border-red-300 hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-red-300"
                  >
                    <p className="font-semibold text-slate-900">{ticket.ticketNumber}</p>
                    <p className="truncate text-slate-600" title={ticket.description}>{ticket.description}</p>
                    <p className="mt-1 text-slate-600">{ticket.designer || 'Unassigned'}</p>
                    <p className="text-xs text-red-700">Deadline: {ticket.deadline || 'Not recorded'}</p>
                  </button>
                ))}
              </div>
            ) : (
              <p className="mt-4 text-sm text-red-800">No delayed tickets match the selected filters.</p>
            )}
          </div>

          <div className="mb-6 rounded-[22px] border border-slate-200 bg-white p-8 shadow-soft">
            <div className="mb-6">
              <p className="text-sm font-medium uppercase tracking-[0.24em] text-slate-500">SLA Monitoring</p>
              <h3 className="text-xl font-semibold text-slate-950">Designer SLA & Timeliness</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-slate-500">
                    <th className="pb-3">Designer</th>
                    <th className="pb-3">Assigned</th>
                    <th className="pb-3">Done</th>
                    <th className="pb-3">Delayed</th>
                    <th className="pb-3">Timeliness</th>
                  </tr>
                </thead>
                <tbody>
                  {dashboard.designerSla.map((designer) => (
                    <tr key={designer.name} className="border-b border-slate-100">
                      <td className="py-3 font-medium text-slate-900">{designer.name}</td>
                      <td className="py-3">{designer.assigned}</td>
                      <td className="py-3">{designer.completed}</td>
                      <td className="py-3 text-red-700">{designer.delayed}</td>
                      <td className="py-3 font-semibold text-emerald-700">{designer.timeliness === null ? '—' : `${designer.timeliness}%`}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="mb-6 rounded-[22px] border border-slate-200 bg-white p-8 shadow-soft">
            <div className="mb-5">
              <p className="text-sm font-medium uppercase tracking-[0.24em] text-slate-500">Monthly report</p>
              <h3 className="text-xl font-semibold text-slate-950">Timeliness Summary</h3>
              <p className="mt-1 text-sm text-slate-500">Timeliness percentage excludes cancelled and unsubmitted tickets.</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-slate-500">
                    <th className="pb-3">Period</th>
                    <th className="pb-3">Delayed</th>
                    <th className="pb-3">On time</th>
                    <th className="pb-3">Cancel</th>
                    <th className="pb-3">Timeliness</th>
                  </tr>
                </thead>
                <tbody>
                  {dashboard.monthlyTimeliness.map((month) => (
                    <tr key={month.period} className="border-b border-slate-100">
                      <td className="py-3 font-medium text-slate-900">{month.period}</td>
                      <td className="py-3 text-red-700">{month.delayed}</td>
                      <td className="py-3 text-emerald-700">{month.onTime}</td>
                      <td className="py-3">{month.cancelled}</td>
                      <td className="py-3 font-semibold">{month.timeliness === null ? '—' : `${month.timeliness}%`}</td>
                    </tr>
                  ))}
                  {dashboard.monthlyTimeliness.length === 0 && <tr><td colSpan={5} className="py-6 text-center text-slate-500">No ticket activity for these filters.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>

          <div className="mb-6 grid gap-6 xl:grid-cols-2">
            <div className="rounded-[22px] border border-slate-200 bg-white p-8 shadow-soft">
              <div className="mb-5">
                <p className="text-sm font-medium uppercase tracking-[0.24em] text-slate-500">Designer breakdown</p>
                <h3 className="text-xl font-semibold text-slate-950">Tickets by Level</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="border-b border-slate-200 text-left text-slate-500"><th className="pb-3">Designer</th>{levelOptions.map((level) => <th key={level} className="pb-3">{level}</th>)}<th className="pb-3">Total</th></tr></thead>
                  <tbody>
                    {dashboard.designerTicketLevels.map(({ name, levels }) => (
                      <tr key={name} className="border-b border-slate-100">
                        <td className="py-3 font-medium text-slate-900">{name}</td>
                        {levelOptions.map((level) => <td key={level} className="py-3">{levels[level] ?? 0}</td>)}
                        <td className="py-3 font-semibold">{Object.values(levels).reduce((sum, count) => sum + count, 0)}</td>
                      </tr>
                    ))}
                    {dashboard.designerTicketLevels.length === 0 && <tr><td colSpan={5} className="py-6 text-center text-slate-500">No matching tickets.</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="rounded-[22px] border border-slate-200 bg-white p-8 shadow-soft">
              <div className="mb-5 flex items-end justify-between gap-4">
                <div>
                  <p className="text-sm font-medium uppercase tracking-[0.24em] text-slate-500">Designer breakdown</p>
                  <h3 className="text-xl font-semibold text-slate-950">Tickets by Material</h3>
                </div>
                <span className="shrink-0 text-sm text-slate-500">{designerMaterialCards.length} designers</span>
              </div>
              {designerMaterialCards.length > 0 ? (
                <div className="grid max-h-80 gap-3 overflow-y-auto pr-1 sm:grid-cols-2">
                  {designerMaterialCards.map((designer) => (
                    <button
                      key={designer.name}
                      type="button"
                      onClick={() => setSelectedMaterialDesigner(designer.name)}
                      className="group rounded-xl border border-slate-200 bg-white p-4 text-left transition hover:border-blue-300 hover:bg-blue-50/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-xs font-medium uppercase tracking-[0.12em] text-slate-500">Designer</p>
                          <h4 className="mt-1 truncate font-semibold text-slate-950">{designer.name}</h4>
                        </div>
                        <ArrowUpRight className="h-4 w-4 shrink-0 text-slate-400 transition group-hover:text-blue-600" />
                      </div>
                      <div className="mt-4 flex items-baseline gap-2">
                        <span className="text-2xl font-semibold tabular-nums text-slate-950">{designer.total}</span>
                        <span className="text-sm text-slate-500">tickets</span>
                        <span className="ml-auto text-xs text-slate-500">{designer.materials.length} materials</span>
                      </div>
                      <p className="mt-3 truncate border-t border-slate-100 pt-3 text-xs text-slate-500" title={designer.materials.map((item) => item.material).join(', ')}>
                        {designer.materials.slice(0, 3).map((item) => item.material).join(' · ')}
                        {designer.materials.length > 3 ? ` +${designer.materials.length - 3} more` : ''}
                      </p>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="py-10 text-center text-sm text-slate-500">No matching tickets.</p>
              )}
            </div>
          </div>

          <div className="mb-6 grid gap-6 xl:grid-cols-2">
            <div className="rounded-[22px] border border-slate-200 bg-white p-8 shadow-soft">
              <div className="mb-6">
                <p className="text-sm font-medium uppercase tracking-[0.24em] text-slate-500">Distribution</p>
                <h3 className="text-xl font-semibold text-slate-950">Ticket Level</h3>
              </div>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie data={dashboard.ticketLevelData} cx="50%" cy="50%" innerRadius={80} outerRadius={120} paddingAngle={2} dataKey="value">
                    {dashboard.ticketLevelData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="rounded-[22px] border border-slate-200 bg-white p-8 shadow-soft">
              <div className="mb-6">
                <p className="text-sm font-medium uppercase tracking-[0.24em] text-slate-500">Breakdown</p>
                <h3 className="text-xl font-semibold text-slate-950">Tickets by Department</h3>
              </div>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie data={dashboard.departmentData} cx="50%" cy="50%" outerRadius={100} paddingAngle={2} dataKey="value">
                    {dashboard.departmentData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <div className="rounded-[22px] border border-slate-200 bg-white p-8 shadow-soft">
              <div className="mb-6">
                <p className="text-sm font-medium uppercase tracking-[0.24em] text-slate-500">Trends</p>
                <h3 className="text-xl font-semibold text-slate-950">Monthly Ticket Trend</h3>
              </div>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={dashboard.monthlyTrendData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="tickets" stroke="#3b82f6" strokeWidth={2} dot={{ fill: '#3b82f6' }} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="rounded-[22px] border border-slate-200 bg-white p-8 shadow-soft">
              <div className="mb-6">
                <p className="text-sm font-medium uppercase tracking-[0.24em] text-slate-500">Performance</p>
                <h3 className="text-xl font-semibold text-slate-950">Designer Workload</h3>
              </div>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={dashboard.designerWorkload}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="workload" fill="#8b5cf6" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}

      {selectedDesignerMaterialCard && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center overflow-y-auto bg-slate-950/50 p-5 sm:p-10"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setSelectedMaterialDesigner(null);
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="designer-material-title"
            className="flex max-h-[calc(100vh-2.5rem)] w-full max-w-xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl sm:max-h-[calc(100vh-5rem)]"
          >
            <header className="flex shrink-0 items-start justify-between gap-4 border-b border-slate-200 px-5 pb-4 pt-5 sm:px-7">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-700">Designer breakdown</p>
                <h2 id="designer-material-title" className="mt-1 text-xl font-semibold text-slate-950">{selectedDesignerMaterialCard.name}</h2>
                <p className="mt-1 text-sm text-slate-500">{selectedDesignerMaterialCard.total} tickets across {selectedDesignerMaterialCard.materials.length} materials</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedMaterialDesigner(null)}
                aria-label="Close designer breakdown"
                title="Close"
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition hover:bg-slate-100"
              >
                <X className="h-4 w-4" />
              </button>
            </header>
            <div className="min-h-0 overflow-y-auto px-5 py-4 sm:px-7">
              <div className="divide-y divide-slate-100">
                {selectedDesignerMaterialCard.materials.map((item) => (
                  <div key={item.material} className="py-4">
                    <div className="flex items-center justify-between gap-4 text-sm">
                      <span className="font-medium text-slate-800">{item.material}</span>
                      <span className="shrink-0 font-semibold tabular-nums text-slate-950">{item.count}</span>
                    </div>
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-blue-600"
                        style={{ width: `${(item.count / selectedDesignerMaterialCard.total) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </div>
      )}

      {isDelayedModalOpen && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center overflow-y-auto bg-slate-950/50 p-5 sm:p-10"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setIsDelayedModalOpen(false);
              setSelectedDelayedTicket(null);
            }
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="delayed-modal-title"
            className="flex max-h-[calc(100vh-2.5rem)] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl sm:max-h-[calc(100vh-5rem)]"
          >
            <header className="flex shrink-0 items-start justify-between gap-4 border-b border-slate-200 px-5 pb-4 pt-5 sm:px-7">
              <div className="min-w-0">
                {selectedDelayedTicket && (
                  <button
                    type="button"
                    onClick={() => setSelectedDelayedTicket(null)}
                    className="mb-3 inline-flex items-center gap-1 text-sm font-medium text-slate-600 hover:text-slate-950"
                  >
                    <ArrowLeft className="h-4 w-4" /> Back to delayed tickets
                  </button>
                )}
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-red-700">SLA monitoring</p>
                <h2 id="delayed-modal-title" className="mt-1 text-xl font-semibold text-slate-950">
                  {selectedDelayedTicket ? `Ticket ${selectedDelayedTicket.ticketNumber}` : 'All delayed tickets'}
                </h2>
                <p className="mt-1 text-sm text-slate-600">
                  {selectedDelayedTicket?.description ?? `${dashboard.delayedTickets.length} tickets match the current dashboard filters`}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsDelayedModalOpen(false);
                  setSelectedDelayedTicket(null);
                }}
                aria-label="Close delayed tickets"
                title="Close"
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition hover:bg-slate-100"
              >
                <X className="h-4 w-4" />
              </button>
            </header>

            <div className="min-h-0 overflow-y-auto p-5 sm:p-7">
              {selectedDelayedTicket ? (
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-medium text-red-800">Delayed</span>
                    <span className={`rounded-full px-3 py-1 text-xs font-medium ${selectedDelayedTicket.status === 'OPEN' ? 'bg-amber-100 text-amber-800' : selectedDelayedTicket.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-800' : 'bg-slate-100 text-slate-700'}`}>
                      {statusLabels[selectedDelayedTicket.status]}
                    </span>
                  </div>
                  <div className="mt-6 grid gap-6 sm:grid-cols-2">
                    <section>
                      <h3 className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Request</h3>
                      <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-4">
                        <div><dt className="text-xs text-slate-500">Department</dt><dd className="mt-1 text-sm font-medium text-slate-900">{selectedDelayedTicket.department}</dd></div>
                        <div><dt className="text-xs text-slate-500">Requestor</dt><dd className="mt-1 text-sm font-medium text-slate-900">{selectedDelayedTicket.requestor}</dd></div>
                        <div><dt className="text-xs text-slate-500">Requested</dt><dd className="mt-1 text-sm font-medium text-slate-900">{selectedDelayedTicket.ticketRequestDate ?? selectedDelayedTicket.createdAt ?? 'Not recorded'}</dd></div>
                        <div><dt className="text-xs text-slate-500">Month</dt><dd className="mt-1 text-sm font-medium text-slate-900">{selectedDelayedTicket.month || 'Not recorded'}</dd></div>
                      </dl>
                    </section>
                    <section>
                      <h3 className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Assignment & deadline</h3>
                      <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-4">
                        <div><dt className="text-xs text-slate-500">Designer</dt><dd className="mt-1 text-sm font-medium text-slate-900">{selectedDelayedTicket.designer || 'Unassigned'}</dd></div>
                        <div><dt className="text-xs text-slate-500">Level / material</dt><dd className="mt-1 text-sm font-medium text-slate-900">{selectedDelayedTicket.ticketLevel} / {selectedDelayedTicket.material}</dd></div>
                        <div><dt className="text-xs text-slate-500">Received by artist</dt><dd className="mt-1 text-sm font-medium text-slate-900">{selectedDelayedTicket.dateReceivedByArtist ?? 'Not recorded'}</dd></div>
                        <div><dt className="text-xs text-slate-500">Deadline</dt><dd className="mt-1 text-sm font-medium text-red-700">{selectedDelayedTicket.deadline ?? 'Not recorded'}</dd></div>
                        <div><dt className="text-xs text-slate-500">Working days</dt><dd className="mt-1 text-sm font-medium text-slate-900">{selectedDelayedTicket.workingDays}</dd></div>
                        <div><dt className="text-xs text-slate-500">Date submitted</dt><dd className="mt-1 text-sm font-medium text-slate-900">{selectedDelayedTicket.dateOfSubmission ?? 'Not recorded'}</dd></div>
                      </dl>
                    </section>
                    <section className="border-t border-slate-200 pt-5 sm:col-span-2">
                      <h3 className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Notes</h3>
                      <dl className="mt-4 grid gap-4 sm:grid-cols-2">
                        <div><dt className="text-xs text-slate-500">Remarks</dt><dd className="mt-1 whitespace-pre-wrap break-words text-sm text-slate-900">{selectedDelayedTicket.remarks || 'None'}</dd></div>
                        <div><dt className="text-xs text-slate-500">Others</dt><dd className="mt-1 whitespace-pre-wrap break-words text-sm text-slate-900">{selectedDelayedTicket.others || 'None'}</dd></div>
                      </dl>
                    </section>
                  </div>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {dashboard.delayedTickets.map((ticket) => (
                    <button
                      key={ticket.id}
                      type="button"
                      onClick={() => setSelectedDelayedTicket(ticket)}
                      className="grid w-full gap-2 py-4 text-left transition hover:bg-red-50/60 sm:grid-cols-[minmax(0,1fr)_150px_130px_24px] sm:items-center sm:px-3"
                    >
                      <span className="min-w-0">
                        <span className="block font-semibold text-slate-900">{ticket.ticketNumber}</span>
                        <span className="block truncate text-sm text-slate-600" title={ticket.description}>{ticket.description}</span>
                      </span>
                      <span className="text-sm text-slate-700">{ticket.designer || 'Unassigned'}</span>
                      <span className="text-sm text-red-700">Due {ticket.deadline || 'Not recorded'}</span>
                      <ArrowUpRight className="hidden h-4 w-4 text-slate-400 sm:block" />
                    </button>
                  ))}
                  {dashboard.delayedTickets.length === 0 && (
                    <p className="py-10 text-center text-sm text-slate-500">No delayed tickets match the selected filters.</p>
                  )}
                </div>
              )}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
