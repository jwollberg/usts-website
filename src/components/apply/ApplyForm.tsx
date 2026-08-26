import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  EXPERIENCE,
  EMPLOYMENT_TYPE,
  TRAVEL,
  START_TIMEFRAME,
  EDUCATION,
  REFERRAL,
  LONGEST_EMPLOYMENT,
  SHIFT_LENGTH,
  US_STATES,
  DAYS,
  RESUME_MAX_BYTES,
  RESUME_TYPES,
} from './options';
import { TextField, TextArea, SelectField, YesNo, RadioCards, CheckboxField, ErrorText } from './fields';

/* ------------------------------------------------------------------ types */

type Ref = { id: string; name: string };
type Opening = { id: string; requisitionNumber: string; position: string; market: string; city: string; state: string };
type Options = { positions: Ref[]; markets: Ref[]; offices: Ref[]; openings: Opening[] };

type Data = {
  // 1 eligibility
  yearsOld: boolean | null;
  eligibleForUsEmployment: boolean | null;
  canUndergoBackgroundChecks: boolean | null;
  ableToPerformRole: boolean | null;
  // 2 contact
  firstName: string;
  middleName: string;
  lastName: string;
  preferredFirstName: string;
  email: string;
  phone: string;
  street1: string;
  street2: string;
  city: string;
  state: string;
  zip: string;
  textAuthorization: boolean;
  // 3 role
  requisitionNumber: string;
  positionId: string;
  positionOther: string;
  marketId: string;
  officeId: string;
  experience: number | '';
  relevantExperienceNotes: string;
  askingPay: string;
  education: number | '';
  // 4 availability
  employmentType: number | '';
  shiftLength: number | '';
  worksMonday: boolean;
  worksTuesday: boolean;
  worksWednesday: boolean;
  worksThursday: boolean;
  worksFriday: boolean;
  worksSaturday: boolean;
  worksSunday: boolean;
  travelAvailability: number | '';
  canWorkOvertime: boolean | null;
  canWorkWeekend: boolean | null;
  canWorkOvernight: boolean | null;
  startingTimeframe: number | '';
  canMakeWorkSchedule: boolean | null;
  canMakeLocalCommute: boolean | null;
  canRelocate: boolean | null;
  // 5 background
  currentEmployerName: string;
  currentEmployerStartPosition: string;
  currentEmployerEndPosition: string;
  currentEmployerStartDate: string;
  currentEmployerEndDate: string;
  previousEmployerName: string;
  previousEmployerStartPosition: string;
  previousEmployerEndPosition: string;
  previousEmployerStartDate: string;
  previousEmployerEndDate: string;
  longestEmployment: number | '';
  hasValidDriversLicense: boolean | null;
  driver: boolean | null;
  hasReliableTransportation: boolean | null;
  hasMilitaryService: boolean | null;
  referralSource: number | '';
  // 6 review
  certify: boolean;
};

const EMPTY: Data = {
  yearsOld: null,
  eligibleForUsEmployment: null,
  canUndergoBackgroundChecks: null,
  ableToPerformRole: null,
  firstName: '',
  middleName: '',
  lastName: '',
  preferredFirstName: '',
  email: '',
  phone: '',
  street1: '',
  street2: '',
  city: '',
  state: '',
  zip: '',
  textAuthorization: false,
  requisitionNumber: '',
  positionId: '',
  positionOther: '',
  marketId: '',
  officeId: '',
  experience: '',
  relevantExperienceNotes: '',
  askingPay: '',
  education: '',
  employmentType: '',
  shiftLength: '',
  worksMonday: true,
  worksTuesday: true,
  worksWednesday: true,
  worksThursday: true,
  worksFriday: true,
  worksSaturday: false,
  worksSunday: false,
  travelAvailability: '',
  canWorkOvertime: null,
  canWorkWeekend: null,
  canWorkOvernight: null,
  startingTimeframe: '',
  canMakeWorkSchedule: null,
  canMakeLocalCommute: null,
  canRelocate: null,
  currentEmployerName: '',
  currentEmployerStartPosition: '',
  currentEmployerEndPosition: '',
  currentEmployerStartDate: '',
  currentEmployerEndDate: '',
  previousEmployerName: '',
  previousEmployerStartPosition: '',
  previousEmployerEndPosition: '',
  previousEmployerStartDate: '',
  previousEmployerEndDate: '',
  longestEmployment: '',
  hasValidDriversLicense: null,
  driver: null,
  hasReliableTransportation: null,
  hasMilitaryService: null,
  referralSource: '',
  certify: false,
};

