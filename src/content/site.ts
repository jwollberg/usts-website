/**
 * Single source of truth for company facts.
 *
 * Everything the site states about USTS lives here so an edit is one file,
 * not a hunt through markup. Office rows mirror the active rows of Dataverse
 * `cr24f_office`; markets mirror `cr24f_market`.
 */

export const site = {
  name: 'US Telecom Services',
  legalName: 'US Tower Services, Inc.',
  tagline: 'Keeping People Connected',
  founded: 2002,
  url: 'https://www.usts1.com',
  description:
    'US Telecom Services is a wireless infrastructure contractor building and maintaining cell towers, small cells, fiber and commercial electric for the nation’s major carriers. Serving carriers, tower owners and OEMs since 2002.',

  email: 'info@usts1.com',
  phone: '636-497-2898',
  phoneHref: '+16364972898',

  mailing: {
    street: 'PO Box 17003',
    city: 'Missoula',
    state: 'MT',
    zip: '59808',
  },

  social: {
    linkedin: 'https://www.linkedin.com/company/us-telecom-services',
    facebook: 'https://www.facebook.com/ustelecomservices',
  },
} as const;

/** Years of operation, computed so it never goes stale. */
export const yearsInBusiness = new Date().getFullYear() - site.founded;

/**
 * Operating markets only.
 *
 * `label` is the metro name we present publicly; `city` stays the real postal
 * city so addresses and directions remain correct.
 *
 * Missoula is the corporate mailing address, not a market we run crews out of,
 * so it belongs in the footer's legal line rather than here. Santa Fe Springs,
 * Saint Charles and the old Salt Lake City address are inactive in Dataverse.
 */
export const offices = [
  {
    name: 'Sun Valley',
    label: 'Los Angeles',
    market: 'California',
    street: '7636 Clybourn Avenue',
    city: 'Sun Valley',
    state: 'CA',
    zip: '91352',
    lat: 34.205303,
    lon: -118.362754,
    note: 'California operations',
  },
  {
    name: 'Gilbert',
    label: 'Phoenix',
    market: 'Arizona',
    street: '15953 Lonesome Ln',
    city: 'Gilbert',
    state: 'AZ',
    zip: '85298',
    lat: 33.236986,
    lon: -111.738703,
    note: 'Arizona operations',
  },
  {
    name: 'Salt Lake City',
    label: 'Salt Lake City',
    market: 'Utah',
    street: '1525 S Gladiola St, Ste 6',
    city: 'Salt Lake City',
    state: 'UT',
    zip: '84104',
    lat: 40.737879,
    lon: -111.970637,
    note: 'Utah operations',
  },
] as const;

export const executives = [
  { name: 'Ish Ramirez', title: 'President and Owner' },
  { name: 'Chad Berg', title: 'Owner' },
  { name: 'Ted Chaffin', title: 'Owner' },
  { name: 'Joshua Wollberg', title: 'Director of Operations Support' },
] as const;

/** Headline proof points. Each one is defensible from company history. */
export const stats = [
  { value: `${site.founded}`, label: 'Founded', detail: 'Building wireless infrastructure since day one' },
  { value: `${yearsInBusiness}+`, label: 'Years in the field', detail: 'Analog through 5G, coast to coast' },
  { value: '120+', label: 'Combined years of expertise', detail: 'Across our engineering and technical leadership' },
  { value: '3', label: 'Operating markets', detail: 'California, Arizona and Utah' },
] as const;

export const services = [
  {
    slug: 'tower-construction',
    title: 'Tower construction & modification',
    summary:
      'New builds, structural modifications, antenna and line work, and full tower-top services on macro sites.',
    points: [
      'Antenna, RRU and coax/fiber installation',
      'Structural modifications and reinforcement',
      'Line sweeps, PIM testing and troubleshooting',
      'Tower-top rigging by certified climbers',
    ],
  },
  {
    slug: 'maintenance',
    title: 'Maintenance & emergency response',
    summary:
      'Long-term maintenance programs that keep networks at peak efficiency, plus fast response when a site goes down.',
    points: [
      'Preventive and corrective site maintenance',
      'Outage response and trouble tickets',
      'Site audits and condition reporting',
      'Ongoing carrier maintenance programs',
    ],
  },
  {
    slug: 'project-management',
    title: 'Project scoping & management',
    summary:
      'SOW review, scope creation and a dedicated project manager who keeps the program on time and on budget.',
    points: [
      'Scope of Work (SOW) review',
      'Scope of work creation to customer standards',
      'Contingency analysis at start and throughout',
      'Closeout documentation to carrier requirements',
    ],
  },
  {
    slug: 'power-generators',
    title: 'Power & generators',
    summary:
      'Licensed electrical work purpose-built for telecom sites, from service upgrades to permanent standby power.',
    points: [
      'Commercial electric and service upgrades',
      'Generator installation and commissioning',
      'DC plant, batteries and backup power',
      'Off-grid and hybrid power solutions',
    ],
  },
  {
    slug: 'fiber',
    title: 'Fiber & dry utility',
    summary:
      'Backhaul and fronthaul builds, splicing and testing, plus the underground work that gets you there.',
    points: [
      'Fiber placement, splicing and termination',
      'OTDR testing and as-built documentation',
      'Conduit, boring and dry utility',
      'Small cell and DAS connectivity',
    ],
  },
  {
    slug: 'special-events',
    title: 'Special event & temporary coverage',
    summary:
      'Temporary capacity where the network needs it most, deployed and supported for the length of the event.',
    points: [
      'COW and COLT deployment and support',
      'Temporary power and off-grid solutions',
      'On-site technical staffing',
      'Teardown and site restoration',
    ],
  },
] as const;

/** Links surfaced on /employees. IDs verified against the live tenant. */
export const employeeApps = [
  {
    name: 'My Nexus',
    audience: 'Field crews',
    description:
      'Clock in and out, review and approve your timecards, submit receipts and check your schedule.',
    href: 'https://apps.powerapps.com/play/e/5202c98f-0efa-e95a-8a86-e5cd7c16a408/a/0bcfcb76-838e-4da6-bf8a-a530ba626cd4',
    cta: 'Open My Nexus',
  },
  {
    name: 'Nexus',
    audience: 'Office & management',
    description:
      'Job orders, scheduling, timecard approvals, applicants and reporting — the full administrative system.',
    href: 'https://ustelecomservices.crm.dynamics.com/main.aspx?appid=63566016-a6d5-ed11-a7c7-000d3a37033d',
    cta: 'Open Nexus',
  },
  {
    name: 'Employee portal',
    audience: 'Everyone',
    description:
      'Company announcements, the employee handbook, HR policies, forms and shared documents.',
    href: 'https://usts1.sharepoint.com/sites/Home',
    cta: 'Open the portal',
  },
] as const;

export const nav = [
  { label: 'Services', href: '/services' },
  { label: 'About', href: '/about' },
  { label: 'Team', href: '/team' },
  { label: 'Careers', href: '/careers' },
  { label: 'Contact', href: '/contact' },
] as const;
