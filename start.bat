@echo off
echo Starting InPlace backend (port 5002) and frontend (port 5175)...
start "InPlace Backend" cmd /k "cd backend && npm run dev"
start "InPlace Frontend" cmd /k "cd frontend && npm run dev"
