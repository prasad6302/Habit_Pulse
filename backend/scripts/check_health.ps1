$TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE3ODUyMzk5MTYsInN1YiI6ImIyYTg5ODhiLTgwYmEtNDgzNC05YzliLTAyNmI2MGEzYTg3NyIsInR5cGUiOiJhY2Nlc3MifQ.rzLfiOKYz-29hXHVULkvRVPnItukJ-DsfaesHsWgsvw"
$H = @{ "Authorization" = "Bearer $TOKEN" }

Write-Host "--- Health check ---"
$health = Invoke-WebRequest -Uri "http://127.0.0.1:8000/health" -UseBasicParsing -TimeoutSec 10
Write-Host $health.Content

Write-Host ""
Write-Host "--- Auth/me (confirms JWT + Postgres user lookup) ---"
$me = Invoke-WebRequest -Uri "http://127.0.0.1:8000/api/v1/auth/me" -Headers $H -UseBasicParsing -TimeoutSec 10
Write-Host $me.Content
