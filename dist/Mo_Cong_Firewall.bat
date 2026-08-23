@echo off
title Mo Cong 4001 Tuong Lua Windows - Vinmec OCP2
chcp 65001 >nul
echo ========================================================================
echo  🛡️ TỰ ĐỘNG MỞ CỔNG 4001 TƯỜNG LỬA (WINDOWS FIREWALL)
echo ========================================================================
echo.
echo  Đang kiểm tra quyền Administrator...

net session >nul 2>&1
if %errorlevel% neq 0 (
    echo.
    echo  ❌ Vui lòng nhấp CHUỘT PHẢI vào file này và chọn:
    echo     "Run as administrator" (Chạy với quyền quản trị viên)!
    echo.
    pause
    exit /b
)

echo  ✅ Đang thêm quy tắc cho phép cổng 4001 qua Windows Firewall...
netsh advfirewall firewall delete rule name="Vinmec Port 4001" >nul 2>&1
netsh advfirewall firewall add rule name="Vinmec Port 4001" dir=in action=allow protocol=TCP localport=4001 profile=any >nul 2>&1

echo.
echo ========================================================================
echo  🎉 ĐÃ MỞ THÀNH CÔNG CỔNG 4001!
echo  👉 Các máy khác trong mạng LAN/Wi-Fi bệnh viện đã có thể truy cập.
echo ========================================================================
echo.
pause
