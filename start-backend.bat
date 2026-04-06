@echo off
echo Starting Option Seeker Backend (FastAPI)...
cd backend
py -3.14 -m uvicorn main:app --host 0.0.0.0 --port 8000
