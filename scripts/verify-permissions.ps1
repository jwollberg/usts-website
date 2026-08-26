# Verifies that the public website's Dataverse identity can do exactly what it
# needs and nothing else. Creates one throwaway applicant row and removes it.
#
# Expected: reference reads PASS, Nexus reads DENIED, create PASS, delete DENIED.
# A denial turning into a success means the identity has been over-granted.

$ErrorActionPreference = 'Continue'
$sub    = '2f7fad7e-5796-4a12-a1b6-52db53dbacba'
$tenant = '08b93273-d51f-41e4-8e81-c3f54457442c'
$envUrl = 'https://ustelecomservices.crm.dynamics.com'
$api    = "$envUrl/api/data/v9.2"

# Pull the credential straight from the SWA settings; never echo it.
$settings = az staticwebapp appsettings list --subscription $sub -n usts-web -g rg-usts-web-cus -o json | ConvertFrom-Json
$clientId = $settings.properties.DV_CLIENT_ID
$secret   = $settings.properties.DV_CLIENT_SECRET
Write-Host "client id: $clientId"

$body = @{
  client_id = $clientId; client_secret = $secret
  grant_type = 'client_credentials'; scope = "$envUrl/.default"
}
$tok = (Invoke-RestMethod -Method POST "https://login.microsoftonline.com/$tenant/oauth2/v2.0/token" -Body $body).access_token
Write-Host "token acquired: $($tok.Length) chars"

$h  = @{ Authorization = "Bearer $tok"; 'OData-MaxVersion'='4.0'; 'OData-Version'='4.0'; Accept='application/json' }
$hw = $h + @{ 'Content-Type' = 'application/json' }

function Try-It($label, $block) {
  try { $r = & $block; Write-Host "PASS  $label"; return $r }
  catch {
    $code = $_.Exception.Response.StatusCode.value__
    Write-Host "FAIL  $label  (HTTP $code)"
    return $null
  }
}
function Expect-Denied($label, $block) {
  try { & $block | Out-Null; Write-Host "FAIL  $label -- ACCESS WAS ALLOWED (should be denied)" }
  catch {
    $code = $_.Exception.Response.StatusCode.value__
    if ($code -eq 403 -or $code -eq 401) { Write-Host "PASS  $label (correctly denied, HTTP $code)" }
    else { Write-Host "?     $label unexpected HTTP $code" }
  }
}

Write-Host ''
$who = Try-It 'WhoAmI' { Invoke-RestMethod -Headers $h "$api/WhoAmI" }
if ($who) { Write-Host "      acting as user $($who.UserId)" }

Try-It 'read requisitions'  { Invoke-RestMethod -Headers $h "$api/cr24f_requisitions?`$top=1" } | Out-Null
Try-It 'read positions'     { Invoke-RestMethod -Headers $h "$api/positions?`$top=1" } | Out-Null
Try-It 'read markets'       { Invoke-RestMethod -Headers $h "$api/cr24f_markets?`$top=1" } | Out-Null
Try-It 'read offices'       { Invoke-RestMethod -Headers $h "$api/cr24f_offices?`$top=1" } | Out-Null

Write-Host ''
Write-Host '--- least privilege: these MUST be denied ---'
Expect-Denied 'read timecards'  { Invoke-RestMethod -Headers $h "$api/cr24f_timecards?`$top=1" }
Expect-Denied 'read employees'  { Invoke-RestMethod -Headers $h "$api/systemusers?`$top=1" }
Expect-Denied 'read job orders' { Invoke-RestMethod -Headers $h "$api/cr24f_joborders?`$top=1" }
Expect-Denied 'read HR policy'  { Invoke-RestMethod -Headers $h "$api/cr24f_policieses?`$top=1" }

Write-Host ''
Write-Host '--- create + file upload ---'
$rec = @{
  cr24f_fullname = 'ZZ TEST DELETE ME'
  cr24f_firstname = 'ZZ'; cr24f_lastname = 'TEST DELETE ME'
  cr24f_email = 'zz.test@example.invalid'; cr24f_phone = '(555) 555-0100'
  cr24f_applicantstatus = 190580000
} | ConvertTo-Json
$resp = Try-It 'create applicant' { Invoke-WebRequest -UseBasicParsing -Method POST -Headers $hw "$api/cr24f_applicants" -Body $rec }
if ($resp) {
  $id = ($resp.Headers['OData-EntityId'] -join '') -replace '.*\(([0-9a-fA-F-]{36})\).*','$1'
  Write-Host "      created $id"

  $bytes = [System.Text.Encoding]::UTF8.GetBytes("resume smoke test $(Get-Random)")
  Try-It 'upload resume to file column' {
    Invoke-WebRequest -UseBasicParsing -Method PATCH `
      -Headers ($h + @{ 'Content-Type' = 'application/octet-stream' }) `
      "$api/cr24f_applicants($id)/cr24f_resume?x-ms-file-name=smoke.txt" -Body $bytes
  } | Out-Null

  Expect-Denied 'delete own row' { Invoke-RestMethod -Method DELETE -Headers $h "$api/cr24f_applicants($id)" }

  # Clean up with the admin identity, since the web user deliberately cannot
  # delete. Verify the row is actually gone rather than assuming -- a failed
  # delete here leaves junk sitting in the recruiting pipeline.
  $adm = & "C:\Projects\USTS\scripts\token.ps1" -Resource $envUrl
  $ah = @{ Authorization = "Bearer $adm"; 'OData-MaxVersion' = '4.0'; 'OData-Version' = '4.0'; Accept = 'application/json' }
  try { Invoke-RestMethod -Method DELETE -Headers $ah "$api/cr24f_applicants($id)" | Out-Null } catch { }
  $still = (Invoke-RestMethod -Headers $ah "$api/cr24f_applicants?`$select=cr24f_applicantid&`$filter=cr24f_applicantid eq $id").value
  if ($still.Count -eq 0) { Write-Host "PASS  test row removed" }
  else { Write-Host "FAIL  TEST ROW $id STILL EXISTS - delete it manually" }
}
