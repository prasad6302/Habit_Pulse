$TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE3ODUyNDM1MDAsInN1YiI6ImIyYTg5ODhiLTgwYmEtNDgzNC05YzliLTAyNmI2MGEzYTg3NyIsInR5cGUiOiJhY2Nlc3MifQ.uoC5ejSM5y8q9cBn9yAA8IKfGvlnu7pukcG1r2YC0uU"
$BASE = "http://127.0.0.1:8001/api/v1"
$H = @{ "Authorization" = "Bearer $TOKEN" }

$endpoints = @(
    @{ label = "1.  Auth /auth/me";                     url = "$BASE/auth/me" },
    @{ label = "2.  Habits /habits/";                   url = "$BASE/habits/" },
    @{ label = "3.  Analytics /analytics/";             url = "$BASE/analytics/" },
    @{ label = "4.  Goals /goals/summary";              url = "$BASE/goals/summary" },
    @{ label = "5.  Journal /journal/";                 url = "$BASE/journal/" },
    @{ label = "6.  Templates /templates/";             url = "$BASE/templates/" },
    @{ label = "7.  Insights /insights/";               url = "$BASE/insights/" },
    @{ label = "8.  Profile /profile/me";               url = "$BASE/profile/me" },
    @{ label = "9.  Privacy JSON export";               url = "$BASE/privacy/export/json" },
    @{ label = "10. Privacy CSV export";                url = "$BASE/privacy/export/csv" },
    @{ label = "11. Social leaderboard";                url = "$BASE/social/leaderboard" },
    @{ label = "12. Social challenges";                 url = "$BASE/social/challenges" },
    @{ label = "13. VAPID public key";                  url = "$BASE/notifications/vapid-public-key" },
    @{ label = "14. Notification logs";                 url = "$BASE/notifications/logs?limit=30" }
)

Write-Host ""
Write-Host "FRESH VERIFICATION RUN - $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss UTC')"
Write-Host "PAGE                                           STATUS"
Write-Host ("-" * 60)

$allOk = $true
foreach ($ep in $endpoints) {
    try {
        $resp = Invoke-WebRequest -Uri $ep.url -Headers $H -UseBasicParsing -TimeoutSec 15 -ErrorAction Stop
        $code = $resp.StatusCode
    } catch {
        $code = $_.Exception.Response.StatusCode.value__
        if (-not $code) { $code = "ERR" }
    }
    $ok = ($code -eq 200)
    if (-not $ok) { $allOk = $false }
    $result = if ($ok) { "200 OK" } else { "$code FAIL" }
    Write-Host ("{0,-46} {1}" -f $ep.label, $result)
}

Write-Host ("-" * 60)
if ($allOk) {
    Write-Host "ALL 14 ENDPOINTS PASSED ON LIVE NEON POSTGRES"
} else {
    Write-Host "SOME ENDPOINTS FAILED - see above"
}
