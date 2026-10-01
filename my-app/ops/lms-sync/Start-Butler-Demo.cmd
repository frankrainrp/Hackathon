@echo off
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0portable-launch.ps1" -Demo
if errorlevel 1 pause
