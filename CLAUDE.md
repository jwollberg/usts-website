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

### If a push doesn't publish

There is a one-command fallback that builds and deploys straight from your
machine, skipping GitHub entirely:

```bash
pnpm deploy
```

It needs `az login` with access to the USTS subscription and reads the
deployment token from Azure at run time — nothing is stored in the repo.

> This was needed on 2026-08-26: GitHub stopped dispatching Actions runs for this
> account (a run wedged in "queued" that could not be cancelled or deleted, then
> no runs created at all). The repo was made public, which makes Actions free, but
> the block did not lift the same day. If pushes still aren't publishing, use
> `pnpm deploy` and check the Actions tab.

| | |
|---|---|
| Live (once DNS moves) | https://www.usts1.com |
| Azure URL (works now) | https://ambitious-tree-058d7ee10.7.azurestaticapps.net |
| GitHub repo | `jwollberg/usts-website` |

## What's where

```
src/content/site.ts      EVERY company fact — email, offices, services,
                         team, the employee app links. Edit here, not in pages.
src/pages/               One file per page of the site.
src/components/          Header, footer, and the three forms.
src/styles/global.css    Colors, fonts, buttons. All colors are defined once at
                         the top of this file.
public/                  Logo, icons, share image.
api/                     The small bit of server code (see below).
```

**To change wording on a page**, open the matching file in `src/pages/`.
**To change the email address, an office, a service, or a team member**, open
`src/content/site.ts` — it feeds every page at once.

## Brand

The logo's colors are the US flag: navy `#3C3B6E`, red `#B22234`, charcoal
`#383838`. Navy carries the brand; red is used sparingly, for buttons and small
accents. The top bar is deliberately **cream in both light and dark mode** — the
logo's red ring disappears against a dark background, so keeping that bar light
means the real logo is always readable. Don't make the header dark.

Tagline: **"Keeping People Connected."** Founded 2002.

## The four things the site does that aren’t just pages

All four run in `api/` as small serverless functions:

| What | Where it goes |
|---|---|
| **Job application** | Creates a row in Dataverse `cr24f_applicant` — the same table the recruiting team already works from. Resume attaches to the `cr24f_resume` file column. |
| **Open positions list** | Reads live from Dataverse `cr24f_requisition` (active, with at least one opening). No rebuild needed when a job opens or closes. |
| **Contact form** | Posts to the existing "Nexus - Send Branded Email" flow, which emails `info@usts1.com`. |
| **Subcontractor onboarding** | Creates a row in Dataverse `cr24f_contractoronboardingrequest` with the quote, W-9 and COI attached as notes — same place the old Power Pages form put them. |

### What the website is allowed to touch in Nexus

**This repository is public. Nothing sensitive belongs in it.**

The site signs in to Dataverse as a dedicated, deliberately narrow identity. It
can create job applications and subcontractor-onboarding rows and read the list
of open roles. It cannot read timecards, employees, job orders or HR policies,
and it cannot delete anything — all verified by an automated check.

The full setup, the reasoning behind it, and the operational procedures
(including rotating the credential before it expires) live **outside this repo**,
in the private USTS workspace under `docs/website/` — `runbook.md` and
`verify-permissions.ps1`.

> If you are changing anything about how the site talks to Dataverse, read that
> runbook first. There is a specific trap documented there that would otherwise
> silently hand this public website far more access to Nexus than it should have.

### Secrets

There are none in this repo, and none should ever be added. Credentials live in
the Static Web App's application settings in Azure and are set from the command
line. The setting names are `TENANT_ID`, `DV_URL`, `DV_CLIENT_ID`,
`DV_CLIENT_SECRET`, `BRANDED_EMAIL_FLOW_URL` and `CONTACT_TO`; the values exist
only in Azure.

**`DV_CLIENT_SECRET` expires and must be replaced before it does**, or the job
application form stops working. The runbook has the procedure.

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
node scripts/live-check.mjs <url>                      # walk the whole application form
node scripts/csp-check.mjs <url>                       # nothing blocked, forms render
node scripts/text-check.mjs <url>                      # words run together across a link
node scripts/make-og.mjs                               # regenerate the link-preview image
```

Run `csp-check` and `text-check` against the deployed URL after any change to the
layout or the security headers. Both catch things a build cannot: the CSP one
found the careers list silently broken in production.

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
- Josh to sign off on the wording generally.

> Two claims from the old Wix site were **deliberately left off**: "120+ years of
> combined experience" and the "100% Satisfaction on Your First Job, or it's
> Free" guarantee. Josh removed them. Don't reinstate either without asking —
> a guarantee in particular is a commitment, not a tagline.
- Real photography.
- **The Power Pages portal (`ustsportal.powerappsportals.com`) can now be switched
  off.** Both of its forms — careers and contractor onboarding — live here and
  write to the same Dataverse tables. Nothing on this site links to it any more.
  Check nothing else points at it before retiring it.
