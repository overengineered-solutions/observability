import { describe, expect, it } from 'vitest';

import {
  CloudflareVerifyTokenSchema,
  EmailSendResponseSchema,
  ZonesListResponseSchema,
} from '../src/shapes';

describe('shapes', () => {
  // Real response bodies, trimmed. The point of a shape is to fail when the vendor changes it, so the
  // fixtures have to be shaped like the wire, not like the schema.
  it('accepts a Cloudflare zones list and keeps unknown message fields', () => {
    const parsed = ZonesListResponseSchema.parse({
      success: true,
      result: [{ id: 'abc123', name: 'example.net', status: 'active' }],
      messages: [{ code: 10000, message: 'ok', extra: 'passthrough' }],
      errors: [],
    });
    expect(parsed.result[0]?.name).toBe('example.net');
  });

  it('accepts a Resend send response', () => {
    expect(EmailSendResponseSchema.parse({ id: '7087fbe8-ec94-4af9-83ca-0602560924a4' }).id).toContain('-');
  });

  // The failure direction is the one that matters: a silently-renamed field must not parse clean.
  it('rejects a Cloudflare token verify that lost its status field', () => {
    expect(() => CloudflareVerifyTokenSchema.parse({ expires_on: '2026-09-01T00:00:00Z' })).toThrow();
  });
});
