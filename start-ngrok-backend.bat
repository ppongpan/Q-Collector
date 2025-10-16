@echo off
echo Starting ngrok tunnel for backend (port 5000)...
echo.
echo After ngrok starts, keep this window open!
echo Then run: npm run setup:ngrok
echo.
ngrok http 5000
