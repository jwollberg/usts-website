# DNS change request — US Telecom Services

**Send this to whoever administers DNS.** All three domains are on **GoDaddy**
(`*.domaincontrol.com` nameservers), so everything below is done in one place.

## What we're doing

`www.ustelecomservices.com` becomes the company website. The two older domains
stop serving their own sites and permanently forward to it instead.

`ustelecomservices.com` is also being set up to send and receive company email.

| Domain | Today | After |
|---|---|---|
| **ustelecomservices.com** | forwards to usts1.com, no email | **the website**, and a working email domain |
| **usts1.com** | forwards to ustowerservicesinc.com | forwards to the new site — **email unchanged** |
| **ustowerservicesinc.com** | the old Wix site | forwards to the new site — **email unchanged** |

---

## 🚫 Do not touch the email records

**`usts1.com` and `ustowerservicesinc.com` both carry live company email.** Leave
every one of these exactly as it is — removing any of them stops mail:

**usts1.com**
- `MX` → `usts1-com.mail.protection.outlook.com`
- `TXT @` → `MS=55208010`
- `TXT @` → `v=spf1 include:spf.protection.outlook.com -all`
- `TXT @` → `v=verifydomain MS=5834608`
- `CNAME autodiscover` → `autodiscover.outlook.com`

**ustowerservicesinc.com**
- `MX` → `ustowerservicesinc-com.mail.protection.outlook.com`
- `TXT @` → `v=spf1 include:spf.protection.outlook.com -all`
- `TXT @` → `v=verifydomain MS=3882931`
- `CNAME autodiscover` → `autodiscover.outlook.com`

Anything else with `_domainkey`, `enterpriseregistration` or `enterpriseenrollment`
in the name is also email or device management. Leave those alone too.

**The only records that change are the ones listed below.**

---

# Domain 1 — ustelecomservices.com (the new website + email)

This domain has no email and no records of its own today, so there is nothing
here to break.

## Stage 1 — verification records (safe, nothing visible changes)

Add these two `TXT` records. They prove we own the domain — one for the website
certificate, one for email. **Nothing about any live site changes at this stage.**

| Type | Name / Host | Value | TTL |
|---|---|---|---|
| `TXT` | `_dnsauth.www` | `_zutruum3gzhyupyp25vdggzz2re3qjh` | default |
| `TXT` | `@` | `MS=ms20047663` | default |

> Enter `_dnsauth.www` exactly as written, leading underscore included — GoDaddy
> adds `ustelecomservices.com` for you.

Then tell us. We confirm both verifications have gone through before Stage 2.

## Stage 2 — point the website here

**Change the `www` record.** It is currently a `CNAME` to `ustelecomservices.com`.

| Type | Name / Host | Points to | TTL |
|---|---|---|---|
| `CNAME` | `www` | `ambitious-tree-058d7ee10.7.azurestaticapps.net` | 600 |

Edit the existing `www` record rather than adding a second one. TTL can go back
to default once everything is confirmed working.

**Change the domain forwarding.** This domain currently forwards to
`http://usts1.com`. Repoint that forward to:

```
https://www.ustelecomservices.com
```

Permanent (301), root domain only.

> The `A` records at the root (`3.33.152.147`, `15.197.142.173`) belong to
> GoDaddy's forwarding service. Don't edit them by hand — changing the forwarding
> setting updates them.

## Stage 3 — email for this domain

Add these **after** we confirm the `MS=ms20047663` record has verified.

| Type | Name / Host | Value | Priority | TTL |
|---|---|---|---|---|
| `MX` | `@` | `ustelecomservices-com.mail.protection.outlook.com` | `0` | default |
| `TXT` | `@` | `v=spf1 include:spf.protection.outlook.com -all` | — | default |
| `CNAME` | `autodiscover` | `autodiscover.outlook.com` | — | default |

### ⚠️ Two records Microsoft will suggest that you must NOT add

If you follow Microsoft's own setup wizard it will offer a longer list. **Skip
these two:**

1. **`CNAME` at `@` pointing to `usts1.sharepoint.com`.** A `CNAME` at the root of
   a domain is invalid alongside any other record and **would take the website
   and the email down at the same time**. It is for a retired SharePoint feature
   and is not needed.
2. **`MX` at `@` pointing to `ms20047663.msv1.invalid`.** That is an alternative
   way of proving ownership. The `TXT` record above already does that, and this
   one would break mail delivery.

The Skype/Teams records (`sip`, `lyncdiscover`, `_sip._tls`,
`_sipfederationtls._tcp`) are only needed if this domain is used for Teams calling.
Skip them unless we ask.

---

# Domain 2 — usts1.com (forward only, keep email)

**Change the domain forwarding.** It currently forwards to
`http://ustowerservicesinc.com`. Repoint it to:

```
https://www.ustelecomservices.com
```

Permanent (301). If GoDaddy offers to include subdomains, include them so
`www.usts1.com` follows too — it is currently a `CNAME` to `usts1.com`.

**Nothing else on this domain changes.** Re-read the "Do not touch" list above
before saving.

---

# Domain 3 — ustowerservicesinc.com (forward only, keep email)

This is the one that actually retires the old Wix site, so do it last.

**Remove these two records** — they point at Wix:

| Type | Name / Host | Current value |
|---|---|---|
| `A` | `@` | `185.230.63.107` |
| `CNAME` | `www` | `pointing.wixdns.net` |

**Then set domain forwarding** to:

```
https://www.ustelecomservices.com
```

Permanent (301), including subdomains if offered.

**Nothing else on this domain changes.** Its email records stay exactly as they
are.

---

## Suggested order

1. **Stage 1** on ustelecomservices.com — the two `TXT` records. Nothing visible
   changes; the current site keeps serving.
2. We confirm both verified, and that the certificate has been issued.
3. **Stage 2** — the `www` `CNAME` and the forwarding. The new site goes live.
4. **Stage 3** — the email records for ustelecomservices.com.
5. **Domains 2 and 3** — repoint the two old domains once the new site is
   confirmed good.

## Backing it out

Every step reverses in a minute:

- **Website:** point the `www` `CNAME` back, and set the forwards back to where
  they were. With TTL at 600 that takes effect in about ten minutes.
- **Old site:** put the `A` record `185.230.63.107` and the `www` `CNAME`
  `pointing.wixdns.net` back on ustowerservicesinc.com.
- **Verification records:** harmless to leave in place; delete if you prefer.

## What we do on our side

- Confirm the website domain validates and Azure issues the certificate.
- Confirm the email domain verifies in Microsoft 365 and set up mailboxes.
- After cutover: confirm `https://www.ustelecomservices.com` serves the site with
  a valid certificate, that both old domains forward correctly, and — most
  importantly — that mail is still flowing on all domains.
