import os
import zipfile
import shutil

ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
DIST_DIR = os.path.join(ROOT_DIR, "dist")
PUBLIC_DIR = os.path.join(ROOT_DIR, "public")
ZIP_OUTPUT = os.path.join(PUBLIC_DIR, "solariot_deploy_bundle.zip")

print("Building production bundle zip...")

# Ensure dist exists
if not os.path.exists(DIST_DIR):
    print("Warning: dist/ does not exist. Run 'npm run build' first.")

# Create the zip file
with zipfile.ZipFile(ZIP_OUTPUT, 'w', zipfile.ZIP_DEFLATED) as zipf:
    # 1. Add all files in dist/
    for root, dirs, files in os.walk(DIST_DIR):
        for file in files:
            full_path = os.path.join(root, file)
            # Store in zip inside a 'dist' folder
            arcname = os.path.relpath(full_path, ROOT_DIR)
            zipf.write(full_path, arcname)
            
    # 2. Add firebase.json
    firebase_json = os.path.join(ROOT_DIR, "firebase.json")
    if os.path.exists(firebase_json):
        zipf.write(firebase_json, "firebase.json")
        
    # 3. Add .firebaserc
    firebaserc = os.path.join(ROOT_DIR, ".firebaserc")
    if os.path.exists(firebaserc):
        zipf.write(firebaserc, ".firebaserc")

    # 4. Create standalone 1-click deploy.bat for Windows
    deploy_bat_content = """@echo off
TITLE Deploy Farm.IOT to Firebase Hosting
COLOR 0A
echo ==============================================================================
echo        Farm.IOT / Solar.IOT - 1-Click Firebase Hosting Deployer
echo ==============================================================================
echo.
echo Target Project: solariot-f49f5
echo Public Directory: ./dist (Pre-compiled production build)
echo.

WHERE npx >nul 2>nul
IF %ERRORLEVEL% NEQ 0 (
    COLOR 0C
    echo [ERROR] Node.js / npx was not detected on your computer!
    echo Please install Node.js from https://nodejs.org and then run this script again.
    echo.
    pause
    exit /b 1
)

echo [Step 1/2] Authenticating with Firebase...
echo (A browser window will open if you are not logged in yet. Log in with your secondary Firebase account)
echo.
call npx -y firebase-tools login

echo.
echo [Step 2/2] Publishing files to Firebase Hosting (solariot-f49f5)...
echo.
call npx -y firebase-tools deploy --only hosting --project solariot-f49f5

if %ERRORLEVEL% EQU 0 (
    COLOR 0A
    echo.
    echo ==============================================================================
    echo  SUCCESS! Your app is now published live on:
    echo  - https://solariot-f49f5.web.app
    echo  - https://solariot-f49f5.firebaseapp.com
    echo  - And any connected custom domains (.com / .in)
    echo ==============================================================================
) else (
    COLOR 0C
    echo.
    echo [ERROR] Deployment encountered an issue. Please check the log messages above.
)

echo.
pause
"""
    zipf.writestr("deploy.bat", deploy_bat_content)

    # 5. Create standalone 1-click deploy.sh for Mac / Linux
    deploy_sh_content = """#!/usr/bin/env bash
set -e

echo "=============================================================================="
echo "       Farm.IOT / Solar.IOT - 1-Click Firebase Hosting Deployer"
echo "=============================================================================="
echo ""
echo "Target Project: solariot-f49f5"
echo "Public Directory: ./dist (Pre-compiled production build)"
echo ""

if ! command -v npx &> /dev/null; then
    echo "[ERROR] Node.js / npx not found on this system."
    echo "Please install Node.js from https://nodejs.org and re-run this script."
    exit 1
fi

echo "[Step 1/2] Authenticating with Firebase..."
echo "Log into your secondary account when prompted in the browser."
npx -y firebase-tools login

echo ""
echo "[Step 2/2] Publishing to Firebase Hosting (solariot-f49f5)..."
npx -y firebase-tools deploy --only hosting --project solariot-f49f5

echo ""
echo "=============================================================================="
echo " SUCCESS! Your website is live:"
echo " - https://solariot-f49f5.web.app"
echo " - https://solariot-f49f5.firebaseapp.com"
echo "=============================================================================="
"""
    zipf.writestr("deploy.sh", deploy_sh_content)

    # 6. Create Quickstart README
    readme_content = """==============================================================================
Farm.IOT / Solar.IOT - Production Deployment Package
Target Firebase Project: solariot-f49f5
==============================================================================

WHAT IS IN THIS FOLDER:
-----------------------
1. dist/          : Complete pre-built, production-optimized React web app.
2. firebase.json  : Hosting configuration with single-page app rewrites.
3. .firebaserc    : Pre-configured project alias for solariot-f49f5.
4. deploy.bat     : 1-Click double-clickable deploy script for Windows.
5. deploy.sh      : 1-Click deploy script for Mac / Linux.

HOW TO DEPLOY (3 EASY STEPS):
-----------------------------
1. Extract all files in this ZIP folder to any location on your PC or laptop.
2. Ensure Node.js is installed on your computer (download free at https://nodejs.org if needed).
3. Run the deploy script:
   - On Windows: Double-click 'deploy.bat'
   - On Mac/Linux: Open Terminal in this folder and run 'bash deploy.sh'

AUTHENTICATION:
---------------
When you run the deploy script for the first time, a web browser tab will open asking you to sign in with your Google / Firebase account.
Sign in with the secondary Google account that owns the 'solariot-f49f5' Firebase project.

ONCE DEPLOYED:
--------------
Your app will be immediately accessible worldwide at:
- https://solariot-f49f5.web.app
- https://solariot-f49f5.firebaseapp.com
- Any custom domain (.com or .in) you connect in the Firebase Console!

Note: Your hardware ESP8266 / NodeMCU microcontrollers will automatically communicate with the deployed web app through the configured cloud database bridge.
==============================================================================
"""
    zipf.writestr("README.txt", readme_content)

print(f"Deploy bundle generated successfully: {ZIP_OUTPUT} ({os.path.getsize(ZIP_OUTPUT)} bytes)")
