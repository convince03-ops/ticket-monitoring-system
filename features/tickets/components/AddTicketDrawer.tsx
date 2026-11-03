'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { X, Calendar, AlertCircle } from 'lucide-react';
import { createTicketSchema, CreateTicketFormData } from '@/features/tickets/schemas/createTicket';
import type { TicketRecord } from '@/features/tickets/types';

const getTodayDate = () => {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
};

interface AddTicketDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit?: (data: CreateTicketFormData) => void | Promise<void>;
  initialTicket?: TicketRecord | null;
}

export function AddTicketDrawer({ isOpen, onClose, onSubmit, initialTicket }: AddTicketDrawerProps) {
  const [selectedMaterial, setSelectedMaterial] = useState('');
  const [workingDays, setWorkingDays] = useState(0);
  const [departmentOptions, setDepartmentOptions] = useState<string[]>([]);
  const [designerOptions, setDesignerOptions] = useState<string[]>([]);
  const [materialOptions, setMaterialOptions] = useState<Array<{ id: string; name: string; slaDays: number }>>([]);
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [lookupError, setLookupError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  useEffect(() => {
    if (!isOpen) return;

    const loadOptions = async () => {
      setLoadingOptions(true);
      setLookupError('');
      try {
        const loadLookup = async <T,>(path: string, label: string): Promise<{ data: T | null; error: string | null }> => {
          let lastError: Error | null = null;

          for (let attempt = 0; attempt < 2; attempt += 1) {
            try {
              const response = await fetch(path, { cache: 'no-store' });
              if (!response.ok) {
                const details = await response.text();
                throw new Error(`${label} request failed (${response.status})${details ? `: ${details}` : ''}`);
              }
              return { data: await response.json() as T, error: null };
            } catch (error) {
              lastError = error instanceof Error ? error : new Error(`Unable to load ${label.toLowerCase()}`);
            }
          }

          return { data: null, error: lastError?.message ?? `Unable to load ${label.toLowerCase()}` };
        };

        const [departments, designers, materials] = await Promise.all([
          loadLookup<Array<{ name?: string; status?: string }>>('/api/admin/departments', 'Departments'),
          loadLookup<Array<{ name?: string; status?: string }>>('/api/admin/designers', 'Designers'),
          loadLookup<Array<{ id?: string; name?: string; slaDays?: number; status?: string }>>('/api/admin/materials', 'Materials'),
        ]);

        if (departments.data) {
          setDepartmentOptions(departments.data.filter((item) => item.status !== 'INACTIVE').flatMap((item) => item.name ? [item.name] : []));
        }
        if (designers.data) {
          setDesignerOptions(designers.data.filter((item) => item.status !== 'INACTIVE').flatMap((item) => item.name ? [item.name] : []));
        }
        if (materials.data) {
          setMaterialOptions(materials.data
          .filter((item) => item.status !== 'INACTIVE' && item.id && item.name)
            .map((item) => ({ id: item.id as string, name: item.name as string, slaDays: Number(item.slaDays ?? 0) })));
        }

        const lookupErrors = [departments.error, designers.error, materials.error].filter(Boolean);
        if (lookupErrors.length > 0) {
          setLookupError(`Some ticket options could not be loaded: ${lookupErrors.join('; ')}`);
        }
      } catch (error) {
        console.error('Failed to load admin lookup data:', error);
        setLookupError(error instanceof Error ? error.message : 'Unable to load lookup data. Please try again.');
      } finally {
        setLoadingOptions(false);
      }
    };

    void loadOptions();
  }, [isOpen]);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
    reset
  } = useForm<CreateTicketFormData>({
    resolver: zodResolver(createTicketSchema),
    defaultValues: {
      status: 'OPEN',
      ticketRequestDate: getTodayDate()
    }
  });

  useEffect(() => {
    if (!isOpen) return;

    if (initialTicket) {
      reset({
        ticketNumber: initialTicket.ticketNumber,
        description: initialTicket.description,
        department: initialTicket.department,
        requestor: initialTicket.requestor,
        requestorEmail: initialTicket.requestorEmail ?? '',
        material: initialTicket.material,
        level: initialTicket.ticketLevel,
        designer: initialTicket.designer,
        ticketRequestDate: initialTicket.ticketRequestDate ?? initialTicket.createdAt ?? getTodayDate(),
        dateReceivedByArtist: initialTicket.dateReceivedByArtist ?? '',
        workingDays: initialTicket.workingDays,
        deadline: initialTicket.deadline ?? '',
        dateOfSubmission: initialTicket.dateOfSubmission ?? '',
        status: initialTicket.status,
        remarks: initialTicket.remarks,
        others: initialTicket.others,
      });
      setSelectedMaterial(initialTicket.material);
      setWorkingDays(initialTicket.workingDays);
    } else {
      reset({ status: 'OPEN', ticketRequestDate: getTodayDate() });
      setSelectedMaterial('');
      setWorkingDays(0);
    }
  }, [initialTicket, isOpen, reset]);

  const material = watch('material');

  const calculateWorkingDays = () => {
    if (!material) {
      setWorkingDays(0);
      setValue('workingDays', 0);
      return;
    }

    const selectedMaterialOption = materialOptions.find((item) => item.name === material);
    const slaDays = selectedMaterialOption?.slaDays ?? 7;
    setValue('workingDays', slaDays);
    setWorkingDays(slaDays);
  };

  useEffect(() => {
    calculateWorkingDays();
  }, [material, materialOptions, setValue]);

  const onFormSubmit = async (data: CreateTicketFormData) => {
    if (!onSubmit) return;

    setSubmitting(true);
    setSubmitError('');
    try {
      await onSubmit(data);
      reset();
      setSelectedMaterial('');
      setWorkingDays(0);
      onClose();
    } catch (error) {
      console.error('Failed to create ticket:', error);
      setSubmitError(error instanceof Error ? error.message : 'Unable to save the ticket. Check the form and try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 z-40 bg-black/50 transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-ticket-title"
        className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto p-5 sm:p-10"
      >
        <div className="flex max-h-[calc(100vh-2.5rem)] w-full max-w-3xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl sm:max-h-[calc(100vh-5rem)]">
        {/* Header */}
        <div className="sticky top-0 flex items-center justify-between border-b border-slate-200 bg-white px-6 pb-4 pt-5">
          <div>
            <h2 id="add-ticket-title" className="text-lg font-semibold text-slate-950">{initialTicket ? 'Edit Ticket' : 'Add New Ticket'}</h2>
            <p className="text-sm text-slate-600">{initialTicket ? 'Update the ticket details and save your changes' : 'Fill in the details to create a new ticket'}</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onFormSubmit)} className="grid gap-6 overflow-y-auto px-6 py-6 sm:grid-cols-2">
          {lookupError && (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 sm:col-span-2">
              {lookupError}
            </p>
          )}
          {submitError && (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 sm:col-span-2">
              {submitError}
            </p>
          )}
          {/* Ticket Number */}
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-slate-900 mb-2">Ticket #</label>
            <input
              type="text"
              placeholder="AUTO-001"
              {...register('ticketNumber')}
              className="w-full rounded-lg border border-slate-200 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            {errors.ticketNumber && (
              <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {errors.ticketNumber.message}
              </p>
            )}
          </div>

          {/* Description */}
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-slate-900 mb-2">Description</label>
            <textarea
              placeholder="Describe the ticket..."
              rows={3}
              {...register('description')}
              className="w-full rounded-lg border border-slate-200 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            {errors.description && (
              <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {errors.description.message}
              </p>
            )}
          </div>

          {/* Department */}
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-slate-900 mb-2">Department</label>
            <select
              {...register('department')}
              className="w-full rounded-lg border border-slate-200 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">Select Department</option>
              {loadingOptions && <option disabled>Loading departments...</option>}
              {departmentOptions.map((department) => (
                <option key={department} value={department}>{department}</option>
              ))}
            </select>
            {errors.department && (
              <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {errors.department.message}
              </p>
            )}
          </div>

          {/* Requestor */}
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-slate-900 mb-2">Requestor</label>
            <input
              type="text"
              placeholder="John Doe"
              {...register('requestor')}
              className="w-full rounded-lg border border-slate-200 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            {errors.requestor && (
              <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {errors.requestor.message}
              </p>
            )}
          </div>

          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-slate-900 mb-2">Requestor email</label>
            <input
              type="email"
              placeholder="john.doe@princeretail.com"
              {...register('requestorEmail')}
              className="w-full rounded-lg border border-slate-200 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <p className="mt-1 text-xs text-slate-500">Links this ticket to the requestor’s secure portal account.</p>
            {errors.requestorEmail && (
              <p className="mt-1 text-xs text-red-600">{errors.requestorEmail.message}</p>
            )}
          </div>

          {/* Material */}
          <div>
            <label className="block text-sm font-medium text-slate-900 mb-2">Material / Type</label>
            <select
              {...register('material')}
              onChange={(e) => {
                register('material').onChange(e);
                setSelectedMaterial(e.target.value);
              }}
              className="w-full rounded-lg border border-slate-200 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">{loadingOptions ? 'Loading materials...' : 'Select Material'}</option>
              {materialOptions.map((material) => (
                <option key={material.id} value={material.name}>{material.name}</option>
              ))}
            </select>
            {selectedMaterial && (
              <p className="mt-2 text-xs text-blue-600 flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                SLA: {(materialOptions.find((item) => item.name === selectedMaterial)?.slaDays ?? 7)} working days
              </p>
            )}
            {errors.material && (
              <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {errors.material.message}
              </p>
            )}
          </div>

          {/* Designer */}
          <div>
            <label className="block text-sm font-medium text-slate-900 mb-2">Designer</label>
            <select
              {...register('designer')}
              className="w-full rounded-lg border border-slate-200 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">Select Designer</option>
              {designerOptions.map((designer) => (
                <option key={designer} value={designer}>{designer}</option>
              ))}
            </select>
            {errors.designer && (
              <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {errors.designer.message}
              </p>
            )}
          </div>

          {/* Date Received by Artist */}
          <div>
            <label className="block text-sm font-medium text-slate-900 mb-2">Ticket Request Date</label>
            <input
              type="date"
              {...register('ticketRequestDate')}
              className="w-full rounded-lg border border-slate-200 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            {errors.ticketRequestDate && (
              <p className="mt-1 text-xs text-red-600">{errors.ticketRequestDate.message}</p>
            )}
          </div>

          {/* Date Received by Artist */}
          <div>
            <label className="block text-sm font-medium text-slate-900 mb-2">Date Received by Artist</label>
            <input
              type="date"
              {...register('dateReceivedByArtist')}
              className="w-full rounded-lg border border-slate-200 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            {errors.dateReceivedByArtist && (
              <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {errors.dateReceivedByArtist.message}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-900 mb-2">Date of Submission (Artist)</label>
            <input
              type="date"
              {...register('dateOfSubmission')}
              className="w-full rounded-lg border border-slate-200 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <p className="mt-1 text-xs text-slate-500">Recorded by the artist when work is submitted.</p>
            {errors.dateOfSubmission && (
              <p className="mt-1 text-xs text-red-600">{errors.dateOfSubmission.message}</p>
            )}
          </div>

          {/* Working Days (Auto-calculated) */}
          <div>
            <label className="block text-sm font-medium text-slate-900 mb-2">Working Days (Auto)</label>
            <input
              type="number"
              readOnly
              value={workingDays}
              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-600"
            />
            <p className="mt-1 text-xs text-slate-500">Automatically calculated based on material SLA</p>
          </div>

          {/* Deadline entered by the admin */}
          <div>
            <label className="block text-sm font-medium text-slate-900 mb-2">Deadline</label>
            <input
              type="date"
              {...register('deadline')}
              className="w-full rounded-lg border border-slate-200 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <p className="mt-1 text-xs text-slate-500">Set by the admin.</p>
            {errors.deadline && (
              <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {errors.deadline.message}
              </p>
            )}
          </div>

          {/* Ticket Level */}
          <div>
            <label className="block text-sm font-medium text-slate-900 mb-2">Ticket Level</label>
            <select
              {...register('level')}
              className="w-full rounded-lg border border-slate-200 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">Select Level</option>
              <option value="MINOR">Minor</option>
              <option value="MAJOR">Major</option>
              <option value="MODERATE">Moderate</option>
            </select>
            {errors.level && (
              <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {errors.level.message}
              </p>
            )}
          </div>

          {/* Status */}
          <div>
            <label className="block text-sm font-medium text-slate-900 mb-2">Status</label>
            <select
              {...register('status')}
              className="w-full rounded-lg border border-slate-200 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="OPEN">Pending</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="COMPLETED">Done</option>
              <option value="CANCELLED">Cancel</option>
            </select>
            {errors.status && (
              <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {errors.status.message}
              </p>
            )}
          </div>

          {/* Remarks */}
          <div>
            <label className="block text-sm font-medium text-slate-900 mb-2">Remarks</label>
            <textarea
              placeholder="Add any additional remarks..."
              rows={3}
              {...register('remarks')}
              className="w-full rounded-lg border border-slate-200 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-900 mb-2">Others</label>
            <input
              type="text"
              placeholder="Additional notes"
              {...register('others')}
              className="w-full rounded-lg border border-slate-200 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* Action Buttons */}
          <div className="sticky bottom-0 flex gap-3 border-t border-slate-200 bg-white pt-6 sm:col-span-2">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="flex-1 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || loadingOptions}
              className="flex-1 rounded-lg bg-blue-600 px-4 py-3 text-sm font-medium text-white hover:bg-blue-700 transition"
            >
              {submitting ? 'Saving...' : initialTicket ? 'Save Changes' : 'Create Ticket'}
            </button>
          </div>
        </form>
        </div>
      </div>
    </>
  );
}
