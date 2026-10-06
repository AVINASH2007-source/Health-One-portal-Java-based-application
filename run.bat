@echo off
echo ===============================================================================
echo                HEALTH-ONE LIFETIME DIGITAL HEALTH PORTAL
echo                     Launching Java Application Server
echo ===============================================================================

if not exist "backend\bin" (
    echo [*] Compiling Java backend classes...
    call build.bat
)

echo [*] Starting Java Application on http://localhost:8080 ...
java -cp backend\bin com.healthone.Main
pause
