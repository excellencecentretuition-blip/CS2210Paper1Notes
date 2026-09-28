@echo off
cd /d "%~dp0"
echo Starting Paper 1 at http://127.0.0.1:8787/Paper1/
start "CS Paper 1 server" /MIN node "%~dp0server.js"
ping 127.0.0.1 -n 2 >nul
start "" "http://127.0.0.1:8787/Paper1/"
echo.
echo Leave the minimized "CS Paper 1 server" window running while you use the app.
echo Close that window when you want to stop it.
pause
