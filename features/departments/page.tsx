'use client';

import { useEffect, useState } from 'react';
import { Plus, Edit2, Trash2, AlertCircle } from 'lucide-react';

interface Department {
  id: string;
  name: string;
  description: string;
  ticketCount: number;
  status: 'ACTIVE' | 'INACTIVE';
}

export function DepartmentsPage() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [forming, setForming] = useState({ name: '', description: '', status: 'ACTIVE' as 'ACTIVE' | 'INACTIVE' });

  const loadDepartments = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/departments');
      if (!response.ok) {
        throw new Error('Failed to load departments');
      }
      const data = (await response.json()) as Department[];
      setDepartments(data);
      setError('');
    } catch (err) {
      console.error(err);
      setError('Unable to load departments from the database.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadDepartments();
  }, []);

  const handleAddDepartment = async () => {
    if (!forming.name.trim()) {
      setError('Department name is required.');
      return;
    }

    try {
      const response = await fetch(editingId ? `/api/admin/departments?id=${editingId}` : '/api/admin/departments', {
        method: editingId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(forming),
      });

      if (!response.ok) {
        throw new Error('Failed to create department');
      }

      setForming({ name: '', description: '', status: 'ACTIVE' });
      setEditingId(null);
      setShowForm(false);
      setError('');
      await loadDepartments();
    } catch (err) {
      console.error(err);
      setError('Unable to save department to the database.');
    }
  };

  const handleEditDepartment = (department: Department) => {
    setEditingId(department.id);
    setForming({ name: department.name, description: department.description, status: department.status });
    setShowForm(true);
  };

  const handleDeleteDepartment = async (id: string) => {
    try {
      const response = await fetch(`/api/admin/departments?id=${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete department');
      }

      await loadDepartments();
    } catch (err) {
      console.error(err);
      setError('Unable to delete department from the database.');
    }
  };

  return (
    <div>
      <div className="mb-8 flex flex-col gap-2">
        <p className="text-sm font-medium uppercase tracking-[0.24em] text-slate-500">Management</p>
        <h1 className="text-4xl font-bold text-slate-950">Departments</h1>
        <p className="max-w-2xl text-sm leading-6 text-slate-600">
          Manage departments and track their ticket metrics.
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
          Add Department
        </button>
      </div>

      <div className="overflow-x-auto rounded-[22px] border border-slate-200 bg-white shadow-soft">
        {loading ? (
          <div className="px-6 py-10 text-sm text-slate-500">Loading departments...</div>
        ) : departments.length === 0 ? (
          <div className="px-6 py-10 text-center text-sm text-slate-500">No departments have been added yet.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="px-6 py-4 text-left font-semibold text-slate-900">Department Name</th>
                <th className="px-6 py-4 text-left font-semibold text-slate-900">Description</th>
                <th className="px-6 py-4 text-left font-semibold text-slate-900">Tickets</th>
                <th className="px-6 py-4 text-left font-semibold text-slate-900">Status</th>
                <th className="px-6 py-4 text-left font-semibold text-slate-900">Actions</th>
              </tr>
            </thead>
            <tbody>
              {departments.map((dept) => (
                <tr key={dept.id} className="border-b border-slate-100 hover:bg-slate-50 transition">
                  <td className="px-6 py-4 font-medium text-slate-900">{dept.name}</td>
                  <td className="px-6 py-4 text-slate-700">{dept.description}</td>
                  <td className="px-6 py-4">
                    <span className="inline-flex rounded-full bg-blue-100 px-3 py-1 text-sm font-medium text-blue-700">
                      {dept.ticketCount} tickets
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${
                      dept.status === 'ACTIVE'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-slate-100 text-slate-700'
                    }`}>
                      {dept.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex gap-2">
                      <button onClick={() => handleEditDepartment(dept)} aria-label={`Edit ${dept.name}`} className="text-blue-600 hover:text-blue-700 transition">
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => void handleDeleteDepartment(dept.id)}
                        className="text-red-600 hover:text-red-700 transition"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-[22px] border border-slate-200 bg-white p-6 shadow-lg">
            <h3 className="mb-4 text-lg font-semibold text-slate-950">{editingId ? 'Edit Department' : 'Add Department'}</h3>
            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-900">Department Name</label>
                <input
                  type="text"
                  value={forming.name}
                  onChange={(e) => setForming({ ...forming, name: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-900">Description</label>
                <textarea
                  rows={3}
                  value={forming.description}
                  onChange={(e) => setForming({ ...forming, description: e.target.value })}
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
                    setForming({ name: '', description: '', status: 'ACTIVE' });
                  }}
                  className="flex-1 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={() => void handleAddDepartment()}
                  className="flex-1 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition disabled:opacity-50"
                  disabled={!forming.name.trim()}
                >
                  {editingId ? 'Update Department' : 'Save Department'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