const STEPS = ['Eligibility', 'About you', 'Role', 'Availability', 'History', 'Review'] as const;
const STORAGE_KEY = 'usts:application:v1';

type Errors = Partial<Record<keyof Data | 'resume', string>>;

/* -------------------------------------------------------------- validation */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const digits = (s: string) => s.replace(/\D/g, '');

function validateStep(step: number, d: Data, optionsFailed: boolean): Errors {
  const e: Errors = {};
  const req = (k: keyof Data, msg = 'This is required.') => {
    const v = d[k];
    if (v === null || v === '' || v === undefined) e[k] = msg;
  };

  if (step === 0) {
    (['yearsOld', 'eligibleForUsEmployment', 'canUndergoBackgroundChecks', 'ableToPerformRole'] as const).forEach(
      (k) => req(k, 'Please answer this question.')
    );
  }

  if (step === 1) {
    req('firstName');
    req('lastName');
    if (!d.email.trim()) e.email = 'This is required.';
    else if (!EMAIL_RE.test(d.email.trim())) e.email = 'Enter a valid email address.';
    if (!d.phone.trim()) e.phone = 'This is required.';
    else if (digits(d.phone).length < 10) e.phone = 'Enter a 10-digit phone number.';
    req('street1');
    req('city');
    req('state');
    if (!d.zip.trim()) e.zip = 'This is required.';
    else if (!/^\d{5}(-\d{4})?$/.test(d.zip.trim())) e.zip = 'Enter a 5-digit ZIP code.';
  }

  if (step === 2) {
    if (optionsFailed) {
      if (!d.positionOther.trim()) e.positionOther = 'Tell us which role you want.';
    } else {
      req('positionId', 'Choose the role you are applying for.');
      req('marketId', 'Choose a market.');
    }
    req('experience', 'Choose your experience level.');
    req('education', 'Choose your highest level of education.');
    if (!d.askingPay.trim()) e.askingPay = 'Give us a number or a range — it saves everyone time.';
  }

  if (step === 3) {
    req('employmentType');
    req('travelAvailability');
    req('startingTimeframe');
    (['canWorkOvertime', 'canWorkWeekend', 'canWorkOvernight', 'canMakeWorkSchedule', 'canMakeLocalCommute', 'canRelocate'] as const).forEach(
      (k) => req(k, 'Please answer this question.')
    );
    const anyDay = DAYS.some((day) => d[day.key]);
    if (!anyDay) e.worksMonday = 'Pick at least one day you can work.';
  }

  if (step === 4) {
    req('longestEmployment');
    req('referralSource', 'Let us know how you heard about us.');
    (['hasValidDriversLicense', 'driver', 'hasReliableTransportation'] as const).forEach((k) =>
      req(k, 'Please answer this question.')
    );
  }

  if (step === 5) {
    if (!d.certify) e.certify = 'Please confirm before submitting.';
  }

  return e;
}

/* ------------------------------------------------------------------- form */

