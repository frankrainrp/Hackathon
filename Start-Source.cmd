@echo off
setlocal
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0tools\start-source.ps1" -Install %*
set "result=%errorlevel%"
if not "%result%"=="0" if not defined BUTLER_SOURCE_NO_PAUSE pause
exit /b %result%
