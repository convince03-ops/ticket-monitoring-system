'use client';

import { useEffect, useState } from 'react';
import { Plus, Edit2, Trash2, AlertCircle } from 'lucide-react';

interface SLAMaterial {
  id: string;
  name: string;
  slaDays: number;
  status: 'ACTIVE' | 'INACTIVE';
}

export function SLAManagementPage() {
  const [materials, setMaterials] = useState<SLAMaterial[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Partial<SLAMaterial>>({});
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [newMaterial, setNewMaterial] = useState({ name: '', slaDays: 7 });

  const loadMaterials = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/materials');
      if (!response.ok) {
        throw new Error('Failed to load materials');
      }
      const data = (await response.json()) as SLAMaterial[];
      setMaterials(data);
      setError('');
    } catch (err) {
      console.error(err);
      setError('Unable to load materials from the database.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadMaterials();
  }, []);

  const handleEdit = (material: SLAMaterial) => {
    setEditingId(material.id);
    setEditValues(material);
  };

  const handleSave = async (id: string) => {
    try {
      const response = await fetch(`/api/admin/materials?id=${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editValues),
      });

      if (!response.ok) {
        throw new Error('Failed to update material');
      }

      setEditingId(null);
      await loadMaterials();
    } catch (err) {
      console.error(err);
      setError('Unable to update material in the database.');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const response = await fetch(`/api/admin/materials?id=${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete material');
      }

      await loadMaterials();
    } catch (err) {
      console.error(err);
      setError('Unable to delete material from the database.');
    }
  };

  const handleAddMaterial = async () => {
    if (!newMaterial.name.trim()) {
      setError('Material name is required.');
      return;
    }

    try {
      const response = await fetch('/api/admin/materials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newMaterial),
      });

      if (!response.ok) {
        throw new Error('Failed to create material');
      }

      setNewMaterial({ name: '', slaDays: 7 });
      setShowForm(false);
      setError('');
      await loadMaterials();
    } catch (err) {
      console.error(err);
      setError('Unable to save material to the database.');
    }
  };

  return (
    <div>
      <div className="mb-8 flex flex-col gap-2">
        <p className="text-sm font-medium uppercase tracking-[0.24em] text-slate-500">Configuration</p>
        <h1 className="text-4xl font-bold text-slate-950">SLA Management</h1>
        <p className="max-w-2xl text-sm leading-6 text-slate-600">
          Manage materials and their SLA (Service Level Agreement) configurations.
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
          Add Material
        </button>
      </div>

      <div className="overflow-x-auto rounded-[22px] border border-slate-200 bg-white shadow-soft">
        {loading ? (
          <div className="px-6 py-10 text-sm text-slate-500">Loading materials...</div>
        ) : materials.length === 0 ? (
          <div className="px-6 py-10 text-center text-sm text-slate-500">No materials have been added yet.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="px-6 py-4 text-left font-semibold text-slate-900">Material Name</th>
                <th className="px-6 py-4 text-left font-semibold text-slate-900">SLA Days</th>
                <th className="px-6 py-4 text-left font-semibold text-slate-900">Status</th>
                <th className="px-6 py-4 text-left font-semibold text-slate-900">Actions</th>
              </tr>
            </thead>
            <tbody>
              {materials.map((material) => (
                <tr key={material.id} className="border-b border-slate-100 hover:bg-slate-50 transition">
                  {editingId === material.id ? (
                    <>
                      <td className="px-6 py-4">
                        <input
                          type="text"
                          value={editValues.name || ''}
                          onChange={(e) => setEditValues({ ...editValues, name: e.target.value })}
                          className="rounded-lg border border-slate-200 px-3 py-1 text-sm focus:border-blue-500 focus:outline-none"
                        />
                      </td>
                      <td className="px-6 py-4">
                        <input
                          type="number"
                          value={editValues.slaDays || 7}
                          onChange={(e) => setEditValues({ ...editValues, slaDays: parseInt(e.target.value) })}
                          className="w-20 rounded-lg border border-slate-200 px-3 py-1 text-sm focus:border-blue-500 focus:outline-none"
                        />
                      </td>
                      <td className="px-6 py-4">
                        <select
                          value={editValues.status || 'ACTIVE'}
                          onChange={(e) => setEditValues({ ...editValues, status: e.target.value as 'ACTIVE' | 'INACTIVE' })}
                          className="rounded-lg border border-slate-200 px-3 py-1 text-sm focus:border-blue-500 focus:outline-none"
                        >
                          <option value="ACTIVE">Active</option>
                          <option value="INACTIVE">Inactive</option>
                        </select>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex gap-2">
                          <button
                            onClick={() => void handleSave(material.id)}
                            className="text-sm text-green-600 hover:text-green-700 font-medium transition"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="text-sm text-slate-600 hover:text-slate-700 transition"
                          >
                            Cancel
                          </button>
                        </div>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="px-6 py-4 font-medium text-slate-900">{material.name}</td>
                      <td className="px-6 py-4 text-slate-700">{material.slaDays} days</td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${
                            material.status === 'ACTIVE'
                              ? 'bg-green-100 text-green-700'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {material.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleEdit(material)}
                            className="text-blue-600 hover:text-blue-700 transition"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => void handleDelete(material.id)}
                            className="text-red-600 hover:text-red-700 transition"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Add Material Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-[22px] border border-slate-200 bg-white p-6 shadow-lg">
            <h3 className="mb-4 text-lg font-semibold text-slate-950">Add New Material</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-900 mb-2">Material Name</label>
                <input
                  type="text"
                  placeholder="e.g., Social Media Banner"
                  value={newMaterial.name}
                  onChange={(e) => setNewMaterial({ ...newMaterial, name: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-900 mb-2">SLA Days</label>
                <input
                  type="number"
                  min="1"
                  value={newMaterial.slaDays}
                  onChange={(e) => setNewMaterial({ ...newMaterial, slaDays: parseInt(e.target.value) })}
                  className="w-full rounded-lg border border-slate-200 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => {
                    setShowForm(false);
                    setNewMaterial({ name: '', slaDays: 7 });
                  }}
                  className="flex-1 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddMaterial}
                  className="flex-1 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition disabled:opacity-50"
                  disabled={!newMaterial.name}
                >
                  Add Material
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
