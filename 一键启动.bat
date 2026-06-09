@echo off
chcp 65001 >nul
title 量化投资仪表盘

echo ========================================
echo    📈 量化投资仪表盘 - 启动中...
echo ========================================
echo.

cd /d "d:\HuaweiMoveData\Users\ckz00\Desktop\量化模型"

echo [1/2] 启动后端服务...
start "量化后端" cmd /k "cd /d d:\HuaweiMoveData\Users\ckz00\Desktop\量化模型\backend && python -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload"

echo [2/2] 启动前端页面...
start "量化前端" cmd /k "cd /d d:\HuaweiMoveData\Users\ckz00\Desktop\量化模型\frontend && npm run dev"

timeout /t 5 >nul
start "" http://localhost:5173

echo.
echo ========================================
echo   ✅ 启动完成！
echo   浏览器将自动打开 http://localhost:5173
echo   如果没打开，手动复制这个地址到浏览器
echo.
echo   关闭此窗口不影响使用
echo ========================================
echo.
pause
