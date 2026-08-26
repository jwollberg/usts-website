import { useRef, useState } from 'react';
import { TextField, ErrorText } from './apply/fields';

/**
 * Subcontractor onboarding. Replaces the Power Pages form at
 * ustsportal.powerappsportals.com/contractors.
 *
 * The old form had one unlabelled "attach a quote, W9 and COI" box, so what
 * arrived was a pile of files nobody could tell apart. Here each document has
 * its own slot, which is also what lets us name the note in Dataverse.
 */

const SLOTS = [
  {
    key: 'Quote',
    label: 'Quote for the work',
    hint: 'Your pricing for the job you have been asked to do.',
    required: true,
  },
  {
    key: 'W-9',
    label: 'Form W-9',
    hint: 'Current, signed. We cannot pay you without it.',
    required: true,
  },
  {
    key: 'COI',
    label: 'Certificate of insurance',
    hint: 'Naming US Tower Services, Inc. as certificate holder.',
    required: true,
  },
  {
    key: 'Other',
    label: 'Anything else',
    hint: 'Optional — licenses, safety documentation, a capability statement.',
    required: false,
  },
] as const;

const ACCEPT = '.pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.txt,.rtf';
const MAX_BYTES = 5 * 1024 * 1024;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

type Errors = Record<string, string | undefined>;

async function toBase64(file: File): Promise<string> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}

