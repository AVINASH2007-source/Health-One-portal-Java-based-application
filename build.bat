@echo off
echo ===============================================================================
echo                Building Health-One Complete Java Application
echo ===============================================================================

echo [1/2] Building Web Frontend Assets (dist)...
call npm run build

echo [2/2] Compiling Java Backend (com.healthone)...
if not exist "backend\bin" mkdir backend\bin
powershell -Command "Get-ChildItem -Path backend\src -Filter *.java -Recurse | ForEach-Object { '\"' + $_.FullName.Replace('\', '/') + '\"' } | Set-Content -Path 'backend\sources.txt'; javac -encoding UTF-8 -d backend\bin '@backend\sources.txt'; Remove-Item 'backend\sources.txt'"

echo ===============================================================================
echo  Build Complete! Run `run.bat` or `powershell ./run.ps1` to launch.
echo ===============================================================================
