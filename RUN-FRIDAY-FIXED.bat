@echo off
REM ========================================
REM Friday SR Reports - FIXED VERSION
REM This WILL stay open and show progress
REM Sales Rep reports ONLY (not dash/pipe)
REM ========================================

SETLOCAL EnableDelayedExpansion

cls
echo.
echo ============================================
echo   CommonSKU Friday SR Reports Generator
echo ============================================
echo.
echo This will generate 6 Sales Rep reports:
echo   - Today (1 report)
echo   - This Week (1 report)
echo   - Last Week (1 report)
echo   - This Month (1 report)
echo   - Last Month (1 report)
echo   - This Year/YTD (1 report)
echo.
echo Estimated time: 3-5 minutes
echo.
echo The browser will open and you'll see it working!
echo.
echo Press CTRL+C to cancel, or
pause

REM Change to project directory
cd /d "C:\Users\Lawrence\Downloads\Work - Idegy\Operations\CCC\commonsku-automation"

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

echo Starting Friday SR reports...
echo.
echo Command: npm run sr-friday
echo.
echo ============================================
echo.

REM Record start time
echo Start Time: %TIME%
echo.

REM Run the actual command - THIS WILL TAKE 3-5 MINUTES
call npm run sr-friday

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
