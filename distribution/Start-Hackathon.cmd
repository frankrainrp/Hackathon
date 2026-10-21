@echo off
setlocal
cd /d "%~dp0"
"%~dp0runtime\node.exe" "%~dp0Launch.cjs"
if errorlevel 1 pause
endlocal
