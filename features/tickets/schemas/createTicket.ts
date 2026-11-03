import { z } from 'zod';

export const createTicketSchema = z.object({
  ticketNumber: z.string().min(1, 'Ticket number is required'),
  description: z.string().min(5, 'Description must be at least 5 characters'),
  department: z.string().min(1, 'Department is required'),
  requestor: z.string().min(1, 'Requestor is required'),
  requestorEmail: z.union([z.string().email('Enter a valid requestor email'), z.literal('')]).optional(),
  material: z.string().min(1, 'Please select a valid material'),
  level: z.enum(['MINOR', 'MAJOR', 'MODERATE'], {
    errorMap: () => ({ message: 'Please select a valid level' })
  }),
  designer: z.string().min(1, 'Designer is required'),
  ticketRequestDate: z.string().min(1, 'Ticket request date is required'),
  dateReceivedByArtist: z.string().min(1, 'Date received is required'),
  workingDays: z.number().min(1, 'Working days must be at least 1'),
  deadline: z.string().min(1, 'Deadline is required'),
  dateOfSubmission: z.string().optional(),
  status: z.enum(['OPEN', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'], {
    errorMap: () => ({ message: 'Please select a valid status' })
  }),
  remarks: z.string().optional(),
  others: z.string().optional(),
  attachments: z.array(z.instanceof(File)).optional()
}).superRefine((ticket, context) => {
  if (ticket.status === 'COMPLETED' && !ticket.dateOfSubmission) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['dateOfSubmission'],
      message: 'Date of submission is required for completed tickets'
    });
  }
});

export type CreateTicketFormData = z.infer<typeof createTicketSchema>;

// SLA configuration in days
export const SLA_CONFIG = {
  'PROMO': 7,
  'FLYERS': 15,
  'STATIC_LAYOUT': 7,
  'MOTION_GRAPHICS': 10,
  'VIDEO_AVP': 15,
  'DIGITAL_COLLATS': 7,
  'VM_REQUESTS': 7,
  'ISM_GRAPHICS': 7
};
