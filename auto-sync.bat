@echo off
chcp 65001 >nul
cd /d "d:\site v.4"

echo ==========================================
echo   GitHub Auto-Sync
echo ==========================================
echo.

git add .
git commit -m "auto-sync: %date% %time%"

if %errorlevel%==0 (
    echo.
    echo Юкланмоқда...
    git push origin main
    echo.
    echo ✅ Синхронизация муваффақиятли!
) else (
    echo.
    echo ℹ️ Ўзгаришлар йўқ — юклаш шарт эмас.
)

echo.
echo ==========================================
pause
