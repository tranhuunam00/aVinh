@echo off
title Sao Luu Du Lieu - Vinmec OCP2
chcp 65001 >nul
echo ========================================================================
echo  📦 BỆNH VIỆN ĐA KHOA QUỐC TẾ VINMEC OCEAN PARK 2
echo  💾 TIỆN ÍCH SAO LƯU DỮ LIỆU BÁO CÁO GIAO BAN (SQLITE BACKUP)
echo ========================================================================
echo.

node scripts/backup.js

echo.
pause
