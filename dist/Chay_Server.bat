@echo off
title He Thong Bao Cao Giao Ban - Vinmec OCP2
chcp 65001 >nul
echo ========================================================================
echo  🏥 BỆNH VIỆN ĐA KHOA QUỐC TẾ VINMEC OCEAN PARK 2
echo  🚀 HỆ THỐNG BÁO CÁO GIAO BAN HOẠT ĐỘNG NGÀY
echo ========================================================================
echo.
echo  ⏳ Đang khởi động hệ thống...
echo  🌐 Trình duyệt Web sẽ tự động mở sau 2 giây...
echo.
echo  ⚠️  LƯU Ý: Vui lòng KHÔNG ĐÓNG cửa sổ này trong khi đang sử dụng!
echo ========================================================================
echo.

start "" http://localhost:4001
vinmec-server.exe
pause
