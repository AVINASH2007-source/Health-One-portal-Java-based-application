$ErrorActionPreference = "Stop"
# Quotes are needed because directory name contains spaces
$sources = Get-ChildItem -Path "backend/src" -Filter *.java -Recurse | ForEach-Object {
    '"' + $_.FullName.Replace('\', '/') + '"'
}
if (-not (Test-Path "backend/bin")) {
    New-Item -ItemType Directory -Path "backend/bin" | Out-Null
}
$sourceFile = "backend/sources.txt"
[System.IO.File]::WriteAllLines((Resolve-Path "backend").Path + "/sources.txt", $sources)
javac -encoding UTF-8 -d "backend/bin" "@backend/sources.txt"
Remove-Item $sourceFile -Force -ErrorAction SilentlyContinue
Write-Host "Java compilation succeeded! Class files built in backend/bin"
