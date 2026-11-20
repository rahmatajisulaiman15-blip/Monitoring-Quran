@echo off
setlocal
cd /d "%~dp0"
title Tahfidz Monitor - Server Lokal

echo ==============================================
echo    Tahfidz Monitor - Monitoring Hafalan Qur'an
echo ==============================================
echo.

if not exist ".tools\node\node.exe" (
  echo [X] Folder .tools\node tidak ditemukan.
  echo     Jalankan file ini dari dalam folder proyek.
  echo.
  pause
  exit /b 1
)

if not exist "dist\index.html" (
  echo [!] Hasil build belum ada. Membangun antarmuka dulu...
  call .tools\node\npx.cmd vite build
  echo.
)

rem --- server sudah jalan? langsung buka browser ---
curl -s --max-time 2 http://127.0.0.1:8787/ >nul 2>&1
if %errorlevel%==0 goto :buka

echo Menyalakan server lokal di jendela baru...
start "Server Tahfidz Monitor" cmd /k ".tools\node\node.exe node_modules\wrangler\bin\wrangler.js dev --port 8787 --ip 127.0.0.1"

echo Menunggu server siap (maksimal 90 detik)...
set /a coba=0
:cek
set /a coba+=1
curl -s --max-time 2 http://127.0.0.1:8787/ >nul 2>&1
if %errorlevel%==0 goto :buka
if %coba% GEQ 90 goto :gagal
timeout /t 1 /nobreak >nul
goto :cek

:buka
echo Server siap. Membuka aplikasi di browser...
start "" chrome "http://127.0.0.1:8787"
if errorlevel 1 start "" "http://127.0.0.1:8787"
echo.
echo Jangan tutup jendela "Server Tahfidz Monitor" selama aplikasi dipakai.
timeout /t 3 /nobreak >nul
exit /b 0

:gagal
echo.
echo [X] Server belum siap setelah 90 detik.
echo     Periksa jendela "Server Tahfidz Monitor" untuk pesan error.
echo.
pause
exit /b 1
