import { z } from 'zod';

export const DeploymentSchema = z.object({
  uid: z.string(),
  state: z.string(),
  url: z.string(),
});
