#!/bin/bash

# ANSI colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${CYAN}========================================${NC}"
echo -e "${CYAN} Starting DPDPA Compliance Platform...  ${NC}"
echo -e "${CYAN}========================================${NC}"

# Function to stop background processes on exit
cleanup() {
    echo -e "\n${YELLOW}Stopping servers...${NC}"
    kill "$BACKEND_PID" "$FRONTEND_PID" 2>/dev/null
    exit
}
trap cleanup SIGINT SIGTERM

# Start Backend
echo -e "${YELLOW}Launching Backend API (Uvicorn)...${NC}"
cd backend
python -m uvicorn app.main:app --port 8000 --host 0.0.0.0 --reload &
BACKEND_PID=$!
cd ..

# Start Frontend
echo -e "${YELLOW}Launching Frontend Dev Server (Vite)...${NC}"
cd frontend
npm run dev -- --host &
FRONTEND_PID=$!
cd ..

echo -e "${GREEN}Both services launched successfully!${NC}"
echo -e "${GREEN}Backend API: http://localhost:8000${NC}"
echo -e "${GREEN}Frontend App: http://localhost:5173${NC}"
echo -e "${YELLOW}Press CTRL+C to terminate both servers.${NC}"

# Keep script running to wait for background jobs
wait
