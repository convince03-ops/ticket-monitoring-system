'use client';

import { useEffect, useState } from 'react';
import { Plus, Edit2, Trash2, AlertCircle } from 'lucide-react';

interface Designer {
  id: string;
  name: string;
  department: string;
  email: string;
  activeTickets: number;
  status: 'ACTIVE' | 'INACTIVE';
}

export function DesignersPage() {
  const [designers, setDesigners] = useState<Designer[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [forming, setForming] = useState({
    name: '',
    department: '',
    email: '',
    activeTickets: 0,
    status: 'ACTIVE' as 'ACTIVE' | 'INACTIVE'
  });

  const loadDesigners = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/designers');
      if (!response.ok) {
        throw new Error('Failed to load designers');
      }
      const data = (await response.json()) as Designer[];
      setDesigners(data);
      setError('');
    } catch (err) {
      console.error(err);
      setError('Unable to load designers from the database.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadDesigners();
  }, []);

  const handleAddDesigner = async () => {
    if (!forming.name.trim() || !forming.department.trim() || !forming.email.trim()) {
      setError('Name, department, and email are required.');
      return;
    }

    try {
      const response = await fetch(editingId ? `/api/admin/designers?id=${editingId}` : '/api/admin/designers', {
        method: editingId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(forming),
      });

      if (!response.ok) {
        const result = await response.json().catch(() => null) as { error?: string } | null;
        throw new Error(result?.error || `Failed to ${editingId ? 'update' : 'save'} designer.`);
      }

      setForming({ name: '', department: '', email: '', activeTickets: 0, status: 'ACTIVE' });
      setEditingId(null);
      setShowForm(false);
      setError('');
      await loadDesigners();
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Unable to save designer to the database.');
    }
  };

  const handleEditDesigner = (designer: Designer) => {
    setEditingId(designer.id);
    setForming({
      name: designer.name,
      department: designer.department,
      email: designer.email,
      activeTickets: designer.activeTickets,
      status: designer.status,
    });
    setShowForm(true);
  };

  const handleDeleteDesigner = async (id: string) => {
    try {
      const response = await fetch(`/api/admin/designers?id=${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete designer');
      }

      await loadDesigners();
    } catch (err) {
      console.error(err);
      setError('Unable to delete designer from the database.');
    }
  };

  return (
    <div>
      <div className="mb-8 flex flex-col gap-2">
        <p className="text-sm font-medium uppercase tracking-[0.24em] text-slate-500">Management</p>
        <h1 className="text-4xl font-bold text-slate-950">Designers</h1>
        <p className="max-w-2xl text-sm leading-6 text-slate-600">
          Manage designers and monitor their active tickets and workload.
        </p>
      </div>

      {error && (
        <div className="mb-6 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}

      <div className="mb-6 flex justify-end">
        <button
          onClick={() => setShowForm(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition"
        >
          <Plus className="h-4 w-4" />
          Add Designer
        </button>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {loading ? (
          <div className="col-span-full rounded-[22px] border border-slate-200 bg-white p-6 text-sm text-slate-500">Loading designers...</div>
        ) : designers.length === 0 ? (
          <div className="col-span-full rounded-[22px] border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-500">
            No designers have been added yet.
          </div>
        ) : (
          designers.map((designer) => (
            <div key={designer.id} className="rounded-[22px] border border-slate-200 bg-white p-6 shadow-soft hover:shadow-md transition">
              <div className="mb-4 flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-slate-950">{designer.name}</h3>
                  <p className="text-xs text-slate-500 uppercase tracking-[0.24em]">{designer.department}</p>
                </div>
                <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
                  designer.status === 'ACTIVE'
                    ? 'bg-green-100 text-green-700'
                    : 'bg-slate-100 text-slate-700'
                }`}>
                  {designer.status}
                </span>
              </div>

              <div className="mb-4 space-y-2 border-t border-b border-slate-200 py-4">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Email</span>
                  <span className="font-medium text-slate-900">{designer.email}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Active Tickets</span>
                  <span className="font-medium text-blue-600">{designer.activeTickets}</span>
                </div>
              </div>

              <div className="flex gap-2">
                <button onClick={() => handleEditDesigner(designer)} className="flex-1 flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition">
                  <Edit2 className="h-4 w-4" />
                  Edit
                </button>
                <button
                  onClick={() => void handleDeleteDesigner(designer.id)}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-700 hover:bg-red-50 hover:border-red-200 transition"
                >
                  <Trash2 className="h-4 w-4 text-red-600" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-[22px] border border-slate-200 bg-white p-6 shadow-lg">
            <h3 className="mb-4 text-lg font-semibold text-slate-950">{editingId ? 'Edit Designer' : 'Add Designer'}</h3>
            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-900">Name</label>
                <input
                  type="text"
                  value={forming.name}
                  onChange={(e) => setForming({ ...forming, name: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-900">Department</label>
                <input
                  type="text"
                  value={forming.department}
                  onChange={(e) => setForming({ ...forming, department: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-900">Email</label>
                <input
                  type="email"
                  value={forming.email}
                  onChange={(e) => setForming({ ...forming, email: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-900">Active Tickets</label>
                <input
                  type="number"
                  min="0"
                  value={forming.activeTickets}
                  onChange={(e) => setForming({ ...forming, activeTickets: Number(e.target.value) })}
                  className="w-full rounded-lg border border-slate-200 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-900">Status</label>
                <select
                  value={forming.status}
                  onChange={(e) => setForming({ ...forming, status: e.target.value as 'ACTIVE' | 'INACTIVE' })}
                  className="w-full rounded-lg border border-slate-200 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="ACTIVE">Active</option>
                  <option value="INACTIVE">Inactive</option>
                </select>
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => {
                    setShowForm(false);
                    setEditingId(null);
                    setForming({ name: '', department: '', email: '', activeTickets: 0, status: 'ACTIVE' });
                  }}
                  className="flex-1 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={() => void handleAddDesigner()}
                  className="flex-1 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition disabled:opacity-50"
                  disabled={!forming.name.trim() || !forming.department.trim() || !forming.email.trim()}
                >
                  {editingId ? 'Update Designer' : 'Save Designer'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
