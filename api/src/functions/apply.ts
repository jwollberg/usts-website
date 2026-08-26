import { app, type HttpRequest, type HttpResponseInit, type InvocationContext } from '@azure/functions';
import { dvCreate, dataverseUrl, getToken } from '../lib/dataverse.js';
import { loadOpenings } from './openings.js';
import {
  json,
  badRequest,
  rateLimit,
  looksAutomated,
  str,
  bool,
  choice,
  guid,
  monthToDate,
  compact,
  EMAIL_RE,
} from '../lib/guard.js';

/* Option-set values, mirrored from src/components/apply/options.ts. Anything not
   in these lists is dropped rather than written, so a tampered payload cannot
   put a junk value into a picklist column. */
const V = {
  experience: [190580000, 190580001, 190580002, 190580003, 190580004, 190580005, 190580006],
  employmentType: [190580000, 190580001],
  travel: [190580000, 190580001, 190580002, 190580003, 190580004, 190580005, 190580006],
  start: [190580000, 190580001, 190580002, 190580003, 190580004, 190580005, 190580006],
  education: [190580000, 190580001, 190580002, 190580003, 190580004, 190580005, 190580006],
  referral: [
    190580000, 190580001, 190580002, 190580003, 190580004, 190580005, 190580006, 190580007,
    190580008, 190580009, 190580010,
  ],
  longest: [190580000, 190580001, 190580002, 190580003, 190580004, 190580005],
  shift: [8, 10],
} as const;

const STATUS_ADDED = 190580000;
const RESUME_MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED_EXT = ['.pdf', '.doc', '.docx', '.rtf', '.txt'];

/** Uploads to the native `cr24f_resume` file column so it appears on the form in
 *  Nexus, rather than being buried in the notes tab. Single-request upload is
 *  valid below 128 MB; we cap far lower than that. */
async function uploadResume(applicantId: string, name: string, bytes: Buffer): Promise<void> {
  const token = await getToken();
  const safeName = name.replace(/[^\w.\- ]+/g, '_').slice(0, 100);
  const res = await fetch(
    `${dataverseUrl()}/api/data/v9.2/cr24f_applicants(${applicantId})/cr24f_resume?x-ms-file-name=${encodeURIComponent(safeName)}`,
    {
      method: 'PATCH',
      headers: {
        'OData-MaxVersion': '4.0',
        'OData-Version': '4.0',
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/octet-stream',
      },
      body: new Uint8Array(bytes),
    }
  );
  if (!res.ok) {
    throw new Error(`Resume upload failed (${res.status}): ${(await res.text()).slice(0, 300)}`);
  }
}

