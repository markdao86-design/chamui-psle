#!/usr/bin/env bash
# 拉孩子 Firebase 真实状态 — 看 totalPoints / ⭐ / 错题本 / Cloze 正确率
# 用法:
#   ./dump_firebase.sh           只看关键指标
#   ./dump_firebase.sh --full    + 保存完整 state JSON

cd "$(dirname "$0")"
node dump_firebase.js "$@"
