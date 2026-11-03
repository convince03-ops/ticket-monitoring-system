export type TicketType = string;

export type TicketLevel = 'MINOR' | 'MAJOR' | 'MODERATE';

export type TicketStatus = 'OPEN' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

export type TicketRecord = {
  id: string;
  ticketNumber: string;
  description: string;
  department: string;
  requestor: string;
  requestorEmail?: string | null;
  material: TicketType;
  ticketLevel: TicketLevel;
  designer: string;
  status: TicketStatus;
  ticketRequestDate: string | null;
  dateReceivedByArtist: string | null;
  workingDays: number;
  deadline: string | null;
  dateOfSubmission: string | null;
  count: number;
  remarks: string;
  others: string;
  createdAt: string | null;
  updatedAt: string | null;
  month: string | null;
};
