import { app, type HttpRequest, type HttpResponseInit, type InvocationContext } from '@azure/functions';
import { dvGet, cached_ } from '../lib/dataverse.js';
import { json } from '../lib/guard.js';
import { loadOpenings } from './openings.js';

/**
 * Reference data the application form needs to render its lookups.
 *
 * Only id + display name leave Dataverse — nothing else on these tables is any
 * of the public's business.
 */

type Ref = { id: string; name: string };

const loadPositions = () =>
  cached_<Ref[]>('positions', 15 * 60_000, async () => {
    const d = await dvGet<{ value: any[] }>('positions?$select=name,positionid&$orderby=name asc');
    return d.value
      .filter((p) => p.name && p.name !== 'None')
      .map((p) => ({ id: p.positionid, name: p.name }));
  });

const loadMarkets = () =>
  cached_<Ref[]>('markets', 15 * 60_000, async () => {
    const d = await dvGet<{ value: any[] }>(
      'cr24f_markets?$select=cr24f_name,cr24f_marketid&$filter=statecode eq 0&$orderby=cr24f_name asc'
    );
    return d.value.map((m) => ({ id: m.cr24f_marketid, name: m.cr24f_name }));
  });

const loadOffices = () =>
  cached_<Ref[]>('offices', 15 * 60_000, async () => {
    const d = await dvGet<{ value: any[] }>(
      'cr24f_offices?$select=cr24f_name,cr24f_officeid,cr24f_addressstate&$filter=statecode eq 0&$orderby=cr24f_name asc'
    );
    return d.value.map((o) => ({
      id: o.cr24f_officeid,
      name: o.cr24f_addressstate ? `${o.cr24f_name}, ${o.cr24f_addressstate}` : o.cr24f_name,
    }));
  });

async function handler(_req: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const [positions, markets, offices, openings] = await Promise.all([
      loadPositions(),
      loadMarkets(),
      loadOffices(),
      loadOpenings(),
    ]);
    return {
      status: 200,
      jsonBody: { positions, markets, offices, openings },
      headers: { 'Cache-Control': 'public, max-age=300, stale-while-revalidate=900' },
    };
  } catch (err) {
    context.error('options failed', err);
    return json(502, { ok: false, message: 'Could not load form options.' });
  }
}

app.http('options', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'options',
  handler,
});
