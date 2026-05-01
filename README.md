# 佑子的 PSLE 备考冒险 (chamui-psle)

游戏化备考激励小工具 — 给新加坡 PSLE 2027 学生用的 26 周打卡 + 角色养成 + 多设备实时同步。

## 🌐 在线访问

**生产环境**: https://chamui-psle.web.app (Firebase Hosting + Firestore 同步)

**备份镜像**: https://markdao86-design.github.io/chamui-psle (GitHub Pages,本仓库自动部署)

> 两个 URL 对应同一份 Firestore 数据库 — 用任一打开都看到同一份打卡进度。

## 📁 文件说明

| 文件 | 用途 |
|------|------|
| `index.html` | UI 骨架 + 全部 CSS + Firebase 配置 |
| `character.js` | 佑子 SVG 角色(8 级 + 10 装备) |
| `data.js` | 26 周任务数据 + 状态/积分规则 + Firebase 同步层 |
| `app.js` | 主应用(每日打卡、周汇总、动画、相片上传) |
| `build.py` | 把上面 4 个文件合并成单文件部署版 |
| `chamui_app_single.html` | 单文件部署版(运行 build.py 生成) |
| `firebase.json` / `.firebaserc` | Firebase Hosting 配置 |
| `开发说明文档.md` | 完整项目文档(项目背景、业务规则、架构) |
| `部署指南.md` | Firebase 部署详细步骤 |
| `SETUP_FIREBASE.md` | Firebase 5 分钟设置教程 |

## 🚀 本地运行

```bash
# 任意 HTTP 服务器均可
python -m http.server 8000

# 浏览器开 http://localhost:8000/index.html
```

或直接双击合并版 `chamui_app_single.html`(无需服务器)。

## 🛠️ 开发流程

改完 `index.html` / `character.js` / `data.js` / `app.js` 任意一个后,**双击 `deploy.bat`** 就完事(Windows)。

`deploy.bat` 自动做这 3 件事:
1. `python build.py` 合并单文件
2. `git commit + push` → 触发 GitHub Pages 1-2 min 更新
3. `firebase deploy` → 立即更新 Firebase Hosting

非 Windows 用 `./deploy.sh "你的 commit 消息"`。

---

手动单独部署(需要时):
```bash
python build.py                        # 合并单文件
git add -A && git commit -m "..." && git push   # 推 GitHub (Pages 自动更新)
npx firebase deploy --only hosting     # 推 Firebase Hosting
```

## 📜 关键约束(改前必读)

- ❌ **不改** localStorage key (`chamui_psle_v1`,改了丢老数据)
- ❌ **不改** Firestore doc 路径 (`chamui/main`)
- ❌ **不改** 业务规则核心数值(积分、汇率、里程碑周)— 见 `开发说明文档.md` 第七部分
- ✅ **保持** 单文件部署能力 (`chamui_app_single.html` 双击就能玩)
- ✅ **保持** 离线可用(Firebase 不通时降级到 localStorage)

## 🔧 技术栈

- 纯前端 HTML/CSS/JS(无框架,无构建)
- Firebase Firestore(多设备同步)
- IndexedDB(作业照片本地存)
- Firebase Hosting + GitHub Pages 双备份

## 🎯 v4 评分体系

每个打卡 slot 实时 +N 分(段3=1, 段1/2=2, 周末块=3,难章周全部 +1):
- 当日全勾 combo +5
- 周完成率 ≥80% **且必做关键 slot 全清** → 周复盘 +5
- 月小测 +20 / W14 中模 +50 / W20 综合 +30 / W26 总模考 +100

8 级形态阈值:60 / 140 / 240 / 360 / 500 / 660 / 840 → 王者佑子。
