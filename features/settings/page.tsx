'use client';

import { useState } from 'react';
import { Save, Bell, Lock, FileText, Download, Database } from 'lucide-react';
import { toCsv } from '@/lib/export-data';

export function SettingsPage() {
  const defaultSettings = {
    appName: 'Ticket Monitoring System',
    organization: 'Multimedia Department',
    email: 'admin@multimedia.com',
    theme: 'light',
    emailNotifications: true,
    autoAssign: false,
    slaAlerts: true,
    timeZone: 'America/New_York'
  };

  const [settings, setSettings] = useState(defaultSettings);
  const [section, setSection] = useState<'general' | 'notifications' | 'security' | 'backup'>('general');
  const [saved, setSaved] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportMessage, setExportMessage] = useState('');

  const handleSave = () => {
    localStorage.setItem('ticket-monitoring-settings', JSON.stringify(settings));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleCancel = () => {
    setSettings(defaultSettings);
    setSaved(false);
  };

  const downloadCsv = (filename: string, rows: Record<string, unknown>[]) => {
    const csv = toCsv(rows);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  };

  const exportTable = async (tableName: 'tickets' | 'departments' | 'designers' | 'materials') => {
    setExporting(true);
    setExportMessage('');

    try {
      const endpointMap = {
        tickets: '/api/tickets',
        departments: '/api/admin/departments',
        designers: '/api/admin/designers',
        materials: '/api/admin/materials',
      };

      const response = await fetch(endpointMap[tableName]);
      if (!response.ok) {
        throw new Error(`Unable to export ${tableName}.`);
      }

      const rows = (await response.json()) as Record<string, unknown>[];
      if (!Array.isArray(rows)) {
        throw new Error(`No export data was returned for ${tableName}.`);
      }

      downloadCsv(`${tableName}.csv`, rows);
      setExportMessage(`${tableName.charAt(0).toUpperCase() + tableName.slice(1)} export downloaded.`);
    } catch (error) {
      console.error(`Failed to export ${tableName}:`, error);
      setExportMessage(`Could not download ${tableName}. Please try again.`);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div>
      <div className="mb-8 flex flex-col gap-2">
        <p className="text-sm font-medium uppercase tracking-[0.24em] text-slate-500">Configuration</p>
        <h1 className="text-4xl font-bold text-slate-950">Settings</h1>
        <p className="max-w-2xl text-sm leading-6 text-slate-600">
          Configure system settings, preferences, and backup exports for the monitoring data.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <div className="rounded-[22px] border border-slate-200 bg-white shadow-soft">
            <nav className="flex flex-col">
              <button onClick={() => setSection('general')} className={`flex items-center gap-3 border-b border-slate-200 px-6 py-4 text-left font-medium hover:bg-slate-50 transition ${section === 'general' ? 'text-blue-600' : 'text-slate-700'}`}>
                <FileText className="h-4 w-4" />
                General
              </button>
              <button onClick={() => setSection('notifications')} className={`flex items-center gap-3 border-b border-slate-200 px-6 py-4 text-left font-medium hover:bg-slate-50 transition ${section === 'notifications' ? 'text-blue-600' : 'text-slate-700'}`}>
                <Bell className="h-4 w-4" />
                Notifications
              </button>
              <button onClick={() => setSection('security')} className={`flex items-center gap-3 border-b border-slate-200 px-6 py-4 text-left font-medium hover:bg-slate-50 transition ${section === 'security' ? 'text-blue-600' : 'text-slate-700'}`}>
                <Lock className="h-4 w-4" />
                Security
              </button>
              <button onClick={() => setSection('backup')} className={`flex items-center gap-3 px-6 py-4 text-left font-medium hover:bg-slate-50 transition ${section === 'backup' ? 'text-blue-600' : 'text-slate-700'}`}>
                <Database className="h-4 w-4" />
                Backup & Export
              </button>
            </nav>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-6">
          {section === 'general' && <div className="rounded-[22px] border border-slate-200 bg-white p-6 shadow-soft">
            <h3 className="mb-6 text-lg font-semibold text-slate-950">General Settings</h3>
            
            <div className="space-y-6">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-900">Application Name</label>
                <input
                  type="text"
                  value={settings.appName}
                  onChange={(e) => setSettings({ ...settings, appName: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-900">Organization Name</label>
                <input
                  type="text"
                  value={settings.organization}
                  onChange={(e) => setSettings({ ...settings, organization: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-900">Support Email</label>
                <input
                  type="email"
                  value={settings.email}
                  onChange={(e) => setSettings({ ...settings, email: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-900">Theme</label>
                <select
                  value={settings.theme}
                  onChange={(e) => setSettings({ ...settings, theme: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="light">Light</option>
                  <option value="dark">Dark</option>
                  <option value="auto">Auto</option>
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-900">Time Zone</label>
                <select
                  value={settings.timeZone}
                  onChange={(e) => setSettings({ ...settings, timeZone: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="America/New_York">Eastern Time</option>
                  <option value="America/Chicago">Central Time</option>
                  <option value="America/Los_Angeles">Pacific Time</option>
                  <option value="UTC">UTC</option>
                </select>
              </div>
            </div>
          </div>}

          {section === 'notifications' && <div className="rounded-[22px] border border-slate-200 bg-white p-6 shadow-soft">
            <h3 className="mb-6 text-lg font-semibold text-slate-950">Notification Preferences</h3>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-slate-900">Email Notifications</p>
                  <p className="text-sm text-slate-600">Receive email updates for important events</p>
                </div>
                <label className="flex h-6 w-11 cursor-pointer items-center rounded-full bg-slate-300 transition" style={{ backgroundColor: settings.emailNotifications ? '#3b82f6' : undefined }}>
                  <input
                    type="checkbox"
                    checked={settings.emailNotifications}
                    onChange={(e) => setSettings({ ...settings, emailNotifications: e.target.checked })}
                    className="sr-only"
                  />
                  <div className={`h-5 w-5 rounded-full bg-white transition ${settings.emailNotifications ? 'translate-x-6' : 'translate-x-1'}`} />
                </label>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-slate-900">SLA Alerts</p>
                  <p className="text-sm text-slate-600">Alert when tickets approach SLA deadline</p>
                </div>
                <label className="flex h-6 w-11 cursor-pointer items-center rounded-full bg-slate-300 transition" style={{ backgroundColor: settings.slaAlerts ? '#3b82f6' : undefined }}>
                  <input
                    type="checkbox"
                    checked={settings.slaAlerts}
                    onChange={(e) => setSettings({ ...settings, slaAlerts: e.target.checked })}
                    className="sr-only"
                  />
                  <div className={`h-5 w-5 rounded-full bg-white transition ${settings.slaAlerts ? 'translate-x-6' : 'translate-x-1'}`} />
                </label>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-slate-900">Auto Assign Tickets</p>
                  <p className="text-sm text-slate-600">Automatically assign new tickets to available designers</p>
                </div>
                <label className="flex h-6 w-11 cursor-pointer items-center rounded-full bg-slate-300 transition" style={{ backgroundColor: settings.autoAssign ? '#3b82f6' : undefined }}>
                  <input
                    type="checkbox"
                    checked={settings.autoAssign}
                    onChange={(e) => setSettings({ ...settings, autoAssign: e.target.checked })}
                    className="sr-only"
                  />
                  <div className={`h-5 w-5 rounded-full bg-white transition ${settings.autoAssign ? 'translate-x-6' : 'translate-x-1'}`} />
                </label>
              </div>
            </div>
          </div>}

          {section === 'security' && <div className="rounded-[22px] border border-slate-200 bg-white p-6 shadow-soft">
            <h3 className="mb-2 text-lg font-semibold text-slate-950">Security</h3>
            <p className="text-sm text-slate-600">Authentication is managed through the configured Supabase provider.</p>
          </div>}

          {section === 'backup' && <div className="rounded-[22px] border border-slate-200 bg-white p-6 shadow-soft">
            <h3 className="mb-2 text-lg font-semibold text-slate-950">Backup & Download</h3>
            <p className="mb-6 text-sm text-slate-600">
              Download the live data as spreadsheet-friendly CSV files for tickets, departments, designers, and materials.
            </p>

            <div className="grid gap-3 sm:grid-cols-2">
              {[
                ['tickets', 'Tickets'],
                ['departments', 'Departments'],
                ['designers', 'Designers'],
                ['materials', 'Materials'],
              ].map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => exportTable(key as 'tickets' | 'departments' | 'designers' | 'materials')}
                  disabled={exporting}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-800 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Download className="h-4 w-4" />
                  Download {label}
                </button>
              ))}
            </div>

            {exportMessage && (
              <p className="mt-4 text-sm text-slate-700">{exportMessage}</p>
            )}
          </div>}

          <div className="flex justify-end gap-3">
            <button onClick={handleCancel} className="rounded-lg border border-slate-200 bg-white px-6 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50 transition">
              Cancel
            </button>
            <button
              onClick={handleSave}
              className={`inline-flex items-center gap-2 rounded-lg px-6 py-3 text-sm font-medium text-white transition ${
                saved ? 'bg-green-600 hover:bg-green-700' : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              <Save className="h-4 w-4" />
              {saved ? 'Saved!' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
