@echo off
echo ===============================================================================
echo                Building Health-One Complete Java Application
echo ===============================================================================

echo [1/2] Building Web Frontend Assets (dist)...
call npm run build

echo [2/2] Compiling Java Backend (com.healthone)...
powershell -ExecutionPolicy Bypass -File .\compile_java.ps1

echo ===============================================================================
echo  Build Complete! Run `run.bat` or `powershell ./run.ps1` to launch.
echo ===============================================================================
