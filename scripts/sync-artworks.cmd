@echo off
setlocal
set "SCRIPT_DIR=%~dp0"

powershell -NoProfile -ExecutionPolicy Bypass -File "%SCRIPT_DIR%sync-artworks.ps1" -VerboseOutput
set "SYNC_EXIT=%ERRORLEVEL%"

echo.
if "%SYNC_EXIT%"=="0" (
  echo Artwork sync completed successfully.
) else (
  echo Artwork sync failed with exit code %SYNC_EXIT%.
)

echo Press any key to close this window...
pause >nul

exit /b %SYNC_EXIT%
