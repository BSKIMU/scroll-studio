$ErrorActionPreference = 'Stop'
$studioRoot = $PSScriptRoot
$studioPython = Join-Path $studioRoot '.venv/Scripts/python.exe'
if (-not (Test-Path -LiteralPath $studioPython)) {
    $studioPython = Join-Path $studioRoot '../../#3d/local/runtime/blender-4.5.9-windows-x64/4.5/python/bin/python.exe'
}
if (-not (Test-Path -LiteralPath $studioPython)) { $studioPython = (Get-Command python).Source }
$studioRunning = $false
try { $studioStatus = Invoke-RestMethod 'http://127.0.0.1:8765/api/status'; $studioRunning = $studioStatus.skp -eq 'browser' } catch {}
if (-not $studioRunning) {
    Start-Process -FilePath $studioPython -ArgumentList @('"' + (Join-Path $studioRoot 'tools/server.py') + '"') -WorkingDirectory $studioRoot -WindowStyle Hidden
    for ($attempt = 0; $attempt -lt 30; $attempt++) {
        Start-Sleep -Milliseconds 300
        try { $studioRunning = (Invoke-RestMethod 'http://127.0.0.1:8765/api/status' -TimeoutSec 1).skp -eq 'browser' } catch {}
        if ($studioRunning) { break }
    }
    if (-not $studioRunning) { throw 'Scroll Studio did not start on port 8765.' }
}
Start-Process 'http://127.0.0.1:8765'
