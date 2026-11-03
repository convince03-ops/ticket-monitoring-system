'use client';

import { useState, useMemo, useEffect } from 'react';
import { Search, Filter, Calendar } from 'lucide-react';

interface ActivityLogEntry {
  id: string;
  user: string;
  action: string;
  details: string;
  timestamp: string;
  ticketNumber?: string;
}

const activityActions = [
  'Ticket Created',
  'Ticket Updated',
  'Status Changed',
];

export function ActivityLogPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterAction, setFilterAction] = useState('');
  const [filterUser, setFilterUser] = useState('');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');

  const [activities, setActivities] = useState<ActivityLogEntry[]>([]);

  useEffect(() => {
    const loadActivities = async () => {
      try {
        const response = await fetch('/api/activity-log', { cache: 'no-store' });
        if (!response.ok) throw new Error('Failed to load activity log');
        setActivities(await response.json() as ActivityLogEntry[]);
      } catch (error) {
        console.error('Failed to load activity log:', error);
        setActivities([]);
      }
    };

    void loadActivities();
  }, []);

  const filteredActivities = useMemo(() => {
    let filtered = [...activities];

    if (searchTerm) {
      filtered = filtered.filter(
        (activity) =>
          activity.user.toLowerCase().includes(searchTerm.toLowerCase()) ||
          activity.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
          activity.details.toLowerCase().includes(searchTerm.toLowerCase()) ||
          activity.ticketNumber?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (filterAction) {
      filtered = filtered.filter((activity) => activity.action === filterAction);
    }

    if (filterUser) {
      filtered = filtered.filter((activity) => activity.user === filterUser);
    }

    // Sort by timestamp
    filtered.sort((a, b) => {
      const timeA = new Date(a.timestamp).getTime();
      const timeB = new Date(b.timestamp).getTime();
      return sortOrder === 'desc' ? timeB - timeA : timeA - timeB;
    });

    return filtered;
  }, [searchTerm, filterAction, filterUser, sortOrder, activities]);

  const getActionBadgeColor = (action: string) => {
    switch (action) {
      case 'Ticket Created':
        return 'bg-blue-100 text-blue-700';
      case 'Status Changed':
        return 'bg-purple-100 text-purple-700';
      case 'Designer Assigned':
        return 'bg-green-100 text-green-700';
      case 'File Uploaded':
        return 'bg-orange-100 text-orange-700';
      case 'Deadline Updated':
        return 'bg-yellow-100 text-yellow-700';
      case 'Holiday Added':
        return 'bg-pink-100 text-pink-700';
      case 'User Login':
        return 'bg-slate-100 text-slate-700';
      default:
        return 'bg-slate-100 text-slate-700';
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 30) return `${diffDays}d ago`;
    
    return date.toLocaleDateString();
  };

  const uniqueUsers = [...new Set(activities.map((a) => a.user))];
  const actionTypes = new Set(activities.map((activity) => activity.action)).size;
  const thisMonthCount = activities.filter((activity) => {
    const timestamp = new Date(activity.timestamp);
    const now = new Date();
    return timestamp.getFullYear() === now.getFullYear() && timestamp.getMonth() === now.getMonth();
  }).length;

  return (
    <div>
      <div className="mb-8 flex flex-col gap-2">
        <p className="text-sm font-medium uppercase tracking-[0.24em] text-slate-500">Monitoring</p>
        <h1 className="text-4xl font-bold text-slate-950">Activity Log</h1>
        <p className="max-w-2xl text-sm leading-6 text-slate-600">
          Track all actions and changes made in the system for audit and compliance purposes.
        </p>
      </div>

      {/* Controls */}
      <div className="mb-6 flex flex-col gap-4 rounded-[22px] border border-slate-200 bg-white p-6 shadow-soft">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by user, action, details, or ticket..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-slate-500" />
            <span className="text-sm font-medium text-slate-600">Filter:</span>
          </div>

          <select
            value={filterUser}
            onChange={(e) => setFilterUser(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 focus:outline-none"
          >
            <option value="">All Users</option>
            {uniqueUsers.map((user) => (
              <option key={user} value={user}>
                {user}
              </option>
            ))}
          </select>

          <select
            value={filterAction}
            onChange={(e) => setFilterAction(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 focus:outline-none"
          >
            <option value="">All Actions</option>
            {activityActions.map((action) => (
              <option key={action} value={action}>
                {action}
              </option>
            ))}
          </select>

          <select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value as 'desc' | 'asc')}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 focus:outline-none"
          >
            <option value="desc">Newest First</option>
            <option value="asc">Oldest First</option>
          </select>
        </div>
      </div>

      {/* Activity Timeline */}
      <div className="space-y-4">
        {filteredActivities.length === 0 ? (
          <div className="rounded-[22px] border border-slate-200 bg-white p-12 text-center shadow-soft">
            <Calendar className="mx-auto h-12 w-12 text-slate-300" />
            <p className="mt-4 text-slate-600">No activities found matching your criteria</p>
          </div>
        ) : (
          filteredActivities.map((activity) => (
            <div
              key={activity.id}
              className="rounded-[22px] border border-slate-200 bg-white p-6 shadow-soft hover:shadow-md transition"
            >
              <div className="flex gap-4">
                {/* Timeline dot */}
                <div className="flex flex-col items-center">
                  <div className="h-3 w-3 rounded-full bg-blue-600" />
                  <div className="mt-2 h-12 w-0.5 bg-slate-200" />
                </div>

                {/* Activity details */}
                <div className="flex-1 pt-1">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3">
                      <h4 className="font-semibold text-slate-950">{activity.user}</h4>
                      <span className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${getActionBadgeColor(activity.action)}`}>
                        {activity.action}
                      </span>
                      {activity.ticketNumber && (
                        <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                          {activity.ticketNumber}
                        </span>
                      )}
                    </div>
                    <span className="text-sm text-slate-500">{formatTime(activity.timestamp)}</span>
                  </div>
                  <p className="mt-2 text-sm text-slate-600">{activity.details}</p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Activity Stats */}
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-[22px] border border-slate-200 bg-white p-6 shadow-soft">
          <p className="text-sm font-medium text-slate-600">Total Activities</p>
          <p className="mt-2 text-3xl font-bold text-slate-950">{activities.length}</p>
        </div>
        <div className="rounded-[22px] border border-slate-200 bg-white p-6 shadow-soft">
          <p className="text-sm font-medium text-slate-600">Unique Users</p>
          <p className="mt-2 text-3xl font-bold text-slate-950">{uniqueUsers.length}</p>
        </div>
        <div className="rounded-[22px] border border-slate-200 bg-white p-6 shadow-soft">
          <p className="text-sm font-medium text-slate-600">Action Types</p>
          <p className="mt-2 text-3xl font-bold text-slate-950">{actionTypes}</p>
        </div>
        <div className="rounded-[22px] border border-slate-200 bg-white p-6 shadow-soft">
          <p className="text-sm font-medium text-slate-600">This Month</p>
          <p className="mt-2 text-3xl font-bold text-slate-950">{thisMonthCount}</p>
        </div>
      </div>
    </div>
  );
}
