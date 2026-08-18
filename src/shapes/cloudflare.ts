import { z } from 'zod';

const CloudflareMessageSchema = z
  .object({
    code: z.number().optional(),
    message: z.string().optional(),
  })
  .passthrough();

export const CloudflareZoneSchema = z.object({
  id: z.string(),
  name: z.string(),
  status: z.string().optional(),
});

export const CloudflareDnsRecordSchema = z.object({
  id: z.string(),
  type: z.string(),
  name: z.string(),
  content: z.string().optional(),
});

export const CloudflareVerifyTokenSchema = z.object({
  status: z.string(),
  expires_on: z.string().optional(),
  id: z.string().optional(),
});

export const ZonesListResponseSchema = z.object({
  success: z.boolean(),
  result: z.array(CloudflareZoneSchema),
  messages: z.array(CloudflareMessageSchema),
  errors: z.array(CloudflareMessageSchema),
});
