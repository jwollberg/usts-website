/**
 * Minimal Dataverse client.
 *
 * Uses the OAuth2 client-credentials flow directly rather than pulling in MSAL —
 * it is ~20 lines and one fewer dependency to keep patched on a public endpoint.
 *
 * The identity behind DV_CLIENT_ID is a Dataverse *application user* holding a
 * narrow custom role: create + read on cr24f_applicant and annotation, read on
 * the reference tables. It deliberately cannot read employees, timecards or any
 * other part of Nexus, so a leaked secret has a small blast radius.
 */

type Cached = { token: string; expiresAt: number };
let cached: Cached | null = null;

export function env(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required app setting: ${name}`);
  return v;
}

export function dataverseUrl(): string {
  return env('DV_URL').replace(/\/+$/, '');
}

export async function getToken(): Promise<string> {
  // 60s of slack so a token never expires mid-request.
  if (cached && cached.expiresAt > Date.now() + 60_000) return cached.token;

  const tenant = env('TENANT_ID');
  const body = new URLSearchParams({
    client_id: env('DV_CLIENT_ID'),
    client_secret: env('DV_CLIENT_SECRET'),
    grant_type: 'client_credentials',
    scope: `${dataverseUrl()}/.default`,
  });

  const res = await fetch(`https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Token request failed (${res.status}): ${text.slice(0, 400)}`);
  }

  const json = (await res.json()) as { access_token: string; expires_in: number };
  cached = { token: json.access_token, expiresAt: Date.now() + json.expires_in * 1000 };
  return cached.token;
}

const BASE_HEADERS = {
  'OData-MaxVersion': '4.0',
  'OData-Version': '4.0',
  Accept: 'application/json',
};

export async function dvGet<T = any>(path: string): Promise<T> {
  const token = await getToken();
  const res = await fetch(`${dataverseUrl()}/api/data/v9.2/${path}`, {
    headers: {
      ...BASE_HEADERS,
      Authorization: `Bearer ${token}`,
      Prefer: 'odata.include-annotations="OData.Community.Display.V1.FormattedValue"',
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Dataverse GET ${path} failed (${res.status}): ${text.slice(0, 400)}`);
  }
  return (await res.json()) as T;
}

/** Creates a row and returns its id, parsed out of the OData-EntityId header. */
export async function dvCreate(entitySet: string, payload: unknown): Promise<string> {
  const token = await getToken();
  const res = await fetch(`${dataverseUrl()}/api/data/v9.2/${entitySet}`, {
    method: 'POST',
    headers: {
      ...BASE_HEADERS,
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Dataverse POST ${entitySet} failed (${res.status}): ${text.slice(0, 600)}`);
  }

  const header = res.headers.get('OData-EntityId') ?? '';
  return header.match(/\(([0-9a-fA-F-]{36})\)/)?.[1] ?? '';
}

/* ------------------------------------------------------------------ caching */

type Entry<T> = { value: T; expiresAt: number };
const memo = new Map<string, Entry<any>>();

/**
 * Per-instance memo for reference data. Job postings do not change minute to
 * minute, and this keeps a burst of careers-page traffic from turning into a
 * burst of Dataverse queries.
 */
export async function cached_<T>(key: string, ttlMs: number, load: () => Promise<T>): Promise<T> {
  const hit = memo.get(key);
  if (hit && hit.expiresAt > Date.now()) return hit.value as T;
  const value = await load();
  memo.set(key, { value, expiresAt: Date.now() + ttlMs });
  return value;
}