export default function ContractorForm() {
  const [companyName, setCompanyName] = useState('');
  const [submitterName, setSubmitterName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [sponsor, setSponsor] = useState('');
  const [files, setFiles] = useState<Record<string, File | null>>({});
  const [errors, setErrors] = useState<Errors>({});
  const [status, setStatus] = useState<'idle' | 'sending' | 'done' | 'error'>('idle');
  const [serverError, setServerError] = useState('');

  const startedAt = useRef(Date.now());
  const honeypot = useRef<HTMLInputElement>(null);
  const alertRef = useRef<HTMLDivElement>(null);
  const doneRef = useRef<HTMLHeadingElement>(null);

  function setFile(key: string, file: File | null) {
    setErrors((e) => ({ ...e, [key]: undefined }));
    if (file && file.size > MAX_BYTES) {
      setErrors((e) => ({ ...e, [key]: `That file is over 5 MB. Please attach a smaller one.` }));
      return;
    }
    setFiles((f) => ({ ...f, [key]: file }));
  }

  function validate(): Errors {
    const e: Errors = {};
    if (!companyName.trim()) e.companyName = 'Please give us your company name.';
    if (!submitterName.trim()) e.submitterName = 'Please give us your name.';
    if (!email.trim()) e.email = 'We need an email to reply to.';
    else if (!EMAIL_RE.test(email.trim())) e.email = 'Enter a valid email address.';
    if (!phone.trim()) e.phone = 'Please give us a phone number.';
    else if (phone.replace(/\D/g, '').length < 10) e.phone = 'Enter a 10-digit phone number.';
    if (!sponsor.trim()) e.sponsor = 'Tell us who at USTS asked you to do this work.';
    for (const s of SLOTS) if (s.required && !files[s.key]) e[s.key] = `Please attach your ${s.label.toLowerCase()}.`;
    return e;
  }

  async function submit(ev: React.FormEvent) {
    ev.preventDefault();
    const e = validate();
    setErrors(e);
    if (Object.values(e).some(Boolean)) {
      requestAnimationFrame(() => alertRef.current?.focus());
      return;
    }

    setStatus('sending');
    setServerError('');
    try {
      const payload = [];
      for (const s of SLOTS) {
        const f = files[s.key];
        if (f) payload.push({ name: f.name, kind: s.key, contentBase64: await toBase64(f) });
      }

      const res = await fetch('/api/contractor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName,
          submitterName,
          email,
          phone,
          sponsor,
          files: payload,
          website: honeypot.current?.value ?? '',
          elapsedMs: Date.now() - startedAt.current,
        }),
      });

      if (!res.ok) {
        const b = await res.json().catch(() => ({}));
        throw new Error(b.message || `Could not send your request (${res.status}).`);
      }
      setStatus('done');
      requestAnimationFrame(() => doneRef.current?.focus());
    } catch (err) {
      setStatus('error');
      setServerError(err instanceof Error ? err.message : 'Something went wrong.');
      requestAnimationFrame(() => alertRef.current?.focus());
    }
  }

  if (status === 'done') {
    return (
      <div className="card p-8 sm:p-10">
        <div
          className="flex h-14 w-14 items-center justify-center rounded-full"
          style={{ background: 'color-mix(in srgb, var(--accent) 12%, transparent)' }}
        >
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M5 12.5 10 17.5 19 7" stroke="var(--accent)" strokeWidth="2.25" strokeLinecap="square" />
          </svg>
        </div>
        <h2 ref={doneRef} tabIndex={-1} className="mt-6 font-display text-2xl outline-none sm:text-3xl">
          Request received.
        </h2>
        <p className="mt-3 max-w-lg leading-relaxed text-[var(--text-body)]">
          Thanks. Your paperwork is with our team, and {sponsor.split(' ')[0] || 'your USTS contact'} has what
          they need to get you set up. We'll email {email} if anything else is required.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} noValidate>
      <div ref={alertRef} tabIndex={-1} className="outline-none">
        {(Object.values(errors).some(Boolean) || serverError) && (
          <div
            role="alert"
            className="mb-8 rounded-sm border p-5"
            style={{ borderColor: 'var(--accent)', background: 'color-mix(in srgb, var(--accent) 6%, transparent)' }}
          >
            <p className="font-display font-semibold" style={{ color: 'var(--accent)' }}>
              {serverError ? 'We could not send your request.' : 'Please check the highlighted fields.'}
            </p>
            {serverError ? (
              <p className="mt-2 text-[0.9375rem] text-[var(--text-body)]">
                {serverError} You can also email the documents to{' '}
                <a href="mailto:info@ustelecomservices.com" style={{ color: 'var(--accent)', textDecoration: 'underline' }}>
                  info@ustelecomservices.com
                </a>
                .
              </p>
            ) : (
              <ul className="mt-2 list-disc space-y-1 pl-5 text-[0.9375rem] text-[var(--text-body)]">
                {Object.entries(errors)
                  .filter(([, v]) => v)
                  .map(([k, v]) => (
                    <li key={k}>{v}</li>
                  ))}
              </ul>
            )}
          </div>
        )}
      </div>

      <fieldset>
        <legend className="font-display text-lg font-semibold text-[var(--text-strong)]">Your company</legend>
        <div className="mt-5 grid gap-6 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <TextField id="companyName" label="Company name" required value={companyName} onChange={setCompanyName} error={errors.companyName} autoComplete="organization" />
          </div>
          <TextField id="submitterName" label="Your name" required value={submitterName} onChange={setSubmitterName} error={errors.submitterName} autoComplete="name" />
          <TextField id="sponsor" label="Who at USTS requested your services?" required hint="The name of the person who asked you to quote or do the work." value={sponsor} onChange={setSponsor} error={errors.sponsor} />
          <TextField id="email" label="Email" required type="email" inputMode="email" value={email} onChange={setEmail} error={errors.email} autoComplete="email" />
          <TextField id="phone" label="Phone" required type="tel" inputMode="tel" value={phone} onChange={setPhone} error={errors.phone} autoComplete="tel" />
        </div>
      </fieldset>

      <fieldset className="mt-10">
        <legend className="font-display text-lg font-semibold text-[var(--text-strong)]">Your documents</legend>
        <p className="mt-2 text-[0.9375rem] leading-relaxed text-[var(--text-muted)]">
          PDF, Word, Excel or an image. Up to 5 MB each.
        </p>

        <div className="mt-5 space-y-px" style={{ background: 'var(--line)' }}>
          {SLOTS.map((s) => (
            <div key={s.key} className="p-5" style={{ background: 'var(--surface)' }}>
              <label htmlFor={`file-${s.key}`} className="font-display text-[0.9375rem] font-semibold text-[var(--text-strong)]">
                {s.label}
                {s.required && (
                  <span className="text-[var(--accent)]" aria-hidden="true">
                    {' '}
                    *
                  </span>
                )}
              </label>
              <p className="mt-1 text-sm text-[var(--text-muted)]">{s.hint}</p>
              <input
                id={`file-${s.key}`}
                type="file"
                accept={ACCEPT}
                className="usts-file mt-3"
                aria-invalid={errors[s.key] ? true : undefined}
                aria-describedby={errors[s.key] ? `file-${s.key}-error` : undefined}
                onChange={(e) => setFile(s.key, e.target.files?.[0] ?? null)}
              />
              {files[s.key] && (
                <p className="mt-2 text-sm text-[var(--text-body)]">
                  Attached: <strong>{files[s.key]!.name}</strong> ({Math.round(files[s.key]!.size / 1024)} KB)
                </p>
              )}
              <ErrorText id={`file-${s.key}-error`}>{errors[s.key]}</ErrorText>
            </div>
          ))}
        </div>
      </fieldset>

      <div aria-hidden="true" className="absolute h-px w-px overflow-hidden opacity-0" style={{ left: '-9999px' }}>
        <label htmlFor="contractor-website">Leave this field blank</label>
        <input id="contractor-website" name="website" type="text" ref={honeypot} tabIndex={-1} autoComplete="off" />
      </div>

      <button type="submit" disabled={status === 'sending'} className="btn btn-primary mt-8 w-full disabled:opacity-60 sm:w-auto">
        {status === 'sending' ? 'Sending…' : 'Submit onboarding request'}
      </button>

      <p className="mt-5 text-sm text-[var(--text-muted)]">
        We use what you send here to set you up as an approved subcontractor. See our{' '}
        <a href="/privacy" style={{ color: 'var(--accent)', textDecoration: 'underline' }}>
          privacy notice
        </a>
        .
      </p>
    </form>
  );
}
