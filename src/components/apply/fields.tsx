import type { ReactNode } from 'react';
import type { Choice } from './options';

/* Shared field primitives. Every one wires label → control → error with real
   ids so screen readers announce the error with the field, and every invalid
   control gets aria-invalid + aria-describedby. */

let seq = 0;
export const uid = (p: string) => `${p}-${++seq}`;

export function Label({
  htmlFor,
  children,
  required,
  hint,
}: {
  htmlFor: string;
  children: ReactNode;
  required?: boolean;
  hint?: string;
}) {
  return (
    <span className="block">
      <label htmlFor={htmlFor} className="font-display text-[0.9375rem] font-semibold text-[var(--text-strong)]">
        {children}
        {required && (
          <span className="text-[var(--accent)]" aria-hidden="true">
            {' '}
            *
          </span>
        )}
      </label>
      {hint && <span className="mt-1 block text-sm text-[var(--text-muted)]">{hint}</span>}
    </span>
  );
}

export function ErrorText({ id, children }: { id: string; children?: string }) {
  if (!children) return null;
  return (
    <p id={id} className="mt-1.5 flex items-start gap-1.5 text-sm font-medium text-[var(--accent)]">
      <svg width="15" height="15" viewBox="0 0 16 16" fill="none" className="mt-0.5 flex-none" aria-hidden="true">
        <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.5" />
        <path d="M8 4.75v3.75M8 11.1v.4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
      {children}
    </p>
  );
}

export function TextField({
  id,
  label,
  value,
  onChange,
  error,
  required,
  hint,
  type = 'text',
  autoComplete,
  placeholder,
  inputMode,
  maxLength,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  required?: boolean;
  hint?: string;
  type?: string;
  autoComplete?: string;
  placeholder?: string;
  inputMode?: 'text' | 'tel' | 'email' | 'numeric';
  maxLength?: number;
}) {
  const errId = `${id}-error`;
  return (
    <div>
      <Label htmlFor={id} required={required} hint={hint}>
        {label}
      </Label>
      <input
        id={id}
        name={id}
        type={type}
        value={value}
        autoComplete={autoComplete}
        placeholder={placeholder}
        inputMode={inputMode}
        maxLength={maxLength}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errId : undefined}
        onChange={(e) => onChange(e.target.value)}
        className="usts-input mt-2"
        data-invalid={error ? 'true' : undefined}
      />
      <ErrorText id={errId}>{error}</ErrorText>
    </div>
  );
}

export function TextArea({
  id,
  label,
  value,
  onChange,
  error,
  required,
  hint,
  rows = 4,
  maxLength = 2000,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  required?: boolean;
  hint?: string;
  rows?: number;
  maxLength?: number;
}) {
  const errId = `${id}-error`;
  return (
    <div>
      <Label htmlFor={id} required={required} hint={hint}>
        {label}
      </Label>
      <textarea
        id={id}
        name={id}
        rows={rows}
        value={value}
        maxLength={maxLength}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errId : undefined}
        onChange={(e) => onChange(e.target.value)}
        className="usts-input mt-2 resize-y"
        data-invalid={error ? 'true' : undefined}
      />
      <ErrorText id={errId}>{error}</ErrorText>
    </div>
  );
}

export function SelectField({
  id,
  label,
  value,
  onChange,
  options,
  error,
  required,
  hint,
  placeholder = 'Select…',
}: {
  id: string;
  label: string;
  value: number | string | '';
  onChange: (v: string) => void;
  options: { value: number | string; label: string }[];
  error?: string;
  required?: boolean;
  hint?: string;
  placeholder?: string;
}) {
  const errId = `${id}-error`;
  return (
    <div>
      <Label htmlFor={id} required={required} hint={hint}>
        {label}
      </Label>
      <select
        id={id}
        name={id}
        value={String(value ?? '')}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errId : undefined}
        onChange={(e) => onChange(e.target.value)}
        className="usts-input usts-select mt-2"
        data-invalid={error ? 'true' : undefined}
      >
        <option value="">{placeholder}</option>
        {options.map((o) => (
          <option key={String(o.value)} value={String(o.value)}>
            {o.label}
          </option>
        ))}
      </select>
      <ErrorText id={errId}>{error}</ErrorText>
    </div>
  );
}

/**
 * Select for a Dataverse option set.
 *
 * A native <select> always hands back a string, but option-set values are
 * numbers — comparing the two silently fails, which is what made the review
 * screen show "—" for answered questions. This converts once, here, so callers
 * always hold a number.
 */
