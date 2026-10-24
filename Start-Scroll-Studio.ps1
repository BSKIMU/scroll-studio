$ErrorActionPreference = 'Stop'
$studioRoot = $PSScriptRoot
$studioPython = Join-Path $studioRoot '.venv/Scripts/python.exe'
if (-not (Test-Path -LiteralPath $studioPython)) { $studioPython = (Get-Command python).Source }
$studioRunning = $false
try { $studioStatus = Invoke-RestMethod 'http://127.0.0.1:8765/api/status'; $studioRunning = $studioStatus.skp -eq 'browser' } catch {}
if (-not $studioRunning) {
    Start-Process -FilePath $studioPython -ArgumentList @('"' + (Join-Path $studioRoot 'tools/server.py') + '"') -WorkingDirectory $studioRoot -WindowStyle Hidden
    Start-Sleep -Seconds 2
}
Start-Process 'http://127.0.0.1:8765'
