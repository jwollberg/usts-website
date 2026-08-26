# DNS change request — usts1.com

**Send this to whoever administers DNS for `usts1.com`.** Everything below is
copy-paste-ready. It is split into two stages on purpose: Stage 1 changes nothing
visitors can see, and Stage 2 is the actual switch-over.

DNS for `usts1.com` is hosted at **GoDaddy** (nameservers `ns33.domaincontrol.com`
and `ns34.domaincontrol.com`).

---

## ⚠️ Please do not touch the mail records

`usts1.com` is a live Microsoft 365 mail domain. **Leave every one of these
exactly as they are** — changing or removing any of them will stop company email:

- the `MX` record pointing at `usts1-com.mail.protection.outlook.com`
- every `TXT` record (SPF, domain verification, DKIM)
- any `CNAME` starting with `selector1._domainkey` / `selector2._domainkey`
- any `autodiscover` or `enterpriseregistration` / `enterpriseenrollment` record

**The only records that change are the two named below.**

---

## Stage 1 — prove we own the domain (safe, nothing visible changes)

This lets Microsoft issue the SSL certificate ahead of time. The current website
keeps serving normally while it happens.

**Add one TXT record:**

| Field | Value |
|---|---|
| Type | `TXT` |
| Name / Host | `_dnsauth.www` |
| Value | *(a validation code — see below)* |
| TTL | leave default |

> The validation code is generated per request and expires, so it is **not**
> written down here. Ask Josh for the current code immediately before making the
> change — it takes seconds to produce.

Then tell us it's done. We'll confirm the certificate has been issued before
asking for Stage 2. **Nothing about the live site changes at this stage.**

---

## Stage 2 — the switch-over

Do this only after we confirm Stage 1 validated.

**Change the `www` record:**

| Field | Value |
|---|---|
| Type | `CNAME` |
| Name / Host | `www` |
| Points to | `ambitious-tree-058d7ee10.7.azurestaticapps.net` |
| TTL | 600 (10 minutes) while switching; can go back to default after |

> If a record already exists for `www`, edit it rather than adding a second one.
> Today `www` is a CNAME to `usts1.com`.

**Change the domain forwarding:**

`usts1.com` (no `www`) currently forwards to `http://ustowerservicesinc.com`.
Repoint that forward to:

```
https://www.usts1.com
```

Use a **permanent (301)** forward, and forward the **root domain only**.

> Why forwarding and not a normal record: GoDaddy doesn't support the record type
> (`ALIAS`/`ANAME`) that would let the bare domain point straight at Azure. A
> permanent forward to `www` is the supported approach and is how the domain is
> already set up today, so this is a swap rather than a new arrangement.

---

## Also worth doing (optional, separate)

`ustowerservicesinc.com` is the old Wix site's domain. Forwarding it to
`https://www.usts1.com` with a **permanent (301)** forward means the old domain's
search-engine history follows the brand to the new site instead of splitting it.
This can be done at any time and is unrelated to the two stages above.

---

## Backing it out

Both changes are reversible in a minute:

- **Undo Stage 2:** point the `www` CNAME back at `usts1.com` and set the root
  forward back to `http://ustowerservicesinc.com`.
- **Undo Stage 1:** delete the `_dnsauth.www` TXT record.

With TTL at 600 seconds, a rollback takes effect within about ten minutes.

---

## What we do on our side

- Before Stage 1: generate the validation code on request.
- Between the stages: confirm Microsoft has validated the domain and issued the
  certificate.
- After Stage 2: confirm `https://www.usts1.com` serves the new site, that the
  padlock is valid, and that `usts1.com` forwards correctly. Also confirm mail is
  still flowing.
