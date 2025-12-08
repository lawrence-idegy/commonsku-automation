@echo off
REM ========================================
REM Friday Reports - FIXED VERSION
REM This WILL stay open and show progress
REM ========================================

SETLOCAL EnableDelayedExpansion

cls
echo.
echo ============================================
echo   CommonSKU Friday Reports Generator
echo ============================================
echo.
echo This will generate 18 reports:
echo   - Today (3 reports)
echo   - This Week (3 reports)
echo   - Last Week (3 reports)
echo   - This Month (3 reports)
echo   - Last Month (3 reports)
echo   - This Year/YTD (3 reports)
echo.
echo Estimated time: 10-12 minutes
echo.
echo The browser will open and you'll see it working!
echo.
echo Press CTRL+C to cancel, or
pause

REM Change to project directory
cd /d "C:\Users\Lawrence\Downloads\CCC\commonsku-automation"

echo.
echo ============================================
echo   STARTING AUTOMATION
echo ============================================
echo.

REM Check if compiled
if not exist "dist\index.js" (
    echo Building TypeScript...
    call npm run build
    if errorlevel 1 (
        echo.
        echo ERROR: Build failed!
        pause
        exit /b 1
    )
    echo Build complete!
    echo.
)

REM Create folders
if not exist "downloads" mkdir downloads
if not exist "logs" mkdir logs

echo Starting Friday reports...
echo.
echo Command: npm run friday
echo.
echo ============================================
echo.

REM Record start time
echo Start Time: %TIME%
echo.

REM Run the actual command - THIS WILL TAKE 10-12 MINUTES
call npm run friday

REM Record end time
echo.
echo End Time: %TIME%
echo.

REM Check results
echo.
echo ============================================
echo   CHECKING RESULTS
echo ============================================
echo.

REM Count CSV files
set /a COUNT=0
for /r downloads %%F in (*.csv) do set /a COUNT+=1

echo Total CSV files in downloads: %COUNT%
echo.

if %COUNT% GTR 0 (
    echo SUCCESS! Reports generated!
    echo.
    echo Files are in: %CD%\downloads\
    echo.

    REM Show folder structure
    echo Folder structure:
    dir downloads /ad /b 2>nul
    echo.

    REM Ask to open folder
    choice /c YN /m "Open downloads folder now? (Y/N)"
    if errorlevel 2 goto end
    if errorlevel 1 start "" explorer "%CD%\downloads"
) else (
    echo.
    echo WARNING: No CSV files found!
    echo Check logs\combined.log for details
    echo.
)

:end
echo.
echo ============================================
echo   DONE
echo ============================================
echo.
echo Press any key to exit...
pause >nul
exit /b 0
