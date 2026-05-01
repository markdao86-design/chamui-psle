# iPad 限网模式 — 佑子的 PSLE 备考冒险 设置指南

孩子的 iPad 如果开了 **Screen Time → Web Content → Allowed Websites Only**(仅限允许的网站),需要把下面 17 个域名手动加到白名单,所有功能(角色、打卡、跨设备同步、CNA938 直播、YouTube 听力、装备、皮肤、分数追踪、兑换)才能正常工作。

主 App 地址:**https://chamui-psle.web.app**

---

## 快速复制区(17 条全加,顺序无关)

```
chamui-psle.web.app
markdao86-design.github.io
fonts.googleapis.com
fonts.gstatic.com
www.gstatic.com
firestore.googleapis.com
chamui-psle.firebaseapp.com
streamtheworld.com
www.melisten.sg
youtube-nocookie.com
www.youtube-nocookie.com
youtube.com
www.youtube.com
i.ytimg.com
googlevideo.com
googleapis.com
gstatic.com
```

> 不要写 `https://` 前缀。iPad 默认会匹配该域名的所有路径。

---

## iPad 操作步骤

1. 打开 **设置 (Settings)**
2. 进入 **屏幕使用时间 (Screen Time)**
3. 点 **内容和隐私访问限制 (Content & Privacy Restrictions)** → 打开开关
4. 点 **内容限制 (Content Restrictions)** → **Web Content (网页内容)**
5. 选 **仅限允许的网站 (Allowed Websites Only)**
6. 滚到底,点 **添加网站 (Add Website)**
7. 把上面 17 条逐条粘贴(每条独立一次添加)
8. 全加完后回到主屏,Safari 打开 https://chamui-psle.web.app 测试

---

## 每个域名的用途(删错了知道影响什么)

### 1) 核心必需 — App 本体 + 跨设备同步

| 域名 | 用途 | 缺了会怎样 |
|---|---|---|
| `chamui-psle.web.app` | 主 App URL(Firebase Hosting) | 完全打不开 |
| `markdao86-design.github.io` | 备用 App URL(GitHub Pages) | 主站挂时无备用 |
| `fonts.googleapis.com` | Google Fonts CSS 文件 | 字体退化为系统默认 |
| `fonts.gstatic.com` | Google Fonts 字体二进制 | 同上 |
| `www.gstatic.com` | Firebase JS SDK 库 | 同步功能不工作 |
| `firestore.googleapis.com` | **跨设备数据同步** | 加分/打卡/兑换不能跨设备同步 |
| `chamui-psle.firebaseapp.com` | Firebase Auth token | 同步可能间歇失败 |

### 2) 听力 modal — CNA938 24h 直播

| 域名 | 用途 | 缺了会怎样 |
|---|---|---|
| `streamtheworld.com` | CNA938 实际流服务器(覆盖所有子域如 `22893.live.streamtheworld.com`) | 直播无声 |
| `www.melisten.sg` | CNA938 备用网页(主流挂时的官方播放页) | 备用链接打不开(直播本身能播就不影响) |

### 3) 听力 modal — YouTube 嵌入(7 个视频/频道连播)

| 域名 | 用途 | 缺了会怎样 |
|---|---|---|
| `youtube-nocookie.com` | iframe 嵌入主域 | 视频框白屏 |
| `www.youtube-nocookie.com` | 同上,加 www 子域 | 同上 |
| `youtube.com` | 部分视频回退路径 | 部分视频不可播 |
| `www.youtube.com` | iframe 内部跳转 | 同上 |
| `i.ytimg.com` | 视频缩略图 | 缩略图缺失,可播但难看 |
| `googlevideo.com` | **实际视频流服务器** | **视频框出现但点播放无反应** |
| `googleapis.com` | YouTube player API + Firestore 公用根域 | 视频元数据/控件失效 |
| `gstatic.com` | Google 静态资源根域(字体/SDK 也用) | 多种小问题 |

---

## 故障排查

| 症状 | 缺哪个域名 |
|---|---|
| Safari 打开是白屏/网络错误 | `chamui-psle.web.app` |
| 主页能开但字体丑 | `fonts.googleapis.com` + `fonts.gstatic.com` |
| 主页能开但加分不同步到桌面 | `firestore.googleapis.com` + `chamui-psle.firebaseapp.com` + `www.gstatic.com` |
| 听力点 🔊 弹出 modal,但 CNA938 audio 控件按了无声 | `streamtheworld.com` |
| YouTube 视频框白屏 | `youtube-nocookie.com` + `www.youtube-nocookie.com` |
| YouTube 视频框出现但点播放转圈不播 | `googlevideo.com`(必加) |
| YouTube 视频缩略图都是灰块 | `i.ytimg.com` |

---

## 简化方案 — 只用核心 7 个

如果家长不想完全锁住 iPad,可以改用 **Limit Adult Websites (限制成人内容)** 模式 + 在 **Always Allow (始终允许)** 列表里只加这 7 个核心域名:

```
chamui-psle.web.app
fonts.googleapis.com
fonts.gstatic.com
www.gstatic.com
firestore.googleapis.com
chamui-psle.firebaseapp.com
streamtheworld.com
```

YouTube 在"限制成人内容"模式下默认可访问,所以听力 7 个 YouTube 视频都能正常播,不用单独加。

---

## 验证(全配完后)

打开 https://chamui-psle.web.app,依次测试:

1. ✅ **App 加载**:看到佑子角色 + 4 个 tab
2. ✅ **字体**:标题"佑子的 PSLE 备考冒险 🔨"是可爱楷体(不是 SF Pro)
3. ✅ **同步**:在 iPad 勾选一个打卡 → 桌面浏览器刷新看到 ✓
4. ✅ **直播**:打卡页 → 周一 → 19:00 LS 项目 → 旁边紫色 🔊 → modal 第 1 项 CNA938 → 按 ▶ → 听到新闻
5. ✅ **YouTube**:同 modal → "🎬 PSLE 2025 English Listening" → 按 ▶ → 视频播放
6. ✅ **照片**:任意项目 → 📷 → 选张照片 → 缩略图显示(用 IndexedDB 本地存,不依赖网络)

每条都过 = 配置 OK。
