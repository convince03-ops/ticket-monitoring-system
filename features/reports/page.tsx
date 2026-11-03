'use client';

import { useEffect, useMemo, useState } from 'react';
import { Download, FileText } from 'lucide-react';
import type { TicketRecord } from '@/features/tickets/types';
import { getTicketTimeliness } from '@/features/tickets/services/timeliness';

interface ReportConfig {
  type: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'QUARTERLY';
  reportType: 'DESIGNER_PERFORMANCE' | 'DEPARTMENT_PERFORMANCE' | 'MATERIAL_PERFORMANCE' | 'DELAYED_TICKETS' | 'SLA_COMPLIANCE' | 'TIMELINESS';
  format: 'PDF' | 'EXCEL';
  dateRange: {
    from: string;
    to: string;
  };
}

const reportTypes = [
  { id: 'DESIGNER_PERFORMANCE', label: 'Designer Performance', description: 'Workload and efficiency metrics for each designer' },
  { id: 'DEPARTMENT_PERFORMANCE', label: 'Department Performance', description: 'Productivity and ticket metrics by department' },
  { id: 'MATERIAL_PERFORMANCE', label: 'Material Performance', description: 'SLA compliance by material type' },
  { id: 'DELAYED_TICKETS', label: 'Delayed Tickets', description: 'List of all delayed tickets and reasons' },
  { id: 'SLA_COMPLIANCE', label: 'SLA Compliance', description: 'Overall SLA compliance metrics and trends' },
  { id: 'TIMELINESS', label: 'Timeliness', description: 'On-time delivery metrics and analysis' }
];

const frequencyOptions = [
  { id: 'DAILY', label: 'Daily' },
  { id: 'WEEKLY', label: 'Weekly' },
  { id: 'MONTHLY', label: 'Monthly' },
  { id: 'QUARTERLY', label: 'Quarterly' }
];

interface ReportData {
  columns: string[];
  rows: Array<Array<string | number>>;
}

const reportLabel = (id: ReportConfig['reportType']) => reportTypes.find((report) => report.id === id)?.label ?? id;

const escapeHtml = (value: string | number) => String(value)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;');

