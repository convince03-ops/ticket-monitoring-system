import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().trim().email('Enter a valid email address.').refine(
    (email) => email.toLowerCase().endsWith('@princeretail.com'),
    'Use your @princeretail.com email address.'
  ),
  password: z.string().min(1, 'Enter your password.')
});