export default function ApplyForm() {
  const [step, setStep] = useState(0);
  const [data, setData] = useState<Data>(EMPTY);
  const [errors, setErrors] = useState<Errors>({});
  const [options, setOptions] = useState<Options | null>(null);
  const [optionsFailed, setOptionsFailed] = useState(false);
  const [resume, setResume] = useState<File | null>(null);
  const [status, setStatus] = useState<'idle' | 'sending' | 'done' | 'error'>('idle');
  const [serverError, setServerError] = useState('');
  const [restored, setRestored] = useState(false);

  const startedAt = useRef(Date.now());
  const headingRef = useRef<HTMLHeadingElement>(null);
  const errorSummaryRef = useRef<HTMLDivElement>(null);
  const honeypot = useRef<HTMLInputElement>(null);

  const set = useCallback(<K extends keyof Data>(k: K, v: Data[K]) => {
    setData((d) => ({ ...d, [k]: v }));
    setErrors((e) => (e[k] ? { ...e, [k]: undefined } : e));
  }, []);

  /* -------- restore a part-finished application, and the ?req= deep link */
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') {
          setData((d) => ({ ...d, ...parsed.data }));
          if (typeof parsed.step === 'number') setStep(Math.min(parsed.step, STEPS.length - 1));
          setRestored(true);
        }
      }
    } catch {
      /* a corrupt draft should never block an application */
    }
    const req = new URLSearchParams(location.search).get('req');
    if (req) setData((d) => ({ ...d, requisitionNumber: req }));
  }, []);

  /* -------- persist (never the resume — a File cannot be serialized anyway) */
  useEffect(() => {
    if (status === 'done') return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ step, data }));
    } catch {
      /* private browsing / quota — not worth surfacing */
    }
  }, [step, data, status]);

  /* -------- reference data */
  useEffect(() => {
    fetch('/api/options')
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((d: Options) => setOptions(d))
      .catch(() => setOptionsFailed(true));
  }, []);

  /* -------- when a requisition is deep-linked, preselect role + market */
  useEffect(() => {
    if (!options || !data.requisitionNumber) return;
    const op = options.openings.find((o) => o.requisitionNumber === data.requisitionNumber);
    if (!op) return;
    setData((d) => ({
      ...d,
      positionId: d.positionId || options.positions.find((p) => p.name === op.position)?.id || '',
      marketId: d.marketId || options.markets.find((m) => m.name === op.market)?.id || '',
    }));
  }, [options, data.requisitionNumber]);

  const linkedOpening = useMemo(
    () => options?.openings.find((o) => o.requisitionNumber === data.requisitionNumber) ?? null,
    [options, data.requisitionNumber]
  );

  const errorList = useMemo(
    () => Object.entries(errors).filter(([, v]) => Boolean(v)) as [string, string][],
    [errors]
  );

  function goTo(next: number) {
    setStep(next);
    setErrors({});
    requestAnimationFrame(() => {
      headingRef.current?.focus();
      window.scrollTo({ top: (document.getElementById('apply-top')?.offsetTop ?? 0) - 90, behavior: 'smooth' });
    });
  }

  function next() {
    const e = validateStep(step, data, optionsFailed);
    if (Object.keys(e).length) {
      setErrors(e);
      requestAnimationFrame(() => errorSummaryRef.current?.focus());
      return;
    }
    goTo(Math.min(step + 1, STEPS.length - 1));
  }

  function back() {
    goTo(Math.max(step - 1, 0));
  }

  function onResume(file: File | null) {
    setErrors((e) => ({ ...e, resume: undefined }));
    if (!file) return setResume(null);
    if (file.size > RESUME_MAX_BYTES) {
      setErrors((e) => ({ ...e, resume: 'That file is over 5 MB. Please attach a smaller one.' }));
      return;
    }
    const ok = RESUME_TYPES.some((t) => file.name.toLowerCase().endsWith(t));
    if (!ok) {
      setErrors((e) => ({ ...e, resume: `Accepted file types: ${RESUME_TYPES.join(', ')}` }));
      return;
    }
    setResume(file);
  }

  async function submit(ev: React.FormEvent) {
    ev.preventDefault();
    const e = validateStep(5, data, optionsFailed);
    if (Object.keys(e).length) {
      setErrors(e);
      requestAnimationFrame(() => errorSummaryRef.current?.focus());
      return;
    }

    setStatus('sending');
    setServerError('');

    let resumePayload: { name: string; contentBase64: string } | undefined;
    if (resume) {
      const buf = await resume.arrayBuffer();
      let bin = '';
      const bytes = new Uint8Array(buf);
      for (let i = 0; i < bytes.length; i += 0x8000) {
        bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
      }
      resumePayload = { name: resume.name, contentBase64: btoa(bin) };
    }

    try {
      const res = await fetch('/api/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          resume: resumePayload,
          // anti-spam: a field no human sees, and how long the form was open
          website: honeypot.current?.value ?? '',
          elapsedMs: Date.now() - startedAt.current,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message || `Submission failed (${res.status}).`);
      }

      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch {
        /* ignore */
      }
      setStatus('done');
      requestAnimationFrame(() => headingRef.current?.focus());
    } catch (err) {
      setStatus('error');
      setServerError(err instanceof Error ? err.message : 'Something went wrong.');
      requestAnimationFrame(() => errorSummaryRef.current?.focus());
    }
  }

  /* --------------------------------------------------------------- success */
  if (status === 'done') {
    return (
      <div className="card p-8 sm:p-12" id="apply-top">
        <div
          className="flex h-14 w-14 items-center justify-center rounded-full"
          style={{ background: 'color-mix(in srgb, var(--accent) 12%, transparent)' }}
        >
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M5 12.5 10 17.5 19 7" stroke="var(--accent)" strokeWidth="2.25" strokeLinecap="square" />
          </svg>
        </div>
        <h2 ref={headingRef} tabIndex={-1} className="mt-6 font-display text-3xl outline-none sm:text-4xl">
          Application received.
        </h2>
        <p className="mt-4 max-w-xl text-lg leading-relaxed text-[var(--text-body)]">
          Thanks, {data.preferredFirstName || data.firstName}. It is in front of our recruiting team now. If
          your experience lines up with what we need, someone will call you at {data.phone} — usually within a
          few business days.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <a href="/careers" className="btn btn-outline">
            Back to careers
          </a>
          <a href="/" className="btn btn-secondary">
            Go to homepage
          </a>
        </div>
      </div>
    );
  }

  /* ----------------------------------------------------------------- steps */
  return (
    <form onSubmit={submit} noValidate id="apply-top">
      {/* progress */}
      <ol className="flex flex-wrap gap-x-1 gap-y-2" aria-label="Application progress">
        {STEPS.map((s, i) => (
          <li key={s} className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => i < step && goTo(i)}
              disabled={i > step}
              aria-current={i === step ? 'step' : undefined}
              className="usts-step"
              data-state={i === step ? 'current' : i < step ? 'done' : 'todo'}
            >
              <span className="usts-step-num">{i < step ? '✓' : i + 1}</span>
              <span className="hidden sm:inline">{s}</span>
              <span className="sr-only sm:hidden">{s}</span>
            </button>
          </li>
        ))}
      </ol>

      <div className="mt-8 h-1 w-full overflow-hidden rounded-full" style={{ background: 'var(--line)' }}>
        <div
          className="h-full transition-all duration-500"
          style={{ background: 'var(--accent)', width: `${((step + 1) / STEPS.length) * 100}%` }}
          role="progressbar"
          aria-valuenow={step + 1}
          aria-valuemin={1}
          aria-valuemax={STEPS.length}
          aria-label={`Step ${step + 1} of ${STEPS.length}`}
        />
      </div>

      {restored && step === 0 && (
        <p className="mt-6 rounded-sm border p-4 text-sm" style={{ borderColor: 'var(--line)', color: 'var(--text-muted)' }}>
          We picked up where you left off. Your answers are saved on this device only.
        </p>
      )}

      {/* error summary */}
      <div ref={errorSummaryRef} tabIndex={-1} className="outline-none">
        {(errorList.length > 0 || serverError) && (
          <div
            role="alert"
            className="mt-6 rounded-sm border p-5"
            style={{ borderColor: 'var(--accent)', background: 'color-mix(in srgb, var(--accent) 6%, transparent)' }}
          >
            <p className="font-display font-semibold" style={{ color: 'var(--accent)' }}>
              {serverError ? 'We could not submit your application.' : 'Please check the highlighted fields.'}
            </p>
            {serverError && <p className="mt-2 text-[0.9375rem] text-[var(--text-body)]">{serverError}</p>}
            {!serverError && errorList.length > 0 && (
              <ul className="mt-2 list-disc space-y-1 pl-5 text-[0.9375rem] text-[var(--text-body)]">
                {errorList.map(([k, v]) => (
                  <li key={k}>{v}</li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      <h2 ref={headingRef} tabIndex={-1} className="mt-10 font-display text-3xl outline-none">
        {STEPS[step]}
      </h2>

      <div className="mt-8 space-y-8">
        {/* ------------------------------------------------------- 1 eligibility */}
        {step === 0 && (
          <>
            <p className="text-lg leading-relaxed text-[var(--text-body)]">
              Four quick questions before we start. Everything here is required by law or by the nature of the
              work.
            </p>
            <YesNo
              id="yearsOld"
              label="Are you at least 18 years of age?"
              value={data.yearsOld}
              onChange={(v) => set('yearsOld', v)}
              error={errors.yearsOld}
            />
            <YesNo
              id="eligibleForUsEmployment"
              label="Are you legally permitted to work in the United States?"
              value={data.eligibleForUsEmployment}
              onChange={(v) => set('eligibleForUsEmployment', v)}
              error={errors.eligibleForUsEmployment}
            />
            <YesNo
              id="canUndergoBackgroundChecks"
              label="Are you willing to undergo pre-employment driving, criminal and drug checks?"
              hint="These happen after a conditional offer, not now."
              value={data.canUndergoBackgroundChecks}
              onChange={(v) => set('canUndergoBackgroundChecks', v)}
              error={errors.canUndergoBackgroundChecks}
            />
            <YesNo
              id="ableToPerformRole"
              label="Can you perform the essential functions of the role, with or without reasonable accommodation?"
              hint="Tower work involves climbing, lifting and working at height in varying weather."
              value={data.ableToPerformRole}
              onChange={(v) => set('ableToPerformRole', v)}
              error={errors.ableToPerformRole}
            />
          </>
        )}

        {/* ----------------------------------------------------------- 2 contact */}
        {step === 1 && (
          <>
            <div className="grid gap-6 sm:grid-cols-2">
              <TextField id="firstName" label="First name" required value={data.firstName} onChange={(v) => set('firstName', v)} error={errors.firstName} autoComplete="given-name" />
              <TextField id="lastName" label="Last name" required value={data.lastName} onChange={(v) => set('lastName', v)} error={errors.lastName} autoComplete="family-name" />
              <TextField id="middleName" label="Middle name" value={data.middleName} onChange={(v) => set('middleName', v)} autoComplete="additional-name" />
              <TextField id="preferredFirstName" label="Preferred first name" hint="What we should actually call you." value={data.preferredFirstName} onChange={(v) => set('preferredFirstName', v)} />
              <TextField id="email" label="Email" required type="email" inputMode="email" value={data.email} onChange={(v) => set('email', v)} error={errors.email} autoComplete="email" />
              <TextField id="phone" label="Mobile phone" required type="tel" inputMode="tel" value={data.phone} onChange={(v) => set('phone', v)} error={errors.phone} autoComplete="tel" placeholder="(555) 555-5555" />
            </div>

            <div className="grid gap-6 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <TextField id="street1" label="Street address" required value={data.street1} onChange={(v) => set('street1', v)} error={errors.street1} autoComplete="address-line1" />
              </div>
              <div className="sm:col-span-2">
                <TextField id="street2" label="Apartment, suite, unit" value={data.street2} onChange={(v) => set('street2', v)} autoComplete="address-line2" />
              </div>
              <TextField id="city" label="City" required value={data.city} onChange={(v) => set('city', v)} error={errors.city} autoComplete="address-level2" />
              <div className="grid grid-cols-2 gap-6">
                <SelectField id="state" label="State" required value={data.state} onChange={(v) => set('state', v)} error={errors.state} options={US_STATES.map((s) => ({ value: s, label: s }))} placeholder="—" />
                <TextField id="zip" label="ZIP code" required inputMode="numeric" maxLength={10} value={data.zip} onChange={(v) => set('zip', v)} error={errors.zip} autoComplete="postal-code" />
              </div>
            </div>

            <CheckboxField
              id="textAuthorization"
              checked={data.textAuthorization}
              onChange={(v) => set('textAuthorization', v)}
              label={
                <>
                  I agree that US Telecom Services may send me automated text messages about my application.
                  Message and data rates may apply, and I can opt out at any time by replying STOP.
                </>
              }
            />
          </>
        )}

        {/* -------------------------------------------------------------- 3 role */}
        {step === 2 && (
          <>
            {linkedOpening && (
              <div className="rounded-sm border p-5" style={{ borderColor: 'var(--line)', background: 'var(--surface-sunken)' }}>
                <p className="font-display text-xs font-semibold tracking-[0.14em] uppercase" style={{ color: 'var(--accent)' }}>
                  Applying for requisition {linkedOpening.requisitionNumber}
                </p>
                <p className="mt-1.5 font-display text-lg">{linkedOpening.position}</p>
                <p className="text-sm text-[var(--text-muted)]">
                  {linkedOpening.city}, {linkedOpening.state}
                </p>
              </div>
            )}

            {optionsFailed ? (
              <TextField
                id="positionOther"
                label="Which role are you applying for?"
                required
                hint="Our live role list did not load, so type the job title you want."
                value={data.positionOther}
                onChange={(v) => set('positionOther', v)}
                error={errors.positionOther}
              />
            ) : (
              <div className="grid gap-6 sm:grid-cols-2">
                <SelectField
                  id="positionId"
                  label="Role you are applying for"
                  required
                  value={data.positionId}
                  onChange={(v) => set('positionId', v)}
                  error={errors.positionId}
                  options={(options?.positions ?? []).map((p) => ({ value: p.id, label: p.name }))}
                  placeholder={options ? 'Select a role…' : 'Loading roles…'}
                />
                <SelectField
                  id="marketId"
                  label="Market you want to work in"
                  required
                  value={data.marketId}
                  onChange={(v) => set('marketId', v)}
                  error={errors.marketId}
                  options={(options?.markets ?? []).map((m) => ({ value: m.id, label: m.name }))}
                  placeholder={options ? 'Select a market…' : 'Loading markets…'}
                />
                <div className="sm:col-span-2">
                  <SelectField
                    id="officeId"
                    label="Nearest office"
                    hint="Optional — helps us route your application to the right recruiter."
                    value={data.officeId}
                    onChange={(v) => set('officeId', v)}
                    options={(options?.offices ?? []).map((o) => ({ value: o.id, label: o.name }))}
                    placeholder="No preference"
                  />
                </div>
              </div>
            )}

            <RadioCards
              id="experience"
              label="How much experience do you have in this kind of work?"
              value={data.experience}
              onChange={(v) => set('experience', v)}
              options={EXPERIENCE}
              error={errors.experience}
            />

            <TextArea
              id="relevantExperienceNotes"
              label="Tell us about that experience"
              hint="Certifications, the kind of sites you have worked, equipment you know. A few lines is plenty."
              value={data.relevantExperienceNotes}
              onChange={(v) => set('relevantExperienceNotes', v)}
            />

            <div className="grid gap-6 sm:grid-cols-2">
              <TextField
                id="askingPay"
                label="Desired pay"
                required
                hint="Hourly or annual, a number or a range."
                placeholder="e.g. $28–32/hr"
                value={data.askingPay}
                onChange={(v) => set('askingPay', v)}
                error={errors.askingPay}
              />
              <SelectField
                id="education"
                label="Highest level of education"
                required
                value={data.education}
                onChange={(v) => set('education', v)}
                error={errors.education}
                options={EDUCATION}
              />
            </div>
          </>
        )}

        {/* ------------------------------------------------------ 4 availability */}
        {step === 3 && (
          <>
            <div className="grid gap-8 sm:grid-cols-2">
              <RadioCards id="employmentType" label="Employment type" value={data.employmentType} onChange={(v) => set('employmentType', v)} options={EMPLOYMENT_TYPE} error={errors.employmentType} />
              <RadioCards id="shiftLength" label="Preferred shift length" required={false} value={data.shiftLength} onChange={(v) => set('shiftLength', v)} options={SHIFT_LENGTH} />
            </div>

            <fieldset aria-describedby={errors.worksMonday ? 'days-error' : undefined}>
              <legend className="font-display text-[0.9375rem] font-semibold text-[var(--text-strong)]">
                Which days can you work?
                <span className="text-[var(--accent)]" aria-hidden="true"> *</span>
              </legend>
              <div className="mt-2.5 flex flex-wrap gap-2.5">
                {DAYS.map((d) => (
                  <label key={d.key} className="usts-choice" data-checked={data[d.key] ? 'true' : undefined}>
                    <input type="checkbox" checked={data[d.key]} onChange={(e) => set(d.key, e.target.checked)} className="sr-only" />
                    {d.label}
                  </label>
                ))}
              </div>
              <ErrorText id="days-error">{errors.worksMonday}</ErrorText>
            </fieldset>

            <SelectField id="travelAvailability" label="How long can you travel for at a time?" required value={data.travelAvailability} onChange={(v) => set('travelAvailability', v)} options={TRAVEL} error={errors.travelAvailability} />

            <div className="grid gap-8 sm:grid-cols-2">
              <YesNo id="canWorkOvertime" label="Are you available for overtime?" value={data.canWorkOvertime} onChange={(v) => set('canWorkOvertime', v)} error={errors.canWorkOvertime} />
              <YesNo id="canWorkWeekend" label="Are you available on weekends?" value={data.canWorkWeekend} onChange={(v) => set('canWorkWeekend', v)} error={errors.canWorkWeekend} />
              <YesNo id="canWorkOvernight" label="Can you work overnight shifts?" value={data.canWorkOvernight} onChange={(v) => set('canWorkOvernight', v)} error={errors.canWorkOvernight} />
              <YesNo id="canMakeWorkSchedule" label="Can you commit to a set weekly schedule?" value={data.canMakeWorkSchedule} onChange={(v) => set('canMakeWorkSchedule', v)} error={errors.canMakeWorkSchedule} />
              <YesNo id="canMakeLocalCommute" label="Can you reliably commute to the market you selected?" value={data.canMakeLocalCommute} onChange={(v) => set('canMakeLocalCommute', v)} error={errors.canMakeLocalCommute} />
              <YesNo id="canRelocate" label="Would you be willing to relocate?" value={data.canRelocate} onChange={(v) => set('canRelocate', v)} error={errors.canRelocate} />
            </div>

            <SelectField id="startingTimeframe" label="When could you start?" required value={data.startingTimeframe} onChange={(v) => set('startingTimeframe', v)} options={START_TIMEFRAME} error={errors.startingTimeframe} />
          </>
        )}

        {/* -------------------------------------------------------- 5 background */}
        {step === 4 && (
          <>
            <fieldset>
              <legend className="font-display text-lg font-semibold text-[var(--text-strong)]">
                Current or most recent employer
              </legend>
              <div className="mt-5 grid gap-6 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <TextField id="currentEmployerName" label="Employer" value={data.currentEmployerName} onChange={(v) => set('currentEmployerName', v)} autoComplete="organization" />
                </div>
                <TextField id="currentEmployerStartPosition" label="Starting position" value={data.currentEmployerStartPosition} onChange={(v) => set('currentEmployerStartPosition', v)} />
                <TextField id="currentEmployerEndPosition" label="Ending position" value={data.currentEmployerEndPosition} onChange={(v) => set('currentEmployerEndPosition', v)} />
                <TextField id="currentEmployerStartDate" label="Start date" type="month" value={data.currentEmployerStartDate} onChange={(v) => set('currentEmployerStartDate', v)} />
                <TextField id="currentEmployerEndDate" label="End date" hint="Leave blank if you still work there." type="month" value={data.currentEmployerEndDate} onChange={(v) => set('currentEmployerEndDate', v)} />
              </div>
            </fieldset>

            <fieldset>
              <legend className="font-display text-lg font-semibold text-[var(--text-strong)]">Previous employer</legend>
              <div className="mt-5 grid gap-6 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <TextField id="previousEmployerName" label="Employer" value={data.previousEmployerName} onChange={(v) => set('previousEmployerName', v)} />
                </div>
                <TextField id="previousEmployerStartPosition" label="Starting position" value={data.previousEmployerStartPosition} onChange={(v) => set('previousEmployerStartPosition', v)} />
                <TextField id="previousEmployerEndPosition" label="Ending position" value={data.previousEmployerEndPosition} onChange={(v) => set('previousEmployerEndPosition', v)} />
                <TextField id="previousEmployerStartDate" label="Start date" type="month" value={data.previousEmployerStartDate} onChange={(v) => set('previousEmployerStartDate', v)} />
                <TextField id="previousEmployerEndDate" label="End date" type="month" value={data.previousEmployerEndDate} onChange={(v) => set('previousEmployerEndDate', v)} />
              </div>
            </fieldset>

            <SelectField id="longestEmployment" label="How long was your longest period with one employer?" required value={data.longestEmployment} onChange={(v) => set('longestEmployment', v)} options={LONGEST_EMPLOYMENT} error={errors.longestEmployment} />

            <div className="grid gap-8 sm:grid-cols-2">
              <YesNo id="hasValidDriversLicense" label="Do you hold a valid driver’s license?" value={data.hasValidDriversLicense} onChange={(v) => set('hasValidDriversLicense', v)} error={errors.hasValidDriversLicense} />
              <YesNo id="driver" label="Are you willing to drive a company vehicle?" value={data.driver} onChange={(v) => set('driver', v)} error={errors.driver} />
              <YesNo id="hasReliableTransportation" label="Do you have reliable transportation to work?" value={data.hasReliableTransportation} onChange={(v) => set('hasReliableTransportation', v)} error={errors.hasReliableTransportation} />
              <YesNo id="hasMilitaryService" label="Have you served in the U.S. armed forces?" hint="Optional — answering helps us support veterans, and never counts against you." required={false} value={data.hasMilitaryService} onChange={(v) => set('hasMilitaryService', v)} />
            </div>

            <SelectField id="referralSource" label="How did you hear about us?" required value={data.referralSource} onChange={(v) => set('referralSource', v)} options={REFERRAL} error={errors.referralSource} />
          </>
        )}

        {/* ------------------------------------------------------------ 6 review */}
        {step === 5 && (
          <>
            <div>
              <label htmlFor="resume" className="font-display text-[0.9375rem] font-semibold text-[var(--text-strong)]">
                Attach a resume
              </label>
              <p className="mt-1 text-sm text-[var(--text-muted)]">
                Optional, but it helps. {RESUME_TYPES.join(', ')} — up to 5 MB.
              </p>
              <input
                id="resume"
                name="resume"
                type="file"
                accept={RESUME_TYPES.join(',')}
                onChange={(e) => onResume(e.target.files?.[0] ?? null)}
                className="usts-file mt-3"
                aria-describedby={errors.resume ? 'resume-error' : undefined}
              />
              {resume && (
                <p className="mt-2 text-sm text-[var(--text-body)]">
                  Attached: <strong>{resume.name}</strong> ({Math.round(resume.size / 1024)} KB)
                </p>
              )}
              <ErrorText id="resume-error">{errors.resume}</ErrorText>
            </div>

            <div className="rounded-sm border" style={{ borderColor: 'var(--line)' }}>
              <h3 className="border-b px-6 py-4 font-display text-lg" style={{ borderColor: 'var(--line)' }}>
                Check your details
              </h3>
              <dl className="divide-y" style={{ borderColor: 'var(--line)' }}>
                {[
                  ['Name', [data.firstName, data.middleName, data.lastName].filter(Boolean).join(' ')],
                  ['Email', data.email],
                  ['Phone', data.phone],
                  ['Address', [data.street1, data.street2, `${data.city}, ${data.state} ${data.zip}`].filter(Boolean).join(', ')],
                  ['Role', optionsFailed ? data.positionOther : options?.positions.find((p) => p.id === data.positionId)?.name ?? '—'],
                  ['Market', options?.markets.find((m) => m.id === data.marketId)?.name ?? '—'],
                  ['Experience', EXPERIENCE.find((o) => o.value === data.experience)?.label ?? '—'],
                  ['Desired pay', data.askingPay],
                  ['Available from', START_TIMEFRAME.find((o) => o.value === data.startingTimeframe)?.label ?? '—'],
                ].map(([k, v]) => (
                  <div key={k} className="grid grid-cols-1 gap-1 px-6 py-3.5 sm:grid-cols-[10rem_1fr]" style={{ borderColor: 'var(--line)' }}>
                    <dt className="text-sm font-medium text-[var(--text-muted)]">{k}</dt>
                    <dd className="text-[0.9375rem] text-[var(--text-strong)]">{v || '—'}</dd>
                  </div>
                ))}
              </dl>
              <div className="border-t px-6 py-4" style={{ borderColor: 'var(--line)' }}>
                <button type="button" onClick={() => goTo(1)} className="font-display text-sm font-semibold" style={{ color: 'var(--accent)' }}>
                  Edit your answers
                </button>
              </div>
            </div>

            <CheckboxField
              id="certify"
              checked={data.certify}
              onChange={(v) => set('certify', v)}
              error={errors.certify}
              label={
                <>
                  I certify that the information I have given is true and complete to the best of my
                  knowledge, and I have read the{' '}
                  <a href="/privacy" target="_blank" rel="noopener" style={{ color: 'var(--accent)', textDecoration: 'underline' }}>
                    privacy notice
                  </a>
                  .
                </>
              }
            />
          </>
        )}
      </div>

      {/* honeypot — off-screen, never announced, never focusable */}
      <div aria-hidden="true" className="absolute h-px w-px overflow-hidden opacity-0" style={{ left: '-9999px' }}>
        <label htmlFor="website">Leave this field blank</label>
        <input id="website" name="website" type="text" ref={honeypot} tabIndex={-1} autoComplete="off" />
      </div>

      {/* nav */}
      <div className="mt-12 flex flex-col-reverse gap-3 border-t pt-8 sm:flex-row sm:items-center sm:justify-between" style={{ borderColor: 'var(--line)' }}>
        <div>
          {step > 0 && (
            <button type="button" onClick={back} className="btn btn-outline w-full sm:w-auto">
              Back
            </button>
          )}
        </div>
        {step < STEPS.length - 1 ? (
          <button type="button" onClick={next} className="btn btn-primary w-full sm:w-auto">
            Continue
          </button>
        ) : (
          <button type="submit" disabled={status === 'sending'} className="btn btn-primary w-full sm:w-auto disabled:opacity-60">
            {status === 'sending' ? 'Submitting…' : 'Submit application'}
          </button>
        )}
      </div>

      <p className="mt-6 text-sm text-[var(--text-muted)]">
        Your answers save automatically on this device, so you can close this and come back.
      </p>
    </form>
  );
}
