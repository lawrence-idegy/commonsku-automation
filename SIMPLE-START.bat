@echo off
REM ========================================
REM CommonSKU Reports - SIMPLE LAUNCHER
REM Just shows menu and runs reports
REM ========================================

SETLOCAL EnableDelayedExpansion

REM Set colors
set "GREEN=[92m"
set "YELLOW=[93m"
set "RED=[91m"
set "BLUE=[94m"
set "CYAN=[96m"
set "MAGENTA=[95m"
set "RESET=[0m"

:MENU
cls
echo.
echo %MAGENTA%========================================%RESET%
echo %MAGENTA%    CommonSKU Report Generator%RESET%
echo %MAGENTA%========================================%RESET%
echo.
echo %CYAN%What would you like to do?%RESET%
echo.
echo   %GREEN%[1]%RESET% Generate Friday SR Reports (6 Sales Rep reports)
echo   %BLUE%[2]%RESET% Generate Daily SR Report (1 Sales Rep report)
echo   %YELLOW%[3]%RESET% Open Downloads Folder
echo   %YELLOW%[4]%RESET% View Logs
echo   %RED%[5]%RESET% Exit
echo.
echo %CYAN%========================================%RESET%
echo.

set /p choice="Enter your choice (1-5): "

if "%choice%"=="1" goto FRIDAY
if "%choice%"=="2" goto DAILY
if "%choice%"=="3" goto DOWNLOADS
if "%choice%"=="4" goto LOGS
if "%choice%"=="5" goto EXIT

echo %RED%Invalid choice! Please enter 1-5.%RESET%
timeout /t 2 >nul
goto MENU

:FRIDAY
cls
echo.
echo %GREEN%Starting Friday SR Reports (6 Sales Rep reports)...%RESET%
echo.
call RUN-FRIDAY-FIXED.bat
echo.
echo %YELLOW%Press any key to return to menu...%RESET%
pause >nul
goto MENU

:DAILY
cls
echo.
echo %BLUE%Starting Daily SR Report (1 Sales Rep report)...%RESET%
echo.
call run-daily-reports.bat
echo.
echo %YELLOW%Press any key to return to menu...%RESET%
pause >nul
goto MENU

:DOWNLOADS
cls
echo.
echo %YELLOW%Opening downloads folder...%RESET%
echo.
start "" explorer "%CD%\downloads"
timeout /t 1 >nul
goto MENU

:LOGS
cls
echo.
echo %YELLOW%Opening logs folder...%RESET%
echo.
start "" explorer "%CD%\logs"
timeout /t 1 >nul
goto MENU

:EXIT
cls
echo.
echo %GREEN%Thank you for using CommonSKU Report Generator!%RESET%
echo.
timeout /t 1 >nul
exit /b 0
