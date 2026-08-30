@echo off
REM ---------------------------------------------------------------------------
REM  Belong Field Operations - one double-click to run it locally on Windows.
REM
REM  Installs, builds, opens the browser and starts the server. Written as a
REM  .bat rather than documented commands because PowerShell blocks npm's
REM  script by default and the person demonstrating this should not have to
REM  care: double-clicking a batch file runs it through cmd, which does not.
REM ---------------------------------------------------------------------------
setlocal
cd /d "%~dp0"

echo.
echo  ===============================================
echo   Belong Field Operations - starting locally
echo  ===============================================
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo  Node.js is not installed.
  echo.
  echo  Install the LTS version from https://nodejs.org
  echo  then run this file again.
  echo.
  pause
  exit /b 1
)

for /f "delims=" %%v in ('node -v') do set NODEV=%%v
echo  Node %NODEV% found.
echo.

echo  [1/3] Installing dependencies. About 15-60 seconds...
echo.
call npm install --no-audit --no-fund
if errorlevel 1 goto failed

echo.
echo  [2/3] Building...
echo.
call npm run build
if errorlevel 1 goto failed

echo.
echo  [3/3] Starting the server.
echo.
echo  The browser opens by itself in a few seconds.
echo  If it does not, go to:  http://localhost:3000
echo.
echo  To stop it: close this window, or press Ctrl+C.
echo.
start "" cmd /c "timeout /t 7 >nul && start http://localhost:3000"
call npm run start
goto done

:failed
echo.
echo  ---------------------------------------------------------------
echo   Something failed above. Copy the red text and send it to Claude.
echo  ---------------------------------------------------------------
echo.
pause
exit /b 1

:done
pause
