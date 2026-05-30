@echo off
setlocal
pushd "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File "%~dp0launch-localhost.ps1"
popd
endlocal
