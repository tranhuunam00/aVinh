@echo off
title Sao Luu Du Lieu - Vinmec OCP2
chcp 65001 >nul
echo ========================================================================
echo  📦 BỆNH VIỆN ĐA KHOA QUỐC TẾ VINMEC OCEAN PARK 2
echo  💾 TIỆN ÍCH SAO LƯU DỮ LIỆU BÁO CÁO GIAO BAN (SQLITE BACKUP)
echo ========================================================================
echo.

set "DATA_DIR=data"
set "BACKUP_DIR=data\backups"

if not exist "%DATA_DIR%\vinmec.sqlite" (
    echo ❌ Không tìm thấy file dữ liệu: %DATA_DIR%\vinmec.sqlite
    echo.
    pause
    exit /b 1
)

if not exist "%BACKUP_DIR%" (
    mkdir "%BACKUP_DIR%"
)

for /f "tokens=2 delims==" %%I in ('wmic os get localdatetime /value') do set dt=%%I
set "TIMESTAMP=%dt:~0,4%-%dt:~4,2%-%dt:~6,2%_%dt:~8,2%-%dt:~10,2%-%dt:~12,2%"
set "BACKUP_FILE=%BACKUP_DIR%\vinmec_backup_%TIMESTAMP%.sqlite"

copy /y "%DATA_DIR%\vinmec.sqlite" "%BACKUP_FILE%" >nul

if %errorlevel% equ 0 (
    echo  ✅ ĐÃ SAO LƯU THÀNH CÔNG!
    echo  📁 File lưu tại: %BACKUP_FILE%
    echo ========================================================================
) else (
    echo  ❌ Lỗi khi sao lưu dữ liệu!
)

echo.
pause
