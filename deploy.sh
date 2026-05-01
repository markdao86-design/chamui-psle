#!/usr/bin/env bash
# 一键同时部署到 Firebase + GitHub Pages (Mac/Linux/Git Bash 用)
# 用法: ./deploy.sh "commit 消息"  (省略消息则用时间戳)
set -e
cd "$(dirname "$0")"

MSG="${1:-deploy $(date +'%Y-%m-%d %H:%M')}"

echo
echo "============================================"
echo "  佑子 PSLE 一键部署"
echo "  Commit msg: $MSG"
echo "============================================"

echo
echo "[1/3] 合并单文件 chamui_app_single.html ..."
python build.py

echo
echo "[2/3] 推到 GitHub (自动触发 GitHub Pages 1-2 min 后更新) ..."
git add -A
if git diff --cached --quiet; then
  echo "  (没有改动,跳过 commit/push)"
else
  git commit -m "$MSG"
  git push
fi

echo
echo "[3/3] 部署到 Firebase Hosting ..."
./node_modules/.bin/firebase deploy --only hosting

echo
echo "============================================"
echo "  ✅ 部署完成"
echo
echo "  Firebase:  https://chamui-psle.web.app"
echo "  GitHub:    https://markdao86-design.github.io/chamui-psle/  (~1-2 min)"
echo "============================================"