export function ReportsPage() {
  const [tickets, setTickets] = useState<TicketRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [config, setConfig] = useState<ReportConfig>({
    type: 'MONTHLY',
    reportType: 'SLA_COMPLIANCE',
    format: 'PDF',
    dateRange: {
      from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      to: new Date().toISOString().split('T')[0]
    }
  });

  useEffect(() => {
    const loadTickets = async () => {
      try {
        const response = await fetch('/api/tickets', { cache: 'no-store' });
        if (!response.ok) throw new Error(`Ticket data request failed (${response.status})`);
        setTickets(await response.json() as TicketRecord[]);
      } catch (error) {
        console.error('Failed to load report ticket data:', error);
        setLoadError(error instanceof Error ? error.message : 'Unable to load ticket data');
      } finally {
        setLoading(false);
      }
    };

    void loadTickets();
  }, []);

  const reportTickets = useMemo(() => tickets.filter((ticket) => {
    const requestDate = ticket.ticketRequestDate ?? ticket.createdAt;
    return Boolean(requestDate && requestDate >= config.dateRange.from && requestDate <= config.dateRange.to);
  }), [tickets, config.dateRange]);

  const reportData = useMemo<ReportData>(() => {
    const timelinessOf = (ticket: TicketRecord) => getTicketTimeliness(ticket);
    const periodKeyFor = (ticket: TicketRecord) => {
      const requestDate = ticket.ticketRequestDate ?? ticket.createdAt;
      if (!requestDate) return 'Unknown';
      if (config.type === 'DAILY') return requestDate;
      const date = new Date(`${requestDate}T00:00:00`);
      if (Number.isNaN(date.getTime())) return 'Unknown';
      if (config.type === 'WEEKLY') {
        const weekStart = new Date(date);
        weekStart.setDate(weekStart.getDate() - ((weekStart.getDay() + 6) % 7));
        return `WEEK-${weekStart.toISOString().slice(0, 10)}`;
      }
      if (config.type === 'QUARTERLY') return `${date.getFullYear()}-Q${Math.ceil((date.getMonth() + 1) / 3)}`;
      return requestDate.slice(0, 7);
    };
    const periodLabel = (key: string) => {
      if (key === 'Unknown' || config.type === 'DAILY') return key;
      if (config.type === 'WEEKLY') return `Week of ${key.replace('WEEK-', '')}`;
      if (config.type === 'QUARTERLY') return key.replace('-', ' ');
      return new Date(`${key}-01T00:00:00`).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    };
    const grouped = (keyOf: (ticket: TicketRecord) => string) => {
      const groups = new Map<string, { period: string; name: string; records: TicketRecord[] }>();
      reportTickets.forEach((ticket) => {
        const period = periodKeyFor(ticket);
        const name = keyOf(ticket) || 'Unassigned';
        const key = `${period}\u0000${name}`;
        const group = groups.get(key) ?? { period, name, records: [] };
        group.records.push(ticket);
        groups.set(key, group);
      });
      return groups;
    };

    if (config.reportType === 'DESIGNER_PERFORMANCE' || config.reportType === 'DEPARTMENT_PERFORMANCE' || config.reportType === 'MATERIAL_PERFORMANCE') {
      const groupKey = config.reportType === 'DESIGNER_PERFORMANCE'
        ? (ticket: TicketRecord) => ticket.designer
        : config.reportType === 'DEPARTMENT_PERFORMANCE'
          ? (ticket: TicketRecord) => ticket.department
          : (ticket: TicketRecord) => ticket.material;
      const heading = config.reportType === 'DESIGNER_PERFORMANCE'
        ? 'Designer'
        : config.reportType === 'DEPARTMENT_PERFORMANCE' ? 'Department' : 'Material';

      return {
        columns: ['Period', heading, 'Tickets', 'Done', 'Working', 'Pending', 'Delayed', 'On time', 'Cancelled', 'Timeliness'],
        rows: Array.from(grouped(groupKey).values(), ({ period, name, records }) => {
          const done = records.filter((ticket) => ticket.status === 'COMPLETED').length;
          const delayed = records.filter((ticket) => timelinessOf(ticket) === 'DELAYED').length;
          const onTime = records.filter((ticket) => timelinessOf(ticket) === 'ON-TIME').length;
          const cancelled = records.filter((ticket) => timelinessOf(ticket) === 'CANCEL').length;
          const denominator = delayed + onTime;
          return [
            periodLabel(period),
            name,
            records.length,
            done,
            records.filter((ticket) => ticket.status === 'IN_PROGRESS').length,
            records.filter((ticket) => ticket.status === 'OPEN').length,
            delayed,
            onTime,
            cancelled,
            denominator ? `${Math.round((onTime / denominator) * 100)}%` : 'Not available'
          ];
        }).sort((first, second) => String(first[0]).localeCompare(String(second[0])))
      };
    }

    if (config.reportType === 'DELAYED_TICKETS') {
      return {
        columns: ['Ticket #', 'Description', 'Department', 'Designer', 'Material', 'Request Date', 'Deadline', 'Status', 'Remarks'],
        rows: reportTickets.filter((ticket) => timelinessOf(ticket) === 'DELAYED').map((ticket) => [
          ticket.ticketNumber,
          ticket.description,
          ticket.department,
          ticket.designer,
          ticket.material,
          ticket.ticketRequestDate ?? ticket.createdAt ?? '',
          ticket.deadline ?? '',
          ticket.status,
          ticket.remarks
        ])
      };
    }

    if (config.reportType === 'SLA_COMPLIANCE') {
      const periods = new Map<string, TicketRecord[]>();
      reportTickets.forEach((ticket) => {
        const period = periodKeyFor(ticket);
        periods.set(period, [...(periods.get(period) ?? []), ticket]);
      });
      return {
        columns: ['Period', 'Tickets', 'On time', 'Delayed', 'Cancelled', 'Unrecorded', 'Timeliness'],
        rows: Array.from(periods, ([period, records]) => {
          const onTime = records.filter((ticket) => timelinessOf(ticket) === 'ON-TIME').length;
          const delayed = records.filter((ticket) => timelinessOf(ticket) === 'DELAYED').length;
          const denominator = onTime + delayed;
          return [
            periodLabel(period),
            records.length,
            onTime,
            delayed,
            records.filter((ticket) => timelinessOf(ticket) === 'CANCEL').length,
            records.filter((ticket) => timelinessOf(ticket) === 'UNRECORDED').length,
            denominator ? `${Math.round((onTime / denominator) * 100)}%` : 'Not available'
          ];
        }).sort((first, second) => String(first[0]).localeCompare(String(second[0])))
      };
    }

    const periods = new Map<string, TicketRecord[]>();
    reportTickets.forEach((ticket) => {
      const key = periodKeyFor(ticket);
      periods.set(key, [...(periods.get(key) ?? []), ticket]);
    });

    return {
      columns: ['Period', 'Delayed', 'On time', 'Cancelled', 'Timeliness'],
      rows: Array.from(periods, ([period, records]) => {
        const delayed = records.filter((ticket) => timelinessOf(ticket) === 'DELAYED').length;
        const onTime = records.filter((ticket) => timelinessOf(ticket) === 'ON-TIME').length;
        const cancelled = records.filter((ticket) => timelinessOf(ticket) === 'CANCEL').length;
        const denominator = delayed + onTime;
        return [periodLabel(period), delayed, onTime, cancelled, denominator ? `${Math.round((onTime / denominator) * 100)}%` : 'Not available'];
      }).sort((first, second) => String(first[0]).localeCompare(String(second[0])))
    };
  }, [reportTickets, config.reportType, config.type]);

  const downloadReport = () => {
    const reportName = reportLabel(config.reportType);
    const filename = `${reportName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${config.dateRange.from}-to-${config.dateRange.to}`;

    if (config.format === 'EXCEL') {
      const csv = [reportData.columns, ...reportData.rows]
        .map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(','))
        .join('\r\n');
      const url = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = `${filename}.csv`;
      link.click();
      URL.revokeObjectURL(url);
      return;
    }

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      setLoadError('Allow pop-ups to print or save this report as PDF.');
      return;
    }
    const header = reportData.columns.map((column) => `<th>${escapeHtml(column)}</th>`).join('');
    const rows = reportData.rows.map((row) => `<tr>${row.map((value) => `<td>${escapeHtml(value)}</td>`).join('')}</tr>`).join('');
    printWindow.document.write(`<!doctype html><html><head><title>${escapeHtml(reportName)}</title><style>body{font:14px Arial,sans-serif;padding:32px;color:#111}h1{font-size:22px}p{color:#555}table{border-collapse:collapse;width:100%;margin-top:24px}th,td{border:1px solid #ccc;padding:8px;text-align:left}th{background:#eee}@media print{body{padding:0}}</style></head><body><h1>${escapeHtml(reportName)}</h1><p>${escapeHtml(config.dateRange.from)} to ${escapeHtml(config.dateRange.to)} · ${escapeHtml(config.type.toLowerCase())}</p><table><thead><tr>${header}</tr></thead><tbody>${rows}</tbody></table></body></html>`);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  const handleGenerateReport = () => {
    downloadReport();
  };

  return (
    <div>
      <div className="mb-8 flex flex-col gap-2">
        <p className="text-sm font-medium uppercase tracking-[0.24em] text-slate-500">Analytics</p>
        <h1 className="text-4xl font-bold text-slate-950">Reports</h1>
        <p className="max-w-2xl text-sm leading-6 text-slate-600">
          Generate comprehensive reports on tickets, performance, and SLA compliance.
        </p>
      </div>

      {loadError && (
        <p role="alert" className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{loadError}</p>
      )}

      <div className="grid gap-6 xl:grid-cols-3">
        {/* Report Configuration */}
        <div className="xl:col-span-1 rounded-[22px] border border-slate-200 bg-white p-6 shadow-soft">
          <h3 className="mb-6 text-lg font-semibold text-slate-950">Generate Report</h3>
          
          <div className="space-y-6">
            {/* Frequency */}
            <div>
              <label className="block text-sm font-medium text-slate-900 mb-3">Frequency</label>
              <div className="space-y-2">
                {frequencyOptions.map((option) => (
                  <label key={option.id} className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="radio"
                      name="frequency"
                      value={option.id}
                      checked={config.type === option.id as any}
                      onChange={(e) => setConfig({ ...config, type: e.target.value as any })}
                      className="h-4 w-4 border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-slate-700">{option.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Date Range */}
            <div>
              <label className="block text-sm font-medium text-slate-900 mb-3">Date Range</label>
              <div className="space-y-2">
                <div>
                  <label className="text-xs text-slate-600">From</label>
                  <input
                    type="date"
                    value={config.dateRange.from}
                    onChange={(e) => setConfig({
                      ...config,
                      dateRange: { ...config.dateRange, from: e.target.value }
                    })}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-600">To</label>
                  <input
                    type="date"
                    value={config.dateRange.to}
                    onChange={(e) => setConfig({
                      ...config,
                      dateRange: { ...config.dateRange, to: e.target.value }
                    })}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Export Format */}
            <div>
              <label className="block text-sm font-medium text-slate-900 mb-3">Export Format</label>
              <div className="space-y-2">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="radio"
                    name="format"
                    value="PDF"
                    checked={config.format === 'PDF'}
                    onChange={(e) => setConfig({ ...config, format: e.target.value as any })}
                    className="h-4 w-4 border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-slate-700">Print / Save as PDF</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="radio"
                    name="format"
                    value="EXCEL"
                    checked={config.format === 'EXCEL'}
                    onChange={(e) => setConfig({ ...config, format: e.target.value as any })}
                    className="h-4 w-4 border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-slate-700">Excel-compatible CSV</span>
                </label>
              </div>
            </div>

            <button
              onClick={handleGenerateReport}
              disabled={loading || reportTickets.length === 0 || config.dateRange.from > config.dateRange.to}
              className="w-full rounded-lg bg-blue-600 px-4 py-3 text-sm font-medium text-white hover:bg-blue-700 transition flex items-center justify-center gap-2"
            >
              <Download className="h-4 w-4" />
              {loading ? 'Loading tickets...' : 'Generate Report'}
            </button>
          </div>
        </div>

        {/* Available Reports */}
        <div className="xl:col-span-2 space-y-4">
          <h3 className="text-lg font-semibold text-slate-950">Available Reports</h3>
          {reportTypes.map((report) => (
            <button
              type="button"
              key={report.id}
              onClick={() => setConfig({ ...config, reportType: report.id as any })}
              className={`w-full cursor-pointer rounded-[22px] border-2 p-6 text-left transition ${
                config.reportType === report.id
                  ? 'border-blue-600 bg-blue-50'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              <div className="flex items-start gap-4">
                <div className="rounded-lg bg-slate-100 p-3 text-slate-600">
                  <FileText className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-slate-950">{report.label}</h4>
                  <p className="mt-1 text-sm text-slate-600">{report.description}</p>
                </div>
                {config.reportType === report.id && (
                  <div className="flex items-center text-blue-600">
                    <div className="h-3 w-3 rounded-full bg-blue-600" />
                  </div>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Live report preview */}
      <div className="mt-8 rounded-[22px] border border-slate-200 bg-white p-6 shadow-soft">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-slate-950">{reportLabel(config.reportType)}</h3>
            <p className="mt-1 text-sm text-slate-600">
              {loading ? 'Loading ticket data...' : `${reportTickets.length} ticket${reportTickets.length === 1 ? '' : 's'} from ${config.dateRange.from} to ${config.dateRange.to}`}
            </p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-slate-500">
                {reportData.columns.map((column) => <th key={column} className="whitespace-nowrap px-3 py-3 font-medium">{column}</th>)}
              </tr>
            </thead>
            <tbody>
              {reportData.rows.map((row, rowIndex) => (
                <tr key={`${rowIndex}-${String(row[0])}`} className="border-b border-slate-100">
                  {row.map((value, cellIndex) => <td key={`${rowIndex}-${cellIndex}`} className="px-3 py-3 text-slate-700">{value}</td>)}
                </tr>
              ))}
              {reportData.rows.length === 0 && (
                <tr><td colSpan={reportData.columns.length} className="px-3 py-8 text-center text-slate-500">No tickets match this report and date range.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
