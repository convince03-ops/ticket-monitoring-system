import { SLA_CONFIG } from '@/features/tickets/schemas/createTicket';

export interface CalculateSLAResult {
  slaDays: number;
  deadline: Date;
  workingDays: number;
}

/**
 * Calculate SLA deadline based on material type and start date
 * Excludes weekends (Saturday and Sunday) from calculation
 * @param material - The material/ticket type
 * @param startDate - The start date
 * @param holidays - Array of holiday dates to exclude (optional)
 * @returns SLA calculation result with the automatic deadline and working days
 */
export function calculateSLA(
  material: string,
  startDate: Date,
  holidays: Date[] = []
): CalculateSLAResult {
  const slaDays = SLA_CONFIG[material as keyof typeof SLA_CONFIG] || 7;
  
  let deadline = new Date(startDate);
  let daysAdded = 0;
  const holidaySet = new Set(holidays.map(h => h.toDateString()));

  // Calculate working days (skip weekends and holidays)
  while (daysAdded < slaDays) {
    deadline.setDate(deadline.getDate() + 1);
    const day = deadline.getDay();
    const isHoliday = holidaySet.has(deadline.toDateString());
    
    if (day !== 0 && day !== 6 && !isHoliday) { // 0 = Sunday, 6 = Saturday
      daysAdded++;
    }
  }

  return {
    slaDays,
    deadline,
    workingDays: slaDays
  };
}

/**
 * Check if a ticket is within SLA
 * @param deadline - The deadline date
 * @param submissionDate - The actual submission/completion date
 * @returns true if submission is on or before deadline
 */
export function isWithinSLA(deadline: Date, submissionDate: Date): boolean {
  return submissionDate <= deadline;
}

/**
 * Calculate SLA compliance percentage
 * @param totalTickets - Total number of tickets
 * @param completedOnTime - Number of tickets completed on time
 * @returns Compliance percentage
 */
export function calculateSLACompliance(totalTickets: number, completedOnTime: number): number {
  if (totalTickets === 0) return 0;
  return Math.round((completedOnTime / totalTickets) * 100);
}

/**
 * Get SLA status badge
 * @param deadline - The deadline date
 * @param submissionDate - The submission date (current date if not submitted)
 * @param status - Current ticket status
 * @returns Status string: 'on-time', 'at-risk', or 'overdue'
 */
export function getSLAStatus(
  deadline: Date,
  submissionDate: Date | null,
  status: string
): 'on-time' | 'at-risk' | 'overdue' {
  if (status === 'COMPLETED' && submissionDate) {
    return isWithinSLA(deadline, submissionDate) ? 'on-time' : 'overdue';
  }

  const now = new Date();
  const daysUntilDeadline = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  if (daysUntilDeadline < 0) return 'overdue';
  if (daysUntilDeadline <= 2) return 'at-risk';
  return 'on-time';
}
