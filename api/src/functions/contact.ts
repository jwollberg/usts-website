import { app, type HttpRequest, type HttpResponseInit, type InvocationContext } from '@azure/functions';
import { env } from '../lib/dataverse.js';
import { json, badRequest, rateLimit, looksAutomated, str, EMAIL_RE } from '../lib/guard.js';

/**
 * Contact form → the existing "Nexus - Send Branded Email" flow.
 *
 * Routing through that flow rather than calling Graph directly means this site
 * needs no mail permission of its own: the flow already owns sending as Nexus@
 * and already applies the company's branded template. Its Request trigger takes
 * { to, subject, headline, bodyHtml, ctaLabel, ctaUrl, ... }.
 */

const TOPICS: Record<string, string> = {
  quote: 'Request a quote',
  scope: 'Scope a program',
  maintenance: 'Maintenance or emergency response',
  'employment-verification': 'Employment verification',
  invoice: 'Billing or invoice',
  other: 'General inquiry',
};

/** Everything placed into the HTML body is escaped — the message is untrusted
 *  input arriving from a public form and must never become markup. */
const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

const row = (label: string, value: string) =>
  value
    ? `<tr><td style="padding:4px 16px 4px 0;color:#6b6b78;white-space:nowrap;vertical-align:top">${esc(label)}</td>` +
      `<td style="padding:4px 0;color:#1d1c36"><strong>${esc(value)}</strong></td></tr>`
    : '';

async function handler(req: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  if (!rateLimit(req, 'contact', 5, 10 * 60_000)) {
    return json(429, { ok: false, message: 'Too many messages from this connection. Try again shortly.' });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return badRequest('We could not read that message.');
  }

  if (looksAutomated(body, 4_000)) {
    context.warn('contact: discarded as automated');
    return json(200, { ok: true });
  }

  const name = str(body.name, 120);
  const email = str(body.email, 200);
  const company = str(body.company, 150);
  const phone = str(body.phone, 40);
  const topicKey = str(body.topic, 40);
  const message = str(body.message, 5000);

  if (!name) return badRequest('Please tell us your name.');
  if (!EMAIL_RE.test(email)) return badRequest('Please give us a valid email address.');
  if (!TOPICS[topicKey]) return badRequest('Please choose what your message is about.');
  if (message.length < 15) return badRequest('Please tell us a little more about what you need.');

  const topic = TOPICS[topicKey];

  const bodyHtml = `
    <p style="margin:0 0 18px">A new message came in through the website contact form.</p>
    <table style="border-collapse:collapse;font-size:15px;margin:0 0 22px">
      ${row('From', name)}
      ${row('Company', company)}
      ${row('Email', email)}
      ${row('Phone', phone)}
      ${row('About', topic)}
    </table>
    <div style="border-left:3px solid #B22234;padding:2px 0 2px 16px;color:#45454f;font-size:15px;line-height:1.7">
      ${esc(message).replace(/\r?\n/g, '<br>')}
    </div>`.trim();

  try {
    const res = await fetch(env('BRANDED_EMAIL_FLOW_URL'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: env('CONTACT_TO'),
        subject: `Website inquiry — ${topic} — ${name}`,
        headline: `New ${topic.toLowerCase()}`,
        bodyHtml,
        ctaLabel: `Reply to ${name}`,
        ctaUrl: `mailto:${email}?subject=${encodeURIComponent(`Re: your message to US Telecom Services`)}`,
      }),
    });

    if (!res.ok) {
      throw new Error(`Flow returned ${res.status}: ${(await res.text()).slice(0, 300)}`);
    }
  } catch (err) {
    context.error('contact: send failed', err);
    return json(502, {
      ok: false,
      message: 'We could not send your message just now.',
    });
  }

  context.log(`contact: relayed message from ${email} (${topicKey})`);
  return json(200, { ok: true });
}

app.http('contact', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'contact',
  handler,
});
