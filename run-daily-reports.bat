@echo off
REM ========================================
REM CommonSKU Daily Reports - One Click
REM Generates today's 3 reports quickly
REM ========================================

SETLOCAL EnableDelayedExpansion

REM Set colors
set "GREEN=[92m"
set "YELLOW=[93m"
set "RED=[91m"
set "BLUE=[94m"
set "RESET=[0m"

REM Store start time
set START_TIME=%TIME%

REM Clear screen and show banner
cls
echo.
echo %BLUE%========================================%RESET%
echo %BLUE%  CommonSKU Daily Reports Generator%RESET%
echo %BLUE%========================================%RESET%
echo.
echo %YELLOW%Starting daily reports...%RESET%
echo.

REM Change to the project directory
cd /d "C:\Users\Lawrence\Downloads\CCC\commonsku-automation"

REM Check if node_modules exists
if not exist "node_modules" (
    echo %RED%ERROR: node_modules not found!%RESET%
    echo %YELLOW%Please run: npm install%RESET%
    pause
    exit /b 1
)

REM Check if TypeScript is compiled
if not exist "dist" (
    echo %YELLOW%Compiling TypeScript...%RESET%
    call npm run build
    if errorlevel 1 (
        echo %RED%Build failed!%RESET%
        pause
        exit /b 1
    )
    echo %GREEN%Build completed!%RESET%
    echo.
)

REM Create directories if they don't exist
if not exist "logs" mkdir logs
if not exist "downloads" mkdir downloads

REM Save output to log file
set LOG_FILE=logs\daily-run-%date:~-4,4%%date:~-10,2%%date:~-7,2%-%time:~0,2%%time:~3,2%%time:~6,2%.log
set LOG_FILE=%LOG_FILE: =0%

echo %GREEN%Log file: %LOG_FILE%%RESET%
echo.

REM Run daily reports
echo %BLUE%====================================%RESET%
echo %BLUE%  Generating Today's Reports%RESET%
echo %BLUE%====================================%RESET%
echo.
echo Reports to be generated:
echo   1. Dashboard Report (Today)
echo   2. Pipeline Report (Today)
echo   3. Sales Rep Report (Today)
echo.
echo %GREEN%Total: 3 reports%RESET%
echo.
echo %YELLOW%This will take approximately 1-2 minutes...%RESET%
echo.
echo %YELLOW%Starting in 2 seconds...%RESET%
timeout /t 2 /nobreak > nul
echo.

REM Run the daily reports command
echo %GREEN%Executing: npm run daily%RESET%
echo.
call npm run daily

REM Check if successful
if errorlevel 1 (
    echo.
    echo %RED%========================================%RESET%
    echo %RED%  ERROR: Report generation failed!%RESET%
    echo %RED%========================================%RESET%
    echo.
    echo %YELLOW%Check the log file for details:%RESET%
    echo %LOG_FILE%
    echo.
    echo %YELLOW%Press any key to view logs...%RESET%
    pause > nul
    start notepad "%LOG_FILE%"
    exit /b 1
)

REM Success message
echo.
echo %GREEN%========================================%RESET%
echo %GREEN%  SUCCESS! Daily Reports Generated%RESET%
echo %GREEN%========================================%RESET%
echo.

REM Calculate elapsed time
set END_TIME=%TIME%
echo %BLUE%Start Time:%RESET% %START_TIME%
echo %BLUE%End Time:%RESET% %END_TIME%
echo.

REM Show file locations
echo %YELLOW%Reports saved to:%RESET%
echo   %CD%\downloads\
echo.
echo %YELLOW%Files generated:%RESET%
dir /b downloads\*-daily-*.csv 2>nul
dir /b downloads\*-monday-*.csv 2>nul
dir /b downloads\*-tuesday-*.csv 2>nul
dir /b downloads\*-wednesday-*.csv 2>nul
dir /b downloads\*-thursday-*.csv 2>nul
dir /b downloads\*-friday-*.csv 2>nul
echo.

REM Ask to open downloads folder
echo %YELLOW%Would you like to open the downloads folder? (Y/N)%RESET%
choice /c YN /n /m "Press Y for Yes, N for No: "
if errorlevel 2 goto :skip_open
if errorlevel 1 (
    echo.
    echo %GREEN%Opening downloads folder...%RESET%
    start "" explorer "%CD%\downloads"
)

:skip_open
echo.
echo %GREEN%All done! :)%RESET%
echo.
echo %YELLOW%Press any key to exit...%RESET%
pause > nul

exit /b 0
