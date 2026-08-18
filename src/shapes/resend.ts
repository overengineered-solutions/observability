import { z } from 'zod';

export const EmailSendResponseSchema = z.object({
  id: z.string(),
});
