import type { TicketRecord } from '@/features/tickets/types';

export type TicketTimeliness = 'DELAYED' | 'ON-TIME' | 'CANCEL' | 'PENDING' | 'UNRECORDED';

const getTodayDate = (date: Date) => (
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
);

export function getTicketTimeliness(ticket: TicketRecord, today = new Date()): TicketTimeliness {
  if (ticket.status === 'CANCELLED') return 'CANCEL';

  if (ticket.status === 'COMPLETED') {
    if (!ticket.deadline || !ticket.dateOfSubmission) return 'UNRECORDED';
    return ticket.dateOfSubmission <= ticket.deadline ? 'ON-TIME' : 'DELAYED';
  }

  if (ticket.deadline && ticket.deadline < getTodayDate(today)) return 'DELAYED';
  return 'PENDING';
}