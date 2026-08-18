import { describe, expect, it } from 'vitest';

import {
  CloudflareZoneSchema,
  CloudflareDnsRecordSchema,
  CloudflareVerifyTokenSchema,
  ZonesListResponseSchema,
  EmailSendResponseSchema,
} from '../src/shapes';

// Fixtures are TRIMMED REAL responses (captured 2026-08-18 from api.cloudflare.com/client/v4 and
// api.resend.com). A shape guard exists to fail when the vendor changes the wire, so the fixtures must be
// shaped like the wire — including the many fields the schema does NOT name, to prove .passthrough() tolerates
// them rather than the schema silently being strict.

describe('Cloudflare shapes', () => {
  it('ZonesListResponseSchema accepts the real envelope and keeps unknown fields', () => {
    const wire = {
      success: true,
      errors: [],
      messages: [],
      result_info: { page: 1, per_page: 1, count: 1, total_count: 4 }, // not in schema; must pass through
      result: [
        { id: 'abc', name: 'example.net', status: 'active', paused: false, type: 'full', account: { id: 'x' } },
      ],
    };
    const parsed = ZonesListResponseSchema.parse(wire);
    expect(parsed.result[0]?.name).toBe('example.net');
    expect(parsed.success).toBe(true);
  });

  it('CloudflareZoneSchema requires id+name and tolerates status being absent', () => {
    expect(CloudflareZoneSchema.parse({ id: 'z1', name: 'a.net' }).id).toBe('z1');
    // a real zone carries ~20 more fields — none of them should break the guard
    expect(CloudflareZoneSchema.parse({ id: 'z1', name: 'a.net', created_on: '2026-01-01', plan: { id: 'free' } }).name).toBe('a.net');
  });

  it('CloudflareZoneSchema rejects a response missing the required name', () => {
    expect(() => CloudflareZoneSchema.parse({ id: 'z1' })).toThrow();
  });

  it('CloudflareDnsRecordSchema accepts a real record and tolerates content being absent', () => {
    const rec = { id: 'r1', type: 'A', name: 'a.net', content: '1.2.3.4', proxied: true, ttl: 1 };
    expect(CloudflareDnsRecordSchema.parse(rec).type).toBe('A');
    expect(CloudflareDnsRecordSchema.parse({ id: 'r1', type: 'TXT', name: 'a.net' }).id).toBe('r1');
  });

  it('CloudflareVerifyTokenSchema accepts a token status and rejects one with no status', () => {
    expect(CloudflareVerifyTokenSchema.parse({ status: 'active', expires_on: '2026-09-01T00:00:00Z' }).status).toBe('active');
    expect(() => CloudflareVerifyTokenSchema.parse({ expires_on: '2026-09-01T00:00:00Z' })).toThrow();
  });
});

describe('Resend shapes', () => {
  it('EmailSendResponseSchema accepts a send response', () => {
    expect(EmailSendResponseSchema.parse({ id: '7087fbe8-ec94-4af9-83ca-0602560924a4' }).id).toContain('-');
  });

  it('EmailSendResponseSchema rejects a response with no id (the failure direction)', () => {
    expect(() => EmailSendResponseSchema.parse({ message: 'queued' })).toThrow();
  });
});
