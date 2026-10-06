# Health-One PowerShell Launcher
Write-Host "===============================================================================" -ForegroundColor Cyan
Write-Host "               HEALTH-ONE LIFETIME DIGITAL HEALTH PORTAL" -ForegroundColor Green
Write-Host "                    Launching Java Application Server" -ForegroundColor Cyan
Write-Host "===============================================================================" -ForegroundColor Cyan

if (-not (Test-Path "backend\bin")) {
    Write-Host "[*] Compiling Java backend classes..." -ForegroundColor Yellow
    New-Item -ItemType Directory -Force -Path "backend\bin" | Out-Null
    $sources = (Get-ChildItem -Path backend\src -Filter *.java -Recurse | ForEach-Object { '"{0}"' -f ($_.FullName.Replace('\', '/')) })
    Set-Content -Path 'backend\sources.txt' -Value $sources
    javac -encoding UTF-8 -d backend\bin '@backend\sources.txt'
    Remove-Item 'backend\sources.txt'
}

Write-Host "[*] Starting Java Application on http://localhost:8080 ..." -ForegroundColor Green
java -cp backend\bin com.healthone.Main