async function handler(req: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  if (!rateLimit(req, 'apply', 5, 10 * 60_000)) {
    return json(429, { ok: false, message: 'Too many submissions from this connection. Try again shortly.' });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return badRequest('We could not read that submission.');
  }

  // Bots fill the hidden field and post faster than anyone can read the form.
  // Accept and discard rather than explaining the check to them.
  if (looksAutomated(body, 8_000)) {
    context.warn('apply: discarded as automated');
    return json(200, { ok: true });
  }

  /* ------------------------------------------------------------- validate */
  const firstName = str(body.firstName, 100);
  const lastName = str(body.lastName, 100);
  const email = str(body.email, 200);
  const phone = str(body.phone, 40);

  if (!firstName || !lastName) return badRequest('Please give us your first and last name.');
  if (!EMAIL_RE.test(email)) return badRequest('Please give us a valid email address.');
  if (phone.replace(/\D/g, '').length < 10) return badRequest('Please give us a 10-digit phone number.');

  const positionId = guid(body.positionId);
  const marketId = guid(body.marketId);
  const officeId = guid(body.officeId);
  const positionOther = str(body.positionOther, 150);

  if (!positionId && !positionOther) return badRequest('Please tell us which role you are applying for.');

  // The form sends a requisition number, not an id — resolve it against the
  // live list so a hand-edited query string cannot bind to an arbitrary row.
  let requisitionId: string | undefined;
  const requisitionNumber = str(body.requisitionNumber, 30);
  if (requisitionNumber) {
    try {
      requisitionId = (await loadOpenings()).find((o) => o.requisitionNumber === requisitionNumber)?.id || undefined;
    } catch {
      /* a requisition we cannot resolve is not worth failing the application over */
    }
  }

  /* ---- notes: keep the free-text role in the notes when lookups were down */
  const notes = [
    positionOther && !positionId ? `Role requested (typed by applicant): ${positionOther}` : '',
    str(body.relevantExperienceNotes, 4000),
  ]
    .filter(Boolean)
    .join('\n\n');

  const record = compact({
    cr24f_fullname: `${firstName} ${lastName}`.slice(0, 200),
    cr24f_firstname: firstName,
    cr24f_middlename: str(body.middleName, 100),
    cr24f_lastname: lastName,
    cr24f_preferredfirstname: str(body.preferredFirstName, 100) || firstName,
    cr24f_email: email,
    cr24f_phone: phone,

    cr24f_homeaddressstreet1: str(body.street1, 250),
    cr24f_homeaddressstreet2: str(body.street2, 250),
    cr24f_homeaddresscity: str(body.city, 100),
    cr24f_homeaddressstate: str(body.state, 2).toUpperCase(),
    cr24f_homeaddresszip: str(body.zip, 10),
    cr24f_textauthorization: bool(body.textAuthorization) ?? false,

    cr24f_yearsold: bool(body.yearsOld),
    cr24f_eligibleforusemployment: bool(body.eligibleForUsEmployment),
    cr24f_canundergobackgroundchecks: bool(body.canUndergoBackgroundChecks),
    cr24f_abletoperformrole: bool(body.ableToPerformRole),

    cr24f_experience: choice(body.experience, V.experience),
    cr24f_relevantexperiencenotes: notes,
    cr24f_askingpay: str(body.askingPay, 100),
    cr24f_education: choice(body.education, V.education),

    cr24f_employmenttype: choice(body.employmentType, V.employmentType),
    cr24f_shiftlength: choice(body.shiftLength, V.shift),
    cr24f_worksmonday: bool(body.worksMonday) ?? false,
    cr24f_workstuesday: bool(body.worksTuesday) ?? false,
    cr24f_workswednesday: bool(body.worksWednesday) ?? false,
    cr24f_worksthursday: bool(body.worksThursday) ?? false,
    cr24f_worksfriday: bool(body.worksFriday) ?? false,
    cr24f_workssaturday: bool(body.worksSaturday) ?? false,
    cr24f_workssunday: bool(body.worksSunday) ?? false,
    cr24f_travelavailability: choice(body.travelAvailability, V.travel),
    cr24f_canworkovertime: bool(body.canWorkOvertime),
    cr24f_canworkweekend: bool(body.canWorkWeekend),
    cr24f_canworkovernight: bool(body.canWorkOvernight),
    cr24f_startingtimeframe: choice(body.startingTimeframe, V.start),
    cr24f_canmakeworkschedule: bool(body.canMakeWorkSchedule),
    cr24f_canmakelocalcommute: bool(body.canMakeLocalCommute),
    cr24f_canrelocate: bool(body.canRelocate),

    cr24f_currentemployername: str(body.currentEmployerName, 200),
    cr24f_currentemployerstartposition: str(body.currentEmployerStartPosition, 200),
    cr24f_currentemployerendposition: str(body.currentEmployerEndPosition, 200),
    cr24f_currentemployerstartdate: monthToDate(body.currentEmployerStartDate),
    cr24f_currentemployerenddate: monthToDate(body.currentEmployerEndDate),
    cr24f_previousemployername: str(body.previousEmployerName, 200),
    cr24f_previousemployerstartposition: str(body.previousEmployerStartPosition, 200),
    cr24f_previousemployerendposition: str(body.previousEmployerEndPosition, 200),
    cr24f_previousemployerstartdate: monthToDate(body.previousEmployerStartDate),
    cr24f_previousemployerenddate: monthToDate(body.previousEmployerEndDate),

    cr24f_longestemployment: choice(body.longestEmployment, V.longest),
    cr24f_hasvaliddriverslicense: bool(body.hasValidDriversLicense),
    cr24f_driver: bool(body.driver),
    cr24f_hasreliabletransportation: bool(body.hasReliableTransportation),
    cr24f_hasmilitaryservice: bool(body.hasMilitaryService),
    cr24f_referralsource: choice(body.referralSource, V.referral),

    cr24f_applicantstatus: STATUS_ADDED,

    ...(positionId ? { 'cr24f_AppliedPosition@odata.bind': `/positions(${positionId})` } : {}),
    ...(marketId ? { 'cr24f_Market@odata.bind': `/cr24f_markets(${marketId})` } : {}),
    ...(officeId ? { 'cr24f_Office@odata.bind': `/cr24f_offices(${officeId})` } : {}),
    ...(requisitionId ? { 'cr24f_Requisition@odata.bind': `/cr24f_requisitions(${requisitionId})` } : {}),
  });

  /* --------------------------------------------------------------- write */
  let applicantId: string;
  try {
    applicantId = await dvCreate('cr24f_applicants', record);
  } catch (err) {
    context.error('apply: create failed', err);
    return json(502, {
      ok: false,
      message: 'We could not file your application. Please try again, or email info@ustelecomservices.com.',
    });
  }

  /* The application is safely stored by this point. A resume that fails to
     attach is logged and reported, but never costs the applicant their
     submission — that is why the file goes up second. */
  let resumeAttached = false;
  const resume = body.resume;
  if (resume && typeof resume.contentBase64 === 'string' && typeof resume.name === 'string') {
    try {
      const ext = resume.name.toLowerCase().slice(resume.name.lastIndexOf('.'));
      if (!ALLOWED_EXT.includes(ext)) throw new Error(`Rejected extension: ${ext}`);
      const bytes = Buffer.from(resume.contentBase64, 'base64');
      if (bytes.length === 0 || bytes.length > RESUME_MAX_BYTES) throw new Error(`Bad size: ${bytes.length}`);
      await uploadResume(applicantId, resume.name, bytes);
      resumeAttached = true;
    } catch (err) {
      context.error(`apply: resume upload failed for ${applicantId}`, err);
    }
  }

  context.log(`apply: created applicant ${applicantId} (resume attached: ${resumeAttached})`);
  return json(201, { ok: true, resumeAttached });
}

app.http('apply', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'apply',
  handler,
});
