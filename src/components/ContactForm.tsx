import { useRef, useState } from 'react';
import { TextField, TextArea, SelectField, ErrorText } from './apply/fields';

const TOPICS = [
  { value: 'quote', label: 'Request a quote' },
  { value: 'scope', label: 'Scope a program' },
  { value: 'maintenance', label: 'Maintenance or emergency response' },
  { value: 'employment-verification', label: 'Employment verification' },
  { value: 'invoice', label: 'Billing or invoice' },
  { value: 'other', label: 'Something else' },
];

type Errors = Partial<Record<'name' | 'email' | 'phone' | 'company' | 'topic' | 'message', string>>;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export default function ContactForm() {
  const [name, setName] = useState('');
  const [company, setCompany] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [topic, setTopic] = useState('');
  const [message, setMessage] = useState('');
  const [errors, setErrors] = useState<Errors>({});
  const [status, setStatus] = useState<'idle' | 'sending' | 'done' | 'error'>('idle');
  const [serverError, setServerError] = useState('');

  const startedAt = useRef(Date.now());
  const honeypot = useRef<HTMLInputElement>(null);
  const alertRef = useRef<HTMLDivElement>(null);
  const doneRef = useRef<HTMLHeadingElement>(null);

  function validate(): Errors {
    const e: Errors = {};
    if (!name.trim()) e.name = 'Please tell us your name.';
    if (!email.trim()) e.email = 'We need an email to reply to.';
    else if (!EMAIL_RE.test(email.trim())) e.email = 'Enter a valid email address.';
    if (!topic) e.topic = 'Pick the closest match.';
    if (!message.trim()) e.message = 'Tell us a little about what you need.';
    else if (message.trim().length < 15) e.message = 'A sentence or two helps us route this properly.';
    return e;
  }

  async function submit(ev: React.FormEvent) {
    ev.preventDefault();
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length) {
      requestAnimationFrame(() => alertRef.current?.focus());
      return;
    }

    setStatus('sending');
    setServerError('');
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          company,
          email,
          phone,
          topic,
          message,
          website: honeypot.current?.value ?? '',
          elapsedMs: Date.now() - startedAt.current,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message || `Could not send your message (${res.status}).`);
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
          Message sent.
        </h2>
        <p className="mt-3 max-w-lg leading-relaxed text-[var(--text-body)]">
          Thanks, {name.split(' ')[0]}. We have it, and someone will get back to you at {email}. If it is
          urgent, call us on 636-497-2898.
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
              {serverError ? 'We could not send your message.' : 'Please check the highlighted fields.'}
            </p>
            {serverError && (
              <p className="mt-2 text-[0.9375rem] text-[var(--text-body)]">
                {serverError} You can also email us directly at{' '}
                <a href="mailto:info@usts1.com" style={{ color: 'var(--accent)', textDecoration: 'underline' }}>
                  info@usts1.com
                </a>
                .
              </p>
            )}
          </div>
        )}
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <TextField id="name" label="Your name" required value={name} onChange={setName} error={errors.name} autoComplete="name" />
        <TextField id="company" label="Company" value={company} onChange={setCompany} autoComplete="organization" />
        <TextField id="email" label="Email" required type="email" inputMode="email" value={email} onChange={setEmail} error={errors.email} autoComplete="email" />
        <TextField id="phone" label="Phone" type="tel" inputMode="tel" value={phone} onChange={setPhone} autoComplete="tel" />
      </div>

      <div className="mt-6">
        <SelectField
          id="topic"
          label="What is this about?"
          required
          value={topic}
          onChange={setTopic}
          options={TOPICS}
          error={errors.topic}
        />
      </div>

      <div className="mt-6">
        <TextArea
          id="message"
          label="Message"
          required
          rows={6}
          hint="Site counts, markets, timelines — whatever you have. Detail helps us give you a real answer instead of a callback request."
          value={message}
          onChange={setMessage}
          error={errors.message}
        />
      </div>

      <div aria-hidden="true" className="absolute h-px w-px overflow-hidden opacity-0" style={{ left: '-9999px' }}>
        <label htmlFor="contact-website">Leave this field blank</label>
        <input id="contact-website" name="website" type="text" ref={honeypot} tabIndex={-1} autoComplete="off" />
      </div>

      <button type="submit" disabled={status === 'sending'} className="btn btn-primary mt-8 w-full disabled:opacity-60 sm:w-auto">
        {status === 'sending' ? 'Sending…' : 'Send message'}
      </button>

      <p className="mt-5 text-sm text-[var(--text-muted)]">
        We use what you send here only to reply to you. See our{' '}
        <a href="/privacy" style={{ color: 'var(--accent)', textDecoration: 'underline' }}>
          privacy notice
        </a>
        .
      </p>
    </form>
  );
}
