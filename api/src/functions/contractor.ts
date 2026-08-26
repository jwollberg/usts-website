import { app, type HttpRequest, type HttpResponseInit, type InvocationContext } from '@azure/functions';
import { dvCreate } from '../lib/dataverse.js';
import { json, badRequest, rateLimit, looksAutomated, str, compact, EMAIL_RE } from '../lib/guard.js';

/**
 * Subcontractor onboarding → Dataverse `cr24f_contractoronboardingrequest`,
 * replacing the Power Pages form.
 *
 * The row and its attachments go up as a single deep insert. A request without
 * its quote, W-9 and COI is of no use to anyone, so it is all-or-nothing rather
 * than a row followed by uploads that might not land.
 *
 * `cr24f_id` is an autonumber ({SEQNUM:4}) — never set it here.
 */

const MAX_FILE_BYTES = 5 * 1024 * 1024;
const MAX_TOTAL_BYTES = 12 * 1024 * 1024;
const MAX_FILES = 8;

const ALLOWED = new Set(['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.jpg', '.jpeg', '.png', '.txt', '.rtf']);

const MIME: Record<string, string> = {
  '.pdf': 'application/pdf',
  '.doc': 'application/msword',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.xls': 'application/vnd.ms-excel',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.txt': 'text/plain',
  '.rtf': 'application/rtf',
};

type Incoming = { name: string; kind: string; contentBase64: string };

async function handler(req: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  if (!rateLimit(req, 'contractor', 4, 10 * 60_000)) {
    return json(429, { ok: false, message: 'Too many submissions from this connection. Try again shortly.' });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return badRequest('We could not read that submission.');
  }

  if (looksAutomated(body, 6_000)) {
    context.warn('contractor: discarded as automated');
    return json(200, { ok: true });
  }

  const companyName = str(body.companyName, 200);
  const submitterName = str(body.submitterName, 150);
  const email = str(body.email, 200);
  const phone = str(body.phone, 40);
  const sponsor = str(body.sponsor, 150);

  if (!companyName) return badRequest('Please give us your company name.');
  if (!submitterName) return badRequest('Please give us your name.');
  if (!EMAIL_RE.test(email)) return badRequest('Please give us a valid email address.');
  if (phone.replace(/\D/g, '').length < 10) return badRequest('Please give us a 10-digit phone number.');
  if (!sponsor) return badRequest('Please tell us who at USTS requested your services.');

  /* ------------------------------------------------------------ documents */
  const files: Incoming[] = Array.isArray(body.files) ? body.files.slice(0, MAX_FILES) : [];
  if (files.length === 0) {
    return badRequest('Please attach at least one document — normally your quote, W-9 and certificate of insurance.');
  }

  const notes: Record<string, unknown>[] = [];
  let total = 0;

  for (const f of files) {
    const name = str(f?.name, 150);
    const kind = str(f?.kind, 40) || 'Document';
    if (!name || typeof f?.contentBase64 !== 'string') return badRequest('One of those files did not upload correctly.');

    const ext = name.toLowerCase().slice(name.lastIndexOf('.'));
    if (!ALLOWED.has(ext)) {
      return badRequest(`We can't accept "${name}". Please use PDF, Word, Excel or an image.`);
    }

    const bytes = Buffer.from(f.contentBase64, 'base64');
    if (bytes.length === 0) return badRequest(`"${name}" appears to be empty.`);
    if (bytes.length > MAX_FILE_BYTES) return badRequest(`"${name}" is over 5 MB. Please attach a smaller file.`);
    total += bytes.length;
    if (total > MAX_TOTAL_BYTES) return badRequest('Those files come to more than 12 MB in total. Please send fewer or smaller ones.');

    notes.push({
      subject: `${kind} — ${companyName}`.slice(0, 200),
      notetext: `Submitted through the website contractor onboarding form by ${submitterName}.`,
      filename: name.replace(/[^\w.\- ]+/g, '_'),
      mimetype: MIME[ext] ?? 'application/octet-stream',
      documentbody: f.contentBase64,
    });
  }

  const record = compact({
    cr24f_companyname: companyName,
    cr24f_submittername: submitterName,
    cr24f_email: email,
    cr24f_phone: phone,
    cr24f_sponsor: sponsor,
    // Row + attachments in one request: a request without its paperwork is
    // useless, so we never want the row to exist without the files.
    cr24f_contractoronboardingrequest_Annotations: notes,
  });

  let id: string;
  try {
    id = await dvCreate('cr24f_contractoronboardingrequests', record);
  } catch (err) {
    context.error('contractor: create failed', err);
    return json(502, {
      ok: false,
      message: 'We could not file your request. Please try again, or email info@ustelecomservices.com.',
    });
  }

  context.log(`contractor: created ${id} for ${companyName} with ${notes.length} document(s)`);
  return json(201, { ok: true, documents: notes.length });
}

app.http('contractor', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'contractor',
  handler,
});
