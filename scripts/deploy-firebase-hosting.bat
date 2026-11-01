@echo off
REM ==============================================================================
REM Farm.IOT / Solar.IOT - Firebase Hosting Deploy Script for Windows
REM ==============================================================================

echo [1/2] Building production bundle...
call npm run build

if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Build failed! Please fix errors before deploying.
    exit /b %ERRORLEVEL%
)

echo.
echo [2/2] Deploying to Firebase Hosting...
if "%~1"=="" (
    echo Deploying using default/active project...
    npx -y firebase-tools deploy --only hosting
) else (
    echo Deploying to secondary project: %~1
    npx -y firebase-tools deploy --only hosting --project %~1
)

echo.
echo Done! Your app is live on Firebase Hosting.
pause
