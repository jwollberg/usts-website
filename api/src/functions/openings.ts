import { app, type HttpRequest, type HttpResponseInit, type InvocationContext } from '@azure/functions';
import { dvGet, cached_ } from '../lib/dataverse.js';
import { json } from '../lib/guard.js';

export type Opening = {
  id: string;
  requisitionNumber: string;
  position: string;
  market: string;
  office: string;
  city: string;
  state: string;
  openings: number;
};

/**
 * Active requisitions that actually have a seat to fill.
 *
 * The old Power Pages careers list rendered "no records to display" even with
 * nine live requisitions, so the filter is stated explicitly here: active state
 * AND at least one opening. Requisitions parked at zero openings stay hidden.
 */
const QUERY =
  'cr24f_requisitions?$select=cr24f_requisitionnumber,cr24f_openings' +
  '&$expand=cr24f_Position($select=name),cr24f_Office($select=cr24f_name,cr24f_addresscity,cr24f_addressstate),cr24f_Market($select=cr24f_name)' +
  '&$filter=statecode eq 0 and cr24f_openings gt 0' +
  '&$orderby=cr24f_requisitionnumber asc';

/**
 * Offices are named after their postal city in Dataverse, but applicants search
 * for the metro. Keep this in step with `label` in src/content/site.ts.
 */
const METRO: Record<string, string> = {
  'Sun Valley': 'Los Angeles',
  Gilbert: 'Phoenix',
};

export async function loadOpenings(): Promise<Opening[]> {
  return cached_('openings', 5 * 60_000, async () => {
    const data = await dvGet<{ value: any[] }>(QUERY);
    return data.value.map((r) => ({
      id: r.cr24f_requisitionid ?? '',
      requisitionNumber: String(r.cr24f_requisitionnumber ?? ''),
      position: r.cr24f_Position?.name ?? 'Open position',
      market: r.cr24f_Market?.cr24f_name ?? '',
      office: r.cr24f_Office?.cr24f_name ?? '',
      city:
        METRO[r.cr24f_Office?.cr24f_name] ??
        r.cr24f_Office?.cr24f_addresscity ??
        r.cr24f_Office?.cr24f_name ??
        '',
      state: r.cr24f_Office?.cr24f_addressstate ?? '',
      openings: Number(r.cr24f_openings ?? 0),
    }));
  });
}

async function handler(_req: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const openings = await loadOpenings();
    return {
      status: 200,
      jsonBody: { openings },
      // Short public cache: new postings surface quickly, but a spike in
      // careers-page traffic does not become a spike in Dataverse queries.
      headers: { 'Cache-Control': 'public, max-age=120, stale-while-revalidate=600' },
    };
  } catch (err) {
    context.error('openings failed', err);
    return json(502, { ok: false, message: 'Could not load open positions.' });
  }
}

app.http('openings', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'openings',
  handler,
});