export function ChoiceSelect({
  id,
  label,
  value,
  onChange,
  options,
  error,
  required,
  hint,
  placeholder,
}: {
  id: string;
  label: string;
  value: number | '';
  onChange: (v: number | '') => void;
  options: Choice[];
  error?: string;
  required?: boolean;
  hint?: string;
  placeholder?: string;
}) {
  return (
    <SelectField
      id={id}
      label={label}
      value={value}
      onChange={(v) => onChange(v === '' ? '' : Number(v))}
      options={options}
      error={error}
      required={required}
      hint={hint}
      placeholder={placeholder}
    />
  );
}

/** Yes/No question rendered as a radio pair — clearer than a checkbox for a
    question that must be answered deliberately. */
export function YesNo({
  id,
  label,
  value,
  onChange,
  error,
  hint,
  required = true,
}: {
  id: string;
  label: string;
  value: boolean | null;
  /** Optional questions can be cleared back to null, so `v` may be null. */
  onChange: (v: boolean | null) => void;
  error?: string;
  hint?: string;
  required?: boolean;
}) {
  const errId = `${id}-error`;
  return (
    <fieldset aria-describedby={error ? errId : undefined}>
      <legend className="font-display text-[0.9375rem] font-semibold text-[var(--text-strong)]">
        {label}
        {required && (
          <span className="text-[var(--accent)]" aria-hidden="true">
            {' '}
            *
          </span>
        )}
      </legend>
      {hint && <p className="mt-1 text-sm text-[var(--text-muted)]">{hint}</p>}
      <div className="mt-2.5 flex gap-2.5">
        {[
          { v: true, l: 'Yes' },
          { v: false, l: 'No' },
        ].map(({ v, l }) => (
          <label key={l} className="usts-choice" data-checked={value === v ? 'true' : undefined}>
            <input
              type="radio"
              name={id}
              checked={value === v}
              onChange={() => onChange(v)}
              // A radio never fires onChange when it is already selected, so the
              // clear has to happen on click. `value` here is the pre-click
              // value, which makes this safe whichever order the events run in.
              onClick={() => {
                if (!required && value === v) onChange(null);
              }}
              className="sr-only"
              aria-invalid={error ? true : undefined}
            />
            {l}
          </label>
        ))}
        {!required && value !== null && (
          <button
            type="button"
            onClick={() => onChange(null)}
            className="usts-clear"
          >
            Clear
          </button>
        )}
      </div>
      <ErrorText id={errId}>{error}</ErrorText>
    </fieldset>
  );
}

export function RadioCards({
  id,
  label,
  value,
  onChange,
  options,
  error,
  hint,
  required = true,
}: {
  id: string;
  label: string;
  value: number | '';
  /** Optional groups can be cleared back to '', so `v` may be ''. */
  onChange: (v: number | '') => void;
  options: Choice[];
  error?: string;
  hint?: string;
  required?: boolean;
}) {
  const errId = `${id}-error`;
  return (
    <fieldset aria-describedby={error ? errId : undefined}>
      <legend className="font-display text-[0.9375rem] font-semibold text-[var(--text-strong)]">
        {label}
        {required && (
          <span className="text-[var(--accent)]" aria-hidden="true">
            {' '}
            *
          </span>
        )}
      </legend>
      {hint && <p className="mt-1 text-sm text-[var(--text-muted)]">{hint}</p>}
      <div className="mt-2.5 flex flex-wrap gap-2.5">
        {options.map((o) => (
          <label key={o.value} className="usts-choice" data-checked={value === o.value ? 'true' : undefined}>
            <input
              type="radio"
              name={id}
              checked={value === o.value}
              onChange={() => onChange(o.value)}
              onClick={() => {
                if (!required && value === o.value) onChange('');
              }}
              className="sr-only"
            />
            {o.label}
          </label>
        ))}
        {!required && value !== '' && (
          <button type="button" onClick={() => onChange('')} className="usts-clear">
            Clear
          </button>
        )}
      </div>
      <ErrorText id={errId}>{error}</ErrorText>
    </fieldset>
  );
}

export function CheckboxField({
  id,
  label,
  checked,
  onChange,
  error,
  hint,
}: {
  id: string;
  label: ReactNode;
  checked: boolean;
  onChange: (v: boolean) => void;
  error?: string;
  hint?: string;
}) {
  const errId = `${id}-error`;
  return (
    <div>
      <label htmlFor={id} className="flex cursor-pointer items-start gap-3">
        <input
          id={id}
          name={id}
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errId : undefined}
          className="usts-checkbox mt-0.5"
        />
        <span className="text-[0.9375rem] leading-relaxed text-[var(--text-body)]">{label}</span>
      </label>
      {hint && <p className="mt-1 pl-8 text-sm text-[var(--text-muted)]">{hint}</p>}
      <div className="pl-8">
        <ErrorText id={errId}>{error}</ErrorText>
      </div>
    </div>
  );
}
