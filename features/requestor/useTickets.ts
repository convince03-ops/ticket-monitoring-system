'use client';

import { useEffect, useState } from 'react';
import { requestorApi } from '@/features/requestor/api';
import type { RequestorTicket } from '@/features/requestor/types';

export function useRequestorTickets() {
  const [tickets, setTickets] = useState<RequestorTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    requestorApi<RequestorTicket[]>('/api/requestor/tickets')
      .then((rows) => { if (active) setTickets(rows); })
      .catch((cause: unknown) => {
        if (active) setError(cause instanceof Error ? cause.message : 'Unable to load your requests.');
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  return { tickets, loading, error };
}
