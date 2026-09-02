@echo off
setlocal
set "SCRIPT_DIR=%~dp0"

set "COMMIT_MSG=%~1"
if "%COMMIT_MSG%"=="" set "COMMIT_MSG=Update site content"

powershell -NoProfile -ExecutionPolicy Bypass -File "%SCRIPT_DIR%push-site.ps1" -Message "%COMMIT_MSG%"
set "PUSH_EXIT=%ERRORLEVEL%"

echo.
if "%PUSH_EXIT%"=="0" (
  echo Push completed successfully.
) else (
  echo Push failed with exit code %PUSH_EXIT%.
)

echo Press any key to close this window...
pause >nul

exit /b %PUSH_EXIT%
