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

## Stage 1 — verification records ✅ DONE

Both `TXT` records are in place and have verified. Nothing further needed here.

| Type | Name / Host | Value | Status |
|---|---|---|---|
| `TXT` | `_dnsauth.www` | `_zutruum3gzhyupyp25vdggzz2re3qjh` | live |
| `TXT` | `@` | `MS=ms20047663` | **verified — email domain is active** |

## Stage 2 — the website ✅ LIVE

`https://www.ustelecomservices.com` is serving the new site with a valid
certificate. Nothing further needed for `www`.

| Type | Name / Host | Value | Status |
|---|---|---|---|
| `CNAME` | `www` | `ambitious-tree-058d7ee10.7.azurestaticapps.net` | **live** |

## Stage 2b — the bare domain (one record left)

`ustelecomservices.com` without the `www` still shows a GoDaddy parked page.

**Move the ownership record from `_dnsauth.www` to `@`.** Azure looks for the
bare domain's proof at the root, not under `www`:

| Action | Type | Name / Host | Value |
|---|---|---|---|
| **Add** | `TXT` | `@` | `_9ms45nu9xtbnrju09dtosantpewje06` |
| **Then delete** | `TXT` | `_dnsauth.www` | *(same value — no longer needed)* |

Add the new one first, confirm with us, then delete the old one. Several `TXT`
records on `@` side by side is normal.

Once that validates we send you an IP address, and you replace the parked record:

| Action | Type | Name / Host | Value | TTL |
|---|---|---|---|---|
| **Edit** | `A` | `@` | *(the IP we send — replaces "Parked")* | 600 |

**Do not re-enable Domain Forwarding on this domain.** It would take the `www`
record back over and the site would go down.

## Stage 3 — email for this domain ✅ RECORDS DONE

All three records are live, and the domain is verified and switched on for email
in Microsoft 365. **The DNS side of email is finished.**

What is still needed is an actual address on the domain — see "Remaining" at the
bottom.

| Type | Name / Host | Value | Priority | TTL |
|---|---|---|---|---|
| `MX` | `@` | `ustelecomservices-com.mail.protection.outlook.com` | `0` | default |
| `TXT` | `@` | `v=spf1 include:spf.protection.outlook.com -all` | — | default |
| `CNAME` | `autodiscover` | `autodiscover.outlook.com` | — | default |

> Keep the existing `TXT @ MS=ms20047663` record. Adding a second `TXT` on `@` is
> fine and expected — a domain can hold several.

### ⚠️ Two records Microsoft will suggest that you must NOT add

If you follow Microsoft's own setup wizard it offers a longer list. **Skip these:**

1. **`CNAME` at `@` pointing to `usts1.sharepoint.com`.** A `CNAME` at the root of
   a domain is invalid alongside any other record and **would take the website and
   the email down together**. It is for a retired SharePoint feature.
2. **`MX` at `@` pointing to `ms20047663.msv1.invalid`.** That is an alternative
   ownership check. The `TXT` already did that, and this would break mail delivery.

The Skype/Teams records (`sip`, `lyncdiscover`, `_sip._tls`,
`_sipfederationtls._tcp`) are only needed for Teams calling on this domain. Skip
them unless we ask.

---

# Domain 2 — usts1.com ✅ DONE

Forwarding now sends it to the new site, and its email records are untouched.
Nothing further needed.

<details><summary>Original instructions</summary>

**Change the domain forwarding.** It currently forwards to
`http://ustowerservicesinc.com`. Repoint it to:

```
https://www.ustelecomservices.com
```

Permanent (301). If GoDaddy offers to include subdomains, include them so
`www.usts1.com` follows too — it is currently a `CNAME` to `usts1.com`.

**Nothing else on this domain changes.** Re-read the "Do not touch" list above
before saving.

</details>

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

1. ~~**Stage 1** — the two `TXT` records on ustelecomservices.com.~~ **Done and
   verified.** The email domain is already active in Microsoft 365.
2. **Stage 2** — turn off Forwarding on ustelecomservices.com, then add the `www`
   `CNAME` and the `_dnsauth` `TXT`. **This is the step that puts the new site
   live.**
3. Tell us; we send you the IP for the bare domain, you add the `A` record.
4. **Stage 3** — the three email records for ustelecomservices.com.
5. **Domains 2 and 3** — repoint the two old domains, once the new site is
   confirmed good. Domain 3 is what actually retires the Wix site.

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

---

# Remaining

### 1. The bare domain (`ustelecomservices.com`) — waiting on Azure

The `TXT @` record is in and correct. Azure is validating; once it completes we
send you an IP to replace the `A @ Parked` row, and the bare domain will serve
the site. Nothing for you to do until then.

After it goes live, the `TXT _dnsauth.www` record can be deleted — it is the
same value in the wrong place and is no longer doing anything.

### 2. `ustowerservicesinc.com` is forwarding to itself

The Wix records are gone — good. But the forward is currently set to
`https://www.ustowerservicesinc.com`, which points back at the same domain rather
than at the new site:

```
http://ustowerservicesinc.com
  → https://ustowerservicesinc.com
  → https://www.ustowerservicesinc.com    ← dead end
```

**Change the forwarding destination to `https://www.ustelecomservices.com`.**
If GoDaddy offers a "forward to www" option, make sure it is pointing at the new
domain and not at this one.

### 3. Email address ✅ DONE

`info@ustelecomservices.com` now reaches the same **Info** distribution list as
`info@usts1.com` and `info@ustowerservicesinc.com`. The website and its contact
form have been switched over to it.
