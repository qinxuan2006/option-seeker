@echo off
echo Starting Option Seeker Frontend...
cd /d %~dp0frontend
npm install
npm run dev
