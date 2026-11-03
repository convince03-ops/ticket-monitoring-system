export type RequestorStatus =
  | 'PENDING_REVIEW'
  | 'IN_PROGRESS'
  | 'NEEDS_ACTION'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'ON_HOLD'
  | 'REJECTED';

export type PortalMessageType = 'REPLY' | 'INFORMATION' | 'REVISION_REQUEST';

export interface RequestorTicket {
  id: string;
  ticketNumber: string;
  title: string;
  description: string;
  category: string;
  priority: 'LOW' | 'NORMAL' | 'HIGH';
  status: RequestorStatus;
  submissionDate: string | null;
  updatedAt: string | null;
  targetDate: string | null;
  assignedTo: string | null;
}

export interface RequestorActivity {
  id: string;
  kind: 'STATUS' | 'MESSAGE';
  title: string;
  message: string;
  createdAt: string;
  author: string;
  messageType?: PortalMessageType;
}

export interface RequestorFile {
  id: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  createdAt: string;
  kind: 'SUPPORTING' | 'DELIVERABLE';
  downloadUrl: string;
}

export interface RequestorProfile {
  name: string;
  email: string;
  department: string | null;
}
