@echo off
REM Registers MariaDB as a Windows service so the database starts
REM automatically with Windows. Right-click this file and choose
REM "Run as administrator".

"C:\Program Files\MariaDB 12.3\bin\mysqld.exe" --install MariaDB
if %errorlevel% neq 0 (
  echo.
  echo Failed - make sure you ran this as administrator.
  pause
  exit /b 1
)
net start MariaDB
echo.
echo Done! MariaDB now runs as a Windows service and starts on boot.
pause
