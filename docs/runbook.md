# Runbook — usts1.com

Everything here is done from the command line. No portal clicking required.

| | |
|---|---|
| Subscription | `USTS` — `2f7fad7e-5796-4a12-a1b6-52db53dbacba` |
| Resource group | `rg-usts-web-cus` (Central US) |
| Static Web App | `usts-web` |
| Azure URL | `ambitious-tree-058d7ee10.7.azurestaticapps.net` |
| App registration | `USTS-Web-Public` — `acd80fda-0f4d-48ac-b389-7d1acb469f26` |
| Dataverse app user | `USTS Website`, BU **Web Integrations**, role **Web Careers Writer** |
| Dataverse env | `https://ustelecomservices.crm.dynamics.com` (Nexus) |

Always pass `--subscription` explicitly; never `az account set`.

---

## Publish a change

Push to `main`. GitHub Actions builds and deploys. Watch it with:

```bash
gh run watch
```

To roll back, revert the commit and push — the previous version redeploys.

---

## Rotate the Dataverse client secret (REQUIRED before it expires)

The secret behind `DV_CLIENT_SECRET` expires **two years after it was created
(created 2026-08-26, so before 2028-08-26)**. When it expires the job application
form and the live openings list stop working. Rotate it well before then:

```powershell
$sub = '2f7fad7e-5796-4a12-a1b6-52db53dbacba'
$app = 'acd80fda-0f4d-48ac-b389-7d1acb469f26'

# `az ad` ignores --subscription and acts in the CLI's ACTIVE tenant, so get a
# Graph token pinned to the USTS subscription and use Graph directly.
$tok = az account get-access-token --subscription $sub --resource https://graph.microsoft.com --query accessToken -o tsv
$h = @{ Authorization = "Bearer $tok"; 'Content-Type' = 'application/json' }
$objId = (Invoke-RestMethod -Headers $h "https://graph.microsoft.com/v1.0/applications?`$filter=appId eq '$app'").value[0].id

$body = @{ passwordCredential = @{ displayName = 'usts-web swa'
           endDateTime = (Get-Date).AddMonths(24).ToString('yyyy-MM-ddTHH:mm:ssZ') } } | ConvertTo-Json -Depth 5
$pw = Invoke-RestMethod -Method POST -Headers $h "https://graph.microsoft.com/v1.0/applications/$objId/addPassword" -Body $body

az staticwebapp appsettings set --subscription $sub -n usts-web -g rg-usts-web-cus `
  --setting-names "DV_CLIENT_SECRET=$($pw.secretText)"
```

Then delete the old credential (list them with `GET /applications/$objId` and
`POST /applications/$objId/removePassword`), and confirm the form still works.

---

## Check what the website identity can reach

Proves the least-privilege setup is still intact. Run it after any Dataverse
security change:

```powershell
# Reads the credential from the SWA settings; creates and deletes a test row.
scripts\verify-permissions.ps1
```

Expected: reads of requisitions/positions/markets/offices succeed; reads of
timecards, employees and job orders are **denied (403)**; create succeeds;
delete is **denied**.

If a denial turns into a success, something has re-granted the identity access —
most likely it was moved back into the main business unit, whose default team
carries thirteen roles. Move it back to **Web Integrations**.

---

## Custom domain

Generate the ownership-validation code, then hand
[`dns-change-request.md`](dns-change-request.md) to whoever runs DNS:

```bash
SUB=2f7fad7e-5796-4a12-a1b6-52db53dbacba
az staticwebapp hostname set --subscription $SUB -n usts-web -g rg-usts-web-cus \
  --hostname www.usts1.com --validation-method dns-txt-token
az staticwebapp hostname show --subscription $SUB -n usts-web -g rg-usts-web-cus \
  --hostname www.usts1.com -o table      # shows the code and the status
```

Once the TXT record is in place the status goes to `Ready` and the certificate is
issued automatically. Only then ask for the `www` CNAME to be switched.

---

## Things that will bite you

- **Don't add roles to the `USTS Website` Dataverse user**, and don't move it out
  of the **Web Integrations** business unit. Users in the main business unit
  inherit thirteen roles automatically from its default team — that is exactly
  what the separate business unit exists to avoid.
- **The `openings` and `options` endpoints cache for 5–15 minutes.** A newly
  opened requisition will not appear on the careers page instantly.
- **Only requisitions with `cr24f_openings > 0` show.** A requisition parked at
  zero openings is deliberately hidden — that, plus `statecode eq 0`, is the
  filter the old Power Pages list got wrong.
- **`az` prints warnings to stderr**, which PowerShell turns into a red
  `NativeCommandError` even on success. Check the actual result before assuming
  a failure.
