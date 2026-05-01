# 5 分钟 Firebase 设置指南

代码已经改造完毕。下面 6 步走完,你就拿到一个 `https://chamui-psle.web.app` 的公网地址,你和孩子在不同设备打开同一个 URL **看到同一份打卡数据**。

---

## 第 1 步:注册 Firebase + 创建项目(3 min)

1. 浏览器打开 https://console.firebase.google.com/
2. 用 Google 账号登录(没有就注册一个)
3. 点 **Create a project / 创建项目**
4. 项目名:`chamui-psle`(就这个,后面所有步骤都假定这个名字)
5. **取消勾选** Google Analytics(本地用不到)
6. 点 **Create project**,等 30 秒
7. 进入项目首页

---

## 第 2 步:注册 Web App,拿 firebaseConfig(2 min)

1. 项目首页中央找到 **`</>`** 图标(Add app → Web)
2. 应用昵称:`chamui-app`
3. **不要**勾选 Firebase Hosting(我们后面再开)
4. 点 **Register app**
5. 屏幕上会显示一段代码,类似:

```javascript
const firebaseConfig = {
  apiKey: "AIzaSyXXXXXXXXX",
  authDomain: "chamui-psle.firebaseapp.com",
  projectId: "chamui-psle",
  storageBucket: "chamui-psle.appspot.com",
  messagingSenderId: "1234567890",
  appId: "1:1234567890:web:abcdefg"
};
```

**全部复制下来**,马上要用。

---

## 第 3 步:把 firebaseConfig 粘进代码(1 min)

打开 `C:\claude\chamui-psle\index.html`,找到这段(大概第 1100 行附近):

```javascript
window.firebaseConfig = {
  // apiKey: "...",
  // authDomain: "chamui-psle.firebaseapp.com",
  // ...
};
```

把上面复制的 firebaseConfig **整个内容粘进去**(去掉外层的 `const firebaseConfig =` 和分号,只保留 `{...}` 部分),保存。

最终应该长这样(每行去掉 `//`):

```javascript
window.firebaseConfig = {
  apiKey: "AIzaSyXXXXXXXXX",
  authDomain: "chamui-psle.firebaseapp.com",
  projectId: "chamui-psle",
  storageBucket: "chamui-psle.appspot.com",
  messagingSenderId: "1234567890",
  appId: "1:1234567890:web:abcdefg"
};
```

---

## 第 4 步:启用 Firestore(2 min)

1. 回到 Firebase Console
2. 左侧菜单 **Build → Firestore Database**
3. 点 **Create database**
4. 选 **Start in test mode**(测试模式,30 天免登录可读写)
5. 区域选 **`asia-southeast1` (Singapore)**(新加坡机房,延迟最低)
6. 点 **Enable**

---

## 第 5 步:安装 Firebase CLI 并部署(5 min)

打开命令行(PowerShell 或 cmd),在 `C:\claude\chamui-psle\` 目录下运行:

```powershell
# 1. 装 Firebase CLI(全局,只装一次)
npm install -g firebase-tools

# 2. 登录(会打开浏览器让你确认 Google 账号)
firebase login

# 3. 重新合并单文件版(把刚刚改的 firebaseConfig 打包进去)
python -c "
html = open('index.html', encoding='utf-8').read()
char = open('character.js', encoding='utf-8').read()
data = open('data.js', encoding='utf-8').read()
app = open('app.js', encoding='utf-8').read()
old = '<script src=\"character.js\"></script>\n<script src=\"data.js\"></script>\n<script src=\"app.js\"></script>'
new = f'<script>\n{char}\n\n{data}\n\n{app}\n</script>'
open('chamui_app_single.html', 'w', encoding='utf-8').write(html.replace(old, new))
print('OK')
"

# 4. 初始化 Firebase Hosting
firebase init hosting
# - 选 "Use an existing project" → 选 chamui-psle
# - "Public directory":输入 .  (一个点,代表当前目录)
# - "Configure as a single-page app":N
# - "Set up automatic builds with GitHub":N
# - 如果问 "File ./index.html exists. Overwrite":N (千万别覆盖!)

# 5. 部署
firebase deploy --only hosting
```

部署完命令行会打印:

```
Hosting URL: https://chamui-psle.web.app
```

**这就是你的公网地址**。复制它。

---

## 第 6 步:测试

1. 在你电脑浏览器打开 `https://chamui-psle.web.app`
2. Header 右上角应该显示 ☁️ **同步中** → ✅ **已同步**
3. 勾几个 slot
4. 用手机 / 平板 / 别人电脑打开**同一个 URL**
5. 应该看到刚才勾的状态。在那台设备勾新的 → 你这边屏幕几秒后自动出现 toast "☁️ 已收到远程更新"

---

## 常见问题

### Q: Header 一直是 ⚠️ 同步失败
- 检查 firebaseConfig 是不是粘错了字段
- 检查 Firestore 数据库是不是建了(第 4 步)
- 浏览器 DevTools (F12) → Console 看红色报错

### Q: 公网部署后 Header 显示 📴 本地
- firebaseConfig **没生效**。检查 `index.html` 里 `window.firebaseConfig.apiKey` 是不是有值
- 重新跑第 5 步的 python 合并脚本 + `firebase deploy`

### Q: 30 天后会怎样?
- Firestore 测试模式过期 → 数据变只读
- 续期方法 1(简单):Firebase Console → Firestore → Rules → 把 `allow read, write: if request.time < timestamp.date(...)` 那个日期往后调 30 天
- 续期方法 2(正式):加 Firebase Auth(每人发邮箱密码),那时候我帮你改

### Q: 怎么改回离线模式?
- 把 `index.html` 的 `window.firebaseConfig` 全部注释掉,重新合并 + 部署
- 或本地用 — 直接双击 `chamui_app_single.html`,如果 firebaseConfig 留空就会自动降级

### Q: 作业照片同步吗?
- **不同步**。照片在 IndexedDB 里,每台设备独立(避免占 Firebase Storage 配额产生费用)
- 如果你要远程检查作业照,需要孩子那台设备给你看,或后续加 Firebase Storage($)

---

## 安全提醒

- 测试模式 30 天内,**任何拿到 URL + 知道 projectId 的人都能改你的数据**(实际中 URL 不公开传播就基本没事,projectId 都是 6 字符随机串很难被猜中)
- 如果泄露了不放心 → 删掉项目重建即可,数据本地 localStorage 还在
- 30 天到期前,正式做法是加 Auth

祝顺利!部署完发我 URL 看看。
