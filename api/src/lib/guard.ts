import type { HttpRequest, HttpResponseInit } from '@azure/functions';

/**
 * Anti-abuse and validation helpers shared by the two public POST endpoints.
 *
 * Nothing here trusts the client. The browser does its own validation for the
 * user's benefit; these checks are what actually decide whether a row is
 * written.
 */

export const json = (status: number, body: unknown): HttpResponseInit => ({
  status,
  jsonBody: body,
  headers: { 'Cache-Control': 'no-store' },
});

export const badRequest = (message: string) => json(400, { ok: false, message });

/* --------------------------------------------------------------- rate limit */

type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

/**
 * Fixed-window limiter, per instance.
 *
 * Consumption-plan functions scale out, so this is best-effort rather than a
 * hard global cap — it exists to blunt a single noisy source, not to be a WAF.
 * If real abuse shows up, put Turnstile in front or move the limit to Front Door.
 */
export function rateLimit(req: HttpRequest, key: string, limit: number, windowMs: number): boolean {
  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-azure-clientip') ||
    'unknown';
  const id = `${key}:${ip}`;
  const now = Date.now();

  const b = buckets.get(id);
  if (!b || b.resetAt < now) {
    buckets.set(id, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (b.count >= limit) return false;
  b.count += 1;
  return true;

}

/** Keeps the limiter map from growing without bound on a warm instance. */
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of buckets) if (v.resetAt < now) buckets.delete(k);
}, 60_000).unref?.();

/* ------------------------------------------------------------------- checks */

/**
 * A bot fills every field it can see, including the off-screen one, and posts
 * far faster than a person can read. Either signal means we quietly accept the
 * request and drop it — telling a bot why it failed only helps it.
 */
export function looksAutomated(body: any, minElapsedMs: number): boolean {
  if (typeof body?.website === 'string' && body.website.trim() !== '') return true;
  const elapsed = Number(body?.elapsedMs);
  if (!Number.isFinite(elapsed) || elapsed < minElapsedMs) return true;
  return false;
}

/* --------------------------------------------------------------- coercion */

export const str = (v: unknown, max: number): string =>
  typeof v === 'string' ? v.trim().slice(0, max) : '';

export const bool = (v: unknown): boolean | undefined =>
  typeof v === 'boolean' ? v : undefined;

/** Only lets through values that are actually in the option set. */
export const choice = (v: unknown, allowed: readonly number[]): number | undefined => {
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) && allowed.includes(n) ? n : undefined;
};

const GUID_RE = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
export const guid = (v: unknown): string | undefined =>
  typeof v === 'string' && GUID_RE.test(v) ? v : undefined;

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** `2026-08` from a month input becomes a date Dataverse will accept. */
export const monthToDate = (v: unknown): string | undefined => {
  const s = str(v, 10);
  if (/^\d{4}-\d{2}$/.test(s)) return `${s}-01`;
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  return undefined;
};

/** Drops anything that isn't a real value so we never PATCH nulls over defaults. */
export function compact<T extends Record<string, any>>(obj: T): Partial<T> {
  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null || v === '') continue;
    out[k] = v;
  }
  return out as Partial<T>;
}
