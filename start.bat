@echo off
echo Starting Sedgwick CMS...

:: API
start "Sedgwick API" cmd /k "cd /d C:\Sedgwick && npm run dev:api"

:: Frontend
start "Sedgwick Frontend" cmd /k "cd /d C:\Sedgwick && npm run dev:frontend"

:: Open browser after a short delay
timeout /t 5 /nobreak >nul
start "" "http://localhost:3000/login/sedgwick"

echo Done! API running on :7071 — Frontend on :3000
