/**
 * Dataverse option-set values for `cr24f_applicant`.
 *
 * These integers are read straight from the live metadata — do not renumber
 * them. If a picklist gains a value in Dataverse it has to be added here too,
 * and the API re-validates every one of them server-side.
 */

export type Choice = { value: number; label: string };

export const EXPERIENCE: Choice[] = [
  { value: 190580000, label: 'No experience' },
  { value: 190580001, label: '1–6 months' },
  { value: 190580002, label: '7–12 months' },
  { value: 190580003, label: '1–2 years' },
  { value: 190580004, label: '3–5 years' },
  { value: 190580005, label: '6–9 years' },
  { value: 190580006, label: '10+ years' },
];

export const EMPLOYMENT_TYPE: Choice[] = [
  { value: 190580000, label: 'Full-time' },
  { value: 190580001, label: 'Part-time' },
];

export const TRAVEL: Choice[] = [
  { value: 190580000, label: 'None — local work only' },
  { value: 190580006, label: 'Monday to Friday' },
  { value: 190580001, label: '1–2 weeks at a time' },
  { value: 190580002, label: '2–3 weeks at a time' },
  { value: 190580003, label: '3–4 weeks at a time' },
  { value: 190580004, label: '4–5 weeks at a time' },
  { value: 190580005, label: '6+ weeks at a time' },
];

export const START_TIMEFRAME: Choice[] = [
  { value: 190580000, label: 'As soon as possible' },
  { value: 190580001, label: 'Flexible' },
  { value: 190580002, label: 'In 1 week' },
  { value: 190580003, label: 'In 2 weeks' },
  { value: 190580004, label: 'In 3 weeks' },
  { value: 190580005, label: 'In 4 weeks' },
  { value: 190580006, label: 'In 5+ weeks' },
];

export const EDUCATION: Choice[] = [
  { value: 190580000, label: 'Some high school' },
  { value: 190580001, label: 'High school or GED' },
  { value: 190580002, label: 'Some college' },
  { value: 190580003, label: 'Trade school or certificate program' },
  { value: 190580004, label: 'Associate’s degree' },
  { value: 190580005, label: 'Bachelor’s degree' },
  { value: 190580006, label: 'Master’s degree' },
];

export const REFERRAL: Choice[] = [
  { value: 190580007, label: 'This website' },
  { value: 190580000, label: 'Indeed' },
  { value: 190580009, label: 'ZipRecruiter' },
  { value: 190580003, label: 'Employee referral' },
  { value: 190580002, label: 'Facebook' },
  { value: 190580004, label: 'Wireless Estimator' },
  { value: 190580005, label: 'Learning Alliance' },
  { value: 190580006, label: 'Airstreams Renewable' },
  { value: 190580001, label: 'CollabFirst' },
  { value: 190580010, label: 'AbleMKR' },
  { value: 190580008, label: 'Other' },
];

export const LONGEST_EMPLOYMENT: Choice[] = [
  { value: 190580000, label: 'Less than 1 year' },
  { value: 190580001, label: '1 year' },
  { value: 190580002, label: '2 years' },
  { value: 190580003, label: '3 years' },
  { value: 190580004, label: '4 years' },
  { value: 190580005, label: '5+ years' },
];

export const SHIFT_LENGTH: Choice[] = [
  { value: 8, label: '8-hour days' },
  { value: 10, label: '10-hour days' },
];

/** Set on every new row so applications land where recruiters already look. */
export const STATUS_ADDED = 190580000;

export const US_STATES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'DC', 'FL', 'GA', 'HI', 'ID', 'IL', 'IN', 'IA',
  'KS', 'KY', 'LA', 'ME', 'MD', 'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ', 'NM',
  'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC', 'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA',
  'WV', 'WI', 'WY',
];

/** Sunday first, matching the Nexus payroll week. */
export const DAYS = [
  { key: 'worksSunday', label: 'Sun' },
  { key: 'worksMonday', label: 'Mon' },
  { key: 'worksTuesday', label: 'Tue' },
  { key: 'worksWednesday', label: 'Wed' },
  { key: 'worksThursday', label: 'Thu' },
  { key: 'worksFriday', label: 'Fri' },
  { key: 'worksSaturday', label: 'Sat' },
] as const;

export const RESUME_MAX_BYTES = 5 * 1024 * 1024;
export const RESUME_TYPES = ['.pdf', '.doc', '.docx', '.rtf', '.txt'];
