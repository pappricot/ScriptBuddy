@echo off
echo Installing Python...
where python >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo Downloading Python installer...
    powershell -Command "Invoke-WebRequest -Uri https://www.python.org/ftp/python/3.11.5/python-3.11.5-amd64.exe -OutFile python-installer.exe"
    echo Installing Python...
    python-installer.exe /quiet InstallAllUsers=1 PrependPath=1
    del python-installer.exe
)

echo Installing Python dependencies...
pip install flask flask-cors transformers torch

echo Installing Node.js...
where node >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo Downloading Node.js installer...
    powershell -Command "Invoke-WebRequest -Uri https://nodejs.org/dist/v20.12.0/node-v20.12.0-x64.msi -OutFile node-installer.msi"
    echo Installing Node.js...
    msiexec /i node-installer.msi /quiet
    del node-installer.msi
)

echo Installing frontend dependencies...
cd frontend
npm install
cd ..
echo Setup complete!
pause