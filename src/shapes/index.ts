// Response shapes for the external APIs this estate actually still calls.
//
// Salvaged from a v0.1.0 working copy that had been sitting untracked in the `ui` repo -- a second,
// divergent master of this package. Its other three shape files (Vercel, Supabase-mgmt, GitHub) were
// deliberately NOT brought over: the estate exited those vendors, and a schema for an API nobody calls
// is a maintenance cost that looks like coverage.
//
// These live behind the `./shapes` subpath, not the package entry point, because they are the only
// modules here that import `zod` as a VALUE. The main entry uses it as a type-only peer, so importing
// `@overengineered-solutions/observability` stays runtime-zod-free for callers that just want httpFetch.
export {
  CloudflareZoneSchema,
  CloudflareDnsRecordSchema,
  CloudflareVerifyTokenSchema,
  ZonesListResponseSchema,
} from './cloudflare.js';
export { EmailSendResponseSchema } from './resend.js';
