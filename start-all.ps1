Write-Host "========================================" -ForegroundColor Cyan
Write-Host " Starting DPDPA Compliance Platform...  " -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# Start Backend in a new process
Write-Host "Launching Backend API (Uvicorn)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd backend; python -m uvicorn app.main:app --port 8000 --host 0.0.0.0 --reload"

# Start Frontend in a new process
Write-Host "Launching Frontend Dev Server (Vite)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd frontend; npm run dev -- --host"

Write-Host "Both services launched successfully!" -ForegroundColor Green
Write-Host "Backend API: http://localhost:8000" -ForegroundColor Green
Write-Host "Frontend App: http://localhost:5173" -ForegroundColor Green
