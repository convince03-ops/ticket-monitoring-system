import { NextResponse } from 'next/server';
import { authenticatePortalUser, type PortalIdentity } from '@/lib/requestor-auth';
import { getPortalTicketById } from '@/lib/requestor-data';
import { prisma } from '@/lib/prisma';
import type { RequestorTicket } from '@/features/requestor/types';

export async function authenticateStaffTicket(request: Request, ticketId: string) {
  const auth = await authenticatePortalUser(request);
  if (auth.error) return { error: auth.error } as const;
  const identity: PortalIdentity = auth.identity;
  if (identity.role === 'REQUESTOR') {
    return { error: NextResponse.json({ error: 'Staff access required.' }, { status: 403 }) } as const;
  }

  const ticket = await getPortalTicketById(ticketId);
  if (!ticket) {
    return { error: NextResponse.json({ error: 'Ticket not found.' }, { status: 404 }) } as const;
  }

  if (identity.role === 'DESIGNER') {
    const assignedName = ticket.assignedTo?.trim();
    const assignedTo = assignedName?.toLowerCase();
    const assignedByEmail = assignedTo === identity.email.trim().toLowerCase();
    const matchingDesigners = assignedName && !assignedByEmail
      ? await prisma.user.findMany({
        where: { role: 'DESIGNER', name: { equals: assignedName, mode: 'insensitive' } },
        select: { id: true },
        take: 2,
      })
      : [];
    const assignedByUniqueName = matchingDesigners.length === 1 && matchingDesigners[0].id === identity.id;
    const assignedToUser = assignedByEmail || assignedByUniqueName;
    if (!assignedToUser) {
      return { error: NextResponse.json({ error: 'Ticket not found.' }, { status: 404 }) } as const;
    }
  }

  return { identity, ticket } as { identity: PortalIdentity; ticket: RequestorTicket };
}
