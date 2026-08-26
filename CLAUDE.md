# Website-USTS — US Telecom Services (usts1.com)

The public, client-facing website for **US Telecom Services**. It replaces the old
Wix site and the Power Pages job-application form.

> **This site is the exception to the house style.** Every other site in this
> workspace is pure static and lives on GitHub Pages. This one has to *write into
> Dataverse* when somebody applies for a job, and GitHub Pages cannot run code.
> So it lives on **Azure Static Web Apps** instead. Everything else — Astro,
> Tailwind, push-to-publish — is the same as the other sites.

## Publishing

**Push to `main` and the site republishes itself.** That's it.

```bash
git add -A
git commit -m "Short plain-English description"
git push
```

GitHub Actions rebuilds and deploys (about two minutes). Open a pull request and
you get a temporary preview link on the PR to look at before merging.

| | |
|---|---|
| Live (once DNS moves) | https://www.usts1.com |
| Azure URL (works now) | https://ambitious-tree-058d7ee10.7.azurestaticapps.net |
| GitHub repo | `jwollberg/usts-website` |

## What's where

```
src/content/site.ts      EVERY company fact — phone, email, offices, services,
                         team, the employee app links. Edit here, not in pages.
src/pages/               One file per page of the site.
src/components/          Header, footer, and the two forms.
src/styles/global.css    Colors, fonts, buttons. All colors are defined once at
                         the top of this file.
public/                  Logo, icons, share image.
api/                     The small bit of server code (see below).
```

**To change wording on a page**, open the matching file in `src/pages/`.
**To change a phone number, address, service, or team member**, open
`src/content/site.ts` — it feeds every page at once.

## Brand

The logo's colors are the US flag: navy `#3C3B6E`, red `#B22234`, charcoal
`#383838`. Navy carries the brand; red is used sparingly, for buttons and small
accents. The top bar is deliberately **cream in both light and dark mode** — the
logo's red ring disappears against a dark background, so keeping that bar light
means the real logo is always readable. Don't make the header dark.

Tagline: **"Keeping People Connected."** Founded 2002.

## The three things the site does that aren't just pages

All three run in `api/` as small serverless functions:

| What | Where it goes |
|---|---|
| **Job application** | Creates a row in Dataverse `cr24f_applicant` — the same table the recruiting team already works from. Resume attaches to the `cr24f_resume` file column. |
| **Open positions list** | Reads live from Dataverse `cr24f_requisition` (active, with at least one opening). No rebuild needed when a job opens or closes. |
| **Contact form** | Posts to the existing "Nexus - Send Branded Email" flow, which emails `info@usts1.com`. |
| **Subcontractor onboarding** | Creates a row in Dataverse `cr24f_contractoronboardingrequest` with the quote, W-9 and COI attached as notes — same place the old Power Pages form put them. |

### What the website is allowed to touch in Nexus

The site signs in as a dedicated Dataverse identity (`USTS Website`,
app registration **USTS-Web-Public**) that lives in its own business unit,
**Web Integrations**, with a single role: **Web Careers Writer**.

It can create applicant and subcontractor-onboarding rows (with their
attachments) and read the job/market/office lists. It **cannot** read timecards,
employees, job orders or HR policies, and it cannot delete anything — verified
by test. The separate business unit is what makes that true:
users in the main business unit automatically inherit thirteen roles from its
default team, so an integration identity parked there would see far too much.

> **Don't move that user back into the main business unit**, and don't add roles
> to it. That would silently hand a public web endpoint the run of Nexus.

### Secrets

Nothing sensitive is in this repo. The credentials live in the Static Web App's
application settings in Azure:

`TENANT_ID`, `DV_URL`, `DV_CLIENT_ID`, `DV_CLIENT_SECRET`,
`BRANDED_EMAIL_FLOW_URL`, `CONTACT_TO`.

**`DV_CLIENT_SECRET` expires and must be replaced before then** — see
`docs/runbook.md` for how.

## Running it on your own machine

```bash
pnpm install
pnpm dev            # site only, at localhost:4321
```

`pnpm dev` runs the pages but **not** the forms — the job list and both forms
need the API. For those, use `pnpm swa:start` instead, with `api/local.settings.json`
filled in from `api/local.settings.json.example`.

Handy scripts:

```bash
node scripts/shot.mjs / /careers --width 1440 --full   # screenshot pages for review
node scripts/form-test.mjs                             # click through the application form
node scripts/make-og.mjs                               # regenerate the link-preview image
```

> If the dev server ever throws `_jsxDEV is not a function`, delete
> `node_modules/.vite` and start it again. Running a build and the dev server
> against the same cache can poison it.

## Deliberate decisions worth not undoing

- **The application does not ask for Social Security number, date of birth or
  gender.** The old Power Pages form did, from anonymous visitors, before an
  offer. That is a legal and breach-liability problem; Nexus already collects it
  at onboarding, which is the right point. The privacy notice says we don't ask —
  keep that true.
- **Each subcontractor document has its own upload slot** (quote, W-9, COI). The
  old form had a single unlabelled box, so what arrived was a pile of files
  nobody could tell apart. The slots are also what name the note in Dataverse.
- **No stock photography.** The images on the old Wix site look licensed and we
  can't prove we own them. The site is built to look right with typography and
  the logo instead. Real job-site photos from Josh would improve it a lot.
- **No analytics or tracking cookies**, and the privacy notice says so.

## Still to do

- Move DNS so `www.usts1.com` points here — see `docs/dns-change-request.md`.
- Josh to sign off on the wording, especially "120+ years combined experience"
  and the "100% Satisfaction on Your First Job, or it's Free" guarantee.
- Real photography.
- **The Power Pages portal (`ustsportal.powerappsportals.com`) can now be switched
  off.** Both of its forms — careers and contractor onboarding — live here and
  write to the same Dataverse tables. Nothing on this site links to it any more.
  Check nothing else points at it before retiring it.
