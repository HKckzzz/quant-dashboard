@echo off
cd /d "d:\HuaweiMoveData\Users\ckz00\Desktop\量化模型"

echo.
echo   ==========================================
echo      量化投资仪表盘 - 启动中...
echo   ==========================================
echo.

echo [1/3] 启动后端...
start "Backend" cmd /k "cd /d backend && python -m uvicorn main:app --host 127.0.0.1 --port 8000"

timeout /t 3 /nobreak >nul

echo [2/3] 启动前端...
start "Frontend" cmd /k "cd /d frontend && npx vite --host 127.0.0.1 --port 5173"

timeout /t 4 /nobreak >nul

echo [3/3] 启动手机穿透...
start "Tunnel" cmd /k "npx lt --port 5173 --local-host 127.0.0.1"

timeout /t 5 /nobreak >nul

start http://localhost:5173

echo.
echo   ==========================================
echo    启动完成！
echo.
echo    电脑打开: http://localhost:5173
echo.
echo    手机打开: 看「Tunnel」那个黑窗口里显示的链接
echo    格式类似: https://xxxx.loca.lt
echo   ==========================================
echo.
pause
