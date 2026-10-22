// ═══════════════════════════════════════════
// API key primitives for the directory API (/api/v1/directory)
//
// Pure helpers (only `crypto`): no Next/Prisma imports, so the CLI scripts
// (scripts/create-api-key.ts, scripts/revoke-api-key.ts) can reuse them.
// ═══════════════════════════════════════════

import { createHash, randomBytes } from 'crypto';

export const API_KEY_PREFIX = 'plx_';
const DISPLAY_PREFIX_LENGTH = 12;

export const SCOPES = {
  /** Public directory fields. */
  DIRECTORY_READ: 'directory:read',
  /** Adds internal fields (kairosTenantId, plan, plan expiry). Also requires DIRECTORY_READ. */
  DIRECTORY_INTERNAL: 'directory:internal',
} as const;

export type Scope = (typeof SCOPES)[keyof typeof SCOPES];

/**
 * Reserved, never issuable: personal contact data (whatsappPhone, email).
 * Blocked until there is a do-not-contact flag and PII separation (audit #18, #25, #30).
 */
export const RESERVED_SCOPES = ['directory:contacts'] as const;

export function isIssuableScope(value: string): value is Scope {
  return (Object.values(SCOPES) as string[]).includes(value);
}

export function isReservedScope(value: string): boolean {
  return (RESERVED_SCOPES as readonly string[]).includes(value);
}

/** `plx_` + 30 random bytes (base64url) — 44 chars, ~240 bits of entropy. */
export function generateApiKey(): string {
  return API_KEY_PREFIX + randomBytes(30).toString('base64url');
}

/** SHA-256 hex. Enough for a high-entropy random key (no need for a slow KDF). */
export function hashApiKey(rawKey: string): string {
  return createHash('sha256').update(rawKey).digest('hex');
}

/** First 12 chars: identifies a key in listings/logs without exposing it. */
export function extractPrefix(rawKey: string): string {
  return rawKey.slice(0, DISPLAY_PREFIX_LENGTH);
}
