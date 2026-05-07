@echo off
REM 一键同时部署到 Firebase + GitHub Pages
REM 用法:
REM   双击运行 → 用默认 commit 消息(时间戳)
REM   或命令行 deploy.bat "commit 消息"
chcp 65001 >nul 2>&1
cd /d "%~dp0"

set "MSG=%~1"
if "%MSG%"=="" set "MSG=deploy %date:~0,10% %time:~0,5%"

echo.
echo ============================================
echo   佑子 PSLE 一键部署
echo   Commit msg: %MSG%
echo ============================================

echo.
echo [1/3] 合并单文件 chamui_app_single.html ...
python build.py
if errorlevel 1 goto :error

echo.
echo [2/3] 推到 GitHub (会自动触发 GitHub Pages 1-2 min 后更新) ...
git add -A
git diff --cached --quiet
if errorlevel 1 (
  git commit -m "%MSG%"
  if errorlevel 1 goto :error
  git push
  if errorlevel 1 goto :error
) else (
  echo   (没有改动,跳过 commit/push)
)

echo.
echo [3/3] 部署到 Firebase Hosting ...
call "%~dp0node_modules\.bin\firebase.cmd" deploy --only hosting
if errorlevel 1 goto :error

echo.
echo ============================================
echo   ✅ 部署完成
echo.
echo   Firebase:  https://chamui-psle.web.app
echo   GitHub:    https://markdao86-design.github.io/chamui-psle/  (~1-2 min 后生效)
echo.
echo   GitHub repo: https://github.com/markdao86-design/chamui-psle
echo ============================================
echo.
pause
exit /b 0

:error
echo.
echo ============================================
echo   ❌ 部署中出错,看上面错误信息
echo ============================================
echo.
pause
exit /b 1
