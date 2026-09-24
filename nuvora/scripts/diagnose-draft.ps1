<#
.SYNOPSIS
  Read-only diagnostic for a NUVORA editorial draft: confirms the authenticated
  GET and the secure preview route, without submitting or publishing anything.

.DESCRIPTION
  Reads NUVORA_EDITORIAL_API_KEY and NUVORA_PREVIEW_TOKEN from THIS terminal
  session's own environment (never printed, logged, or echoed) and performs:
    1. An authenticated GET of the draft by content_id.
    2. An authenticated preview request for the same content_id.
  Prints only: HTTP status, content_id, publish_status, and the X-Request-Id
  the server returned (useful for finding the matching line in Netlify's
  function logs). Never prints raw HTML, the article body, headers, cookies,
  or any part of either credential.

.PARAMETER ContentId
  The content_id to check. Defaults to NUVORA-AI-20260924-001.

.PARAMETER BaseUrl
  Site origin. Defaults to the production site.

.EXAMPLE
  powershell -NoProfile -ExecutionPolicy Bypass -File nuvora\scripts\diagnose-draft.ps1
#>

param(
  [string]$ContentId = "NUVORA-AI-20260924-001",
  [string]$BaseUrl = "https://nuvora-news.netlify.app"
)

$ErrorActionPreference = "Stop"

if ([string]::IsNullOrWhiteSpace($env:NUVORA_EDITORIAL_API_KEY)) {
  Write-Host "STOP: NUVORA_EDITORIAL_API_KEY is not set in this terminal session." -ForegroundColor Red
  exit 1
}
if ([string]::IsNullOrWhiteSpace($env:NUVORA_PREVIEW_TOKEN)) {
  Write-Host "STOP: NUVORA_PREVIEW_TOKEN is not set in this terminal session." -ForegroundColor Red
  exit 1
}

function Invoke-Quiet {
  param([string]$Uri, [hashtable]$Headers)
  try {
    $resp = Invoke-WebRequest -Uri $Uri -Headers $Headers -Method Get -UseBasicParsing -ErrorAction Stop
    return [PSCustomObject]@{
      StatusCode = [int]$resp.StatusCode
      RequestId  = $resp.Headers["X-Request-Id"]
      Body       = $resp.Content
    }
  } catch [System.Net.WebException] {
    $r = $_.Exception.Response
    $status = if ($r) { [int]$r.StatusCode } else { -1 }
    $reqId = $null
    if ($r) { try { $reqId = $r.Headers["X-Request-Id"] } catch {} }
    return [PSCustomObject]@{ StatusCode = $status; RequestId = $reqId; Body = $null }
  }
}

Write-Host "=== NUVORA draft diagnostic (read-only) ===" -ForegroundColor Cyan
Write-Host "content_id: $ContentId"
Write-Host ""

# 1. Authenticated GET
$getHeaders = @{ Authorization = "Bearer $($env:NUVORA_EDITORIAL_API_KEY)" }
$getResult = Invoke-Quiet -Uri "$BaseUrl/api/v1/editorial/articles/$ContentId" -Headers $getHeaders

$publishStatus = $null
if ($getResult.Body) {
  try {
    $parsed = $getResult.Body | ConvertFrom-Json
    $publishStatus = $parsed.publish_status
  } catch {}
}

Write-Host "Authenticated GET"
Write-Host "  Status:          $($getResult.StatusCode)"
Write-Host "  publish_status:  $publishStatus"
Write-Host "  X-Request-Id:    $($getResult.RequestId)"
Write-Host ""

# 2. Secure preview — the token is URL-encoded without altering its value.
$encodedToken = [System.Uri]::EscapeDataString($env:NUVORA_PREVIEW_TOKEN)
$previewResult = Invoke-Quiet -Uri "$BaseUrl/preview/articles/$ContentId`?token=$encodedToken" -Headers @{}

Write-Host "Secure preview"
Write-Host "  Status:          $($previewResult.StatusCode)"
Write-Host ""

Write-Host "=== Summary ===" -ForegroundColor Cyan
Write-Host "GET:      $(if ($getResult.StatusCode -eq 200) { 'PASS' } else { 'FAIL' })"
Write-Host "Preview:  $(if ($previewResult.StatusCode -eq 200) { 'PASS' } else { 'FAIL' })"
