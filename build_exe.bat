@echo off
title Build Executables - Vinmec OCP2
chcp 65001 >nul
echo ========================================================================
echo  🔨 ĐANG ĐÓNG GÓI ỨNG DỤNG THÀNH FILE .EXE ĐỘC LẬP
echo ========================================================================
echo.

npm run build:exe

if %errorlevel% equ 0 (
    echo.
    echo ========================================================================
    echo  🎉 BUILD THÀNH CÔNG!
    echo  📁 Các file .exe mới đã được tạo tại thư mục: dist/
    echo     - dist/vinmec-server.exe
    echo     - dist/vinmec-migrate.exe
    echo ========================================================================
) else (
    echo.
    echo ❌ Có lỗi xảy ra trong quá trình build!
)

echo.
pause
