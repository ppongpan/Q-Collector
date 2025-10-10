@echo off
echo Killing backend process on port 5000...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":5000.*LISTENING"') do (
    echo Killing PID %%a
    taskkill /F /PID %%a
)
timeout /t 2 /nobreak
echo Starting backend...
cd backend
npm start
