@echo off
setlocal

set "REPO_ROOT=%~dp0"
set "FLUTTER_BAT=%REPO_ROOT%flutter_sdk\flutter\bin\flutter.bat"
set "MINGIT_CMD=%REPO_ROOT%tools\mingit\cmd"

if not exist "%FLUTTER_BAT%" (
  echo Flutter bulunamadi: %FLUTTER_BAT%
  exit /b 1
)

if exist "%MINGIT_CMD%\git.exe" (
  set "PATH=%MINGIT_CMD%;%PATH%"
)

call "%FLUTTER_BAT%" %*
exit /b %ERRORLEVEL%
