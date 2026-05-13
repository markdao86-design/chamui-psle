/**
 * 主应用逻辑 (v2 — 每日打卡 + 周汇总)
 * 渲染 + 交互 + 升级动画
 */

// 全局状态(初始空,init 里 await loadStateAsync 后填)
let state = getDefaultState();

// v19.3: 打卡页显示周 (null = 跟随 state.currentWeek)
let _displayWeek = null;

// 当前选中的"日"(打卡页),Mon..Sun。默认 Mon,用户可切换
let selectedDay = 'Mon';

// ============ 初始化 ============
async function init() {
  // Firebase status 变化时刷新 header badge
  if (typeof onFbStatusChange === 'function') {
    onFbStatusChange(s => updateSyncBadge(s));
  }
  // 先尝试 Firestore 同步加载,失败降级 localStorage
  try {
    state = await loadStateAsync();
  } catch (e) {
    console.warn('loadStateAsync 失败:', e);
    state = loadState();
  }
  recalcTotalPoints(state);
  if (window._loadMastered) window._loadMastered(state);
  // v19.3: 一次性积分回退修正 (5/12 toggle刷分漏洞修复)
  if (!state._rollback_20260513) {
    state._rollback_20260513 = true;
    // 清除 W1 Sat WSF/WSS spam logs
    if (state.logs) {
      state.logs = state.logs.filter(log => {
        const r = log.reason || '';
        const isWSF = r.includes('W1') && r.includes('WSF');
        const isWSS = r.includes('W1') && r.includes('WSS') && !r.includes('WSM');
        return !isWSF && !isWSS;
      });
    }
    // 移除虚假成就
    if (state.achievements && state.achievements.unlocked) {
      state.achievements.unlocked = state.achievements.unlocked.filter(id => {
        if (id.startsWith('wk_')) return false;
        if (id.startsWith('month_')) return false;
        if (id === 'mid_3000pts') return false;
        return true;
      });
    }
    state.craftCrystals = 0;
    state.totalPoints = 0;
    state.lifetimeEarned = 0;
    recalcTotalPoints(state);
    saveState(state);
  }
  // v19.2: 一次性修复仓鼠形态倒退 (之前已解锁 formIdx=3)
  if (state.pet && state.pet.formIdx < 3) { state.pet.formIdx = 3; saveState(state); }
  // 启动时若当前真实日期在本周内,默认选今天
  const today = todayDayKeyForWeek(state.currentWeek);
  if (today) selectedDay = today;
  bindEvents();
  renderAll();
  updateSyncBadge(typeof getFbStatus === 'function' ? getFbStatus() : 'local');
  // 异步拉照片 key cache,完了再 rerender
  refreshPhotoKeyCache().then(() => {
    renderAll();
    // v19.2: 自动补传本地照片到云端 (供家长远程审核)
    if (window.syncLocalPhotosToCloud && isFbReady()) {
      window.syncLocalPhotosToCloud().then(n => {
        if (n > 0) { showToast(`☁️ 已补传 ${n} 张照片到云端`, 'success'); renderAll(); }
      }).catch(e => console.warn('补传失败:', e));
    }
  }).catch(() => {});
  // v18 Phase 5.1: 每日抽奖检查 + 成就 init 检查
  setTimeout(() => {
    _checkDailyLoginBonus();   // v18.86: 每日登录 +5 分
    _checkDailyDrawOnInit();
    _checkAndUnlockAch();
    _checkFTUE();              // v19.3: 首次引导
    _checkCloudIntegrity();    // v19.3: 云端积分对比
  }, 800);
  // v18.20 A: 启动仓鼠周期性鼓励
  if (typeof _startPetIdleTalk === 'function') _startPetIdleTalk();
  // v18.93: 登录→happy表情
  setTimeout(() => petExpress('pet-happy', 3000), 1200);
  // v18.27: 启动闹铃 (打开 App 时检查 + 每 60s)
  if (typeof _startAlarmChecker === 'function') _startAlarmChecker();
  // 订阅 Firestore 远端变化
  if (typeof subscribeFirestore === 'function' && isFbReady && isFbReady()) {
    subscribeFirestore(remoteData => {
      const remoteState = Object.assign(getDefaultState(), remoteData);
      if (!remoteState.daily) remoteState.daily = {};
      if (!remoteState.scores) remoteState.scores = {};
      recalcTotalPoints(remoteState);
      // v18.86 防回退: 云端积分比本地少时, 保留本地并重推云端
      if (remoteState.totalPoints < (state.totalPoints || 0)) {
        saveState(state);
        return;
      }
      state = remoteState;
      renderAll();
      showToast('☁️ 已收到远程更新', 'sync');
    });
  }
}

function updateSyncBadge(status) {
  const el = document.getElementById('syncBadge');
  if (!el) return;
  const map = {
    local:   { text: '📴 本地', cls: 'sync-local' },
    syncing: { text: '☁️ 同步中', cls: 'sync-syncing' },
    synced:  { text: '✅ 已同步', cls: 'sync-synced' },
    error:   { text: '⚠️ 同步失败', cls: 'sync-error' }
  };
  const m = map[status] || map.local;
  el.textContent = m.text;
  el.className = 'stat-pill ' + m.cls;
}

function renderAll() {
  renderHeader();
  renderDashboard();
  renderCheckinPage();
  renderHistoryPage();
  renderAdminPage();
  // v18.60: 检测双龙是否新解锁, 触发觉醒仪式
  if (typeof _checkAndTriggerDragonCeremony === 'function') _checkAndTriggerDragonCeremony();
  // v18.20 E: 总分变化时数字跳动
  if (typeof _bumpScoreNumber === 'function') _bumpScoreNumber();
}

// ============ 日期工具 ============
function parseWeekStart(weekDateRange) {
  // "5.4-5.10" → Date(2026, 4, 4)
  const startStr = weekDateRange.split('-')[0];
  const [month, day] = startStr.split('.').map(Number);
  return new Date(2026, month - 1, day);
}

function getDayDate(weekNum, dayKey) {
  const start = parseWeekStart(WEEK_DATES[weekNum - 1]);
  const offset = DAY_KEYS.indexOf(dayKey);
  return new Date(start.getFullYear(), start.getMonth(), start.getDate() + offset);
}

function fmtDate(d) {
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

// 今天对应本周的哪个 dayKey,如果不在本周则返回 null
function todayDayKeyForWeek(weekNum) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (const day of DAY_KEYS) {
    const d = getDayDate(weekNum, day);
    if (d.getTime() === today.getTime()) return day;
  }
  return null;
}

// ============ Header ============
function renderHeader() {
  document.getElementById('totalPoints').textContent = state.totalPoints;
  document.getElementById('currentLevel').textContent = CHAMUI.getLevelInfo(state.totalPoints).lv;
  document.getElementById('currentWeek').textContent = state.currentWeek;
  const crystalEl = document.getElementById('totalCrystals');
  if (crystalEl) crystalEl.textContent = state.craftCrystals || 0;
  renderStreakBlock();  // v17.1
}

// v17.1: Daily Streak 显示块(主页角色卡顶部)
function renderStreakBlock() {
  const block = document.getElementById('streakBlock');
  if (!block) return;
  const s = state.dailyStreak || { days: 0, bestEver: 0, freezeTokens: 0 };
  const inAshes = window.isStreakInAshes && window.isStreakInAshes(state);
  const days = s.days || 0;
  const best = s.bestEver || 0;
  const freezes = s.freezeTokens || 0;
  if (inAshes) {
    block.className = 'streak-block streak-ashes';
    block.innerHTML = `
      <div class="streak-num">🪦</div>
      <div class="streak-label">火焰熄了 — 今天打 1 个项目重新点燃</div>
      ${best > 0 ? `<div class="streak-best">📜 历史最高 ${best} 天</div>` : ''}
      <div class="streak-hover-hint">📋 悬浮/点击看规则</div>
    `;
    return;
  }
  block.className = 'streak-block ' + (days >= 100 ? 'streak-gold' : days >= 30 ? 'streak-fire' : days >= 7 ? 'streak-active' : 'streak-warm');
  block.innerHTML = `
    <div class="streak-num">🔥 ${days}</div>
    <div class="streak-label">${days === 0 ? '今天打 1 个项目, 点燃火焰' : '连续打卡天数 — 别断!'}</div>
    ${(best > days || freezes > 0) ? `
      <div class="streak-meta">
        ${best > days ? `📜 历史最高 ${best} 天` : ''}
        ${freezes > 0 ? `<span class="streak-freeze">🧊 ×${freezes}</span>` : ''}
      </div>
    ` : ''}
    <div class="streak-hover-hint">📋 悬浮/点击看规则</div>
  `;
}

// v17.1: Streak 断点 modal — 损失厌恶强化
function _renderStreakBrokenModal(prevDays) {
  const sev = window.streakSeverity ? window.streakSeverity(prevDays) : 0;
  const modal = document.getElementById('streakBrokenModal');
  if (!modal) return;
  const headlines = ['🔥 火苗灭了', '💔 连击断了', '💔💔 你失去了 X 天连击', '💔💔💔 你曾经 X 天连续打卡!现在重头', '🪦 X 天的旅程碎了'];
  const headline = headlines[sev].replace('X', prevDays);
  const subtext = [
    '明天再点起来吧',
    `${prevDays} 天的火焰断了, 重新开始`,
    `你曾经连续 ${prevDays} 天每天打卡, 今天断了 — 历史最高记录已存档`,
    `${prevDays} 天的努力 — 别灰心, 再 7 天就能重获连续打卡装备`,
    `${prevDays} 天的连击碎了 — 还要扣 50 分(损失成本). 重新开始, 你能再做到`
  ][sev];
  // 严重程度决定关闭按钮延迟
  const closeDelay = [0, 0, 0, 3, 5][sev];
  const penaltyPoints = sev === 4 ? 50 : 0;
  if (penaltyPoints > 0) {
    state.totalPoints = Math.max(0, state.totalPoints - penaltyPoints);
    state.logs.push({ reason: `streak 断点惩罚(${prevDays} 天)`, points: -penaltyPoints, week: state.currentWeek, timestamp: Date.now() });
  }
  modal.innerHTML = `
    <div class="streak-broken-inner">
      <div class="streak-broken-icon">${sev >= 3 ? '🪦' : '💔'}</div>
      <div class="streak-broken-headline">${headline}</div>
      <div class="streak-broken-sub">${subtext}</div>
      ${penaltyPoints > 0 ? `<div class="streak-broken-penalty">⚠️ 当前扣 ${penaltyPoints} 分</div>` : ''}
      <button id="streakBrokenCloseBtn" class="btn btn-warn" disabled>${closeDelay > 0 ? `等 ${closeDelay} 秒...` : '我知道了, 重新开始'}</button>
    </div>
  `;
  modal.classList.add('show');
  // 强制延迟关闭按钮
  const btn = document.getElementById('streakBrokenCloseBtn');
  if (closeDelay > 0) {
    let remaining = closeDelay;
    const timer = setInterval(() => {
      remaining--;
      if (remaining <= 0) {
        clearInterval(timer);
        btn.disabled = false;
        btn.textContent = '我知道了, 重新开始';
      } else {
        btn.textContent = `等 ${remaining} 秒...`;
      }
    }, 1000);
  } else {
    btn.disabled = false;
  }
  btn.onclick = () => {
    modal.classList.remove('show');
    renderAll();
  };
}

// ============ Dashboard ============
function renderDashboard() {
  const points = state.totalPoints;
  const levelInfo = CHAMUI.getLevelInfo(points);
  const nextLevel = CHAMUI.getNextLevelInfo(points);

  document.getElementById('characterSvg').innerHTML = CHAMUI.renderCharacter(state);
  // v18.60: 称号加双龙前缀 (银龙骑士 / 金龙之王)
  const dragonTitle = (CHAMUI.getDragonTitle ? CHAMUI.getDragonTitle(state) : '');
  document.getElementById('characterName').textContent = levelInfo.name + dragonTitle;
  document.getElementById('characterTitle').textContent = levelInfo.title;
  document.getElementById('charLevelDisplay').textContent = levelInfo.lv;

  // 大字总分 + 击败比例
  const bigScoreEl = document.getElementById('bigScoreNum');
  if (bigScoreEl) bigScoreEl.textContent = points;
  // v19.3: 💎水晶双货币显示
  const crystals = state.craftCrystals || 0;
  const crystalHeaderEl = document.getElementById('totalCrystals');
  if (crystalHeaderEl) crystalHeaderEl.textContent = crystals;
  const bigCrystalEl = document.getElementById('bigCrystalNum');
  if (bigCrystalEl) bigCrystalEl.textContent = crystals;
  const beatPct = studentBeatPercent(points);
  const beatCnt = studentBeatCount(points);
  const beatPctEl = document.getElementById('beatPct');
  const beatCntEl = document.getElementById('beatCount');
  const beatTotEl = document.getElementById('beatTotal');
  if (beatPctEl) beatPctEl.textContent = beatPct;
  if (beatCntEl) beatCntEl.textContent = beatCnt.toLocaleString('en-US');
  if (beatTotEl) beatTotEl.textContent = SG_P5_TOTAL.toLocaleString('en-US');

  // 进度条
  let progressPercent = 0;
  let progressText = '';
  if (nextLevel) {
    const range = nextLevel.minPoints - levelInfo.minPoints;
    const earned = points - levelInfo.minPoints;
    progressPercent = Math.min(100, Math.round((earned / range) * 100));
    progressText = `距离 Lv${nextLevel.lv} ${nextLevel.name} 还差 ${nextLevel.minPoints - points} 分`;
  } else {
    progressPercent = 100;
    progressText = '🎉 已达最高等级!继续保持!';
  }
  document.getElementById('progressBar').style.width = progressPercent + '%';
  document.getElementById('progressText').textContent = progressText;
  document.getElementById('progressPercentage').textContent = progressPercent + '%';

  // 进度统计
  const weekPoints = calcWeekPoints(state.currentWeek);
  const monthPoints = calcMonthPoints(state.currentWeek);
  document.getElementById('weekPoints').textContent = weekPoints;
  document.getElementById('monthPoints').textContent = monthPoints;
  document.getElementById('streakWeeks').textContent = state.streakBonusCount;

  // v19.2: 战力 + 章节 + 下一目标
  const powerEl = document.getElementById('powerChapterBar');
  if (powerEl && window.getCharacterPower && window.getCurrentChapter) {
    const power = window.getCharacterPower(state);
    const chapter = window.getCurrentChapter(points);
    const nextCh = window.getNextChapter(points);
    const streakDays = (state.dailyStreak && state.dailyStreak.days) || 0;
    const sMult = window.getStreakMultiplier(streakDays, power.streakBoost);
    const critPct = Math.round(power.critChance * 100);
    let nextTarget = '';
    if (nextCh) {
      nextTarget = `<span style="font-size:11px;color:var(--color-text-light)">下一章: ${nextCh.title} (差 ${nextCh.pts - points} 分)</span>`;
    }
    const nextEq = window.CHAMUI ? window.CHAMUI.equipment
      .filter(e => e.condition === 'points' && e.value > points)
      .sort((a,b) => a.value - b.value)[0] : null;
    const nextEqHtml = nextEq ? `<span style="font-size:11px;color:var(--color-text-light)">下一装备: ${nextEq.icon} ${nextEq.name} (差 ${nextEq.value - points} 分)</span>` : '';
    // v19.3: 火焰等级+幸运星 (具象化)
    const fireLevel = streakDays >= 30 ? '🔥🔥🔥🔥🔥' : streakDays >= 21 ? '🔥🔥🔥🔥' : streakDays >= 14 ? '🔥🔥🔥' : streakDays >= 7 ? '🔥🔥' : streakDays >= 3 ? '🔥' : '';
    const luckyStars = critPct >= 25 ? '★★★★★' : critPct >= 21 ? '★★★★☆' : critPct >= 16 ? '★★★☆☆' : critPct >= 11 ? '★★☆☆☆' : '★☆☆☆☆';
    powerEl.innerHTML = `
      <div style="display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin-bottom:4px">
        <span class="power-badge">⚔️ 战力 ${power.powerScore}</span>
        ${fireLevel ? `<span class="power-badge" style="background:rgba(255,107,53,0.15);color:#FF6B35;border-color:rgba(255,107,53,0.3)">${fireLevel}</span>` : ''}
        <span class="power-badge" style="background:rgba(56,189,248,0.12);color:#38BDF8;border-color:rgba(56,189,248,0.3)">幸运 ${luckyStars}</span>
      </div>
      <div style="font-size:10px;color:var(--color-text-light);margin-bottom:6px">
        ⚔️战力 = 打卡+游戏的综合实力 · ${fireLevel ? '🔥连续打卡越久火焰越旺 · ' : ''}幸运★ = 游戏答对时有几率获得额外加分
      </div>
      <div class="chapter-badge">${chapter.title}</div>
      <div style="font-size:10px;color:var(--color-text-light);margin:3px 0">积分达标自动升章 → 解锁新装备+称号</div>
      <div style="margin-top:4px;display:flex;flex-direction:column;gap:2px">${nextEqHtml}${nextTarget}</div>
    `;
  }

  // v17.6: renderIronRule() 已移除
  renderWowCard();  // v17.1
  renderMysteryBoxCard();  // v17.5
  renderDailyQuestCard();  // v17.7 Phase 3
  renderPetWidget();  // v18 Phase 5.1
  renderAchievementWall();  // v18 Phase 5.1
  renderReviewCard();  // v18 Phase 5.3
  renderWeeklyCoach();
  // renderMasterTipCard(); // v18.71: 已合并到 wowCard
  renderDragonProgress();  // v18.55
  renderErrorBankCard();   // v18.59
  renderEquipment();
  renderDailySlotList();
}

// v19.3: 每日任务单 (主页 CTA 下方) + 进度环
function renderDailySlotList() {
  const el = document.getElementById('dailySlotList');
  const dayKey = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][new Date().getDay()];
  const wn = state.currentWeek || 1;
  const wt = window.WEEK_TASKS && window.WEEK_TASKS[wn - 1];
  if (!wt || !wt.days || !wt.days[dayKey]) { if (el) el.innerHTML = ''; return; }
  const slots = wt.days[dayKey];
  const done = (state.daily && state.daily[wn] && state.daily[wn][dayKey]) || {};
  const total = Object.keys(slots).length;
  const completed = Object.keys(slots).filter(k => done[k]).length;
  // 进度环
  const ringFill = document.getElementById('ctaRingFill');
  const ringNum = document.getElementById('ctaRingNum');
  if (ringFill && ringNum) {
    const circumference = 94.2;
    const pct = total > 0 ? completed / total : 0;
    ringFill.style.strokeDashoffset = circumference * (1 - pct);
    ringNum.textContent = `${completed}/${total}`;
    if (pct >= 1) ringFill.style.stroke = '#10B981';
  }
  // 任务列表
  if (!el) return;
  let html = '<div style="font-weight:600;margin-bottom:6px">📋 今日任务</div>';
  for (const [key, desc] of Object.entries(slots)) {
    const isDone = done[key];
    html += `<div class="daily-slot-item ${isDone ? 'done' : ''}"><span class="daily-slot-check">${isDone ? '✅' : '⬜'}</span><span>${desc}</span></div>`;
  }
  el.innerHTML = html;
}

function renderErrorBankCard() {
  const card = document.getElementById('errorBankCard');
  if (card) card.style.display = 'none';
}
window.renderErrorBankCard = renderErrorBankCard;

// v18.60: 双龙 RPG 化进度卡 — 真 SVG 龙头像 + 力量/智慧值条 + 已觉醒展示
function renderDragonProgress() {
  const card = document.getElementById('dragonProgressCard');
  if (!card) return;
  const pts = state.totalPoints || 0;
  const ks = state.knowledgeStars || {};
  const totalStars = Object.values(ks).reduce((s, e) => s + (e.stars || 0), 0);
  const silverPct = Math.min(100, Math.round(pts / 10000 * 100));
  const silverDone = !!(state.dragonsUnlocked && state.dragonsUnlocked.silver);
  const goldStarPct = Math.min(100, Math.round(totalStars / 105 * 100));
  const goldPtsPct = Math.min(100, Math.round(pts / 10000 * 100));
  const goldDone = !!(state.dragonsUnlocked && state.dragonsUnlocked.gold);
  const buff = window.getDragonBuff ? window.getDragonBuff(state) : 1.0;

  // 银龙缩略 SVG (头像)
  const silverIcon = `
    <svg viewBox="0 0 60 60" width="56" height="56">
      <defs><linearGradient id="sIcon" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#E8E8E8"/><stop offset="100%" stop-color="#888"/>
      </linearGradient></defs>
      <circle cx="30" cy="30" r="26" fill="rgba(192,192,192,0.15)" stroke="#888" stroke-width="1"/>
      <ellipse cx="30" cy="32" rx="14" ry="11" fill="url(#sIcon)" stroke="#666" stroke-width="1.5"/>
      <path d="M 22 22 L 18 14 M 38 22 L 42 14" stroke="#888" stroke-width="2" stroke-linecap="round"/>
      <circle cx="25" cy="30" r="2.2" fill="#FFF"/><circle cx="25" cy="30" r="1.2" fill="#000"/>
      <path d="M 42 32 Q 50 18 56 30 L 46 28 Z" fill="#D8D8D8" opacity="0.85" stroke="#888"/>
      ${silverDone ? '<circle cx="48" cy="14" r="4" fill="#FFD700"/><text x="48" y="18" text-anchor="middle" font-size="7" fill="#7A5C00">✓</text>' : ''}
    </svg>`;
  // 金龙缩略 SVG (头像)
  const goldIcon = `
    <svg viewBox="0 0 60 60" width="56" height="56">
      <defs><linearGradient id="gIcon" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#FFF3C4"/><stop offset="50%" stop-color="#FFD700"/><stop offset="100%" stop-color="#FF8C00"/>
      </linearGradient>
      <radialGradient id="gIconGlow"><stop offset="0%" stop-color="#FFD700" stop-opacity="0.4"/><stop offset="100%" stop-color="#FFD700" stop-opacity="0"/></radialGradient></defs>
      <circle cx="30" cy="30" r="28" fill="url(#gIconGlow)"/>
      <circle cx="30" cy="30" r="26" fill="rgba(255,215,0,0.15)" stroke="#DAA520" stroke-width="1.5"/>
      <ellipse cx="30" cy="32" rx="15" ry="12" fill="url(#gIcon)" stroke="#B8860B" stroke-width="1.5"/>
      <path d="M 22 22 L 18 12 M 38 22 L 42 12" stroke="#DAA520" stroke-width="2.5" stroke-linecap="round"/>
      <circle cx="25" cy="30" r="2.5" fill="#FFF"/><circle cx="25" cy="30" r="1.5" fill="#000"/>
      <path d="M 16 32 Q 8 20 6 30 Q 12 32 16 32 Z" fill="#FF6B00" opacity="0.9"/>
      <path d="M 44 32 Q 54 18 60 30 L 48 28 Z" fill="#FFA500" opacity="0.9" stroke="#B8860B"/>
      ${goldDone ? '<circle cx="48" cy="12" r="5" fill="#FFD700" stroke="#B8860B" stroke-width="1"/><text x="48" y="16" text-anchor="middle" font-size="8" fill="#7A5C00" font-weight="900">✓</text>' : ''}
    </svg>`;

  card.innerHTML = `
    <div style="display:flex;align-items:center;gap:6px;margin-bottom:10px">
      <div style="font-size:14px;font-weight:900">⚔️ 双龙契约 · RPG 终极</div>
      ${buff > 1.0 ? `<div style="margin-left:auto;background:linear-gradient(135deg,#FFA500,#FFD700);color:#FFF;font-size:11px;padding:2px 8px;border-radius:10px;font-weight:900">⚡ +${Math.round((buff-1)*100)}% mini-game buff</div>` : ''}
    </div>

    <!-- 银龙契约卡 -->
    <div style="display:flex;align-items:center;gap:10px;padding:8px;background:${silverDone ? 'linear-gradient(135deg,rgba(192,192,192,0.15),rgba(128,128,128,0.1))' : 'var(--color-card-soft)'};border:2px solid ${silverDone ? 'rgba(192,192,192,0.5)' : 'var(--color-border)'};border-radius:10px;margin-bottom:8px">
      <div style="flex-shrink:0">${silverIcon}</div>
      <div style="flex:1;min-width:0">
        <div style="font-size:13px;font-weight:900;color:${silverDone ? '#C0C0C0' : 'var(--color-text-light)'}">🐲 银龙 · 守护契约 ${silverDone ? '<span style="color:#00FF88">✅ 已觉醒</span>' : ''}</div>
        <div style="font-size:11px;color:var(--color-text-light);margin:2px 0 4px">${silverDone ? '永久 +10% mini-game 奖励 · 称号: 银龙骑士' : '⚡ 力量值 (积分)'}</div>
        ${silverDone ? '' : `<div style="background:var(--color-card-soft);border-radius:6px;height:8px;overflow:hidden;border:1px solid rgba(192,192,192,0.3)">
          <div style="background:linear-gradient(90deg,#C0C0C0,#E0E0E0);height:100%;width:${silverPct}%;transition:width 0.5s"></div>
        </div>
        <div style="font-size:10px;color:var(--color-text-light);margin-top:2px;display:flex;justify-content:space-between">
          <span>${pts.toLocaleString()} / 10,000</span><span><b>${silverPct}%</b></span>
        </div>`}
      </div>
    </div>

    <!-- 金龙契约卡 -->
    <div style="display:flex;align-items:center;gap:10px;padding:8px;background:${goldDone ? 'linear-gradient(135deg,rgba(255,215,0,0.15),rgba(218,165,32,0.1))' : 'linear-gradient(135deg,rgba(255,215,0,0.05),rgba(255,183,0,0.03))'};border:2px solid ${goldDone ? '#DAA520' : 'rgba(218,165,32,0.3)'};border-radius:10px;${goldDone ? 'box-shadow:0 0 16px rgba(255,215,0,0.4)' : ''}">
      <div style="flex-shrink:0">${goldIcon}</div>
      <div style="flex:1;min-width:0">
        <div style="font-size:13px;font-weight:900;color:#FFD700">🐉 金龙 · 传说契约 ${goldDone ? '<span style="color:#FFD700">👑 已觉醒</span>' : ''}</div>
        ${goldDone
          ? '<div style="font-size:11px;color:var(--color-text-light)">永久 +20% 奖励 · 称号: 金龙之王 · 第二宠物解锁</div>'
          : `<div style="font-size:10px;color:#FFD700;margin:2px 0 4px">⚡ 力量值 ${pts}/10000 · ✨ 智慧值 ${totalStars}/105 ⭐ (双门槛)</div>
             <div style="display:flex;gap:6px;align-items:center;margin-bottom:3px">
               <span style="font-size:9px;color:#FFD700;min-width:14px">⚡</span>
               <div style="flex:1;background:var(--color-card-soft);border-radius:6px;height:8px;overflow:hidden;border:1px solid rgba(218,165,32,0.4)">
                 <div style="background:linear-gradient(90deg,#FFA500,#FFD700);height:100%;width:${goldPtsPct}%"></div>
               </div>
             </div>
             <div style="display:flex;gap:6px;align-items:center">
               <span style="font-size:9px;color:#FFD700;min-width:14px">✨</span>
               <div style="flex:1;background:var(--color-card-soft);border-radius:6px;height:8px;overflow:hidden;border:1px solid rgba(218,165,32,0.4)">
                 <div style="background:linear-gradient(90deg,#FF8C00,#FFD700);height:100%;width:${goldStarPct}%"></div>
               </div>
             </div>`}
      </div>
    </div>

    <div style="font-size:10px;color:var(--color-text-light);margin-top:6px;text-align:center">
      🐲 = SGD 500 + 银龙骑士称号 + 10% buff &nbsp; · &nbsp; 🐉 = SGD 1500 + 金龙之王称号 + 20% buff
    </div>
    <div style="font-size:10px;color:var(--color-text-light);margin-top:4px;border-top:1px solid var(--color-border);padding-top:5px">
      ⚡ <b>力量值</b> = 打卡 + 玩 mini-game 所得积分总量 &nbsp;|&nbsp; ✨ <b>智慧值</b> = 知识树⭐总数 (每节点最多3颗, 共35节点)<br>
      🎮 <b>buff</b> = 解锁后每次 mini-game 答对额外增加对应百分比积分 &nbsp;|&nbsp; 🤖 连续打卡100天 → 解锁命运高达伙伴
    </div>
  `;

  // v18.60: 主页 hero 区金色主题 (拿金龙后)
  const hero = document.querySelector('.hero-section');
  if (hero) hero.classList.toggle('gold-dragon-active', goldDone);
}
window.renderDragonProgress = renderDragonProgress;

// v18.60: 觉醒仪式 modal (一次性, 拿到龙瞬间触发)
function renderDragonCeremony(type) {
  if (!type) return;
  const isGold = type === 'gold';
  const colorMain = isGold ? '#FFD700' : '#C0C0C0';
  const colorDark = isGold ? '#B8860B' : '#666';
  const colorBg = isGold ? '#7A5C00' : '#444';
  const dragonIcon = isGold ? '🐉' : '🐲';
  const titleStr = isGold ? '金龙觉醒' : '银龙觉醒';
  const subtitleStr = isGold ? '传说契约成立!' : '守护契约成立!';
  const messages = isGold
    ? ['你征服了…', '105 个知识节点 ✨', '累积 10,000 积分 ⚡', '智慧 + 毅力 = 传说', `${dragonIcon} 金龙 · 觉醒!`]
    : ['你打卡坚持…', '累积 10,000 积分 ⚡', '银龙守护契约成立', `${dragonIcon} 银龙 · 觉醒!`];
  const buffsStr = isGold
    ? '⚡ 永久 +20% mini-game 奖励<br>👑 称号 "金龙之王" 自动佩戴<br>✨ 主页金光主题永久激活<br>💰 SGD 1500 终极大奖兑现<br>💡 另: 连续100天打卡 → 解锁命运高达伙伴'
    : '⚡ 永久 +10% mini-game 奖励<br>🛡 称号 "银龙骑士" 自动佩戴<br>💰 SGD 500 兑现';

  let modal = document.getElementById('dragonCeremonyModal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'dragonCeremonyModal';
    modal.style.cssText = 'position:fixed;inset:0;z-index:99999;display:flex;align-items:center;justify-content:center;background:radial-gradient(ellipse at center,rgba(0,0,0,0.92),rgba(0,0,0,0.98));backdrop-filter:blur(8px);';
    document.body.appendChild(modal);
  } else {
    modal.style.display = 'flex';
  }

  const messagesHtml = messages.map((m, i) =>
    `<div style="opacity:0;font-size:${i === messages.length-1 ? '32px' : '18px'};font-weight:900;color:${colorMain};margin:8px 0;text-shadow:0 0 20px ${colorMain};animation:dragonMsgIn 0.6s ${i*0.7}s forwards">${m}</div>`
  ).join('');

  modal.innerHTML = `
    <style>
      @keyframes dragonMsgIn { from { opacity:0; transform:translateY(20px) scale(0.8); } to { opacity:1; transform:translateY(0) scale(1); } }
      @keyframes dragonGlow { 0%,100% { transform:scale(1); filter:drop-shadow(0 0 30px ${colorMain}); } 50% { transform:scale(1.08); filter:drop-shadow(0 0 60px ${colorMain}); } }
      @keyframes dragonBgPulse { 0%,100% { box-shadow:inset 0 0 100px ${colorMain}66; } 50% { box-shadow:inset 0 0 200px ${colorMain}99; } }
      .dragon-ceremony-glow { animation:dragonBgPulse 3s ease-in-out infinite; }
      .dragon-ceremony-icon { animation:dragonGlow 2s ease-in-out infinite; }
    </style>
    <div class="dragon-ceremony-glow" style="position:absolute;inset:0;pointer-events:none"></div>
    <div style="text-align:center;max-width:520px;padding:40px;position:relative;z-index:2">
      <div class="dragon-ceremony-icon" style="font-size:120px;margin-bottom:20px">${dragonIcon}</div>
      <div style="font-size:44px;font-weight:900;color:${colorMain};margin-bottom:8px;text-shadow:0 0 30px ${colorMain};letter-spacing:4px">${titleStr}</div>
      <div style="font-size:16px;color:#FFF;opacity:0.9;margin-bottom:24px;letter-spacing:2px">${subtitleStr}</div>
      <div style="margin:24px 0;min-height:200px">${messagesHtml}</div>
      <div style="background:rgba(255,255,255,0.1);border:2px solid ${colorMain};border-radius:12px;padding:16px;margin:24px 0;text-align:left;color:#FFF;font-size:13px;line-height:2;opacity:0;animation:dragonMsgIn 0.8s ${messages.length * 0.7}s forwards">
        <div style="font-weight:900;color:${colorMain};margin-bottom:8px;font-size:14px">🎁 觉醒奖励:</div>
        ${buffsStr}
      </div>
      <button onclick="closeDragonCeremony('${type}')" style="opacity:0;animation:dragonMsgIn 0.5s ${messages.length * 0.7 + 0.5}s forwards;padding:14px 40px;font-size:16px;font-weight:900;background:linear-gradient(135deg,${colorMain},${colorDark});color:#FFF;border:none;border-radius:30px;cursor:pointer;box-shadow:0 0 30px ${colorMain};letter-spacing:3px">接受契约</button>
    </div>
  `;

  // 撒花 + 音效
  if (typeof spawnConfetti === 'function') {
    setTimeout(() => spawnConfetti(window.innerWidth/2, window.innerHeight/3, 100), 600);
    setTimeout(() => spawnConfetti(window.innerWidth/2, window.innerHeight/3, 80), 2000);
    setTimeout(() => spawnConfetti(window.innerWidth/2, window.innerHeight/3, 120), 3500);
  }
  if (typeof playSound === 'function') {
    setTimeout(() => playSound('tada'), 600);
    setTimeout(() => playSound('tada'), (messages.length * 0.7 + 0.3) * 1000);
  }
}
function closeDragonCeremony(type) {
  const modal = document.getElementById('dragonCeremonyModal');
  if (modal) modal.style.display = 'none';
  // 标记已完成仪式
  if (state.dragonsUnlocked && state.dragonsUnlocked[type]) {
    state.dragonsUnlocked[type].ceremonyDone = true;
    saveState(state);
  }
  if (typeof renderAll === 'function') renderAll();
}
window.renderDragonCeremony = renderDragonCeremony;
window.closeDragonCeremony = closeDragonCeremony;

// v18.60: 检测是否新解锁双龙, 触发觉醒仪式 (在 renderAll 调用)
function _checkAndTriggerDragonCeremony() {
  if (!window.checkDragonUnlock) return;
  const newType = window.checkDragonUnlock(state);
  if (newType) {
    saveState(state);
    setTimeout(() => renderDragonCeremony(newType), 300);
  } else {
    // 万一之前解锁但还没仪式, 补 (例如老用户升级版本后)
    if (state.dragonsUnlocked) {
      if (state.dragonsUnlocked.gold && !state.dragonsUnlocked.gold.ceremonyDone) {
        setTimeout(() => renderDragonCeremony('gold'), 300);
      } else if (state.dragonsUnlocked.silver && !state.dragonsUnlocked.silver.ceremonyDone) {
        setTimeout(() => renderDragonCeremony('silver'), 300);
      }
    }
  }
}
window._checkAndTriggerDragonCeremony = _checkAndTriggerDragonCeremony;

// ============ v17.5 Phase 2 / v17.7: 神秘宝箱 — 移到 tab 栏按钮 ============
function renderMysteryBoxCard() {
  // 老 dashboard card 已删除, 改在 tab 栏渲染计数
  const tabBtn = document.getElementById('mysteryTabBtn');
  const cnt = document.getElementById('mysteryTabCount');
  const mb = state.mysteryBoxes || { available: 0 };
  const frags = (state.dailyDraws && state.dailyDraws.fragments) || 0;
  if (cnt) {
    // v18.6: 同时显示 完整盒数 + 碎片数 (X/7)
    cnt.innerHTML = frags > 0
      ? `${mb.available} <span style="opacity:0.7;font-size:11px">·🧩${frags}/7</span>`
      : mb.available;
  }
  if (tabBtn) {
    tabBtn.classList.toggle('mystery-has', mb.available > 0);
    tabBtn.classList.toggle('mystery-empty', mb.available <= 0);
    tabBtn.title = `🎁 神秘宝箱: ${mb.available} 个可开\n🧩 抽奖碎片: ${frags}/7 (满 7 自动合 1 完整宝箱)\n每完成 10 个项目 +1 宝箱; 每天首次打开 App 抽 1-3 片`;
  }
}

function openMysteryBoxModal() {
  const mb = state.mysteryBoxes;
  if (!mb || mb.available <= 0) {
    // v18.9: 没盒 → 弹"规则+进度"卡 (替换原 toast)
    _showMysteryBoxRules();
    return;
  }
  const result = window.openMysteryBoxOnce(state);
  if (!result) return;
  state.totalPoints += result.points;
  state.logs.push({
    reason: `🎁 开宝箱 ${result.tier === 'common' ? '(普通)' : result.tier === 'wow' ? '(惊喜!)' : '(神级!)'}`,
    points: result.points,
    week: state.currentWeek,
    timestamp: Date.now()
  });
  // v17.7 quest: 开 box 算 1 次
  _trackQuest('box-open', 1);
  // v18 sound + rare counter + ach
  playSound('slot');
  if (result.tier === 'rare') state.rareBoxesCount = (state.rareBoxesCount || 0) + 1;
  saveState(state);
  _renderMysteryBoxResult(result);
  _checkAndUnlockAch();
  renderAll();
}

function _renderMysteryBoxResult(r) {
  const modal = document.getElementById('mysteryBoxResultModal');
  if (!modal) return;
  let title, body, color;
  if (r.tier === 'common') {
    title = `🎁 你开出了 +${r.points} 分!`;
    body = '普通奖励 — 继续打卡, 下次说不定开出惊喜!';
    color = '#FFE066';
  } else if (r.tier === 'wow') {
    title = `🎉 惊喜! +${r.points} 分 + 知识彩蛋`;
    body = `<div class="mb-wow-fact"><div class="mb-wow-hook">${escapeHtml(r.wow.hook)}</div><div class="mb-wow-body">${escapeHtml(r.wow.body)}</div></div>`;
    color = '#A788E0';
  } else {
    title = `🌟🌟 神级! 解锁 ${r.equipIcon || '✨'} ${escapeHtml(r.equipName || '神秘装备')}`;
    body = `<div class="mb-rare">补 +${r.points} 分让你跨越 ${escapeHtml(r.equipName || '此装备')} 阈值!</div>`;
    color = '#FF5757';
  }
  modal.innerHTML = `
    <div class="mb-result-inner" style="border-color:${color}">
      <div class="mb-result-icon">${r.tier === 'common' ? '🎁' : r.tier === 'wow' ? '🎉' : '🌟'}</div>
      <div class="mb-result-title">${title}</div>
      <div class="mb-result-body">${body}</div>
      <div class="mb-rules-mini">${_mysteryRulesHtml()}</div>
      <button class="btn btn-primary" onclick="closeMysteryBoxResult()">太棒了!</button>
    </div>
  `;
  modal.classList.add('show');
  if (r.tier !== 'common') {
    spawnConfetti(window.innerWidth / 2, window.innerHeight / 3, r.tier === 'rare' ? 80 : 50);
  }
}

function closeMysteryBoxResult() {
  const modal = document.getElementById('mysteryBoxResultModal');
  if (modal) modal.classList.remove('show');
}

// v18.9: 宝箱规则 HTML (复用于"没盒"模态 + 开完结果模态底部)
function _mysteryRulesHtml() {
  const mb = state.mysteryBoxes || { available: 0, opened: 0 };
  const dd = state.dailyDraws || { fragments: 0, consecutive: 0 };
  const total = window.countTotalCompletedSlots ? window.countTotalCompletedSlots(state) : 0;
  const nextAt = (Math.floor(total / 10) + 1) * 10;
  const toNext = nextAt - total;
  return `
    <div class="mb-rules-title">📜 宝箱与碎片规则</div>
    <ul class="mb-rules-list">
      <li>🎁 每完成 <b>10 个项目</b> +1 整盒 (再完成 <b>${toNext}</b> 个 → 下个盒)</li>
      <li>🧩 每天首次打开 App → 自动抽 <b>1-3 片</b> 碎片</li>
      <li>📅 连登 <b>7 天</b> → 必中 7 片(整盒)</li>
      <li>📅 连登 <b>14 天</b> → +1 wow 知识</li>
      <li>📅 连登 <b>30 天</b> → +1 rare 提示</li>
      <li>🔄 集满 <b>7 片自动合 1 整盒</b> → tab 栏 🎁 计数 +1</li>
    </ul>
    <div class="mb-rules-status">
      当前: 🎁 ${mb.available} 整盒 · 🧩 ${dd.fragments}/7 碎片 · 📅 连登 ${dd.consecutive} 天 · 累计开 ${mb.opened || 0} 个
    </div>
  `;
}

function _showMysteryBoxRules() {
  const modal = document.getElementById('mysteryBoxResultModal');
  if (!modal) return;
  // v18.47: 加历史回顾 — 即使没盒也能看以前开过的
  const mb = state.mysteryBoxes || { opened: 0, history: [] };
  const hist = (mb.history || []).slice(-5).reverse();  // 最近 5 个
  const histHtml = hist.length === 0
    ? '<div style="color:var(--color-text-light);font-style:italic;text-align:center;padding:8px">还没开过宝箱</div>'
    : hist.map(h => {
        const date = h.timestamp ? new Date(h.timestamp).toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' }) : '';
        const tier = h.tier === 'rare' ? '🌟 神级' : h.tier === 'wow' ? '🎉 惊喜' : '🎁 普通';
        return `<div class="mb-hist-item"><span>${date}</span> <b>${tier}</b> +${h.points || 0} 分${h.equipName ? ' · 解锁 ' + h.equipName : ''}</div>`;
      }).join('');
  modal.innerHTML = `
    <div class="mb-result-inner" style="border-color:#A788E0">
      <div class="mb-result-icon">🔒</div>
      <div class="mb-result-title">还没有可开宝箱</div>
      <div class="mb-rules-full">${_mysteryRulesHtml()}</div>
      <div class="mb-hist-title">📦 最近开过 (累计 ${mb.opened || 0} 个)</div>
      <div class="mb-hist-list">${histHtml}</div>
      <button class="btn btn-primary" onclick="closeMysteryBoxResult()">知道了</button>
    </div>
  `;
  modal.classList.add('show');
}

// ============ v17.7 Phase 3: 每日特别任务 (Daily Quest) ============
function renderDailyQuestCard() {
  const card = document.getElementById('dailyQuestCard');
  if (!card || !window.getTodayQuest) return;
  const q = window.getTodayQuest(state);
  const pct = Math.min(100, Math.round((q.progress / q.target) * 100));
  const isVocab = q.unit === 'sec';
  const progDisp = isVocab ? `${Math.floor(q.progress / 60)} 分 / ${Math.floor(q.target / 60)} 分` : `${q.progress} / ${q.target}`;
  card.innerHTML = `
    <div class="dq-header">
      <span class="dq-icon">${q.icon}</span>
      <div class="dq-info">
        <div class="dq-title">⭐ 今日特别任务: ${escapeHtml(q.title)}</div>
        <div class="dq-desc">${escapeHtml(q.desc)} · 完成 +${q.reward} 分</div>
      </div>
      ${q.completed ? `<span class="dq-done">✅ 已完成</span>` : `<button class="btn dq-claim-btn" onclick="claimDailyQuest()" ${q.id !== 'feynman' ? 'disabled' : ''}>${q.id === 'feynman' ? '👍 完成' : '⏳ 进行中'}</button>`}
    </div>
    ${!q.completed ? `
      <div class="dq-progress-bar">
        <div class="dq-progress-fill" style="width:${pct}%"></div>
        <span class="dq-progress-text">${progDisp}</span>
      </div>
      <div class="dq-hint">💡 ${escapeHtml(q.hintWhere)}</div>
    ` : `<div class="dq-celebration">🎉 +${q.reward} 分已发放, 明天换新任务</div>`}
  `;
}

// Feynman 任务靠按钮 — 其它自动 hook
function claimDailyQuest() {
  const q = window.getTodayQuest(state);
  if (q.id !== 'feynman') {
    showToast('这个任务自动追踪进度, 不需要点按钮', 'sad');
    return;
  }
  if (q.completed) return;
  const r = window.bumpQuestProgress(state, q.id, q.target);
  if (r.justCompleted) {
    saveState(state);
    showToast(`⭐ 每日任务完成! +${r.reward} 分`, 'happy');
    spawnConfetti(window.innerWidth / 2, window.innerHeight / 3, 40);
    renderAll();
  }
}

// 内部: 全局自动追踪 — 在相应动作里 call
function _trackQuest(questId, amount) {
  if (!window.bumpQuestProgress) return;
  const r = window.bumpQuestProgress(state, questId, amount);
  if (r && r.justCompleted) {
    showToast(`⭐ 每日任务完成! +${r.reward} 分`, 'happy');
    spawnConfetti(window.innerWidth / 2, window.innerHeight / 3, 40);
    saveState(state);
  }
}

// ============ v17.5 Phase 2: 反直觉思考题 (打卡页顶部) ============
function renderThinkPuzzleCard(week) {
  const card = document.getElementById('thinkPuzzleCard');
  if (!card) return;
  const data = window.getThinkPuzzleForWeek ? window.getThinkPuzzleForWeek(state, week) : null;
  if (!data) {
    card.style.display = 'none';
    return;
  }
  card.style.display = '';
  const { puzzle, answer } = data;
  if (!answer) {
    // 还没答 — 显示题 + 4 个按钮
    card.classList.add('think-unanswered');
    card.classList.remove('think-answered');
    card.innerHTML = `
      <div class="think-header">
        <span class="think-tag">💭 W${puzzle.week} 思考题 · 必先猜!</span>
        <span class="think-subject">${puzzle.subject}</span>
      </div>
      <div class="think-question">${escapeHtml(puzzle.question)}</div>
      <div class="think-options">
        ${puzzle.options.map(opt => {
          const letter = opt.charAt(0);
          return `<button class="think-opt-btn" onclick="submitThinkAnswer(${puzzle.week}, '${letter}')">${escapeHtml(opt)}</button>`;
        }).join('')}
      </div>
      <div class="think-tip">🧠 能力才是目标 — 答对 +10 分, 答错 +0 分但要认真读解析</div>
    `;
  } else {
    // 已答 — 显示结果 + 解释
    card.classList.remove('think-unanswered');
    card.classList.add('think-answered');
    card.innerHTML = `
      <div class="think-header">
        <span class="think-tag">${answer.correct ? '✅ 答对了!' : '🤔 答错没关系'} W${puzzle.week} 思考题</span>
        <span class="think-subject">${puzzle.subject}</span>
      </div>
      <div class="think-question">${escapeHtml(puzzle.question)}</div>
      <div class="think-result">
        你选了 <b>${answer.answer}</b> · 正确答案 <b>${puzzle.correct}</b>
        <span class="think-points">${answer.correct ? '+10 分' : '+0 分'}</span>
      </div>
      <div class="think-explanation">${escapeHtml(puzzle.explanation)}</div>
    `;
  }
}

function submitThinkAnswer(weekN, userAnswer) {
  const result = window.submitThinkPuzzleAnswer(state, weekN, userAnswer);
  if (!result) return;
  recalcTotalPoints(state);
  // v17.7 quest: 答 1 道 think
  _trackQuest('think-1', 1);
  // v18 Phase 5.3: enqueue 复习
  if (window.enqueueReview) window.enqueueReview(state, 'think', weekN);
  saveState(state);
  if (result.correct) {
    showToast(`✅ 答对!+10 分`, 'happy');
    spawnConfetti(window.innerWidth / 2, window.innerHeight / 3, 30);
    playSound('tada');
  } else {
    showToast(`🤔 答错了 — 读下面的解析, 理解才能进步`, 'warn');
    playSound('sad');
  }
  _checkAndUnlockAch();
  renderAll();
}

// v18.71: 每日 Wow 事实卡 — 英语知识(先猜后揭晓) + 名师秘诀(合并展示)
function renderWowCard() {
  const card = document.getElementById('wowCard');
  if (!card || !window.ENGLISH_WOW_FACTS) return;
  card.style.display = '';
  card.style.borderLeftColor = '#6FB8A0';

  const d = new Date();
  const epochDay = Math.floor(d.getTime() / 86400000);
  const len = window.ENGLISH_WOW_FACTS.length;
  const idx = ((epochDay % len) + len) % len;
  const wow = window.ENGLISH_WOW_FACTS[idx];
  const today = d.toISOString().slice(0, 10);

  // 迁移旧数据格式（原来是单对象 {date, hook, revealed}）
  if (!state.wowGuessedToday || typeof state.wowGuessedToday.revealed !== 'undefined') {
    state.wowGuessedToday = {};
  }
  const wowKey = 'wow_' + today;
  const revealed = !!(state.wowGuessedToday[wowKey]);

  // 今日名师秘诀
  const tip = window.getTodayMasterTip ? window.getTodayMasterTip(state.currentWeek) : null;
  const tipColor = tip ? (tip.dailySubjectColor || '#6FB8A0') : '#6FB8A0';

  // 计算今日 tip 在其 pool 中的 idx（用于构造唯一题目 key）
  let tipQIdx = 0;
  if (tip && tip.dailySubject) {
    const tipPool = tip.dailySubject === '英语' ? window.ENGLISH_MASTER_TIPS
      : tip.dailySubject === '科学' ? window.SCIENCE_MASTER_TIPS
      : tip.dailySubject === '数学' ? window.MATH_MASTER_TIPS
      : window.CHINESE_MASTER_TIPS;
    if (tipPool) tipQIdx = ((epochDay % tipPool.length) + tipPool.length) % tipPool.length;
  }
  const tipKey = `tip_${today}_${tip ? tip.dailySubject : 'x'}_${tipQIdx}`;
  if (!state.tipQsAnswered) state.tipQsAnswered = {};

  function _buildTipQHtml() {
    if (!tip || !tip.qs || !tip.qs.length) return '';
    const qsHtml = tip.qs.map((q, qi) => {
      const answeredVal = state.tipQsAnswered[tipKey + '_' + qi];
      const answered = answeredVal !== undefined;
      const optsHtml = q.opts.map((opt, oi) => {
        let cls = 'tip-q-opt';
        if (answered) {
          if (oi === q.ans) cls += ' tq-correct';
          else if (oi === answeredVal) cls += ' tq-wrong';
          else cls += ' tq-dimmed';
        }
        const click = answered ? '' : `onclick="event.stopPropagation();submitTipQ('${tipKey}',${qi},${oi},${q.ans})"`;
        return `<button class="${cls}" ${click}>${escapeHtml(opt)}</button>`;
      }).join('');
      return `<div class="tip-q-item">
        <div class="tip-q-text">${escapeHtml(q.q)}</div>
        <div class="tip-q-opts">${optsHtml}</div>
        ${answered && q.exp ? `<div class="tip-q-exp">💡 ${escapeHtml(q.exp)}</div>` : ''}
      </div>`;
    }).join('');
    return `<div class="tip-qs-section">
      <div class="tip-qs-title">✏️ 马上练 · ${tip.qs.length}题 (+3分/题)</div>
      ${qsHtml}
    </div>`;
  }

  card.innerHTML = `
    <div style="font-size:11px;color:#6FB8A0;font-weight:600;margin-bottom:10px;letter-spacing:0.5px">🧠 今日学习思考 · 2条</div>
    <div style="margin-bottom:12px;padding-bottom:12px;border-bottom:1px solid rgba(111,184,160,0.18)">
      <div class="wow-header">
        <span class="wow-tag" style="color:#6FB8A0;border-color:#6FB8A0">📚 英语 · ${wow.tag}</span>
        ${revealed ? '<span class="wow-toggle">已揭晓 ✓</span>' : '<span class="wow-toggle">🤔 先想想</span>'}
      </div>
      <div class="wow-hook">${escapeHtml(wow.hook)}</div>
      ${revealed
        ? `<div class="wow-body">${escapeHtml(wow.body)}</div>`
        : `<div class="wow-quiz">
             <div class="wow-quiz-prompt">💭 先思考 5 秒, 然后点揭晓:</div>
             <button class="btn btn-primary wow-quiz-btn" onclick="event.stopPropagation(); revealWowAnswer()">💡 揭晓答案 (+2 分)</button>
           </div>`}
    </div>
    ${tip ? `
    <div>
      <div class="wow-header">
        <span class="wow-tag" style="color:${tipColor};border-color:${tipColor}">🌟 名师秘诀 · ${escapeHtml(tip.dailySubject)}</span>
      </div>
      <div class="wow-hook" style="color:${tipColor}">${escapeHtml(tip.subject)} — ${escapeHtml(tip.title)}</div>
      <div class="wow-body">${escapeHtml(tip.content)}</div>
      ${_buildTipQHtml()}
    </div>` : ''}
  `;
  card.onclick = null;
}

function revealWowAnswer() {
  const today = new Date().toISOString().slice(0, 10);
  const wowKey = 'wow_' + today;
  if (!state.wowGuessedToday) state.wowGuessedToday = {};
  if (state.wowGuessedToday[wowKey]) return;  // 防重复
  state.wowGuessedToday[wowKey] = true;
  state.totalPoints = (state.totalPoints || 0) + 2;
  state.logs.push({ reason: '💡 揭晓 Wow 答案', points: 2, week: state.currentWeek, timestamp: Date.now() });
  state.wowSeenCount = (state.wowSeenCount || 0) + 1;
  if (window.enqueueReview) window.enqueueReview(state, 'wow', 'eng_' + wowKey);
  _trackQuest('wow-1', 1);
  playSound('ding');
  saveState(state);
  _checkAndUnlockAch();
  renderAll();
}

// ============ v18.78: 名师秘诀练习题提交 ============
function submitTipQ(tipKey, qIdx, selected, correct) {
  const key = tipKey + '_' + qIdx;
  if (!state.tipQsAnswered) state.tipQsAnswered = {};
  if (state.tipQsAnswered[key] !== undefined) return;
  state.tipQsAnswered[key] = selected;
  // v18.99b: 计入各科 gameStats
  const tipSubj = tipKey.includes('英语') ? 'grammar' : tipKey.includes('科学') ? 'scilab' : tipKey.includes('数学') ? 'math' : null;
  if (tipSubj) {
    if (!state.gameStats) state.gameStats = {};
    if (!state.gameStats[tipSubj]) state.gameStats[tipSubj] = { difficulty: 4, recent: [] };
    const tgs = state.gameStats[tipSubj];
    if (!tgs.cumCorrect) tgs.cumCorrect = 0;
    if (!tgs.cumTotal) tgs.cumTotal = 0;
    if (!tgs.cumRuns) tgs.cumRuns = 0;
    tgs.cumCorrect += (selected === correct ? 1 : 0);
    tgs.cumTotal += 1;
  }
  if (selected === correct) {
    state.totalPoints = (state.totalPoints || 0) + 3;
    state.logs.push({ reason: '✏️ 名师秘诀练习', points: 3, week: state.currentWeek, timestamp: Date.now() });
    showToast('✓ 正确！+3 分', 'success');
    playSound('ding');
    _checkAndUnlockAch();
  } else {
    showToast('✗ 答错了，看解析', 'sad');
  }
  saveState(state);
  renderWowCard();
}
window.submitTipQ = submitTipQ;

// ============ v16: 6 条铁律(每天换一条) ============
function renderIronRule() {
  const card = document.getElementById('ironRuleCard');
  if (!card || !window.IRON_RULES) return;
  const rules = window.IRON_RULES;
  // 按 (currentWeek*7 + 周内日序) 轮换,确保每天换一条
  const today = new Date();
  const dayOfYear = Math.floor((today - new Date(today.getFullYear(), 0, 0)) / 86400000);
  const idx = ((state.currentWeek || 1) * 7 + dayOfYear) % rules.length;
  const r = rules[idx];
  const numEl = document.getElementById('irNum');
  const titleEl = document.getElementById('irTitle');
  const bodyEl = document.getElementById('irBody');
  if (numEl) numEl.textContent = r.n;
  if (titleEl) titleEl.textContent = r.title;
  if (bodyEl) bodyEl.textContent = r.body;
}

// ============ 名师秘诀 (右栏卡,跟升级进度对齐) ============
function renderMasterTipCard() {
  const el = document.getElementById('masterTipCard');
  if (!el) return;
  // v17.6: 用按日轮换的多科秘诀 (英语 3 天/科学 2 天/数学 1 天/华文 1 天)
  const tip = window.getTodayMasterTip ? window.getTodayMasterTip(state.currentWeek) : null;
  if (!tip) {
    el.innerHTML = '';
    return;
  }
  // v18.15: 学科色作 header 左条 + subject 文字下划线 (淡化)
  const subjColor = tip.dailySubjectColor || 'var(--color-primary)';
  el.style.borderLeftColor = subjColor;
  el.innerHTML = `
    <div class="master-tip-header" style="border-left-color:${subjColor}"><span style="color:${subjColor}">🌟</span> 今日名师秘诀 · ${tip.dailySubject}</div>
    <div class="master-tip-subject" style="color:${subjColor}">${escapeHtml(tip.subject)}</div>
    <div class="master-tip-title">${escapeHtml(tip.title)}</div>
    <div class="master-tip-content">${escapeHtml(tip.content)}</div>
  `;
}

// ============ 周末报告(v4 可打印 PDF)============
function openReportModal() {
  const r = generateWeeklyReport(state);
  const overlay = document.createElement('div');
  overlay.className = 'report-modal';
  overlay.innerHTML = `
    <div class="report-modal-card">
      <div class="report-toolbar no-print">
        <div class="report-toolbar-title">📋 W${r.week} 周报告 · ${escapeHtml(r.dateRange)}</div>
        <div>
          <button class="btn btn-primary" onclick="printReport()">🖨️ 打印 / 保存为 PDF</button>
          <button class="btn btn-secondary" onclick="this.closest('.report-modal').remove()">关闭</button>
        </div>
      </div>
      <div class="report-content" id="reportContent">${renderReportHtml(r)}</div>
    </div>
  `;
  overlay.addEventListener('click', e => {
    if (e.target === overlay) overlay.remove();
  });
  document.body.appendChild(overlay);
}

function renderReportHtml(r) {
  const subjScores = Object.entries(r.overallScores || {})
    .map(([s, v]) => `<li><b>${escapeHtml(s)}</b> — 累计 ${v.avgPct}% (${v.count} 项 · ${v.sum}/${v.max})</li>`)
    .join('') || '<li>(暂无累计分数)</li>';
  const weekScoreRows = (r.weekScores || []).map(it => `
    <tr><td>${DAY_LABELS[it.day]} ${it.slot}</td><td>${escapeHtml(it.task)}</td><td><b>${it.score}/${it.max}</b> (${it.pct}%)</td></tr>
  `).join('');
  const missedRows = r.missed.map(m => `
    <li>${m.dayLabel} ${m.slot} <span style="color:var(--color-text-light)">— ${escapeHtml(m.task)}</span></li>
  `).join('');
  const keyMissingRows = r.keySlotsMissing.map(k => `
    <li><b style="color:#FF9F45">🎯 必做</b> ${DAY_LABELS[k.day]} ${k.slot} — ${escapeHtml(k.task)}</li>
  `).join('');
  const diagnosisHtml = r.coachDiagnosis.map(d => `<li>${escapeHtml(d)}</li>`).join('');
  const focusList = r.coachFocus && r.coachFocus.points.length
    ? `<ul>${r.coachFocus.points.map(p => `<li>${escapeHtml(p)}</li>`).join('')}</ul>` : '';
  const weakHtml = r.coachWeakAdvice
    ? `<p><b>弱项:${escapeHtml(r.coachWeakAdvice.subject)}</b> 平均 ${r.coachWeakAdvice.avgPct}%</p><p>${escapeHtml(r.coachWeakAdvice.advice)}</p>`
    : '<p style="color:var(--color-text-light)">暂无明显弱项;继续保持各科均衡</p>';
  const nextHtml = r.nextWeek ? `
    <p><b>W${r.nextWeek.week} ${escapeHtml(r.nextWeek.dateRange)} — ${escapeHtml(r.nextWeek.theme)}${r.nextWeek.isHard ? ' ⭐ 难章周' : ''}</b></p>
    ${r.nextWeek.focus.length ? `<ul>${r.nextWeek.focus.map(p => `<li>${escapeHtml(p)}</li>`).join('')}</ul>` : ''}
  ` : '<p style="color:var(--color-text-light)">已是最后一周</p>';

  return `
    <div class="report-doc">
      <div class="report-head">
        <h1>📋 佑子 PSLE 备考 — 第 ${r.week} 周报告</h1>
        <div class="report-sub">${escapeHtml(r.theme)}${r.isHard ? ' ⭐ 难章周' : ''} · ${escapeHtml(r.dateRange)} · 生成于 ${escapeHtml(r.generatedAt)}</div>
      </div>

      <h2>1️⃣ 本周完成情况</h2>
      <div class="report-grid">
        <div><b>完成率</b><div style="font-size:36px">${r.completion.percent}%</div><div style="color:var(--color-text-light)">${r.completion.done}/${r.completion.total} 个项目</div></div>
        <div><b>本周得分</b><div style="font-size:36px;color:#FF6B6B">${r.points.weekTotal}</div><div style="color:var(--color-text-light)">项目分 ${r.points.slot} + 全勤 ${r.points.combo} + 复盘 ${r.points.review}</div></div>
        <div><b>累计 / 等级</b><div style="font-size:24px">⭐ ${r.points.grandTotal}</div><div style="color:var(--color-text-light)">Lv${r.level.lv} ${escapeHtml(r.level.name)}</div></div>
        <div><b>击败同岛同学</b><div style="font-size:24px;color:#A788E0">${r.beat.pct}%</div><div style="color:var(--color-text-light)">约 ${r.beat.count.toLocaleString('en-US')} 名</div></div>
      </div>

      <h2>2️⃣ 教练诊断</h2>
      <ul class="report-diag">${diagnosisHtml}</ul>

      ${r.coachFocus ? `<h2>3️⃣ 本周重点 — ${escapeHtml(r.coachFocus.title)}</h2>${focusList}` : ''}

      <h2>4️⃣ 提升建议</h2>
      ${weakHtml}

      ${r.coachMasterTip ? `<div class="report-master">
        <b>🌟 ${escapeHtml(r.coachMasterTip.title)}</b><br>
        ${escapeHtml(r.coachMasterTip.content)}
      </div>` : ''}

      <h2>5️⃣ 各科累计分数</h2>
      <ul>${subjScores}</ul>

      ${weekScoreRows ? `<h2>6️⃣ 本周各项分数</h2>
        <table class="report-table">
          <thead><tr><th>时段</th><th>任务</th><th>分数</th></tr></thead>
          <tbody>${weekScoreRows}</tbody>
        </table>` : ''}

      ${keyMissingRows ? `<h2>⚠️ 本周必做未完成 (影响 +5 复盘奖)</h2>
        <ul>${keyMissingRows}</ul>` : ''}

      ${missedRows ? `<h2>📝 本周漏掉的项目</h2>
        <ul>${missedRows}</ul>` : ''}

      <h2>7️⃣ 下周预告</h2>
      ${nextHtml}

      <hr>
      <div style="font-size:11px;color:#999;text-align:center;margin-top:20px">
        佑子的 PSLE 备考冒险 · chamui-psle.web.app · 数据本地 + Firebase 同步
      </div>
    </div>
  `;
}

function printReport() {
  window.print();
}

// ============ 训练中心(v18.99: 教练+错题整合) ============
function renderWeeklyCoach() {
  const container = document.getElementById('coachContent');
  const meta = document.getElementById('coachMeta');
  const diagEl = document.getElementById('coachDiag');
  if (!container) return;
  const c = getWeeklyCoaching(state);
  const subjAcc = window.getSubjectAccuracy ? window.getSubjectAccuracy(state) : {};
  const overallAL = window.predictOverallAL ? window.predictOverallAL(state) : null;

  if (meta) meta.textContent = `W${state.currentWeek} · ${c.phase}${overallAL ? ` · 预测 AL${overallAL}` : ''}`;
  if (diagEl) diagEl.textContent = c.diagnosis[0] || '';

  function _accToAL(pct) {
    if (pct >= 90) return 1; if (pct >= 85) return 2; if (pct >= 80) return 3;
    if (pct >= 75) return 4; if (pct >= 65) return 5; if (pct >= 45) return 6;
    if (pct >= 20) return 7; return 8;
  }
  const SUBJ_META = [
    { name: '英语', icon: '📚', color: '#6FB8A0' },
    { name: '数学', icon: '🔢', color: '#E8B86E' },
    { name: '科学', icon: '🔬', color: '#9B8FC9' },
    { name: '华文', icon: '✍️', color: '#E07B7B' },
  ];

  // 1. 能力概览 (紧凑版)
  const abilityHtml = `
    <div class="coach-section">
      <div class="coach-section-title">📊 PSLE 能力概览${overallAL ? ` · 预测 <b style="color:var(--color-purple)">AL${overallAL}</b>` : ''}</div>
      <div class="coach-subject-grid">
        ${SUBJ_META.map(s => {
          const d = subjAcc[s.name];
          const pct = (d && d.accuracy !== null && d.accuracy !== undefined) ? d.accuracy : null;
          const al = pct !== null ? _accToAL(pct) : null;
          const isWeak = pct !== null && pct < 70;
          const barColor = pct === null ? '#DDD' : pct >= 80 ? '#52C788' : pct >= 60 ? '#F59E0B' : '#EF4444';
          const alStyle = isWeak ? 'background:rgba(255,51,102,0.12);color:#FF3366' : 'background:rgba(0,212,255,0.1);color:#00D4FF';
          return `<div class="coach-subject-card" style="border-left-color:${s.color}">
            <div style="display:flex;align-items:center;justify-content:space-between">
              <span style="font-weight:700">${s.icon} ${s.name}</span>
              ${isWeak ? '<span class="coach-weak-flag">⚠ 弱项</span>' : ''}
            </div>
            ${pct !== null ? `
              <div class="coach-subject-pct">${pct}<span style="font-size:11px">%</span>
                <span class="coach-subject-al" style="${alStyle}">AL${al}</span>
              </div>
              <div class="coach-subject-bar-wrap"><div class="coach-subject-bar" style="width:${pct}%;background:${barColor}"></div></div>
            ` : '<div style="color:var(--color-text-light);font-size:11px">暂无数据 — 玩 mini-game 积累</div>'}
          </div>`;
        }).join('')}
      </div>
    </div>`;

  // 2. 今日训练统计
  const stats = state.gameStats || {};
  const todayKey = new Date().toISOString().slice(0, 10);
  const todayLogs = (state.logs || []).filter(l => l.timestamp && new Date(l.timestamp).toISOString().slice(0, 10) === todayKey);
  const todayPoints = todayLogs.reduce((s, l) => s + (l.points || 0), 0);
  const todayErrorLogs = todayLogs.filter(l => (l.reason || '').includes('📓'));

  // 今日各科游戏正确率
  const _gameSubjLabel = { math:'🔢数学', unit:'🔢单位', grammar:'✏️语法', cloze:'📝完形', editing:'🔍Editing', vocab:'📚词汇', listen:'🎧听力', scimcq:'🔬科学', scilab:'🧪分类', chinese:'🇨🇳华文' };
  const todayGameDetails = [];
  Object.entries(stats).forEach(([gk, gs]) => {
    if (!gs.recent) return;
    gs.recent.forEach(r => {
      if (r.date === todayKey) todayGameDetails.push({ game: gk, correct: r.correct, total: r.total, accuracy: r.accuracy });
    });
  });
  const todayGamesCount = todayGameDetails.length;
  const todayGameHtml = todayGameDetails.length > 0
    ? todayGameDetails.map(g => {
        const pct = Math.round((g.accuracy || 0) * 100);
        const color = pct >= 80 ? '#00FF88' : pct >= 60 ? '#FFB800' : '#FF3366';
        return `<span style="display:inline-block;background:var(--color-card-soft);border-radius:4px;padding:2px 6px;margin:2px;font-size:11px">${_gameSubjLabel[g.game] || g.game} <b style="color:${color}">${g.correct}/${g.total} (${pct}%)</b></span>`;
      }).join('')
    : '<span style="color:var(--color-text-light)">今天还没玩游戏</span>';

  const trainStatHtml = `
    <div class="coach-section" style="padding:8px 12px">
      <div style="display:flex;align-items:center;gap:12px;font-size:13px">
        <span style="color:#00FF88;font-weight:700">+${todayPoints} 分</span>
        <span style="color:#FFB800">错题消灭 ${todayErrorLogs.length}</span>
        ${todayGamesCount > 0 ? `<span style="color:var(--color-primary)">🎮 ${todayGamesCount} 局</span>` : ''}
      </div>
    </div>`;

  // 3. 错题训练
  const wrongItems = state.wrongAnswers || [];
  const errByGame = {};
  wrongItems.forEach(w => { errByGame[w.gameKey] = (errByGame[w.gameKey] || 0) + 1; });
  const errSummary = Object.entries(errByGame).map(([k, v]) => {
    const label = k === 'math' ? '🔢数学' : k === 'grammar' ? '✏️语法' : k === 'cloze' ? '📝完形' : k === 'unit' ? '⚗️单位' : k === 'knowledge' ? '🌳知识树' : k === 'editing' ? '🔍Editing' : '📚' + k;
    return `${label} ${v}题`;
  }).join(' · ');

  let errorListHtml = '';
  if (wrongItems.length > 0) {
    errorListHtml = `<div style="max-height:200px;overflow-y:auto;font-size:12px;line-height:1.7;margin-top:8px;border-top:1px solid #f0f0f0;padding-top:8px">
      ${wrongItems.slice(-20).map(w => {
        const subj = w.gameKey === 'math' ? '🔢' : w.gameKey === 'grammar' ? '✏️' : w.gameKey === 'cloze' ? '📝' : w.gameKey === 'unit' ? '⚗️' : w.gameKey === 'knowledge' ? '🌳' : w.gameKey === 'editing' ? '🔍' : '📚';
        const retries = w.retries || 0;
        const correctAns = w.type === 'mcq' && w.opts ? String.fromCharCode(65 + w.ans) + '. ' + (w.opts[w.ans] || '') : w.ans;
        return `<div style="padding:3px 0;border-bottom:1px solid #f5f5f5">
          <span>${subj}</span> <b>${escapeHtml((w.q || '').slice(0, 50))}</b>
          <span style="color:#52C788;margin-left:4px">答案: ${escapeHtml(String(correctAns).slice(0, 30))}</span>
          ${retries > 0 ? `<span style="color:var(--color-danger);margin-left:4px">重试${retries}次</span>` : ''}
        </div>`;
      }).join('')}
    </div>`;
  }

  const errorHtml = `
    <div class="coach-section" style="padding:8px 12px">
      ${wrongItems.length > 0 ? `
        <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
          <span style="font-weight:700;color:var(--color-danger)">❌ ${wrongItems.length} 题待攻克</span>
          <span style="font-size:11px;color:var(--color-text-light)">${errSummary}</span>
          <button class="btn btn-primary" onclick="openErrorBank()" style="font-size:12px;padding:6px 14px;margin-left:auto">🎯 开始训练 (+2分/答对)</button>
        </div>
      ` : `<div style="display:flex;align-items:center;gap:8px">
        <span style="color:var(--color-success);font-weight:600">✅ 错题全部消灭!</span>
      </div>`}
      <div style="margin-top:6px">
        <button class="btn btn-secondary" onclick="openErrorBank()" style="font-size:12px;padding:5px 12px">📓 查看错题集 (错题详情·原因·改错记录)</button>
      </div>
    </div>`;

  // 4. 重点攻克 + 本周重点 (紧凑合并)
  const weakHtml = c.weakAdvice ? `
    <div class="coach-section" style="padding:8px 12px">
      <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
        <span style="font-weight:700">⚡ 弱项:</span>
        <span class="coach-weak-subj">${escapeHtml(c.weakAdvice.subject)}</span>
        <span style="font-size:12px;color:var(--color-text-light)">均 ${c.weakAdvice.avgPct}%</span>
      </div>
      <div style="font-size:12px;color:var(--color-text);margin-top:4px">${escapeHtml(c.weakAdvice.advice)}</div>
    </div>` : '';

  const focusHtml = c.focus && c.focus.points.length ? `
    <div class="coach-section" style="padding:8px 12px">
      <div style="font-weight:700;margin-bottom:4px">🎯 ${escapeHtml(c.focus.title)}</div>
      <ul style="margin:0;padding-left:18px;font-size:12px;line-height:1.6">${c.focus.points.map(p => `<li>${escapeHtml(p)}</li>`).join('')}</ul>
    </div>` : '';

  let sundayHtml = '';
  if (new Date().getDay() === 0 && window.SUNDAY_REVIEW_STEPS) {
    sundayHtml = `
      <div class="coach-section" style="padding:8px 12px">
        <div style="font-weight:700;margin-bottom:4px">🗓️ 周日复盘 19:30-21:00</div>
        <ol style="margin:0 0 0 18px;padding:0;font-size:12px;line-height:1.6">
          ${window.SUNDAY_REVIEW_STEPS.map(s => `<li>${escapeHtml(s.replace(/^[①②③④⑤]\s?/, ''))}</li>`).join('')}
        </ol>
      </div>`;
  }

  container.innerHTML = abilityHtml + trainStatHtml + errorHtml + weakHtml + focusHtml + sundayHtml;
}

// 计算某周拿到的总分(里程碑 + 每日打卡分 + 周复盘 + 当日 combo)
function calcWeekPoints(weekNum) {
  let pts = 0;
  // 里程碑 / 月小测
  const wd = state.weekly[weekNum];
  if (wd && wd.checkin) {
    const items = getWeeklyCheckinTemplate(weekNum);
    items.forEach(item => {
      if (wd.checkin[item.id]) pts += item.points;
    });
  }
  // 每日打卡 + day combo + 周复盘 (v3 上头版)
  pts += calcWeekDailyPoints(weekNum, state).total;
  return pts;
}

function calcMonthPoints(weekNum) {
  const startWeek = Math.max(1, weekNum - 3);
  let total = 0;
  for (let w = startWeek; w <= weekNum; w++) {
    total += calcWeekPoints(w);
  }
  const cutoffTime = Date.now() - 30 * 24 * 60 * 60 * 1000;
  state.logs.forEach(log => {
    if (log.timestamp > cutoffTime) total += log.points;
  });
  return total;
}

function renderEquipment() {
  const grid = document.getElementById('equipmentGrid');
  const disabled = new Set(state.equipmentDisabled || []);
  // v18.56: 双龙已在 dragonProgressCard 单独展示, 不在装备墙重复
  const HIDDEN_FROM_GRID = new Set(['silver_dragon', 'dragon']);
  grid.innerHTML = CHAMUI.equipment.filter(eq => !HIDDEN_FROM_GRID.has(eq.id)).map(eq => {
    const unlocked = CHAMUI.checkEquipmentUnlocked(eq.id, state);
    const equipped = unlocked && !disabled.has(eq.id);
    const cls = !unlocked ? 'locked' : (equipped ? 'unlocked equipped' : 'unlocked unequipped');
    const click = unlocked ? `onclick="toggleEquipment('${eq.id}')"` : '';
    const cursor = unlocked ? 'cursor:pointer' : 'cursor:default';
    const status = !unlocked ? eq.hint
      : equipped ? '✓ 穿戴中(点击卸下)'
      : '👜 已收藏(点击穿戴)';
    const evoLv = (state.equipEvolutions && state.equipEvolutions[eq.id]) || 0;
    const canEvo = unlocked && eq.condition === 'points' && evoLv < 3;
    const evoCost = canEvo ? Math.round(eq.value * [0.5, 1.0, 2.0][evoLv]) : 0;
    const evoBtn = canEvo ? `<button class="evo-btn" onclick="event.stopPropagation(); doEvolve('${eq.id}')" title="💎 花费 ${evoCost} 水晶进化">⬆ Lv${evoLv + 1}</button>` : '';
    const evoTag = evoLv > 0 ? `<span class="evo-tag">+${evoLv}</span>` : '';
    return `
      <div class="equipment-item ${cls}" style="${cursor}" ${click} title="${unlocked ? (equipped ? '点击卸下' : '点击穿戴') : '未解锁'}">
        <span class="equipment-icon">${eq.icon}${evoTag}</span>
        <div class="equipment-name">${eq.name}</div>
        <div class="equipment-condition">${status}</div>
        ${evoBtn}
      </div>
    `;
  }).join('');
  renderSkinGrid();
}

// v19.3: 装备进化 (消耗💎水晶)
function doEvolve(equipId) {
  if (!window.evolveEquipment) return;
  const result = window.evolveEquipment(state, equipId);
  if (result.success) {
    showToast(`⬆ 进化成功! Lv${result.newLevel} (花费 💎${result.cost})`, 'success');
    renderEquipment();
    renderHeader();
  } else {
    showToast(result.reason, 'warn');
  }
}
window.doEvolve = doEvolve;

// v16.8: 点击装备 → 切换穿戴/卸下 (state.equipmentDisabled 数组里有 = 卸下)
function toggleEquipment(equipId) {
  const unlocked = CHAMUI.checkEquipmentUnlocked(equipId, state);
  if (!unlocked) { showToast('该装备还没解锁哦', 'sad'); return; }
  if (!state.equipmentDisabled) state.equipmentDisabled = [];
  const idx = state.equipmentDisabled.indexOf(equipId);
  const eq = CHAMUI.equipment.find(e => e.id === equipId);
  if (idx >= 0) {
    state.equipmentDisabled.splice(idx, 1);
    showToast(`已穿戴 ${eq ? eq.name : equipId}`, 'happy');
  } else {
    state.equipmentDisabled.push(equipId);
    showToast(`已卸下 ${eq ? eq.name : equipId}`, 'success');
  }
  saveState(state);
  renderAll();
}

function renderSkinGrid() {
  const grid = document.getElementById('skinGrid');
  if (!grid) return;
  const activeId = (state.activeSkin || 'default');
  grid.innerHTML = (CHAMUI.skins || []).map(sk => {
    const unlocked = CHAMUI.checkSkinUnlocked(sk.id, state);
    const isActive = unlocked && sk.id === activeId;
    const swatchBg = sk.shirtColor && sk.shirtColor !== 'auto' ? sk.shirtColor : '#FFE066';
    const onclick = unlocked
      ? `setActiveSkin('${sk.id}')`
      : `showToast('${(sk.hint || '未解锁').replace(/'/g, "\\'")}','sad')`;
    return `
      <div class="skin-item ${unlocked ? '' : 'locked'} ${isActive ? 'active' : ''}" onclick="${onclick}">
        <div class="skin-swatch" style="background:${swatchBg}">${unlocked ? '👤' : '🔒'}</div>
        <div class="skin-name">${sk.name}</div>
        <div class="skin-desc">${unlocked ? sk.desc : sk.hint}</div>
      </div>
    `;
  }).join('');
}

function setActiveSkin(skinId) {
  if (!CHAMUI.checkSkinUnlocked(skinId, state)) {
    showToast('该皮肤还没有解锁哦', 'sad');
    return;
  }
  if (state.activeSkin === skinId) return;
  state.activeSkin = skinId;
  saveState(state);
  renderAll();
  const sk = CHAMUI.skins.find(s => s.id === skinId);
  showToast(`已换上 ${sk ? sk.name : skinId}!`, 'happy');
}

// ============ v18.66: 知识树穿插打卡任务 辅助函数 ============

function _getTaskKtKey(taskText) {
  if (!taskText) return null;
  if (/^🔬|科学|SciLab/.test(taskText)) return '🔬 科学';
  if (/^📖|^🎧|^✏️|^✍️|English|Grammar|Cloze|Vocab|Listen|Editing|Comprehension|Composition|作文|听力/.test(taskText)) return '📖 英语';
  if (/^➗|数学|Math|单位换算|速算/.test(taskText)) return '➗ 数学';
  if (/^🇨🇳|华文/.test(taskText)) return '🇨🇳 华文';
  return null;
}

function _getActiveKtNode(ktKey, weekNum) {
  const nodes = (window.KNOWLEDGE_TREE || {})[ktKey] || [];
  const idx = nodes.findIndex(n => n.weeks && n.weeks[0] <= weekNum && weekNum <= n.weeks[1]);
  return idx >= 0 ? { node: nodes[idx], idx } : null;
}

function _buildKtHintCard(node, subj, idx, st) {
  const ks = st.knowledgeStars || {};
  const entry = ks[node.id];
  const stars = entry ? (entry.stars || 0) : 0;
  const starsStr = stars > 0 ? ('★').repeat(stars) + ('☆').repeat(3 - stars) : '☆☆☆ 未练习';
  const starColor = stars === 3 ? 'var(--color-success)' : stars > 0 ? 'var(--color-warn)' : 'var(--color-text-light)';
  const hasPractice = window.getNodePractice && window.getNodePractice(node.id);
  const practiceBtn = hasPractice
    ? `<button class="btn btn-primary" onclick="event.stopPropagation(); openKnowledgePractice('${node.id}', '${escapeAttr(subj)}', ${idx})">📝 去练习</button>`
    : '';
  const descShort = node.desc ? node.desc.slice(0, 90) + (node.desc.length > 90 ? '…' : '') : '';
  return `
    <div class="kt-hint-card" data-ktid="${node.id}">
      <div class="kt-hint-row" onclick="toggleKtHint(this)">
        <span class="kt-hint-icon">${node.icon || '🌳'}</span>
        <span class="kt-hint-name">本周知识点: <b>${escapeHtml(node.name)}</b></span>
        <span class="kt-hint-stars" style="color:${starColor}">${starsStr}</span>
        <span class="kt-hint-toggle">▼ 展开</span>
      </div>
      <div class="kt-hint-body" style="display:none">
        ${node.pitfall ? `<div class="kt-hint-pitfall">⚠️ 易错: ${escapeHtml(node.pitfall)}</div>` : ''}
        ${descShort ? `<div class="kt-hint-desc">${escapeHtml(descShort)}</div>` : ''}
        <div class="kt-hint-actions">
          <button class="btn btn-secondary" onclick="event.stopPropagation(); openKnowledgeNodeDetail('${escapeAttr(subj)}', ${idx})">📖 看讲解</button>
          ${practiceBtn}
        </div>
      </div>
    </div>`;
}

function toggleKtHint(el) {
  const body = el.nextElementSibling;
  const toggle = el.querySelector('.kt-hint-toggle');
  const isOpen = body.style.display !== 'none';
  body.style.display = isOpen ? 'none' : 'block';
  toggle.textContent = isOpen ? '▼ 展开' : '▲ 收起';
}
window.toggleKtHint = toggleKtHint;

// ============ 打卡页 (v2 — 每日) ============
function renderCheckinPage() {
  const week = _displayWeek || state.currentWeek;
  const isViewOnly = (week !== state.currentWeek);
  const wt = getWeekTasks(week);

  // 标题
  const titleEl = document.getElementById('checkinWeekTitle');
  titleEl.textContent = `第 ${week} 周 (${WEEK_DATES[week - 1]}) — ${WEEK_THEMES[week - 1]}`;

  document.getElementById('prevWeekBtn').disabled = week <= 1;
  document.getElementById('nextWeekBtn').disabled = week >= 73;

  renderThinkPuzzleCard(week);

  // 整个 checkinList 区域我们整体重渲(含日期 tab + slot 列表 + 周汇总)
  const list = document.getElementById('checkinList');

  // === 1) 周目标横幅 ===
  const goalBanner = wt && wt.goal
    ? `<div class="goal-banner">🎯 ${escapeHtml(wt.goal)}</div>`
    : '';

  // v18.52: 95% 休息提示 (防沉迷第3闸 — 软提醒, 不扣分)
  const wkComp = calcWeekCompletion(week, state);
  const restBanner = (wkComp && wkComp.percent >= 95)
    ? `<div class="rest-banner" style="background:linear-gradient(135deg,rgba(255,183,0,0.08),rgba(255,107,53,0.06));border:2px dashed rgba(255,152,0,0.4);border-radius:10px;padding:12px;margin:8px 0;text-align:center;font-size:13px;color:var(--color-text)">🛋️ <b>本周已完成 ${wkComp.percent}%</b> · 剩下的可以休息了, 大脑也需要 recovery · PSLE 是马拉松不是冲刺</div>`
    : '';

  // === 2) 日期 Tab ===
  const realToday = todayDayKeyForWeek(week);
  const dayTabs = `
    <div class="day-tabs">
      ${DAY_KEYS.map(day => {
        const date = fmtDate(getDayDate(week, day));
        const isSel = day === selectedDay;
        const isToday = day === realToday;
        const dayCount = countDayDone(week, day);
        const dayTotal = countDayTotal(week, day);
        const complete = dayTotal > 0 && dayCount === dayTotal;
        const dayBadge = complete ? '🔥' : (isToday ? '⭐' : '');
        return `
          <button class="day-tab ${isSel ? 'active' : ''} ${isToday ? 'today' : ''} ${complete ? 'complete' : ''}"
                  onclick="selectDay('${day}')">
            <div class="day-tab-name">${DAY_LABELS[day]}${dayBadge ? ' ' + dayBadge : ''}</div>
            <div class="day-tab-date">${date}</div>
            <div class="day-tab-count">${dayCount}/${dayTotal}</div>
          </button>
        `;
      }).join('')}
    </div>
  `;

  // === 3) 当日任务列表 ===
  const dayTasks = getDailyTasks(week, selectedDay);
  const allDoneToday = dayTasks.length > 0 && dayTasks.every(t => getDailyCheck(state, week, selectedDay, t.slot));

  // v19.2: 分层逻辑
  const tier1Tasks = dayTasks.filter(t => (SLOT_TIER[t.slot] || 3) === 1);
  const tier2Tasks = dayTasks.filter(t => (SLOT_TIER[t.slot] || 3) === 2);
  const tier3Tasks = dayTasks.filter(t => (SLOT_TIER[t.slot] || 3) === 3);
  const tier1AllDone = tier1Tasks.length > 0 && tier1Tasks.every(t => getDailyCheck(state, week, selectedDay, t.slot));
  const tier2AllDone = tier2Tasks.length > 0 && tier2Tasks.every(t => getDailyCheck(state, week, selectedDay, t.slot));
  const now = new Date();
  const pastBedtime = now.getHours() > BEDTIME_HOUR || (now.getHours() === BEDTIME_HOUR && now.getMinutes() >= BEDTIME_MIN);
  const expandedKey = `tier_expanded_${selectedDay}`;
  const manualExpand = sessionStorage.getItem(expandedKey);
  const showTier2 = tier1AllDone || manualExpand >= '2';
  const showTier3 = (tier2AllDone && tier1AllDone && !pastBedtime) || manualExpand >= '3';

  // v18.23: 周末按 上午/下午/晚上 分段, 段间显示休息/外课说明
  const SECTION_BY_SLOT = {
    WSE: 'AM', WSF: 'AM', WSS: 'AM', WSL: 'AM',
    WSM: 'PM',
    WSR: 'EV', WSV: 'EV',
    WUH: 'AM', WUR: 'AM',
    WUM: 'PM', WUS: 'PM',
    WUE1: 'EV', WUE2: 'EV', WUP: 'EV'
  };
  const SAT_REST = {
    AM_PM: '🍽️ 12:00-14:00 吃饭休息',
    PM_EV: '🎓 15:30-19:30 美林课 (外课, 不打卡) → 19:30-19:50 真休息'
  };
  const SUN_REST = {
    BEFORE_AM: '🎓 08:00-10:20 恒瑞课 (外课, 不打卡) → 10:20-10:35 真休息',
    AM_PM: '🍽️ 12:00-14:00 吃饭休息',
    PM_EV: '🏊 16:10-17:00 游泳 → 17:30-18:10 吃饭'
  };
  const sectionLabel = (s) => s === 'AM' ? '🌅 上午' : s === 'PM' ? '☀️ 下午' : '🌙 晚上';

  let slotsHtml;
  if (dayTasks.length === 0) {
    slotsHtml = `<div class="empty-day">📭 这一天没有安排任务</div>`;
  } else {
    const isWeekend = selectedDay === 'Sat' || selectedDay === 'Sun';
    let lastSection = null;
    // 周日开头加恒瑞课/真休息说明
    let prefixRest = '';
    if (selectedDay === 'Sun') {
      prefixRest = `<div class="rest-divider">${SUN_REST.BEFORE_AM}</div>`;
    }
    const seenKtSubjects = new Set();  // v18.66: 每科只插一次知识树提醒
    slotsHtml = prefixRest + dayTasks.map(t => {
      const checked = getDailyCheck(state, week, selectedDay, t.slot);
      const hasPhoto = hasPhotoCached(week, selectedDay, t.slot);
      const isKey = isKeySlot(week, selectedDay, t.slot);
      const pts = slotPoints(week, t.slot);
      const tip = getTaskTip(t.task);
      const sc = getScore(state, week, selectedDay, t.slot);
      const cloudInfo = state.cloudPhotos && state.cloudPhotos[photoKey(week, selectedDay, t.slot)];
      const isRejected = cloudInfo && cloudInfo.rejected;
      const verifyBadge = cloudInfo ? (isRejected ? '❌' : cloudInfo.verified ? '✅' : '☁️') : '';
      const photoBtn = isRejected
        ? `<button class="photo-btn has-photo" style="border-color:var(--color-danger);color:var(--color-danger)" onclick="event.stopPropagation(); pickPhotoForSlot(${week}, '${selectedDay}', '${t.slot}')" title="照片被驳回,请重新上传">❌📷</button>`
        : (hasPhoto || cloudInfo)
        ? `<button class="photo-btn has-photo" onclick="event.stopPropagation(); viewPhoto(${week}, '${selectedDay}', '${t.slot}')" title="看作业照">📸${verifyBadge}</button>`
        : `<button class="photo-btn" onclick="event.stopPropagation(); pickPhotoForSlot(${week}, '${selectedDay}', '${t.slot}')" title="传作业照">📷</button>`;
      const scoreBtn = sc
        ? `<button class="score-btn has-score" onclick="event.stopPropagation(); openScoreModal(${week}, '${selectedDay}', '${t.slot}')" title="${escapeAttr(sc.note || '')}">📊 ${sc.score}/${sc.max}</button>`
        : `<button class="score-btn" onclick="event.stopPropagation(); openScoreModal(${week}, '${selectedDay}', '${t.slot}')" title="记分数">📊</button>`;
      // v16: 学科词汇按钮 — 任务内含 "30 词" / "DeepSeek 词汇" / "Vocabulary U" / "拼写" / "用法测" 时出现
      const isVocabTask = /30 词|DeepSeek 词汇|Vocabulary U|拼写 \+ 用法测|学科词汇/.test(t.task);
      const vocabAvailable = window.getVocabForWeek && window.getVocabForWeek(week) !== null;
      const vocabBtn = (isVocabTask && vocabAvailable)
        ? `<button class="vocab-btn" onclick="event.stopPropagation(); openVocabModal(${week})" title="本周学科词表">📚</button>
           <button class="vocab-game-btn" onclick="event.stopPropagation(); openVocabGame(${week})" title="🎮 词汇连连看 (赢 2-7 分 + 1 宝箱)">🎮</button>`
        : '';
      // v16.3: 听力资源按钮 — 任务含 CNA938 / okto / Listening / 听力 时出现
      const isListenTask = /CNA938|okto|Listening|听力|🎧/.test(t.task);
      const listenBtn = isListenTask
        ? `<button class="listen-btn" onclick="event.stopPropagation(); openListeningModal(${week})" title="听力资源 + 4 步精听法">🔊</button>`
        : '';
      // v18.21: LS 任务下方加 1 行 4 步法 tip (详细规则点 🔊 看)
      const listenTipLine = isListenTask
        ? `<div class="checkin-listen-tip">🎯 4 步法: 1️⃣ 听感觉 → 2️⃣ 挑 3-5 生词 → 3️⃣ 查字典 + 记本 → 4️⃣ 复听验证</div>`
        : '';
      // v18.40: 华文题库按钮 — 任务含华文/VB/词汇时显示
      const isChineseTask = /华文|VB.*华|🇨🇳/.test(t.task);
      const cnReadingBtn = isChineseTask
        ? `<button class="cn-reading-btn" onclick="event.stopPropagation(); openChineseReadingBank()" title="📚 PSLE 高华阅读题库 — 8 篇 + 答题">📚</button>`
        : '';
      // v18.31: 作文按钮 — 任务含"作文" 且本周有 PSLE 题
      const isCompTask = /作文|composition|Composition/.test(t.task);
      const compPrompt = isCompTask && window.getCompositionPrompt ? window.getCompositionPrompt(week) : null;
      const compBtn = compPrompt
        ? `<button class="comp-btn" onclick="event.stopPropagation(); openCompositionModal(${week})" title="PSLE 作文题 + 精修上传">📝</button>`
        : '';
      const compTipLine = compPrompt
        ? `<div class="checkin-comp-tip">📝 W${week}: <b>${escapeHtml(compPrompt.theme)}</b> · ${escapeHtml(compPrompt.level)}</div>`
        : '';
      const keyChip = isKey ? `<span class="key-chip" title="必做关键项目,影响周复盘奖">🎯 必做</span>` : '';
      const tipLine = tip ? `<div class="checkin-tip">${escapeHtml(tip)}</div>` : '';
      // v18.23: 周末段间分隔
      let sectionHeader = '';
      if (isWeekend) {
        const curSection = SECTION_BY_SLOT[t.slot];
        if (curSection && curSection !== lastSection) {
          // 段头
          if (lastSection) {
            // 段间休息说明
            const rests = selectedDay === 'Sat' ? SAT_REST : SUN_REST;
            const transKey = lastSection + '_' + curSection;
            if (rests[transKey]) {
              sectionHeader += `<div class="rest-divider">${rests[transKey]}</div>`;
            }
          }
          sectionHeader += `<div class="section-divider">${sectionLabel(curSection)}</div>`;
          lastSection = curSection;
        }
      }
      // v18.66: 知识树无痛提醒 — 每学科第一个任务后插入折叠卡片
      const ktKey = _getTaskKtKey(t.task);
      let ktHintHtml = '';
      if (ktKey && !seenKtSubjects.has(ktKey)) {
        const hit = _getActiveKtNode(ktKey, week);
        if (hit) {
          seenKtSubjects.add(ktKey);
          ktHintHtml = _buildKtHintCard(hit.node, ktKey, hit.idx, state);
        }
      }
      const tier = SLOT_TIER[t.slot] || 3;
      const tierHidden = (tier === 2 && !showTier2) || (tier === 3 && !showTier3);
      const tierClass = tier === 1 ? 'tier-core' : tier === 2 ? 'tier-extend' : 'tier-bonus';
      const sizeClass = (SLOT_BASE_POINTS[t.slot] || 2) >= 7 ? 'task-large' : 'task-small';
      return sectionHeader + `
        <div class="checkin-item ${checked ? 'checked' : ''} ${isKey ? 'key-slot' : ''} ${tierClass} ${sizeClass}${isViewOnly ? ' view-only' : ''}" data-slot="${t.slot}" data-tier="${tier}"
             ${tierHidden ? 'style="display:none"' : ''}
             onclick="${isViewOnly ? `showToast('⚠️ 只读模式: 只能打卡当前周','warn')` : `toggleDailyCheck(${week}, '${selectedDay}', '${t.slot}', event)`}">
          <div class="checkin-content">
            <div class="check-circle"></div>
            <div class="checkin-info">
              <div class="checkin-title">${escapeHtml(t.task)} ${keyChip}</div>
              <div class="checkin-desc">⏰ ${escapeHtml(t.time)} · <span class="pts-preview">⚔️ +${pts}</span></div>
              ${tipLine}
              ${listenTipLine}
              ${compTipLine}
            </div>
          </div>
          ${scoreBtn}
          ${vocabBtn}
          ${listenBtn}
          ${cnReadingBtn}
          ${compBtn}
          ${photoBtn}
          <div class="checkin-points">+${pts}</div>
        </div>
      ` + ktHintHtml;
    }).join('');
    // v19.2: tier-based combo + expand buttons
    if (tier1AllDone && tier2AllDone && allDoneToday) {
      slotsHtml += `<div class="combo-banner">🔥 完美日! 主线 +${CORE_COMBO} · 支线 +${EXTEND_COMBO} · 完美 +${PERFECT_COMBO} = 全勤 +${CORE_COMBO + EXTEND_COMBO + PERFECT_COMBO}!</div>`;
    } else if (tier1AllDone) {
      slotsHtml += `<div class="combo-banner" style="background:linear-gradient(135deg,rgba(0,255,136,0.08),rgba(0,212,255,0.06))">🎯 主线全勤! +${CORE_COMBO} 分!</div>`;
      if (!showTier2) {
        slotsHtml += `<button class="tier-expand-btn" onclick="event.stopPropagation(); sessionStorage.setItem('${expandedKey}','2'); renderCheckinPage()">🎁 解锁支线挑战 (+${tier2Tasks.length} 项)</button>`;
      } else if (tier2AllDone && !showTier3 && !pastBedtime) {
        slotsHtml += `<button class="tier-expand-btn" onclick="event.stopPropagation(); sessionStorage.setItem('${expandedKey}','3'); renderCheckinPage()">🔮 解锁隐藏关卡 (+${tier3Tasks.length} 项)</button>`;
      } else if (pastBedtime && !showTier3) {
        slotsHtml += `<div class="combo-hint">🌙 21:30 到了, 该休息了! 明天继续 💪</div>`;
      }
    } else {
      const coreLeft = tier1Tasks.filter(t => !getDailyCheck(state, week, selectedDay, t.slot)).length;
      slotsHtml += `<div class="combo-hint">🎯 主线还差 <b>${coreLeft}</b> 个 → 全勾拿 <b>+${CORE_COMBO}</b> 主线全勤奖</div>`;
    }
  }

  // === 4) 周汇总情况 ===
  const summary = renderWeekSummary(week);

  // === 5) 管理项(里程碑/月小测) ===
  const adminItems = getWeeklyCheckinTemplate(week);
  let adminHtml = '';
  if (adminItems.length > 0) {
    const wd = state.weekly[week] || { checkin: {} };
    adminHtml = `
      <div class="admin-checkin-section">
        <div class="card-title" style="font-size: 16px;">🔒 家长确认项</div>
        ${adminItems.map(item => {
          const checked = !!(wd.checkin && wd.checkin[item.id]);
          const isSpecial = item.type === 'special' || item.type === 'milestone';
          return `
            <div class="checkin-item ${checked ? 'checked' : ''} ${isSpecial ? 'special' : ''}"
                 onclick="showAdminHint('${escapeAttr(item.label)}')">
              <div class="checkin-content">
                <div class="check-circle"></div>
                <div class="checkin-info">
                  <div class="checkin-title">${escapeHtml(item.label)}</div>
                  <div class="checkin-desc">${escapeHtml(item.desc)}</div>
                </div>
              </div>
              <div class="checkin-points">+${item.points}</div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  }

  // v19.3: 情绪安全阀
  const safetyValve = `<div style="text-align:center;margin-top:16px;padding:12px;border-radius:10px;background:var(--color-card-soft)">
    <button onclick="_emotionSafeExit()" style="background:none;border:none;color:var(--color-text-light);font-size:13px;cursor:pointer;padding:8px 16px">🐹 今天状态不好? 点这里休息</button>
  </div>`;

  list.innerHTML = goalBanner + restBanner + dayTabs + `<div class="day-slots">${slotsHtml}</div>` + safetyValve + summary + adminHtml;
}

function countDayDone(week, day) {
  const tasks = getDailyTasks(week, day);
  return tasks.filter(t => getDailyCheck(state, week, day, t.slot)).length;
}
function countDayTotal(week, day) {
  return getDailyTasks(week, day).length;
}

function renderWeekSummary(week) {
  const c = calcWeekCompletion(week, state);
  if (!c) return '';

  const ringColor = c.onTrack ? 'var(--color-success)' : (c.percent >= 50 ? 'var(--color-warn)' : 'var(--color-danger)');
  const dp = calcWeekDailyPoints(week, state);
  const isHard = WEEK_TASKS[week - 1] && WEEK_TASKS[week - 1].theme.includes('⭐');

  // 状态行:三种情况
  let status;
  if (dp.review > 0) {
    status = `🟢 周完成率达标 + 必做全清 — 周复盘 +${WEEKLY_REVIEW_POINTS}`;
  } else if (dp.reviewBlocked) {
    status = `🟠 完成率够了,但还有 <b>${dp.missingKeySlots.length}</b> 个 🎯 必做没做,拿不到周复盘 +${WEEKLY_REVIEW_POINTS}`;
  } else {
    const need = Math.max(0, Math.ceil(c.total * WEEKLY_REVIEW_THRESHOLD) - c.done);
    status = `🟡 还差 ${need} 个项目达 ${Math.round(WEEKLY_REVIEW_THRESHOLD * 100)}% — 拿 +${WEEKLY_REVIEW_POINTS} 复盘奖`;
  }

  // 必做 slot 区块
  const keySlots = listKeySlots(week);
  const keysHtml = keySlots.length === 0 ? '' : `
    <div class="key-slot-strip">
      <div class="subj-section-title">🎯 本周必做(影响 +${WEEKLY_REVIEW_POINTS} 复盘奖)</div>
      ${keySlots.map(k => {
        const done = getDailyCheck(state, week, k.day, k.slot);
        return `<span class="key-pill ${done ? 'done' : 'pending'}">${done ? '✓' : '○'} ${DAY_LABELS[k.day]} ${k.slot} · ${escapeHtml(k.task)}</span>`;
      }).join('')}
    </div>
  `;

  const ptsBreakdown = `
    <div class="pts-breakdown">
      本周已得 <b style="font-size:18px;color:var(--color-primary)">${dp.total}</b> 分
      <span class="pts-piece">项目分 ${dp.slot}</span>
      <span class="pts-piece">全勤 ${dp.combo}</span>
      <span class="pts-piece">复盘 ${dp.review}</span>
      <span class="pts-piece pts-hint" title="勾对一个项目得多少分,按时长分档:短任务(10-30min)+1 / 主科 1h(E1/S2)+2 / 周末整块(上午/下午)+3。难章周全部 +1">${isHard ? '⭐ 难章周 每项 +1' : '勾对加分:短+1 · 主科+2 · 周末+3'}</span>
    </div>
  `;

  // 各科目条形
  const subjectBars = Object.entries(c.bySubject)
    .filter(([_, v]) => v.total > 0)
    .map(([name, v]) => {
      const pct = v.total > 0 ? Math.round((v.done / v.total) * 100) : 0;
      return `
        <div class="subj-row">
          <div class="subj-name">${escapeHtml(name)}</div>
          <div class="subj-bar"><div class="subj-bar-fill" style="width:${pct}%"></div></div>
          <div class="subj-count">${v.done}/${v.total}</div>
        </div>
      `;
    }).join('');

  // 漏的 slot 列表(限 8 条)
  const missedHtml = c.missed.length === 0
    ? `<div class="missed-empty">🎉 本周没有遗漏的任务!</div>`
    : c.missed.slice(0, 8).map(m => `
        <div class="missed-row">
          <span class="missed-day">${m.dayLabel} · ${m.slot}</span>
          <span class="missed-task">${escapeHtml(m.task)}</span>
        </div>
      `).join('') + (c.missed.length > 8 ? `<div class="missed-more">还有 ${c.missed.length - 8} 个未完成…</div>` : '');

  // v18.36: 弱项分析 + 思维导图 + 下周计划
  const subjAcc = window.getSubjectAccuracy ? window.getSubjectAccuracy(state) : {};
  const weakList = window.findWeakSubjects ? window.findWeakSubjects(state) : [];
  const weakMap = window.WEAK_KNOWLEDGE_MAP || {};
  const accSummary = Object.keys(subjAcc).length === 0
    ? '<div class="acc-empty">📭 还没有游戏数据 — 先玩 mini-game 让系统了解你</div>'
    : `<div class="acc-grid">
        ${Object.keys(subjAcc).map(s => {
          const a = subjAcc[s];
          const colorVar = a.accuracy >= 80 ? 'var(--color-secondary)' : a.accuracy >= 60 ? 'var(--color-accent)' : 'var(--color-danger)';
          return `<div class="acc-pill" style="border-color:${colorVar}"><b>${s}</b> ${a.accuracy}% <small>(${a.correct}/${a.total})</small></div>`;
        }).join('')}
       </div>`;
  const weakHtml = weakList.length === 0
    ? (Object.keys(subjAcc).length > 0 ? '<div class="weak-none">🎉 各科正确率都 ≥70%, 继续保持!</div>' : '')
    : weakList.map(subj => {
        const data = weakMap[subj];
        if (!data) return '';
        const acc = subjAcc[subj];
        return `
          <div class="weak-card" style="border-left-color:${data.color}">
            <div class="weak-header">⚠️ ${subj} 正确率 <b>${acc.accuracy}%</b> <small>(${acc.correct}/${acc.total})</small></div>
            <div class="weak-mindmap">${_renderMindmap(subj, data)}</div>
            <div class="weak-topics">
              ${data.topics.map(t => `
                <div class="weak-topic">
                  <div class="wt-name">📚 ${escapeHtml(t.name)}</div>
                  <div class="wt-why">${escapeHtml(t.why)}</div>
                  <div class="wt-drill">💪 ${escapeHtml(t.drill)}</div>
                </div>
              `).join('')}
            </div>
          </div>`;
      }).join('');
  const planHtml = weakList.length === 0
    ? (Object.keys(subjAcc).length > 0
        ? '<div class="next-plan">📅 <b>下周计划</b>:维持当前节奏, 玩 1 次 PSLE+ 难度的 mini-game 挑战自己</div>'
        : '')
    : `<div class="next-plan">
         📅 <b>下周提升计划</b><br>
         1. 重点: ${weakList.join(' + ')} → 每天玩 1 局对应 mini-game<br>
         2. 看 wow 揭晓 + 复习卡时多注意 ${weakList[0]} 知识点<br>
         3. 周日复盘时回看本周漏的相关题目
       </div>`;

  return `
    <div class="week-summary card">
      <div class="card-title">📊 本周打卡完成情况</div>
      <div class="card-subtitle" style="font-size:12px;color:var(--color-text-light);margin-bottom:8px">打卡 = 习惯养成 · PSLE 能力分析见 📊 PSLE 能力 tab</div>
      <div class="week-summary-top">
        <div class="completion-ring" style="--ring-color: ${ringColor}; --ring-pct: ${c.percent}">
          <div class="ring-inner">
            <div class="ring-pct">${c.percent}%</div>
            <div class="ring-frac">${c.done}/${c.total}</div>
          </div>
        </div>
        <div class="completion-side">
          <div class="status-line">${status}</div>
          ${ptsBreakdown}
          <div class="daypart-stats">
            <div>📚 工作日:<b>${c.byDayPart.weekday.done}/${c.byDayPart.weekday.total}</b></div>
            <div>🎒 周末:<b>${c.byDayPart.weekend.done}/${c.byDayPart.weekend.total}</b></div>
          </div>
        </div>
      </div>
      ${keysHtml}
      <div class="subj-section">
        <div class="subj-section-title">分科完成率</div>
        ${subjectBars}
      </div>
      <div class="missed-section">
        <div class="subj-section-title">⚠️ 漏掉的任务</div>
        ${missedHtml}
      </div>
    </div>
  `;
}

// v18.36: 思维导图 (SVG 中心-辐射) + v18.39 加标题说明
function _renderMindmap(subjectName, data) {
  const cx = 160, cy = 110;
  const branches = data.topics.map((t, i) => {
    const angle = (i * 120 - 90) * Math.PI / 180;
    return { x: cx + Math.cos(angle) * 100, y: cy + Math.sin(angle) * 70, name: t.name };
  });
  const lines = branches.map(b => `<line x1="${cx}" y1="${cy}" x2="${b.x}" y2="${b.y}" stroke="${data.color}" stroke-width="2" opacity="0.6"/>`).join('');
  const nodes = branches.map((b, i) => `
    <g transform="translate(${b.x},${b.y})">
      <rect x="-40" y="-14" width="80" height="28" rx="14" fill="white" stroke="${data.color}" stroke-width="2"/>
      <text x="0" y="4" text-anchor="middle" font-size="12" font-weight="700" fill="${data.color}">${escapeHtml(b.name)}</text>
    </g>`).join('');
  return `
    <div class="mindmap-title">📍 <b>${escapeHtml(subjectName)}弱点知识图</b> — 中心是学科, 周围 3 个气泡是该学科最常错的知识点 (下方有详细解析)</div>
    <svg viewBox="0 0 320 220" xmlns="http://www.w3.org/2000/svg" style="width:100%;max-width:320px;height:auto">
      ${lines}
      <circle cx="${cx}" cy="${cy}" r="32" fill="${data.color}"/>
      <text x="${cx}" y="${cy+5}" text-anchor="middle" font-size="14" font-weight="900" fill="white">${escapeHtml(subjectName)}</text>
      ${nodes}
    </svg>
    <div class="mindmap-legend">💡 看完点击下方每个气泡对应的卡片, 知道<b>为什么</b>错 + <b>怎么练</b></div>`;
}

// v19.3: 情绪安全阀 — 不扣分, 不断streak, 仅降低当日期望
function _emotionSafeExit() {
  petSay('🐹 没关系! 休息也是变强的一部分。今天就到这里吧, 明天我们继续!', 8000);
  showToast('🌙 已切换为休息模式 — 今天不扣分', 'success');
  if (window.petExpress) petExpress('pet-happy', 3000);
}
window._emotionSafeExit = _emotionSafeExit;

function selectDay(day) {
  selectedDay = day;
  renderCheckinPage();
}

function toggleDailyCheck(week, day, slot, evt) {
  // v19.3: 防连点冷却 2s
  const cooldownKey = `${week}_${day}_${slot}`;
  const now = Date.now();
  if (!toggleDailyCheck._lastToggle) toggleDailyCheck._lastToggle = {};
  if (toggleDailyCheck._lastToggle[cooldownKey] && now - toggleDailyCheck._lastToggle[cooldownKey] < 2000) {
    showToast('⏳ 操作太快, 请稍等', 'warn');
    return;
  }
  toggleDailyCheck._lastToggle[cooldownKey] = now;

  const oldPoints = state.totalPoints;
  const oldDayComplete = isDayComplete(state, week, day);
  const oldOnTrack = (calcWeekCompletion(week, state) || {}).onTrack;
  const wasChecked = getDailyCheck(state, week, day, slot);

  // v19.3: 禁止跨周打卡(取消不限制,防误勾无法撤销)
  if (!wasChecked && week !== state.currentWeek) {
    showToast('⚠️ 只能打卡当前周的任务', 'warn');
    return;
  }

  // v18.22: 打卡必须先有照片 (取消勾选不限制); 4 mini-game 走独立路径不受此限制
  if (!wasChecked) {
    const hasPhoto = hasPhotoCached(week, day, slot);
    if (!hasPhoto) {
      showToast('📸 请先上传作业照才能打卡', 'warn');
      // 自动弹出拍照/相册选择
      pickPhotoForSlot(week, day, slot);
      return;
    }
  }

  setDailyCheck(state, week, day, slot, !wasChecked);
  recalcTotalPoints(state);

  // v19.3: 积分审计 — 计算真实奖励(含暴击/装备加成)并写入 log
  let reward = { pts: slotPoints(week, slot), isCrit: false, base: slotPoints(week, slot) };
  if (!wasChecked) {
    // 只有当前周才给暴击/buff加成
    if (week === state.currentWeek && window.calcSlotReward) {
      reward = window.calcSlotReward(state, slot, week);
    }
    const critExtra = reward.pts - (reward.base || slotPoints(week, slot));
    if (critExtra > 0) {
      state.totalPoints += critExtra;
      if (!state.lifetimeEarned || state.totalPoints > state.lifetimeEarned) state.lifetimeEarned = state.totalPoints;
    }
    state.logs.push({
      reason: `✅ 打卡 W${week} ${day} ${slot}${reward.isCrit ? ' 💥暴击' : ''} +${reward.pts}`,
      points: critExtra,
      type: 'slot',
      week: state.currentWeek,
      timestamp: Date.now()
    });
  } else {
    // v19.3: 取消时找到对应的打卡log并扣回暴击分
    let undoAmount = 0;
    for (let i = state.logs.length - 1; i >= 0; i--) {
      const log = state.logs[i];
      if (log.type === 'slot' && log.reason && log.reason.includes(`W${week} ${day} ${slot}`)) {
        undoAmount = log.points || 0;
        state.logs.splice(i, 1);
        break;
      }
    }
    if (undoAmount > 0) {
      state.totalPoints = Math.max(0, state.totalPoints - undoAmount);
    }
    state.logs.push({
      reason: `↩️ 取消 W${week} ${day} ${slot}`,
      points: -undoAmount,
      type: 'slot_undo',
      week: state.currentWeek,
      timestamp: Date.now()
    });
  }

  // v17.1: 打勾(非取消)时累加 daily streak
  let streakBump = null;
  if (!wasChecked && window.bumpDailyStreak) {
    streakBump = window.bumpDailyStreak(state);
  }
  // v17.5 Phase 2: 每 10 个 slot 完成 → +1 神秘宝箱
  let newBoxes = 0;
  if (!wasChecked && window.awardMysteryBoxesIfDue) {
    newBoxes = window.awardMysteryBoxesIfDue(state);
  }
  // v17.7 Phase 3: 追踪每日任务 (slot-3/slot-5)
  if (!wasChecked) {
    _trackQuest('slot-3', 1);
    _trackQuest('slot-5', 1);
  }
  // v18 Phase 5.1: 喂宠物 + 检查时段成就
  if (!wasChecked) {
    if (window.feedPet) window.feedPet(state);
    const hr = new Date().getHours();
    if (hr >= 22 || hr < 2) state._lateNightChecked = true;
    if (hr < 6) state._earlyMorningChecked = true;
    playSound('ding');
    // v19.3: 角色点头动画
    const charSvg = document.getElementById('characterSvg');
    if (charSvg) { charSvg.classList.add('char-nod'); setTimeout(() => charSvg.classList.remove('char-nod'), 400); }
  }
  saveState(state);
  // v18 Phase 5.1: 检查成就(在保存后调,避免新成就改 state 没存)
  if (!wasChecked) _checkAndUnlockAch();

  const newDayComplete = isDayComplete(state, week, day);
  const newOnTrack = (calcWeekCompletion(week, state) || {}).onTrack;
  const pts = reward.pts;

  if (!wasChecked) {
    // v19.2: 暴击闪光
    if (reward.isCrit) {
      const flash = document.createElement('div');
      flash.className = 'crit-flash';
      document.body.appendChild(flash);
      setTimeout(() => flash.remove(), 700);
      spawnFloatPoints(`💥 专注暴击! +${pts}`, evt, true);
      showToast(`💥 暴击! +${pts} 分`, 'crit');
      if (typeof petCelebrate === 'function') petCelebrate('💥 你的专注触发了暴击!');
    } else {
      // v19.3: 显示装备加成具体数字
      const equipBonus = pts - reward.base;
      const bonusText = equipBonus > 0 ? ` (装备+${equipBonus})` : '';
      spawnFloatPoints(`+${pts}${bonusText}`, evt, pts >= 8);
      if (typeof petCelebrate === 'function') petCelebrate(pts >= 10 ? '💪 大任务完成!' : '👍 干得好!');
    }
    // 大分数块脉动
    pulseScoreBlock();
    if (typeof _rainbowSweep === 'function') _rainbowSweep();
    // v17.5 Phase 2: 新宝箱提示 (在 streak 庆祝之前)
    if (newBoxes > 0) {
      showToast(`🎁 你赢了 ${newBoxes} 个神秘宝箱! 主页可开盒`, 'happy');
      spawnConfetti(window.innerWidth / 2, window.innerHeight / 2, 30);
    }
    // v17.1: streak 庆祝 (新加 streak 天才显示, 不是每个 slot 都弹)
    if (streakBump && streakBump.added) {
      if (streakBump.brokenInfo && !streakBump.brokenInfo.usedFreeze) {
        // 之前有 streak 但断了 — 必须显示损失感
        _renderStreakBrokenModal(streakBump.brokenInfo.prevDays);
      } else if (streakBump.brokenInfo && streakBump.brokenInfo.usedFreeze) {
        showToast(`🧊 用了 1 张保护券,救回了 ${streakBump.brokenInfo.prevDays} 天连续打卡!`, 'happy');
      } else if (streakBump.isMilestone) {
        showToast(`🔥🔥 第 ${streakBump.isMilestone} 天里程碑!${streakBump.gainedFreeze ? '+ 1 张 🧊 保护券' : ''}`, 'happy');
        spawnConfetti(window.innerWidth / 2, window.innerHeight / 2, 50);
      } else {
        // 普通累计
        showToast(`🔥 连续 ${streakBump.days} 天 — 不能断!`, 'happy');
      }
    }
    // 当日 combo 触发(撒花 + 震屏 + 大数字)
    if (newDayComplete && !oldDayComplete) {
      showToast(`🔥 当日全勾!全勤奖 +${DAY_COMBO_POINTS}`, 'success');
      shakeScreen();
      const cx = (evt && evt.clientX) || window.innerWidth / 2;
      const cy = (evt && evt.clientY) || window.innerHeight / 2;
      spawnConfetti(cx, cy, 35);
      setTimeout(() => spawnFloatPoints(`全勤 +${DAY_COMBO_POINTS}!`, evt, true), 200);
    }
    // 周复盘达标(撒花 + 中央大字 + 震屏)
    if (newOnTrack && !oldOnTrack) {
      setTimeout(() => {
        showToast(`🎉 周完成率达标!周复盘 +${WEEKLY_REVIEW_POINTS}`, 'success');
        shakeScreen();
        spawnConfetti(window.innerWidth / 2, window.innerHeight / 3, 50);
        spawnFloatPoints(`周复盘 +${WEEKLY_REVIEW_POINTS}!`, null, true);
      }, 400);
    }
    checkLevelUp(oldPoints, state.totalPoints);
    // v19.2: 打卡后触发奖励关 (延迟 1.2s 让打卡动画先播完)
    setTimeout(() => _triggerGameReward(week, selectedDay, slot), 1200);
  } else {
    showToast(`↩️ 取消勾选`, 'warn');
    if (oldDayComplete && !newDayComplete) {
      showToast(`💔 当日 combo 没了 -${DAY_COMBO_POINTS}`, 'warn');
    }
    if (oldOnTrack && !newOnTrack) {
      showToast(`⚠️ 周完成率掉到 ${Math.round(WEEKLY_REVIEW_THRESHOLD * 100)}% 以下 -${WEEKLY_REVIEW_POINTS}`, 'warn');
    }
  }

  renderAll();
}

// ============ v19.2: 打卡后奖励关触发 ============
const SLOT_TO_GAME = {
  'Comprehension': ['grammar', 'cloze'], 'Grammar': ['grammar'], 'Editing': ['editing'],
  '作文': ['grammar', 'vocab'], 'Cloze': ['cloze'], '听力': ['listen'], '口试': ['listen', 'vocab'],
  '🔬': ['scimcq', 'scilab'], '➗': ['math', 'unit'],
  '华文': ['chinese'], 'Vocabulary': ['vocab'], 'vocab': ['vocab']
};
const GAME_WEIGHT = { grammar:5, cloze:5, editing:5, vocab:4, listen:4, scimcq:3, scilab:2, math:2, unit:1, chinese:1 };
const GAME_NAMES = { grammar:'Grammar MCQ', cloze:'Cloze 完形', editing:'Editing 找错', vocab:'词汇连连看', listen:'听写练习', scimcq:'科学 MCQ', scilab:'科学分类', math:'数学速算', unit:'单位换算', chinese:'华文 MCQ' };

function _triggerGameReward(week, day, slot) {
  if (!state._gameTriggersToday) state._gameTriggersToday = { date: new Date().toISOString().slice(0,10), count: 0, bossUsed: false };
  const todayKey = new Date().toISOString().slice(0,10);
  if (state._gameTriggersToday.date !== todayKey) state._gameTriggersToday = { date: todayKey, count: 0, bossUsed: false };
  if (state._gameTriggersToday.count >= 3) return;

  const tier = SLOT_TIER[slot] || 3;
  if (tier !== 1) return;

  const dayTasks = getDailyTasks(week, day);
  const coreTasks = dayTasks.filter(t => (SLOT_TIER[t.slot] || 3) === 1);
  const coreAllDone = coreTasks.every(t => getDailyCheck(state, week, day, t.slot));

  // v19.3: 只在核心全完后触发, 不中途弹出
  if (!coreAllDone) return;

  let isBoss = false;
  if (!state._gameTriggersToday.bossUsed) {
    isBoss = true;
  } else if (state._gameTriggersToday.count >= 2) {
    return;
  }

  const wt = getWeekTasks(week);
  const taskText = (wt && wt.days[day] && wt.days[day][slot]) || '';
  let candidates = [];
  for (const [keyword, games] of Object.entries(SLOT_TO_GAME)) {
    if (taskText.includes(keyword)) candidates.push(...games);
  }
  if (candidates.length === 0) candidates = Object.keys(GAME_WEIGHT);
  candidates = [...new Set(candidates)];
  const todayPlayed = state.gameDailyCount ? Object.keys(state.gameDailyCount.counts || {}).filter(k => (state.gameDailyCount.counts[k] || 0) > 0) : [];
  candidates = candidates.filter(g => !todayPlayed.includes(g));
  if (candidates.length === 0) return;

  candidates.sort((a, b) => (GAME_WEIGHT[b] || 1) - (GAME_WEIGHT[a] || 1));
  const picked = candidates[0];
  const diff = (state.gameStats && state.gameStats[picked] && state.gameStats[picked].difficulty) || 4;
  const bossDiff = Math.min(6, diff + 1);
  const rMap = { 3: 4, 4: 6, 5: 10, 6: 15 };
  const reward = isBoss ? (rMap[bossDiff] || 6) * 3 : rMap[diff] || 6;

  state._gameTriggersToday.count++;
  if (isBoss) state._gameTriggersToday.bossUsed = true;

  const title = isBoss ? `⚔️ BOSS 关! ${GAME_NAMES[picked] || picked}` : `🎮 奖励关! ${GAME_NAMES[picked] || picked}`;
  const desc = isBoss ? `难度 Lv${bossDiff} · 满分可赢 +${reward} 分!` : `赢 +${reward} 分!`;
  const listEl = document.getElementById('checkinList');
  if (!listEl) return;
  const existing = listEl.querySelector('.game-reward-card');
  if (existing) existing.remove();
  const card = document.createElement('div');
  card.className = 'game-reward-card';
  card.style.cssText = 'margin:16px 0;padding:20px;background:linear-gradient(135deg,rgba(0,212,255,0.08),rgba(56,189,248,0.06));border:2px solid var(--color-primary);border-radius:14px;text-align:center;animation:fadeIn 0.4s';
  card.innerHTML = `
    <div style="font-size:18px;font-weight:900;color:var(--color-primary);margin-bottom:6px">${title}</div>
    <div style="font-size:13px;color:var(--color-text-light);margin-bottom:14px">${desc}</div>
    <button onclick="this.parentElement.remove(); _startTriggeredGame('${picked}', ${isBoss})" style="padding:12px 24px;font-size:15px;font-weight:700;background:linear-gradient(135deg,var(--color-primary),#0099CC);color:white;border:none;border-radius:10px;cursor:pointer;margin-right:8px">接受挑战!</button>
    <button onclick="this.parentElement.remove()" style="padding:10px 14px;font-size:13px;background:var(--color-card-soft);color:var(--color-text-light);border:1px solid var(--color-border);border-radius:8px;cursor:pointer">跳过</button>
  `;
  const daySlots = listEl.querySelector('.day-slots');
  if (daySlots) daySlots.appendChild(card);
  else listEl.appendChild(card);
}

function _startTriggeredGame(gameKey, isBoss) {
  const openers = { grammar: 'openGrammarGame', cloze: 'openClozeGame', editing: 'openEditingGame', vocab: 'openVocabGame', listen: 'openListeningGame', scimcq: 'openScimcqGame', scilab: 'openScilabGame', math: 'openMathGame', unit: 'openUnitGame', chinese: 'openChineseGame' };
  const fn = openers[gameKey];
  if (fn && typeof window[fn] === 'function') window[fn](state.currentWeek);
  else if (fn && typeof eval(fn) === 'function') eval(fn + '(' + state.currentWeek + ')');
}

// 浮动 "+N" 数字反馈
function spawnFloatPoints(text, evt, big) {
  const el = document.createElement('div');
  el.className = 'float-points' + (big ? ' big' : '');
  el.textContent = text;
  // 锚点优先用鼠标位置,否则用屏幕中央
  let x, y;
  if (evt && (evt.clientX || evt.touches)) {
    x = evt.clientX || (evt.touches && evt.touches[0].clientX) || window.innerWidth / 2;
    y = evt.clientY || (evt.touches && evt.touches[0].clientY) || window.innerHeight / 2;
  } else {
    x = window.innerWidth / 2;
    y = window.innerHeight / 3;
  }
  el.style.left = x + 'px';
  el.style.top = y + 'px';
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 1400);
}

// 撒花粒子 (combo / 升级 / 周复盘达标 触发)
function spawnConfetti(centerX, centerY, count) {
  const colors = ['#FF6B6B', '#4ECDC4', '#FFE66D', '#A788E0', '#FFB6D9', '#6BCB77', '#FF9F45'];
  const cx = centerX || window.innerWidth / 2;
  const cy = centerY || window.innerHeight / 3;
  const n = count || 30;
  for (let i = 0; i < n; i++) {
    const p = document.createElement('div');
    p.className = 'confetti-piece';
    p.style.left = cx + 'px';
    p.style.top = cy + 'px';
    p.style.background = colors[Math.floor(Math.random() * colors.length)];
    // 随机方向(360度)+ 随机距离 80-220 px
    const angle = Math.random() * Math.PI * 2;
    const dist = 80 + Math.random() * 140;
    p.style.setProperty('--cx', Math.cos(angle) * dist + 'px');
    p.style.setProperty('--cy', Math.sin(angle) * dist - 60 + 'px');  // 偏上飞
    // 随机大小 + 旋转
    const size = 8 + Math.random() * 10;
    p.style.width = size + 'px';
    p.style.height = size + 'px';
    p.style.animationDelay = (Math.random() * 0.15) + 's';
    document.body.appendChild(p);
    setTimeout(() => p.remove(), 1900);
  }
}

// 屏幕震动(combo / 升级)
function shakeScreen() {
  document.body.classList.remove('shake');
  // force reflow
  void document.body.offsetWidth;
  document.body.classList.add('shake');
  setTimeout(() => document.body.classList.remove('shake'), 500);
}

// 角色脉动 + 大分数块脉动(每次得分都触发,小高潮)
function pulseScoreBlock() {
  const block = document.getElementById('bigScoreBlock') || document.querySelector('.big-score-block');
  if (block) {
    block.classList.remove('pulse');
    void block.offsetWidth;
    block.classList.add('pulse');
    setTimeout(() => block.classList.remove('pulse'), 700);
  }
  const charDisp = document.querySelector('.character-display');
  if (charDisp) {
    charDisp.classList.remove('glow');
    void charDisp.offsetWidth;
    charDisp.classList.add('glow');
    setTimeout(() => charDisp.classList.remove('glow'), 900);
  }
}

function showAdminHint(label) {
  showToast(`🔒 "${label}" 需要家长在管理页确认`, 'warn');
}

// ============ 作业照片 (方案 A 防虚假打卡) ============
// v18.19: 弹 modal 让用户选 拍照 / 从相册
function pickPhotoForSlot(week, day, slot) {
  const overlay = document.createElement('div');
  overlay.className = 'photo-source-modal';
  overlay.innerHTML = `
    <div class="photo-source-card">
      <div class="photo-source-title">📸 上传作业照</div>
      <div class="photo-source-buttons">
        <button class="photo-source-btn" data-source="camera">
          <span class="ps-icon">📷</span>
          <span class="ps-label">现在拍照</span>
          <span class="ps-sub">用摄像头</span>
        </button>
        <button class="photo-source-btn" data-source="gallery">
          <span class="ps-icon">🖼️</span>
          <span class="ps-label">从相册选</span>
          <span class="ps-sub">已拍好的照片</span>
        </button>
      </div>
      <button class="photo-source-cancel" onclick="this.closest('.photo-source-modal').remove()">取消</button>
    </div>
  `;
  document.body.appendChild(overlay);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.remove();
    const btn = e.target.closest('.photo-source-btn');
    if (!btn) return;
    const source = btn.dataset.source;
    overlay.remove();
    _doPhotoUpload(week, day, slot, source === 'camera');
  });
}

function _doPhotoUpload(week, day, slot, useCamera) {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';
  if (useCamera) input.capture = 'environment';  // 不设 = 相册/选文件
  input.style.display = 'none';
  input.onchange = async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    showToast('📤 正在压缩上传…', 'success');
    try {
      const blob = await compressImage(file);
      // v19.3: 照片指纹防重用
      if (window.computePhotoFingerprint) {
        const fp = await computePhotoFingerprint(blob);
        const slotKey = photoKey(week, day, slot);
        if (isPhotoDuplicate(state, fp, slotKey)) {
          showToast('❌ 这张照片已在其他任务中使用过，请拍新照片', 'danger');
          return;
        }
        if (!state.photoHashes) state.photoHashes = {};
        state.photoHashes[fp] = slotKey;
      }
      await photoPut(week, day, slot, blob);
      await refreshPhotoKeyCache();
      // v19.3: 必须上传云端成功才算有效
      if (typeof photoUploadCloud === 'function' && isFbReady()) {
        showToast('☁️ 正在同步到云端…', 'success');
        try {
          await photoUploadCloud(week, day, slot, blob);
          showToast(`✅ 照片已上传成功 (${Math.round(blob.size / 1024)} KB) — 现在可以打卡`, 'success');
        } catch (err) {
          console.warn('云端同步失败:', err);
          showToast('❌ 云端上传失败，请检查网络后重试。照片已本地保存，联网后会自动同步。', 'danger');
        }
      } else {
        showToast(`📸 照片已本地保存 (${Math.round(blob.size / 1024)} KB) — 联网后自动同步到云端`, 'warn');
      }
      renderAll();
    } catch (err) {
      console.error(err);
      showToast('❌ 上传失败:' + err.message, 'danger');
    }
  };
  document.body.appendChild(input);
  input.click();
  setTimeout(() => input.remove(), 5000);
}

async function viewPhoto(week, day, slot) {
  const rec = await photoGet(week, day, slot);
  const cloudInfo = state.cloudPhotos && state.cloudPhotos[photoKey(week, day, slot)];
  if (!rec && !cloudInfo) {
    showToast('❌ 找不到照片', 'warn');
    return;
  }
  const isCloud = !rec && cloudInfo;
  const imgSrc = rec ? URL.createObjectURL(rec.blob) : cloudInfo.url;
  const uploadTime = rec
    ? new Date(rec.savedAt).toLocaleString('zh-CN')
    : new Date(cloudInfo.uploadedAt).toLocaleString('zh-CN');
  const sizeText = rec ? `${Math.round(rec.size / 1024)} KB` : '云端';
  const cloudBadge = cloudInfo ? ' ☁️' : '';
  const tasks = getDailyTasks(week, day);
  const t = tasks.find(x => x.slot === slot);
  const taskText = t ? t.task : slot;

  const verifyHtml = cloudInfo
    ? cloudInfo.verified
      ? `<div class="photo-verify-badge">✅ 家长已确认 · ${new Date(cloudInfo.verifiedAt).toLocaleString('zh-CN')}</div>`
      : `<button class="btn btn-success photo-verify-btn" onclick="verifyCloudPhoto(${week}, '${day}', '${slot}'); this.closest('.photo-modal').remove()${rec ? ('; URL.revokeObjectURL(\'' + imgSrc + '\')') : ''}">✅ 我确认了（家长点这里）</button>`
    : '';

  const overlay = document.createElement('div');
  overlay.className = 'photo-modal';
  overlay.innerHTML = `
    <div class="photo-modal-card">
      <div class="photo-modal-header">
        <div>
          <div class="photo-modal-title">${escapeHtml(taskText)}${cloudBadge}</div>
          <div class="photo-modal-meta">W${week} · ${DAY_LABELS[day]} · ${slot} · 上传 ${uploadTime} · ${sizeText}</div>
        </div>
        <button class="photo-modal-close" onclick="this.closest('.photo-modal').remove()${rec ? ('; URL.revokeObjectURL(\'' + imgSrc + '\')') : ''}">✕</button>
      </div>
      <img class="photo-modal-img" src="${imgSrc}" alt="作业照">
      ${verifyHtml}
      <div class="photo-modal-actions">
        ${rec ? `<button class="btn btn-secondary" onclick="replacePhoto(${week}, '${day}', '${slot}'); this.closest('.photo-modal').remove();">🔄 换一张</button>` : ''}
        ${rec ? `<button class="btn btn-danger" onclick="deletePhoto(${week}, '${day}', '${slot}'); this.closest('.photo-modal').remove();">🗑️ 删除</button>` : ''}
      </div>
    </div>
  `;
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      overlay.remove();
      if (rec) URL.revokeObjectURL(imgSrc);
    }
  });
  document.body.appendChild(overlay);
}

function replacePhoto(week, day, slot) {
  pickPhotoForSlot(week, day, slot);
}

async function deletePhoto(week, day, slot) {
  if (!confirm('删除这张作业照?')) return;
  await photoDelete(week, day, slot);
  await refreshPhotoKeyCache();
  showToast('🗑️ 已删除', 'warn');
  renderAll();
}

// ============ 作业分数(v4) ============
// ============ v16: 学科词汇 500 词 modal ============
function openVocabModal(week) {
  const v = window.getVocabForWeek ? window.getVocabForWeek(week) : null;
  if (!v) { showToast('本周没有专门的学科词汇', 'sad'); return; }
  // v17.7 quest: 看 vocab 算 1 次
  _trackQuest('vocab-1', 1);
  const modal = document.getElementById('vocabModal');
  if (!modal) return;
  const wordsHtml = v.section.words.map(w => `<span class="vocab-word">${escapeHtml(w)}</span>`).join('');
  modal.innerHTML = `
    <div class="vocab-modal-inner">
      <div class="vocab-modal-header">
        <div>
          <span class="vocab-modal-title">${v.subjectIcon} ${v.subject}词汇 — ${escapeHtml(v.section.title)}</span>
          <span class="vocab-modal-meta">W${week} · 共 ${v.section.words.length} 词 · ${v.weekRange}</span>
        </div>
        <button class="vocab-modal-close" onclick="closeVocabModal()">×</button>
      </div>
      <div class="vocab-modal-body">${wordsHtml}</div>
      <div class="vocab-modal-footer">
        💡 v16 用法:周一 18:00-18:15 领读 30 词,周三拼写 + 用法测,周五迷你诊断含 5 题。
        DeepSeek 词汇复习每天 10min:① 中→英翻译当天词 ② 用每词造 1 句 ③ 错的入错题词汇本。
      </div>
    </div>
  `;
  modal.classList.add('show');
}
function closeVocabModal() {
  const modal = document.getElementById('vocabModal');
  if (modal) modal.classList.remove('show');
}

// ============ v17.7 Phase 4: 词汇连连看 mini-game ============
let _vocabGameState = null;

function openVocabGame(weekN) {
  if (!_checkGameDailyLock('vocab')) return;  // v18.38
  // v18.25: 按当前难度采样 (含 sentence 卡 if diff>=4)
  const diff = window.getDifficulty ? window.getDifficulty(state, 'vocab') : 1;
  let pairs;
  if (window.getVocabPairsByDiff) {
    pairs = window.getVocabPairsByDiff(diff, weekN, 6);
  }
  if (!pairs || pairs.length < 6) {
    // fallback to old logic
    const v = window.getVocabForWeek ? window.getVocabForWeek(weekN) : null;
    if (!v) {
      showToast('本周没有学科词汇游戏可玩', 'sad');
      return;
    }
    const allWords = (v.section.words || []).filter(w => window.VOCAB_MEANINGS && window.VOCAB_MEANINGS[w]);
    if (allWords.length < 6) {
      showToast(`本周词汇翻译数据不足(只有 ${allWords.length} 个), 暂不能玩`, 'sad');
      return;
    }
    pairs = allWords.sort(() => Math.random() - 0.5).slice(0, 6).map(w => ({ en: w, zh: window.getVocabMeaning(w), kind: 'word' }));
  }
  // 中文列独立洗牌
  const zhShuffled = [...pairs].sort(() => Math.random() - 0.5);
  _vocabGameState = {
    pairs, zhShuffled,
    selectedEn: null, selectedZh: null,
    matched: new Set(),
    wrong: 0,
    startedAt: Date.now(),
    weekN, diff
  };
  _renderVocabGame();
}

function _renderVocabGame() {
  const modal = document.getElementById('vocabGameModal');
  if (!modal || !_vocabGameState) return;
  const g = _vocabGameState;
  const total = g.pairs.length;
  const done = g.matched.size;
  const elapsed = Math.floor((Date.now() - g.startedAt) / 1000);
  modal.innerHTML = `
    <div class="vg-inner">
      <div class="vg-header">
        <span class="vg-title">🎮 词汇连连看 · W${g.weekN}</span>
        <span class="vg-stats">${done}/${total} · ⏱️ ${elapsed}s · ❌ ${g.wrong}</span>
        <button class="vg-close-btn" onclick="closeVocabGame()">×</button>
      </div>
      <div class="vg-instr">点选 1 个英文 + 1 个中文配对 — 全配对完获 <b>+10 分 + 1 个宝箱</b></div>
      <div class="vg-board">
        <div class="vg-col">
          ${g.pairs.map((p, i) => {
            const isSelected = g.selectedEn === i;
            const isMatched = g.matched.has(p.en);
            const sentClass = p.kind === 'sent' ? 'vg-sent' : '';
            return `<button class="vg-tile vg-en ${sentClass} ${isSelected ? 'selected' : ''} ${isMatched ? 'matched' : ''}"
              onclick="vocabGameClickEn(${i})" ${isMatched ? 'disabled' : ''}>${escapeHtml(p.en)}</button>`;
          }).join('')}
        </div>
        <div class="vg-col">
          ${g.zhShuffled.map((p, i) => {
            const isSelected = g.selectedZh === i;
            const isMatched = g.matched.has(p.en);
            const sentClass = p.kind === 'sent' ? 'vg-sent' : '';
            return `<button class="vg-tile vg-zh ${sentClass} ${isSelected ? 'selected' : ''} ${isMatched ? 'matched' : ''}"
              onclick="vocabGameClickZh(${i})" ${isMatched ? 'disabled' : ''}>${escapeHtml(p.zh)}</button>`;
          }).join('')}
        </div>
      </div>
      ${done >= total ? `
        <div class="vg-victory">🎉 全部配对完成! +10 分 + 1 个宝箱<br><button class="btn btn-primary" onclick="closeVocabGame()">太棒了!</button></div>
      ` : ''}
    </div>
  `;
  modal.classList.add('show');
}

function vocabGameClickEn(idx) {
  if (!_vocabGameState) return;
  _vocabGameState.selectedEn = idx;
  _checkVocabPair();
  _renderVocabGame();
}
function vocabGameClickZh(idx) {
  if (!_vocabGameState) return;
  _vocabGameState.selectedZh = idx;
  _checkVocabPair();
  _renderVocabGame();
}

function _checkVocabPair() {
  const g = _vocabGameState;
  if (g.selectedEn == null || g.selectedZh == null) return;
  const en = g.pairs[g.selectedEn];
  const zh = g.zhShuffled[g.selectedZh];
  if (en.en === zh.en) {
    // 配对成功
    g.matched.add(en.en);
    g.selectedEn = null;
    g.selectedZh = null;
    if (g.matched.size >= g.pairs.length) {
      // v18.25: 记录难度 (vocab 完成度按 错误数 折算: 0 错 = 100%, 每错 1 个扣 1/total)
      const acc = Math.max(0, 1 - g.wrong / g.pairs.length);
      let diffResult = null;
      if (window.recordGameRun) diffResult = window.recordGameRun(state, 'vocab', Math.round(acc * g.pairs.length), g.pairs.length);
      // v18.24: 递减奖励
      const playNum = _bumpDailyGameCount('vocab');
      const mult = _getGameMultiplier(playNum);
      const vDiff = (state.gameStats && state.gameStats.vocab && state.gameStats.vocab.difficulty) || 4;
      const vRewardMap = { 3: 4, 4: 6, 5: 10, 6: 15 };
      const points = Math.floor((g.wrong === 0 ? (vRewardMap[vDiff] || 2) : Math.max(1, (vRewardMap[vDiff] || 2) - 1)) * mult);
      state.totalPoints += points;
      if (!state.mysteryBoxes) state.mysteryBoxes = { available: 0, opened: 0, totalSlotsAtLastEarn: 0, history: [] };
      // 仅第 1 次 give box
      if (playNum === 1) state.mysteryBoxes.available += 1;
      state.logs.push({
        reason: `🎮 词汇连连看 W${g.weekN} 全对(第 ${playNum} 次, ${_getMultiplierLabel(playNum)})`,
        points, week: state.currentWeek, timestamp: Date.now()
      });
      // v18 vocabPerfectRuns 用于成就 (仅第 1 次计成就)
      if (g.wrong === 0 && playNum === 1) state.vocabPerfectRuns = (state.vocabPerfectRuns || 0) + 1;
      state.vocabGameRuns = (state.vocabGameRuns || 0) + 1;
      saveState(state);
      if (mult > 0) {
        spawnConfetti(window.innerWidth / 2, window.innerHeight / 3, 60);
        playSound('tada');
      }
      if (playNum >= 2) showToast(`🎮 第 ${playNum} 次 — ${_getMultiplierLabel(playNum)} (+${points} 分)`, 'warn');
      if (diffResult && diffResult.levelChanged === 'up') { showToast(`🆙 词汇难度升到 Lv ${diffResult.newDiff}!`, 'happy'); playSound('tada'); }
      if (diffResult && diffResult.levelChanged === 'down') showToast(`📉 词汇难度降到 Lv ${diffResult.newDiff}`, 'sad');
      _checkAndUnlockAch();
      setTimeout(() => renderAll(), 300);
    }
  } else {
    g.wrong += 1;
    if (window.addToErrorBank) {
      const enWord = g.pairs[g.selectedEn];
      const zhWord = g.zhShuffled[g.selectedZh];
      window.addToErrorBank(state, {
        gameKey: 'vocab', type: 'match',
        q: enWord.en + ' ≠ ' + zhWord.zh,
        correctAns: enWord.en + ' = ' + enWord.zh,
        explain: enWord.en + ' 的意思是 ' + enWord.zh
      });
    }
    setTimeout(() => {
      if (_vocabGameState) {
        _vocabGameState.selectedEn = null;
        _vocabGameState.selectedZh = null;
        _renderVocabGame();
      }
    }, 600);
  }
}

function closeVocabGame() {
  const modal = document.getElementById('vocabGameModal');
  if (modal) modal.classList.remove('show');
  _vocabGameState = null;
}

// ============ v18 Phase 5.4: 🔊 音效 (Web Audio API 程序合成) ============
let _audioCtx = null;
function _getAudioCtx() {
  if (!_audioCtx) {
    try { _audioCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {}
  }
  return _audioCtx;
}
function playSound(type) {
  if (state.soundEnabled === false) return;
  const ctx = _getAudioCtx();
  if (!ctx) return;
  try {
    const now = ctx.currentTime;
    switch (type) {
      case 'ding': _playTone(ctx, 880, 0.15, 'sine', 0.18); break;
      case 'fanfare':
        _playTone(ctx, 523, 0.12, 'triangle', 0.2, 0);    // C
        _playTone(ctx, 659, 0.12, 'triangle', 0.2, 0.12); // E
        _playTone(ctx, 784, 0.25, 'triangle', 0.2, 0.24); // G
        break;
      case 'slot':
        for (let i = 0; i < 6; i++) _playTone(ctx, 200 + i * 80, 0.08, 'square', 0.1, i * 0.06);
        break;
      case 'tada':
        _playTone(ctx, 523, 0.12, 'triangle', 0.2, 0);
        _playTone(ctx, 784, 0.12, 'triangle', 0.2, 0.10);
        _playTone(ctx, 1047, 0.4, 'triangle', 0.2, 0.20);
        break;
      case 'sad':
        _playTone(ctx, 440, 0.15, 'sawtooth', 0.15, 0);
        _playTone(ctx, 330, 0.3, 'sawtooth', 0.15, 0.12);
        break;
      case 'pop':
        _playTone(ctx, 660, 0.08, 'sine', 0.2, 0);
        _playTone(ctx, 990, 0.12, 'sine', 0.2, 0.06);
        break;
      // v18.39: 闹铃用 — 长音、舒缓、有旋律
      case 'alarm-rest': {
        // 休息提醒 — 5 音下行钟声 (温柔)
        const notes = [880, 784, 659, 587, 523]; // A5 G5 E5 D5 C5
        notes.forEach((f, i) => _playTone(ctx, f, 0.45, 'sine', 0.4, i * 0.35));
        break;
      }
      case 'alarm-back': {
        // 回来学 — 上行钟声 + 1 长音收尾 (鼓舞)
        const notes = [523, 659, 784, 1047]; // C E G C+
        notes.forEach((f, i) => _playTone(ctx, f, 0.32, 'triangle', 0.45, i * 0.22));
        _playTone(ctx, 1047, 0.6, 'triangle', 0.45, 1.0);
        break;
      }
      case 'alarm-start': {
        // 开始学 — 4 音欢快 (晨钟)
        const notes = [659, 880, 1047, 1319]; // E A C E
        notes.forEach((f, i) => _playTone(ctx, f, 0.3, 'triangle', 0.5, i * 0.18));
        _playTone(ctx, 1319, 0.5, 'triangle', 0.4, 0.85);
        break;
      }
      case 'alarm-sleep': {
        // 睡觉 — 极柔 3 音缓降 (摇篮曲感)
        _playTone(ctx, 587, 0.8, 'sine', 0.35, 0);    // D
        _playTone(ctx, 494, 0.8, 'sine', 0.35, 0.7);  // B
        _playTone(ctx, 392, 1.4, 'sine', 0.35, 1.4);  // G (长尾)
        break;
      }
      case 'alarm-switch': {
        // 换任务 — 2 音 ping ping (提醒)
        _playTone(ctx, 880, 0.18, 'sine', 0.4, 0);
        _playTone(ctx, 880, 0.18, 'sine', 0.4, 0.3);
        _playTone(ctx, 1175, 0.35, 'sine', 0.4, 0.6);
        break;
      }
    }
  } catch (e) {}
}
function _playTone(ctx, freq, dur, wave, vol, delay) {
  const t = ctx.currentTime + (delay || 0);
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = wave || 'sine';
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(vol || 0.2, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
  osc.connect(gain).connect(ctx.destination);
  osc.start(t);
  osc.stop(t + dur);
}

// ============ v18 Phase 5.1: 🐣 宠物 widget ============
function renderPetWidget() {
  const w = document.getElementById('petWidget');
  if (!w || !window.getCurrentPetForm) return;
  if (!state.pet) state.pet = { name: '球球', formIdx: 0, spawnedAt: Date.now(), feedCount: 0, happiness: 100, lastFedDate: null };
  const calcForm = window.getCurrentPetForm(state);
  state.pet.formIdx = Math.max(state.pet.formIdx || 0, calcForm.idx);
  const form = window.PET_FORMS[state.pet.formIdx] || calcForm;
  const happy = state.pet.happiness || 0;
  const isSad = happy < 30;
  const inAshes = window.isStreakInAshes && window.isStreakInAshes(state);
  w.style.background = 'transparent';
  // v19.1: 累计45天解锁高达, 双宠物同时显示
  const completedDays = window._countCompletedDays ? window._countCompletedDays(state) : 0;
  const gundamUnlocked = completedDays >= 45;
  // 情绪动画类
  w.classList.remove('pet-happy', 'pet-sad', 'pet-gundam', 'pet-angry', 'pet-proud', 'pet-excited', 'pet-sleepy');
  if (isSad || inAshes) w.classList.add('pet-sad');
  else if (happy >= 70) w.classList.add('pet-happy');
  w.style.position = 'relative';
  w.innerHTML = `<div class="pet-svg-wrap">${form.svg}</div>`;
  w.classList.toggle('pet-king', form.idx >= 11);
  w.classList.toggle('pet-warrior', form.idx === 9);
  w.setAttribute('data-name', `${state.pet.name || '球球'} · ${form.name} ${isSad ? '😢' : ''}`);
  w.title = `${state.pet.name || '球球'} (${form.name})\n心情 ${happy}/100\n点击查看详情/改名`;
  w.onclick = openPetModal;
  // 双宠物: 高达解锁后显示在仓鼠左侧
  let gundamEl = document.getElementById('petGundam');
  if (gundamUnlocked) {
    if (!gundamEl) {
      gundamEl = document.createElement('div');
      gundamEl.id = 'petGundam';
      gundamEl.className = 'pet-widget pet-gundam-buddy';
      w.parentElement.appendChild(gundamEl);
    }
    gundamEl.style.display = '';
    gundamEl.innerHTML = `<div class="pet-svg-wrap">${window.GUNDAM_PET.svg}</div>`;
    gundamEl.title = '命运高达 · PSLE必胜战友';
    gundamEl.onclick = () => showToast('🤖 命运高达: PSLE必胜！我和仓鼠一起守护你', 'happy');
  } else if (gundamEl) {
    gundamEl.style.display = 'none';
  }
}
// v19.1: switchPet deprecated — 双宠物同时显示
function switchPet() {
  showToast('🐹🤖 仓鼠和高达现在一起陪你了!', 'happy');
}
window.switchPet = switchPet;

// ============ v18.20: A 活的伙伴 ============
let _petBubbleTimer = null;
let _petLastSpoke = 0;
function petSay(message, duration) {
  if (!message) return;
  if (Date.now() - _petLastSpoke < 2000) return;
  _petLastSpoke = Date.now();
  const card = document.getElementById('petWidget');
  if (!card) return;
  const old = card.querySelector('.pet-bubble');
  if (old) old.remove();
  const bubble = document.createElement('div');
  bubble.className = 'pet-bubble';
  const span = document.createElement('span');
  span.className = 'bubble-text';
  span.textContent = message;
  bubble.appendChild(span);
  card.appendChild(bubble);
  let dur;
  if (span.scrollWidth <= bubble.clientWidth) {
    span.classList.add('no-scroll');
    dur = duration || 4500;
  } else {
    // 滚动时长 = 动画时长, 气泡与文字同时消失
    dur = 10000;
  }
  setTimeout(() => {
    bubble.classList.add('fade-out');
    setTimeout(() => bubble.remove(), 400);
  }, dur);
}

// v18.93: 表情自动反应系统 — 按活动切换(登录→happy, 答对→excited, 闲置2min→sleepy)
const _PET_EXPR_LIST = ['pet-nod', 'pet-think', 'pet-jump', 'pet-peek', 'pet-dance', 'pet-excited', 'pet-sleepy', 'pet-sad', 'pet-angry', 'pet-proud'];
let _exprTimer = null;
let _petLastActivity = Date.now();
let _petIdleTimer = null;
function _petTrackActivity() {
  _petLastActivity = Date.now();
  const w = document.getElementById('petWidget');
  if (w && w.classList.contains('pet-sleepy')) {
    w.classList.remove('pet-sleepy');
  }
}
function _petCheckIdle() {
  const w = document.getElementById('petWidget');
  if (!w || document.hidden) return;
  const idle = Date.now() - _petLastActivity;
  if (idle >= 120000) {
    w.classList.add('pet-sleepy');
  }
}
function petExpress(expr, dur) {
  _petTrackActivity();
  const w = document.getElementById('petWidget');
  if (!w) return;
  _PET_EXPR_LIST.forEach(c => w.classList.remove(c));
  void w.offsetWidth;
  w.classList.add(expr);
  const d = dur || (expr === 'pet-sleepy' ? 3000 : expr === 'pet-excited' ? 2000 : 1500);
  setTimeout(() => { if (w) w.classList.remove(expr); }, d);
}
function _doRandomExpr() {
  if (!document.hidden) {
    const dash = document.getElementById('page-dashboard');
    const idle = Date.now() - _petLastActivity;
    if (dash && dash.classList.contains('active') && idle < 120000) {
      petExpress(_PET_EXPR_LIST[Math.floor(Math.random() * _PET_EXPR_LIST.length)], 1500);
    }
  }
  _exprTimer = setTimeout(_doRandomExpr, 8000 + Math.random() * 6000);
}
// 闲置检测: 每30s检查, 超2min→sleepy
_petIdleTimer = setInterval(_petCheckIdle, 30000);
// 用户交互→重置活跃时间
['click', 'touchstart', 'keydown', 'scroll'].forEach(e => document.addEventListener(e, _petTrackActivity, { passive: true }));
// 返回页面时→happy探头
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) { _petTrackActivity(); setTimeout(() => petExpress('pet-peek', 1200), 500); }
});

function petCelebrate(message) {
  const w = document.getElementById('petWidget');
  if (w) {
    w.classList.remove('celebrating');
    void w.offsetWidth;  // reflow 触发动画重启
    w.classList.add('celebrating');
    setTimeout(() => w.classList.remove('celebrating'), 700);
  }
  if (message) petSay(message, 3500);
}

// 冷笑话不重复队列 — 全部讲完才重新洗牌
let _jokeQueue = [];
function _nextColdJoke() {
  if (_jokeQueue.length === 0) {
    _jokeQueue = _COLD_JOKES.map((_, i) => i);
    for (let i = _jokeQueue.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [_jokeQueue[i], _jokeQueue[j]] = [_jokeQueue[j], _jokeQueue[i]];
    }
  }
  return _COLD_JOKES[_jokeQueue.pop()];
}

// 周期性鼓励 — 根据状态选合适的话
const _COLD_JOKES = [
  '为什么数学书那么悲伤？因为它有太多"问题"了 😔',
  '为什么7很怕8？因为"7 8 9"(7 ate 9)! 😱',
  '什么东西越洗越脏？答：水！🥲',
  '我昨晚梦到自己PSLE考了满分…闹钟一响全没了 ⏰',
  '铅笔为什么最适合做作业？因为做错了可以"消除"烦恼！✏️',
  '我问仓鼠你怎么那么圆？它说：每次你答对我就偷吃一粒瓜子 🌰',
  '为什么植物不用考试？因为它们已经"结果"了！🍎',
  '考试时脑子里有答案，可惜在另一个平行宇宙的我脑子里 🧠',
  '老师说举手可以加分。我把手举得太高，手臂酸了，还是不知道答案 😅',
  '书和电视有什么区别？书让你动脑，电视让你动遥控器 📺',
  '科学家说宇宙在膨胀。难怪书包越来越重，因为它也在"膨胀" 🎒',
  '我很擅长数学。一加一等于二，轻而易举。其他题嘛……再说吧 😐',
  '为什么小仓鼠不怕PSLE？因为它懂一个秘诀：每天多存一点，一百天就够了 🌟',
  '问：什么时候鱼最幸运？答：被钓上来那天，因为它终于"上岸"了！🎣',
  '老师问世界上最圆的东西是什么。小明说：是我的饼干，因为我还没来得及咬 🍪',
];

// v19.1: 智能场景检测 + 情感对话
function _detectPetScene() {
  if (!state) return 'idle';
  const today = new Date().toISOString().slice(0, 10);

  // 计算今天打卡 slot 数
  const cw = state.currentWeek || 1;
  const weekData = state.daily && state.daily[cw];
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const todayName = dayNames[new Date().getDay()];
  const todayData = weekData && weekData[todayName];
  let todaySlots = 0;
  let totalSlots = 0;
  if (todayData) {
    for (const k of Object.keys(todayData)) {
      totalSlots++;
      if (todayData[k]) todaySlots++;
    }
  }

  // 全勤检测
  if (todaySlots > 0 && todaySlots >= totalSlots && totalSlots >= 3) return 'perfect';

  // 懒惰检测: 今天没打卡
  if (todaySlots === 0) {
    const lastDate = state.dailyStreak?.lastDate;
    if (lastDate) {
      const daysSince = Math.floor((Date.now() - new Date(lastDate).getTime()) / 86400000);
      if (daysSince >= 2) return 'lazy';
    }
    return 'lazy';
  }

  // 错误率高: 任何游戏最近2局 ≤40%
  if (state.gameStats) {
    for (const key of Object.keys(state.gameStats)) {
      const gs = state.gameStats[key];
      if (gs.recent && gs.recent.length >= 2) {
        const last2 = gs.recent.slice(-2);
        const avg = last2.reduce((s, r) => s + (r.correct / r.total), 0) / 2;
        if (avg <= 0.4) return 'errors';
      }
    }
  }

  // 好表现: 任何游戏最近1局 ≥80%
  if (state.gameStats) {
    for (const key of Object.keys(state.gameStats)) {
      const gs = state.gameStats[key];
      if (gs.recent && gs.recent.length >= 1) {
        const last = gs.recent[gs.recent.length - 1];
        if (last.correct / last.total >= 0.8) return 'good';
      }
    }
  }

  // 错题本提醒: ≥5题
  if (state.wrongAnswers && state.wrongAnswers.length >= 5) return 'errorBank';

  // 时段检测
  const hour = new Date().getHours();
  if (hour >= 22 || hour < 6) return 'night';
  if (hour < 9) return 'morning';
  const dow = new Date().getDay();
  if (dow === 0 || dow === 6) return 'weekend';

  return 'idle';
}

function _pickFromPool(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

let _lastPetEmotion = 'normal';
function _generatePetMessage() {
  if (!state) return null;
  const scene = _detectPetScene();
  const D = window.PET_DIALOGUES;
  let msg = null;
  let emotion = 'normal';

  switch (scene) {
    case 'lazy': {
      // 搞笑50% + 激将35% + 鼓励15%
      const r = Math.random();
      if (r < 0.50) msg = _pickFromPool(D.lazy.funny);
      else if (r < 0.85) msg = _pickFromPool(D.lazy.challenge);
      else msg = _pickFromPool(D.lazy.encourage);
      emotion = r < 0.50 ? 'sad' : 'angry';
      break;
    }
    case 'errors': {
      // 搞笑45% + 激将35% + 安抚20%
      const r = Math.random();
      if (r < 0.45) msg = _pickFromPool(D.errors.funny);
      else if (r < 0.80) msg = _pickFromPool(D.errors.challenge);
      else msg = _pickFromPool(D.errors.comfort);
      emotion = r < 0.45 ? 'normal' : 'angry';
      break;
    }
    case 'good': {
      // 搞笑50% + 激将30% + 骄傲20%
      const r = Math.random();
      if (r < 0.50) msg = _pickFromPool(D.good.funny);
      else if (r < 0.80) msg = _pickFromPool(D.good.challenge);
      else msg = _pickFromPool(D.good.proud);
      emotion = r < 0.50 ? 'excited' : 'proud';
      break;
    }
    case 'errorBank': {
      // 搞笑55% + 激将45%
      const r = Math.random();
      if (r < 0.55) msg = _pickFromPool(D.errorBank.funny);
      else msg = _pickFromPool(D.errorBank.challenge);
      emotion = 'angry';
      break;
    }
    case 'perfect':
      msg = _pickFromPool(D.perfect);
      emotion = 'excited';
      break;
    case 'night':
      msg = _pickFromPool(D.special.night);
      emotion = 'sleepy';
      break;
    case 'morning':
      msg = _pickFromPool(D.special.morning);
      emotion = 'happy';
      break;
    case 'weekend':
      msg = _pickFromPool(D.special.weekend);
      emotion = 'happy';
      break;
    default: {
      // 搞笑70% + 陪伴30%
      const r = Math.random();
      if (r < 0.70) msg = _pickFromPool(D.idle.funny);
      else msg = _pickFromPool(D.idle.companion);
      emotion = 'normal';
      break;
    }
  }

  // 切换表情
  if (emotion !== _lastPetEmotion) {
    _lastPetEmotion = emotion;
    const w = document.getElementById('petWidget');
    if (w) {
      w.classList.remove('pet-sad', 'pet-angry', 'pet-proud', 'pet-happy', 'pet-excited', 'pet-sleepy');
      if (emotion !== 'normal') w.classList.add('pet-' + emotion);
    }
  }

  return msg;
}

let _jokeTimer = null;
function _startPetIdleTalk() {
  if (_petBubbleTimer) clearInterval(_petBubbleTimer);
  if (_jokeTimer) clearInterval(_jokeTimer);
  // v19.3: 学习中静默 — 只在主页且核心已完成(或非打卡页)时说话
  function _canPetTalk() {
    if (document.hidden) return false;
    const checkin = document.getElementById('page-checkin');
    if (checkin && checkin.classList.contains('active')) return false;
    const dash = document.getElementById('page-dashboard');
    return dash && dash.classList.contains('active');
  }
  setTimeout(() => {
    if (_canPetTalk()) petSay(_generatePetMessage());
    _petBubbleTimer = setInterval(() => {
      if (_canPetTalk()) petSay(_generatePetMessage());
    }, 25000 + Math.random() * 15000);
  }, 15000);
  setTimeout(() => {
    if (_canPetTalk()) petSay(_nextColdJoke(), 6000);
    _jokeTimer = setInterval(() => {
      if (_canPetTalk()) petSay(_nextColdJoke(), 6000);
    }, 3 * 60 * 1000);
  }, 45000);
}

// ============ v18.20: E 数字跳动 + 彩虹扫过 ============
let _lastShownScore = null;
function _bumpScoreNumber() {
  const el = document.getElementById('bigScoreNum');
  if (!el) return;
  const cur = parseInt(el.textContent) || 0;
  if (_lastShownScore !== null && cur > _lastShownScore) {
    el.classList.remove('bumping');
    void el.offsetWidth;
    el.classList.add('bumping');
    setTimeout(() => el.classList.remove('bumping'), 600);
  }
  _lastShownScore = cur;
}

// ============ v18.24: 游戏防沉迷 — 递减奖励 ============
// 第 1 次满奖, 第 2 次 50%, 第 3 次 25%, 第 4+ 次 0 分 (能玩, 不计分不发箱)
function _getDailyGameCount(gameKey) {
  const today = new Date().toISOString().slice(0, 10);
  if (!state.gameDailyCount || state.gameDailyCount.date !== today) {
    state.gameDailyCount = { date: today, counts: { vocab: 0, math: 0, editing: 0, listen: 0, unit: 0, grammar: 0, cloze: 0, scilab: 0 } };
  }
  return state.gameDailyCount.counts[gameKey] || 0;
}
function _bumpDailyGameCount(gameKey) {
  _getDailyGameCount(gameKey);  // ensure init
  state.gameDailyCount.counts[gameKey] = (state.gameDailyCount.counts[gameKey] || 0) + 1;
  return state.gameDailyCount.counts[gameKey];
}
// v18.38: 每 game 每天 1 次, 都满奖, 第 2 次锁定
function _getGameMultiplier(playNum) {
  return playNum === 1 ? 1 : 0;
}
function _getMultiplierLabel(playNum) {
  return playNum === 1 ? '满奖 100%' : '🔒 已玩 (明日再来)';
}
// 检查游戏是否可玩, 不可玩则弹提示并返回 false
function _checkGameDailyLock(gameKey) {
  const count = _getDailyGameCount(gameKey);
  if (count >= 1) {
    showToast(`🔒 今日已玩 ${gameKey} — 换个游戏试试! 8 游戏每天各 1 次`, 'warn');
    return false;
  }
  return true;
}

// ============ v18.27: in-app 闹铃 (周末为主) ============
let _alarmTimer = null;
const _DAY_KEY_BY_JS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function _startAlarmChecker() {
  if (_alarmTimer) clearInterval(_alarmTimer);
  _checkAlarms();  // 立即查一次 (打开 App 时)
  _alarmTimer = setInterval(_checkAlarms, 60000);
}

function _checkAlarms() {
  if (!state || state.alarmsEnabled === false) return;
  if (!window.ALARM_SCHEDULE) return;
  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const dayKey = _DAY_KEY_BY_JS[now.getDay()];
  const list = window.ALARM_SCHEDULE[dayKey] || [];
  // 重置当日已显示列表
  if (!state.alarmShownToday || state.alarmShownToday.date !== today) {
    state.alarmShownToday = { date: today, shown: [] };
  }
  const curHM = String(now.getHours()).padStart(2,'0') + ':' + String(now.getMinutes()).padStart(2,'0');
  const curMin = now.getHours() * 60 + now.getMinutes();
  for (const a of list) {
    const [h, m] = a.time.split(':').map(Number);
    const aMin = h * 60 + m;
    // 触发条件: 当前时间 ≥ 闹铃时间 且 ≤ 闹铃 + 5min (容错), 且未显示过
    if (curMin >= aMin && curMin <= aMin + 5) {
      const key = `${dayKey}_${a.time}`;
      if (!state.alarmShownToday.shown.includes(key)) {
        state.alarmShownToday.shown.push(key);
        saveState(state);
        _showAlarmPopup(a, dayKey);
        break;  // 一次只显示 1 个
      }
    }
  }
}

// v18.40: 闹铃 — 30-60s 持续旋律 + 大关闭按钮 + 可停
let _alarmMusicTimers = [];
function _stopAlarmMusic() {
  _alarmMusicTimers.forEach(t => clearTimeout(t));
  _alarmMusicTimers = [];
}
function _playAlarmLoop(type) {
  _stopAlarmMusic();
  if (state.soundEnabled === false) return;
  const ctx = _getAudioCtx();
  if (!ctx) return;
  // 5 种旋律 (notes = [freq, durSec])
  const MELODIES = {
    rest: { notes: [[523,0.5],[659,0.5],[784,0.5],[1047,0.8],[988,0.5],[880,0.5],[784,0.5],[659,0.8],[523,0.5],[659,0.5],[784,1.2]], wave: 'sine', vol: 0.35 },
    back: { notes: [[523,0.3],[659,0.3],[784,0.3],[1047,0.5],[784,0.3],[1047,0.5],[1319,0.8]], wave: 'triangle', vol: 0.4 },
    start: { notes: [[659,0.3],[880,0.3],[1047,0.3],[1319,0.5],[1047,0.3],[1319,0.7]], wave: 'triangle', vol: 0.45 },
    sleep: { notes: [[587,0.9],[494,0.9],[392,1.4],[330,0.9],[392,0.9],[494,1.2]], wave: 'sine', vol: 0.3 },
    switch: { notes: [[880,0.2],[880,0.2],[1175,0.4],[988,0.4]], wave: 'sine', vol: 0.4 }
  };
  const m = MELODIES[type] || MELODIES.back;
  const oneLoopDur = m.notes.reduce((s, n) => s + n[1], 0);
  // 循环播 ~45s
  const TARGET_DUR = 45;  // 秒
  const loops = Math.ceil(TARGET_DUR / oneLoopDur);
  let offset = 0;
  for (let l = 0; l < loops; l++) {
    m.notes.forEach(n => {
      const startMs = offset * 1000;
      const t = setTimeout(() => {
        if (!_alarmMusicTimers.length) return;  // 已停
        try {
          const c2 = _getAudioCtx();
          if (c2) _playTone(c2, n[0], n[1] * 0.95, m.wave, m.vol, 0);
        } catch (e) {}
      }, startMs);
      _alarmMusicTimers.push(t);
      offset += n[1];
    });
    offset += 0.5;  // loop 间隔 0.5s
  }
}

function _showAlarmPopup(alarm, dayKey) {
  const old = document.querySelector('.alarm-popup');
  if (old) { _stopAlarmMusic(); old.remove(); }
  const popup = document.createElement('div');
  popup.className = `alarm-popup alarm-${alarm.type}`;
  popup.innerHTML = `
    <div class="alarm-row">
      <div class="alarm-icon">${alarm.icon}</div>
      <div class="alarm-content">
        <div class="alarm-time">⏰ ${alarm.time} · ${dayKey === 'Sat' ? '周六' : dayKey === 'Sun' ? '周日' : ''}</div>
        <div class="alarm-msg">${alarm.msg}</div>
      </div>
      <button class="alarm-close" onclick="closeAlarmPopup()" title="关闭">✕</button>
    </div>
    <button class="alarm-close-big" onclick="closeAlarmPopup()">🔕 知道了, 关闭闹铃</button>
  `;
  document.body.appendChild(popup);
  _playAlarmLoop(alarm.type);
  // 60s 自动消失 (期间用户可手动关闭)
  const t = setTimeout(() => {
    _stopAlarmMusic();
    popup.classList.add('alarm-fade');
    setTimeout(() => popup.remove(), 400);
  }, 60000);
  _alarmMusicTimers.push(t);
}

function closeAlarmPopup() {
  _stopAlarmMusic();
  const p = document.querySelector('.alarm-popup');
  if (p) {
    p.classList.add('alarm-fade');
    setTimeout(() => p.remove(), 400);
  }
}
window.closeAlarmPopup = closeAlarmPopup;

// 管理页用: 手动触发测试
function testAlarm() {
  _showAlarmPopup({ time: '14:00', type: 'back', icon: '🔔', msg: '回来! 数学 P6 paper 2 (限时 50min)' }, 'Sat');
}

window.testAlarm = testAlarm;

// ============ v18.26: 知识树 modal ============
// v18.49: 抽出 HTML 构建, 复用于 modal + page 两种形态
function _buildKnowledgeTreeInnerHtml(forPage) {
  const tree = window.getKnowledgeTreeStatus(state);
  const prog = window.getKnowledgeProgress(state);
  const explored = state.knowledgeExplored || {};
  const stars = state.knowledgeStars || {};
  const exploredCount = Object.keys(explored).length;
  const totalStars = Object.values(stars).reduce((s, v) => s + (v.stars || 0), 0);
  const maxStars = prog.total * 3;
  const subjHtml = Object.keys(tree).map(subj => {
    const nodes = tree[subj];
    // 该学科 ⭐ 进度
    const subjStars = nodes.reduce((s, n) => s + ((stars[n.id] && stars[n.id].stars) || 0), 0);
    const subjMax = nodes.length * 3;
    const nodeHtml = nodes.map((n, i) => {
      const isLast = i === nodes.length - 1;
      const stateClass = `kt-node-${n.status}`;
      const nodeStars = (stars[n.id] && stars[n.id].stars) || 0;
      const isExplored = !!explored[n.id] || nodeStars > 0;
      const starBadge = nodeStars > 0
        ? `<div class="kt-node-star kt-node-stars-${nodeStars}">${'⭐'.repeat(nodeStars)}</div>`
        : (isExplored ? '<div class="kt-node-star">👁️</div>' : '');
      const statusTxt = n.status === 'mastered' ? '已掌握' : n.status === 'learning' ? '学习中' : '锁定';
      const tip = `${n.name} · W${n.weeks[0]}-W${n.weeks[1]} · ${statusTxt}${nodeStars > 0 ? ' · ' + nodeStars + '⭐' : isExplored ? ' · 已看' : ''} · 点击看讲解+练习`;
      return `
        <div class="kt-node-wrap">
          <div class="kt-node ${stateClass} kt-clickable ${nodeStars > 0 ? 'kt-stars-' + nodeStars : (isExplored ? 'kt-explored' : '')}" title="${escapeHtml(tip)}"
               onclick="openKnowledgeNodeDetail('${escapeHtml(subj)}', ${i})">
            ${starBadge}
            <div class="kt-node-icon">${n.icon}</div>
            <div class="kt-node-name">${escapeHtml(n.name)}</div>
            <div class="kt-node-week">W${n.weeks[0]}-${n.weeks[1]}</div>
          </div>
          ${isLast ? '' : '<div class="kt-connector"></div>'}
        </div>`;
    }).join('');
    return `
      <div class="kt-row">
        <div class="kt-row-label">${subj} <span class="kt-row-stars">${subjStars}/${subjMax} ⭐</span></div>
        <div class="kt-row-nodes">${nodeHtml}</div>
      </div>`;
  }).join('');
  return `
    <div class="kt-inner">
      <div class="kt-header">
        <div>
          <div class="kt-title">🌳 知识树</div>
          <div class="kt-progress">⭐ 总 <b>${totalStars}/${maxStars}</b> · 已探索 ${exploredCount}/${prog.total} · 周进度: ${prog.mastered}掌握 / ${prog.learning}学习中</div>
        </div>
        ${forPage ? '' : '<button class="vocab-modal-close" onclick="closeKnowledgeTreeModal()">×</button>'}
      </div>
      <div class="kt-tip-banner" style="background:linear-gradient(135deg,#3D2A00,#7A5C00);color:#FFE066;border:2px solid #FFD700;font-weight:700">🐉 <b style="color:#FFF">金龙进度: ${totalStars}/105 ⭐</b> · 还差 ${Math.max(0, 105 - totalStars)} ⭐ + ${Math.max(0, 10000 - (state.totalPoints||0)).toLocaleString()} 分 → 解锁传说级金龙伙伴 <span style="color:#FFD700;font-weight:900">(SGD 1500)</span></div>
      <div class="kt-tip-banner">💡 <b>点任意节点</b> 看讲解 + 例子 + 一键去练习对应 mini-game · 学完一个 +2 分 + ⭐ 标记</div>
      <div class="kt-legend">
        <span class="kt-legend-item"><span class="kt-dot kt-node-mastered"></span> 已掌握</span>
        <span class="kt-legend-item"><span class="kt-dot kt-node-learning"></span> 学习中</span>
        <span class="kt-legend-item"><span class="kt-dot kt-node-locked"></span> 锁定</span>
        <span class="kt-legend-item">⭐ 已探索讲解</span>
      </div>
      <div class="kt-body">${subjHtml}</div>
    </div>
  `;
}
// v18.49: page 形态 — 直接渲染到 #knowledgeTreePageContent
function renderKnowledgeTreePage() {
  const el = document.getElementById('knowledgeTreePageContent');
  if (!el) return;
  el.innerHTML = _buildKnowledgeTreeInnerHtml(true);
}
// 旧 modal API 保留为转发(防存量调用): 切到 knowledge tab
function openKnowledgeTreeModal() {
  const btn = document.querySelector('.tab-btn[data-page="knowledge"]');
  if (btn) btn.click();
  else renderKnowledgeTreePage();
}
function closeKnowledgeTreeModal() {
  // page 形态无需关闭, 但保留以防旧 modal 残留
  const m = document.getElementById('knowledgeTreeModal');
  if (m) m.classList.remove('show');
}

// v18.41: 节点详情 modal
function openKnowledgeNodeDetail(subj, idx) {
  const KT = window.KNOWLEDGE_TREE || {};
  const node = KT[subj] && KT[subj][idx];
  if (!node) return;
  let modal = document.getElementById('ktNodeModal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'ktNodeModal';
    modal.className = 'kt-modal';
    document.body.appendChild(modal);
  }
  const wasExplored = !!(state.knowledgeExplored && state.knowledgeExplored[node.id]);
  // 标记探索 + 给奖励 (首次)
  if (!wasExplored) {
    if (!state.knowledgeExplored) state.knowledgeExplored = {};
    state.knowledgeExplored[node.id] = { date: new Date().toISOString().slice(0,10) };
    state.totalPoints = (state.totalPoints || 0) + 2;
    state.logs.push({ reason: `🌳 知识树探索: ${node.name}`, points: 2, week: state.currentWeek, timestamp: Date.now() });
    saveState(state);
    playSound('ding');
  }
  // 关联 mini-game 名字 + open 函数
  const GAME_INFO = {
    math:    { name: '🔢 数学速算', open: 'openMathGame()' },
    unit:    { name: '⚗️ 单位换算', open: 'openUnitGame()' },
    grammar: { name: '✏️ Grammar MCQ', open: 'openGrammarGame()' },
    cloze:   { name: '🧩 Cloze 填空', open: 'openClozeGame()' },
    editing: { name: '🔍 Editing 找错', open: 'openEditingGame()' },
    vocab:   { name: '📚 词汇连连看', open: `openVocabGame(${state.currentWeek})` },
    listen:  { name: '🎧 听写练习', open: 'openListenGame()' },
    scilab:  { name: '🔬 科学快分类', open: 'openSciClassifyGame()' }
  };
  const g = GAME_INFO[node.game];
  const examplesHtml = (node.examples || []).map(e => `<li>${escapeHtml(e)}</li>`).join('');
  modal.innerHTML = `
    <div class="kt-inner kt-node-inner">
      <div class="kt-header">
        <div>
          <div class="kt-title">${node.icon} ${escapeHtml(node.name)} ${wasExplored ? '⭐' : ''}</div>
          <div class="kt-progress">${escapeHtml(subj)} · W${node.weeks[0]}-W${node.weeks[1]} ${wasExplored ? '· 已探索' : '· +2 分'}</div>
        </div>
        <button class="vocab-modal-close" onclick="closeKnowledgeNodeDetail()">×</button>
      </div>
      <div class="ktnd-section">
        <div class="ktnd-label">💡 核心讲解</div>
        <div class="ktnd-text">${escapeHtml(node.desc || '本章节内容请看课本与 wow 揭晓')}</div>
      </div>
      ${examplesHtml ? `
      <div class="ktnd-section">
        <div class="ktnd-label">📌 关键例子 (PSLE 真考)</div>
        <ul class="ktnd-list">${examplesHtml}</ul>
      </div>` : ''}
      ${node.pitfall ? `
      <div class="ktnd-section ktnd-pitfall">
        <div class="ktnd-label">⚠️ AL 4-6 易错陷阱</div>
        <div class="ktnd-text">${escapeHtml(node.pitfall)}</div>
      </div>` : ''}
      <div class="ktnd-section ktnd-action">
        ${window.getNodePractice && window.getNodePractice(node.id) ? `<button class="btn btn-primary ktnd-go ktnd-practice" onclick="openKnowledgePractice('${node.id}', '${escapeHtml(subj)}', ${idx})">📝 PSLE 风格练习 ${_starsHtml(node.id)}</button>` : ''}
        ${g ? `<button class="btn btn-secondary ktnd-go" onclick="closeKnowledgeNodeDetail(); ${g.open};">🎮 玩 mini-game: ${g.name}</button>` : ''}
        <button class="btn btn-secondary" onclick="closeKnowledgeNodeDetail()">关闭</button>
      </div>
    </div>`;
  modal.classList.add('show');
}
function _starsHtml(nodeId) {
  const s = (state.knowledgeStars && state.knowledgeStars[nodeId]) || { stars: 0 };
  return '<span class="kp-stars">' + '⭐'.repeat(s.stars) + '☆'.repeat(3 - s.stars) + '</span>';
}
function closeKnowledgeNodeDetail() {
  const m = document.getElementById('ktNodeModal');
  if (m) m.classList.remove('show');
  // v18.49: 知识树是 page, 直接 re-render 显示新的 ⭐
  if (document.getElementById('page-knowledge')?.classList.contains('active')) {
    renderKnowledgeTreePage();
  }
  renderAll();
}
window.openKnowledgeNodeDetail = openKnowledgeNodeDetail;
window.closeKnowledgeNodeDetail = closeKnowledgeNodeDetail;

// ============ v18.45: 知识树独立练习 modal (3 题 PSLE 风) ============
let _kpracticeState = null;
function openKnowledgePractice(nodeId, subj, idx) {
  const qs = window.getNodePractice(nodeId);
  if (!qs || qs.length === 0) { showToast('本节点暂无练习题', 'sad'); return; }
  // 洗牌每题 opts (修 cloze 全 A bug 一样的逻辑)
  const shuffled = qs.map(q => {
    const correctOpt = q.opts[q.ans];
    const opts = [...q.opts].sort(() => Math.random() - 0.5);
    return Object.assign({}, q, { opts, ans: opts.indexOf(correctOpt) });
  });
  _kpracticeState = { nodeId, subj, idx, qs: shuffled, answers: new Array(shuffled.length).fill(null), submitted: false };
  closeKnowledgeNodeDetail();
  _renderKnowledgePractice();
}
function _renderKnowledgePractice() {
  const g = _kpracticeState;
  if (!g) return;
  let modal = document.getElementById('kpracticeModal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'kpracticeModal';
    modal.className = 'kt-modal';
    document.body.appendChild(modal);
  }
  const KT = window.KNOWLEDGE_TREE || {};
  const node = KT[g.subj] && KT[g.subj][g.idx];
  const total = g.qs.length;
  const score = g.submitted ? g.answers.reduce((s, a, i) => s + (a === g.qs[i].ans ? 1 : 0), 0) : 0;
  const allAnswered = g.answers.every(a => a !== null);
  const qsHtml = g.qs.map((q, i) => {
    const userAns = g.answers[i];
    const opts = q.opts.map((o, oi) => {
      const selected = userAns === oi;
      const reveal = g.submitted;
      const isCorrect = oi === q.ans;
      const cls = reveal ? (isCorrect ? 'mcq-correct' : (selected ? 'mcq-wrong' : '')) : (selected ? 'mcq-selected' : '');
      const disabled = g.submitted ? 'disabled' : '';
      return `<button class="mcq-opt ${cls}" onclick="selectKnowledgePracticeAnswer(${i}, ${oi})" ${disabled}>${String.fromCharCode(65+oi)}. ${escapeHtml(o)}</button>`;
    }).join('');
    const explainHtml = g.submitted
      ? `<div class="cn-q-explain">${userAns === q.ans ? '✅ 正确' : '❌ 应是 ' + String.fromCharCode(65+q.ans)} · ${escapeHtml(q.explain || '')}</div>`
      : '';
    return `
      <div class="cn-question">
        <div class="cn-q-text">${i+1}. ${escapeHtml(q.q)}</div>
        <div class="mcq-opts">${opts}</div>
        ${explainHtml}
      </div>`;
  }).join('');
  modal.innerHTML = `
    <div class="kt-inner cn-reading-inner">
      <div class="kt-header">
        <div>
          <div class="kt-title">📝 ${node ? node.icon + ' ' + escapeHtml(node.name) : '练习'}</div>
          <div class="kt-progress">PSLE 风练习 · ${total} 题 · ${escapeHtml(g.subj)}</div>
        </div>
        <button class="vocab-modal-close" onclick="closeKnowledgePractice()">×</button>
      </div>
      <div class="kp-tip">💡 不限次数 — 反复练习巩固. ⭐ 升级: 60% = 1 ⭐ / 80% = 2 ⭐ / 100% = 3 ⭐ (取最高记录)</div>
      <div class="cn-questions">${qsHtml}</div>
      ${g.submitted
        ? `<div class="cn-result">
             🎯 你的成绩: <b>${score}/${total}</b> (${Math.round(score/total*100)}%) ${score === total ? '— 满分! 3 ⭐' : score >= total*0.8 ? '— 优秀 2 ⭐' : score >= total*0.6 ? '— 及格 1 ⭐' : '— 需复习'}
           </div>
           <div class="kp-actions">
             <button class="btn btn-primary" onclick="restartKnowledgePractice()">🔄 再练 1 次</button>
             <button class="btn btn-secondary" onclick="closeKnowledgePractice()">完成</button>
           </div>`
        : `<button class="btn btn-primary cn-submit" ${allAnswered ? '' : 'disabled'} onclick="submitKnowledgePractice()">${allAnswered ? '✅ 提交答案' : `请先答完 (${g.answers.filter(a => a !== null).length}/${total})`}</button>`}
    </div>`;
  modal.classList.add('show');
}
function selectKnowledgePracticeAnswer(qIdx, optIdx) {
  if (!_kpracticeState || _kpracticeState.submitted) return;
  _kpracticeState.answers[qIdx] = optIdx;
  _renderKnowledgePractice();
}
function submitKnowledgePractice() {
  const g = _kpracticeState;
  if (!g || g.submitted) return;
  const total = g.qs.length;
  const score = g.answers.reduce((s, a, i) => s + (a === g.qs[i].ans ? 1 : 0), 0);
  g.submitted = true;
  // v18.99b: 知识树答题计入各科 gameStats
  const ktGameKey = (g.subj || '').includes('科学') ? 'scilab' : 'grammar';
  if (!state.gameStats) state.gameStats = {};
  if (!state.gameStats[ktGameKey]) state.gameStats[ktGameKey] = { difficulty: 4, recent: [] };
  const ktGs = state.gameStats[ktGameKey];
  if (!ktGs.cumCorrect) ktGs.cumCorrect = 0;
  if (!ktGs.cumTotal) ktGs.cumTotal = 0;
  if (!ktGs.cumRuns) ktGs.cumRuns = 0;
  ktGs.cumCorrect += score;
  ktGs.cumTotal += total;
  ktGs.cumRuns += 1;
  // v18.59: 错题入错题本
  if (window.addToErrorBank) {
    g.qs.forEach((q, i) => {
      if (g.answers[i] !== q.ans) {
        window.addToErrorBank(state, {
          gameKey: 'knowledge', type: 'mcq', subj: g.subj, nodeId: g.nodeId,
          q: q.q, opts: q.opts, ans: q.ans, correctAns: q.opts[q.ans],
          explain: q.explain || ''
        });
      }
    });
  }
  // 计算 ⭐ 数
  const acc = score / total;
  let stars = 0;
  if (acc >= 1) stars = 3;
  else if (acc >= 0.8) stars = 2;
  else if (acc >= 0.6) stars = 1;
  // 更新 state.knowledgeStars (取 best)
  if (!state.knowledgeStars) state.knowledgeStars = {};
  const prev = state.knowledgeStars[g.nodeId] || { stars: 0, bestScore: 0, attempts: 0 };
  const isFirstTime = prev.attempts === 0;
  const newRec = {
    stars: Math.max(prev.stars, stars),
    bestScore: Math.max(prev.bestScore, score),
    attempts: prev.attempts + 1,
    lastDate: new Date().toISOString().slice(0, 10)
  };
  state.knowledgeStars[g.nodeId] = newRec;
  // v19.3: 知识树积分提升 (首次8 + 每⭐15 + 满⭐12)
  let pointsAwarded = 0;
  if (isFirstTime) pointsAwarded += 8;
  if (newRec.stars > prev.stars) pointsAwarded += 15 * (newRec.stars - prev.stars);
  if (newRec.stars === 3 && prev.stars < 3) pointsAwarded += 12;
  if (pointsAwarded > 0) {
    state.totalPoints = (state.totalPoints || 0) + pointsAwarded;
    state.logs.push({ reason: `📝 知识练习: ${g.nodeId} ${score}/${total} (${stars}⭐)`, points: pointsAwarded, week: state.currentWeek, timestamp: Date.now() });
  }
  saveState(state);
  if (stars === 3) { spawnConfetti(window.innerWidth/2, window.innerHeight/3, 50); playSound('tada'); petExpress('pet-excited', 2200); }
  else if (stars > 0) playSound('ding');
  else playSound('sad');
  if (newRec.stars > prev.stars) showToast(`🎉 ${node_name(g.nodeId)} 升级到 ${newRec.stars} ⭐!`, 'happy');
  _renderKnowledgePractice();
}
function node_name(nodeId) {
  const KT = window.KNOWLEDGE_TREE || {};
  for (const subj of Object.keys(KT)) {
    const found = KT[subj].find(n => n.id === nodeId);
    if (found) return found.name;
  }
  return nodeId;
}
function restartKnowledgePractice() {
  const g = _kpracticeState;
  if (!g) return;
  openKnowledgePractice(g.nodeId, g.subj, g.idx);
}

// ============ v18.59: 错题本 (Error Bank) ============
// 知识树/mini-game 答错的题入库, 反复练直到答对清空
let _errorBankState = null;
function openErrorBank() {
  const wrongs = state.wrongAnswers || [];
  let modal = document.getElementById('errorBankModal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'errorBankModal';
    modal.className = 'kt-modal';
    document.body.appendChild(modal);
  }
  if (wrongs.length === 0) {
    modal.innerHTML = `
      <div class="kt-inner cn-reading-inner">
        <div class="kt-header">
          <div>
            <div class="kt-title">📓 错题本</div>
            <div class="kt-progress">空空如也 — 继续保持!</div>
          </div>
          <button class="vocab-modal-close" onclick="closeErrorBank()">×</button>
        </div>
        <div style="text-align:center;padding:40px;font-size:48px">🎉</div>
        <div style="text-align:center;font-size:14px;color:var(--color-text-light);margin-bottom:20px">
          目前没有错题! 知识树和 mini-game 答错的题会自动收进这里, 反复练习直到答对清空。
        </div>
        <button class="btn btn-secondary" onclick="closeErrorBank()" style="width:100%">关闭</button>
      </div>`;
    modal.classList.add('show');
    return;
  }
  // 按学科分组显示 + "开始复习" 按钮
  const byGame = window.errorBankByGame ? window.errorBankByGame(state) : {};
  const GAME_LABEL = {
    knowledge: '🌳 知识树', math: '🔢 数学', grammar: '✏️ Grammar', cloze: '🧩 Cloze',
    editing: '🔍 Editing', vocab: '📚 词汇', listen: '🎧 听力', scilab: '🔬 科学'
  };
  const breakdown = Object.entries(byGame).map(([k, v]) =>
    `<div class="eb-stat"><span class="eb-stat-label">${GAME_LABEL[k] || k}</span><span class="eb-stat-num">${v}</span></div>`
  ).join('');
  modal.innerHTML = `
    <div class="kt-inner cn-reading-inner">
      <div class="kt-header">
        <div>
          <div class="kt-title">📓 错题本</div>
          <div class="kt-progress">共 <b>${wrongs.length}</b> 题待复习 · 答对自动清空</div>
        </div>
        <button class="vocab-modal-close" onclick="closeErrorBank()">×</button>
      </div>
      <div style="background:rgba(255,107,53,0.1);border:2px dashed var(--color-accent);border-radius:10px;padding:12px;margin-bottom:12px;font-size:13px;color:var(--color-text-light)">
        💡 错题反复练 = 真正消灭弱点。每次答对一题, 自动从错题本删掉。答错继续留着。
      </div>
      <div class="eb-stats">${breakdown}</div>
      <div class="kp-actions" style="margin-top:16px">
        <button class="btn btn-primary" onclick="startErrorBankReview()">🎯 开始复习 (${wrongs.length} 题)</button>
        <button class="btn btn-secondary" onclick="closeErrorBank()">稍后再说</button>
      </div>
    </div>`;
  modal.classList.add('show');
}
function closeErrorBank() {
  const m = document.getElementById('errorBankModal');
  if (m) m.classList.remove('show');
  _errorBankState = null;
  if (typeof renderDashboard === 'function') renderDashboard();
}
function startErrorBankReview() {
  const wrongs = (state.wrongAnswers || []).slice();
  if (wrongs.length === 0) { closeErrorBank(); return; }
  // 打乱顺序
  wrongs.sort(() => Math.random() - 0.5);
  _errorBankState = { items: wrongs, idx: 0, correct: 0, removed: [] };
  _renderErrorBankReview();
}
function _renderErrorBankReview() {
  const g = _errorBankState;
  if (!g) return;
  const modal = document.getElementById('errorBankModal');
  if (!modal) return;
  if (g.idx >= g.items.length) { _finishErrorBankReview(); return; }
  const item = g.items[g.idx];
  const GAME_LABEL = {
    knowledge: '🌳 知识树', math: '🔢 数学', grammar: '✏️ Grammar', cloze: '🧩 Cloze',
    editing: '🔍 Editing', vocab: '📚 词汇', listen: '🎧 听力', scilab: '🔬 科学'
  };
  const tag = GAME_LABEL[item.gameKey] || item.gameKey;
  let answerArea = '';
  if (item.type === 'mcq') {
    const opts = (item.opts || []).map((o, oi) =>
      `<button class="mcq-opt" onclick="submitErrorBankAnswer(${oi})">${String.fromCharCode(65+oi)}. ${escapeHtml(o)}</button>`
    ).join('');
    answerArea = `<div class="mcq-opts">${opts}</div>`;
  } else if (item.type === 'math') {
    answerArea = `
      <div style="text-align:center;margin:16px 0">
        <input type="number" id="ebMathInput" inputmode="numeric"
               style="font-size:24px;padding:8px 12px;width:160px;text-align:center;border:2px solid var(--color-text);border-radius:8px"
               placeholder="答案" />
        <button class="btn btn-primary" style="margin-left:8px" onclick="submitErrorBankMath()">提交</button>
      </div>`;
  }
  modal.innerHTML = `
    <div class="kt-inner cn-reading-inner">
      <div class="kt-header">
        <div>
          <div class="kt-title">📓 错题复习 · ${g.idx + 1}/${g.items.length}</div>
          <div class="kt-progress">✅ 已答对 ${g.correct} · 累计入库 ${(state.wrongAnswers||[]).length} 题</div>
        </div>
        <button class="vocab-modal-close" onclick="closeErrorBank()">×</button>
      </div>
      <div style="background:rgba(0,212,255,0.1);color:var(--color-primary);font-size:11px;padding:4px 10px;border-radius:6px;display:inline-block;margin-bottom:8px">${tag}${item.subj ? ' · ' + escapeHtml(item.subj) : ''}${item.retries ? ' · 已重做 ' + item.retries + ' 次' : ''}</div>
      <div class="cn-q-text" style="margin-bottom:16px">${escapeHtml(item.q)}</div>
      ${answerArea}
      <div id="ebFeedback" style="min-height:24px;margin-top:12px;font-size:13px"></div>
    </div>`;
  modal.classList.add('show');
  if (item.type === 'math') {
    setTimeout(() => document.getElementById('ebMathInput')?.focus(), 100);
  }
}
function submitErrorBankAnswer(optIdx) {
  const g = _errorBankState;
  if (!g) return;
  const item = g.items[g.idx];
  const isCorrect = optIdx === item.ans;
  _handleErrorBankResult(isCorrect, item, () => {
    if (isCorrect) {
      g.correct++; petExpress('pet-excited', 800);
      // v19.3: Leitner间隔 — 答对4次才真删
      const w = (state.wrongAnswers || []).find(w => w.id === item.id);
      if (w) {
        w.correctStreak = (w.correctStreak || 0) + 1;
        if (w.correctStreak >= 4) {
          window.removeFromErrorBank(state, item.id);
          g.removed.push(item.id);
        } else {
          const intervals = [1, 3, 7];
          w.nextReview = Date.now() + (intervals[w.correctStreak - 1] || 7) * 86400000;
        }
      }
      state.totalPoints = (state.totalPoints || 0) + 2;
      state.logs.push({ reason: '📓 错题复习答对', points: 2, week: state.currentWeek, timestamp: Date.now() });
    } else {
      const w = (state.wrongAnswers || []).find(w => w.id === item.id);
      if (w) { w.retries = (w.retries || 0) + 1; w.correctStreak = 0; }
    }
    saveState(state);
    g.idx++;
    setTimeout(() => _renderErrorBankReview(), isCorrect ? 1200 : 2200);
  });
}
function submitErrorBankMath() {
  const input = document.getElementById('ebMathInput');
  if (!input || input.value === '') return;
  const val = parseInt(input.value);
  const g = _errorBankState;
  if (!g) return;
  const item = g.items[g.idx];
  const isCorrect = val === item.ans;
  _handleErrorBankResult(isCorrect, item, () => {
    if (isCorrect) {
      g.correct++;
      const w = (state.wrongAnswers || []).find(w => w.id === item.id);
      if (w) {
        w.correctStreak = (w.correctStreak || 0) + 1;
        if (w.correctStreak >= 4) {
          window.removeFromErrorBank(state, item.id);
          g.removed.push(item.id);
        } else {
          const intervals = [1, 3, 7];
          w.nextReview = Date.now() + (intervals[w.correctStreak - 1] || 7) * 86400000;
        }
      }
      state.totalPoints = (state.totalPoints || 0) + 2;
      state.logs.push({ reason: '📓 错题复习答对', points: 2, week: state.currentWeek, timestamp: Date.now() });
    } else {
      const w = (state.wrongAnswers || []).find(w => w.id === item.id);
      if (w) { w.retries = (w.retries || 0) + 1; w.correctStreak = 0; }
    }
    saveState(state);
    g.idx++;
    setTimeout(() => _renderErrorBankReview(), isCorrect ? 1200 : 2200);
  });
}
function _handleErrorBankResult(isCorrect, item, next) {
  const fb = document.getElementById('ebFeedback');
  if (fb) {
    if (isCorrect) {
      fb.innerHTML = `✅ <b>答对了!</b> 此题已从错题本删除 🎉 ${escapeHtml(item.explain || '')}`;
      fb.style.color = '#2E7D32';
      playSound('ding');
    } else {
      const correctText = item.type === 'mcq' && item.opts
        ? String.fromCharCode(65 + item.ans) + '. ' + (item.opts[item.ans] || '')
        : item.ans;
      fb.innerHTML = `❌ 应是 <b>${escapeHtml(String(correctText))}</b><br>💡 ${escapeHtml(item.explain || '')}<br><span style="color:#FF9800">仍留在错题本, 下次再练</span>`;
      fb.style.color = '#C62828';
      playSound('sad');
    }
  }
  // 禁用所有 opts
  document.querySelectorAll('.mcq-opt').forEach(b => b.disabled = true);
  const ebInput = document.getElementById('ebMathInput');
  if (ebInput) ebInput.disabled = true;
  next();
}
function _finishErrorBankReview() {
  const g = _errorBankState;
  if (!g) return;
  const modal = document.getElementById('errorBankModal');
  if (!modal) return;
  const remain = (state.wrongAnswers || []).length;
  modal.innerHTML = `
    <div class="kt-inner cn-reading-inner">
      <div class="kt-header">
        <div>
          <div class="kt-title">📓 复习完成!</div>
        </div>
        <button class="vocab-modal-close" onclick="closeErrorBank()">×</button>
      </div>
      <div style="text-align:center;padding:24px">
        <div style="font-size:64px">${remain === 0 ? '🏆' : '👏'}</div>
        <div style="font-size:18px;font-weight:900;margin-top:12px">本轮答对 ${g.correct}/${g.items.length}</div>
        <div style="margin-top:8px;color:var(--color-text-light)">
          ${remain === 0
            ? '🎉 错题本清空! 你已彻底消灭这批弱点!'
            : `还剩 <b>${remain}</b> 道题在错题本里, 继续加油!`}
        </div>
      </div>
      <div class="kp-actions">
        ${remain > 0 ? '<button class="btn btn-primary" onclick="startErrorBankReview()">🔄 再练一轮</button>' : ''}
        <button class="btn btn-secondary" onclick="closeErrorBank()">完成</button>
      </div>
    </div>`;
  if (g.correct >= g.items.length && g.items.length > 0) {
    spawnConfetti(window.innerWidth/2, window.innerHeight/3, 50);
    playSound('tada');
  }
  _errorBankState = null;
}
window.openErrorBank = openErrorBank;
window.closeErrorBank = closeErrorBank;
window.startErrorBankReview = startErrorBankReview;
window.submitErrorBankAnswer = submitErrorBankAnswer;
window.submitErrorBankMath = submitErrorBankMath;
function closeKnowledgePractice() {
  const m = document.getElementById('kpracticeModal');
  if (m) m.classList.remove('show');
  _kpracticeState = null;
  // v18.49: knowledge 是 page — 若用户在 knowledge 页, re-render 显示新 ⭐
  if (document.getElementById('page-knowledge')?.classList.contains('active')) {
    renderKnowledgeTreePage();
  }
  renderAll();
}
window.openKnowledgePractice = openKnowledgePractice;
window.selectKnowledgePracticeAnswer = selectKnowledgePracticeAnswer;
window.submitKnowledgePractice = submitKnowledgePractice;
window.restartKnowledgePractice = restartKnowledgePractice;
window.closeKnowledgePractice = closeKnowledgePractice;
window.openKnowledgeTreeModal = openKnowledgeTreeModal;
window.closeKnowledgeTreeModal = closeKnowledgeTreeModal;
window.renderKnowledgeTreePage = renderKnowledgeTreePage;

// ============ v18.31: PSLE 作文 modal + 精修上传 + 作文模板库 ============
async function openCompositionModal(week) {
  const p = window.getCompositionPrompt(week);
  if (!p) { showToast('本周无作文题', 'sad'); return; }
  let modal = document.getElementById('compositionModal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'compositionModal';
    modal.className = 'kt-modal';  // 复用样式
    document.body.appendChild(modal);
  }
  // 检查是否已上传精修作文
  let hasEssay = false;
  try {
    const rec = await window.photoGet(week, 'Wed', 'ESSAY');
    hasEssay = !!(rec && rec.blob);
  } catch (e) {}
  const picsHtml = p.pictures.map(pic => `<li>${escapeHtml(pic)}</li>`).join('');
  modal.innerHTML = `
    <div class="kt-inner comp-inner">
      <div class="kt-header">
        <div>
          <div class="kt-title">📝 W${week} 作文 — ${escapeHtml(p.theme)}</div>
          <div class="kt-progress">${escapeHtml(p.level)} · PSLE Paper 1 Section B 风格</div>
        </div>
        <button class="vocab-modal-close" onclick="closeCompositionModal()">×</button>
      </div>
      <div class="comp-section">
        <div class="comp-label">🖼️ 三幅图片 (你可选 1+ 或自己 idea, 必须扣题)</div>
        <ul class="comp-list">${picsHtml}</ul>
      </div>
      <div class="comp-section">
        <div class="comp-label">📐 推荐结构</div>
        <div class="comp-text">${escapeHtml(p.structure)}</div>
      </div>
      <div class="comp-section">
        <div class="comp-label">💡 写作 tips</div>
        <div class="comp-text">${escapeHtml(p.tips)}</div>
      </div>
      <div class="comp-section comp-req">
        <div class="comp-label">✅ 要求</div>
        <div class="comp-text"><b>${escapeHtml(p.requirement)}</b></div>
      </div>
      <div class="comp-actions">
        <button class="btn btn-primary" onclick="uploadPolishedEssay(${week})">
          ${hasEssay ? '🔄 替换精修作文' : '📸 上传精修作文'}
        </button>
        ${hasEssay ? `<button class="btn btn-secondary" onclick="viewPolishedEssay(${week})">📖 看已存精修</button>` : ''}
        <button class="btn btn-secondary" onclick="openEssayLibrary()">📚 作文模板库 (背诵)</button>
      </div>
    </div>
  `;
  modal.classList.add('show');
}
function closeCompositionModal() {
  const m = document.getElementById('compositionModal');
  if (m) m.classList.remove('show');
}

function uploadPolishedEssay(week) {
  // 复用拍照/相册选择
  const overlay = document.createElement('div');
  overlay.className = 'photo-source-modal';
  overlay.innerHTML = `
    <div class="photo-source-card">
      <div class="photo-source-title">📝 上传 W${week} 精修作文</div>
      <div class="photo-source-buttons">
        <button class="photo-source-btn" data-source="camera">
          <span class="ps-icon">📷</span><span class="ps-label">现在拍照</span><span class="ps-sub">用摄像头</span>
        </button>
        <button class="photo-source-btn" data-source="gallery">
          <span class="ps-icon">🖼️</span><span class="ps-label">从相册选</span><span class="ps-sub">已拍好的</span>
        </button>
      </div>
      <button class="photo-source-cancel" onclick="this.closest('.photo-source-modal').remove()">取消</button>
    </div>`;
  document.body.appendChild(overlay);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.remove();
    const btn = e.target.closest('.photo-source-btn');
    if (!btn) return;
    const source = btn.dataset.source;
    overlay.remove();
    _doEssayUpload(week, source === 'camera');
  });
}

function _doEssayUpload(week, useCamera) {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';
  if (useCamera) input.capture = 'environment';
  input.style.display = 'none';
  input.onchange = async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    showToast('📤 压缩上传中…', 'success');
    try {
      const blob = await compressImage(file);
      await window.photoPut(week, 'Wed', 'ESSAY', blob);
      await refreshPhotoKeyCache();
      showToast(`📝 W${week} 精修作文已存 (${Math.round(blob.size/1024)} KB)`, 'success');
      // 重开 modal 刷新状态
      openCompositionModal(week);
    } catch (err) {
      console.error(err);
      showToast('❌ 上传失败:' + err.message, 'danger');
    }
  };
  document.body.appendChild(input);
  input.click();
  setTimeout(() => input.remove(), 5000);
}

async function viewPolishedEssay(week) {
  try {
    const rec = await window.photoGet(week, 'Wed', 'ESSAY');
    if (!rec || !rec.blob) { showToast('没找到 W' + week + ' 精修作文', 'sad'); return; }
    const url = URL.createObjectURL(rec.blob);
    const overlay = document.createElement('div');
    overlay.className = 'photo-modal';
    overlay.innerHTML = `
      <div class="photo-modal-card">
        <div class="photo-modal-header">
          <div>
            <div class="photo-modal-title">📝 W${week} 精修作文</div>
            <div class="photo-modal-meta">背诵模板 · ${Math.round(rec.size/1024)} KB</div>
          </div>
          <button class="photo-modal-close" onclick="this.closest('.photo-modal').remove(); URL.revokeObjectURL('${url}')">✕</button>
        </div>
        <img class="photo-modal-img" src="${url}" alt="精修作文 W${week}">
      </div>`;
    document.body.appendChild(overlay);
  } catch (e) {
    showToast('读取失败:' + e.message, 'danger');
  }
}

// v18.49: 抽出 HTML 构建, 复用于 modal + page 两种形态
async function _buildEssayInnerHtml(forPage) {
  const cards = [];
  for (let w = 1; w <= 73; w++) {
    const p = window.getCompositionPrompt(w);
    if (!p) continue;
    let has = false;
    try {
      const rec = await window.photoGet(w, 'Wed', 'ESSAY');
      has = !!(rec && rec.blob);
    } catch (e) {}
    cards.push({ week: w, theme: p.theme, level: p.level, has });
  }
  const total = cards.length;
  const filed = cards.filter(c => c.has).length;
  // v18.84: 每完成10篇解锁下一批, 减轻压迫感
  const visibleCount = Math.min(total, (Math.floor(filed / 10) + 1) * 10);
  const locked = total - visibleCount;
  const grid = cards.slice(0, visibleCount).map(c => `
    <div class="essay-card ${c.has ? 'essay-saved' : 'essay-empty'}" onclick="${c.has ? `viewPolishedEssay(${c.week})` : `openCompositionModal(${c.week})`}">
      <div class="essay-week">W${c.week}</div>
      <div class="essay-theme">${escapeHtml(c.theme)}</div>
      <div class="essay-status">${c.has ? '✅ 已精修' : '⬜ 未上传'}</div>
    </div>
  `).join('');
  const lockedMsg = locked > 0
    ? `<div class="essay-locked-tip">🔒 还有 <b>${locked}</b> 篇 · 每完成 10 篇自动解锁下一批，专注当前就好</div>`
    : (filed === total && total > 0 ? `<div class="essay-locked-tip" style="color:#4ECDC4">🎉 全部 ${total} 篇已完成！</div>` : '');
  return `
    <div class="kt-inner">
      <div class="kt-header">
        <div>
          <div class="kt-title">📚 作文模板库</div>
          <div class="kt-progress">已存 <b>${filed}/${visibleCount}</b> · 点已精修看模板, 点未上传去写</div>
        </div>
        ${forPage ? '' : '<button class="vocab-modal-close" onclick="closeEssayLibrary()">×</button>'}
      </div>
      <div class="essay-grid">${grid}</div>
      ${lockedMsg}
    </div>`;
}
// v18.49: page 形态 — 直接渲染到 #essayPageContent
async function renderEssayPage() {
  const el = document.getElementById('essayPageContent');
  if (!el) return;
  el.innerHTML = await _buildEssayInnerHtml(true);
}
// 旧 modal API 保留为转发: 切到 essay tab
async function openEssayLibrary() {
  const btn = document.querySelector('.tab-btn[data-page="essay"]');
  if (btn) btn.click();
  else await renderEssayPage();
}
function closeEssayLibrary() {
  const m = document.getElementById('essayLibraryModal');
  if (m) m.classList.remove('show');
}

window.openCompositionModal = openCompositionModal;
window.closeCompositionModal = closeCompositionModal;
window.uploadPolishedEssay = uploadPolishedEssay;
window.viewPolishedEssay = viewPolishedEssay;
window.openEssayLibrary = openEssayLibrary;
window.closeEssayLibrary = closeEssayLibrary;
window.renderEssayPage = renderEssayPage;

// ============ v18.40: 华文 PSLE 高华阅读题库 ============
function openChineseReadingBank() {
  let modal = document.getElementById('cnReadingBankModal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'cnReadingBankModal';
    modal.className = 'kt-modal';
    document.body.appendChild(modal);
  }
  const passages = window.CHINESE_READING || [];
  const prog = state.questionBankProgress || {};
  // v18.40c: 删除入门热身, 仅保留验证过的真题资源
  modal.innerHTML = `
    <div class="kt-inner qb-inner">
      <div class="kt-header">
        <div>
          <div class="kt-title">📚 PSLE 高华真题资源</div>
          <div class="kt-progress">已验证 5 个免费真题站, 直接下载/在线练习</div>
        </div>
        <button class="vocab-modal-close" onclick="closeChineseReadingBank()">×</button>
      </div>
      <div class="qb-section-title">🎯 直接打开真题 (新窗口)</div>
      <div class="qb-real-grid">
        <a class="qb-real-card" href="https://freetestpaper.com/" target="_blank" rel="noopener">
          <div class="qb-real-icon">📄</div>
          <div class="qb-real-title">Free Test Paper ⭐</div>
          <div class="qb-real-desc">P6 Higher Chinese 2025 专区 · 15 套+ 真题免费下载</div>
        </a>
        <a class="qb-real-card" href="https://www.sgtestpaper.com/" target="_blank" rel="noopener">
          <div class="qb-real-icon">📄</div>
          <div class="qb-real-title">SG Test Paper ⭐</div>
          <div class="qb-real-desc">P6 HCL 专区 · 2009-2025 历年真题</div>
        </a>
        <a class="qb-real-card" href="https://kiasuexampaper.com/product/psle-p6-higher-chinese-hcl-exam-papers-soft-copy-download-pdf/" target="_blank" rel="noopener">
          <div class="qb-real-icon">📄</div>
          <div class="qb-real-title">Kiasu Exampaper</div>
          <div class="qb-real-desc">2018-2024 P6 HCL 历年 + 名校 prelim PDF (部分免费)</div>
        </a>
        <a class="qb-real-card" href="https://sgexam.com/category/primary/chinese/" target="_blank" rel="noopener">
          <div class="qb-real-icon">📄</div>
          <div class="qb-real-title">SG Exam</div>
          <div class="qb-real-desc">P6 名校 Prelim 中文卷 (Hwa Chong/Nanyang/RGS) - 普华</div>
        </a>
        <a class="qb-real-card" href="https://pslepals.thinkific.com/courses/pslechinese" target="_blank" rel="noopener">
          <div class="qb-real-icon">🎓</div>
          <div class="qb-real-title">PSLE Pals 网课</div>
          <div class="qb-real-desc">PSLE Chinese 在线课程 + 真题精讲</div>
        </a>
      </div>
      <div class="qb-tip">💡 <b>使用建议</b>: ⭐ 标记的 2 个站完全免费 + 直接到 P6 高华专区。其他需注册或部分付费。</div>
      <div class="qb-future">
        <b>🔜 后续升级</b>: 集成更多学科 (➗ 数学 / 🔬 科学 / 📖 英语 PSLE 真题), 持续更新验证可用的真题链接
      </div>
    </div>`;
  modal.classList.add('show');
}
function closeChineseReadingBank() {
  const m = document.getElementById('cnReadingBankModal');
  if (m) m.classList.remove('show');
}

let _cnReadingState = null;
function openChineseReading(idx) {
  const passages = window.CHINESE_READING || [];
  const p = passages[idx];
  if (!p) return;
  _cnReadingState = { idx, passage: p, answers: new Array(p.questions.length).fill(null), submitted: false };
  _renderChineseReading();
}
function _renderChineseReading() {
  const g = _cnReadingState;
  if (!g) return;
  let modal = document.getElementById('cnReadingModal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'cnReadingModal';
    modal.className = 'kt-modal';
    document.body.appendChild(modal);
  }
  const p = g.passage;
  const qsHtml = p.questions.map((q, i) => {
    const userAns = g.answers[i];
    const opts = q.opts.map((o, oi) => {
      const selected = userAns === oi;
      const reveal = g.submitted;
      const isCorrect = oi === q.ans;
      const cls = reveal
        ? (isCorrect ? 'mcq-correct' : (selected ? 'mcq-wrong' : ''))
        : (selected ? 'mcq-selected' : '');
      const disabled = g.submitted ? 'disabled' : '';
      return `<button class="mcq-opt ${cls}" onclick="selectChineseReadingAnswer(${i}, ${oi})" ${disabled}>${String.fromCharCode(65+oi)}. ${escapeHtml(o)}</button>`;
    }).join('');
    const explainHtml = g.submitted
      ? `<div class="cn-q-explain">${userAns === q.ans ? '✅ 正确' : '❌ 应是 ' + String.fromCharCode(65+q.ans)} · ${escapeHtml(q.explain || '')}</div>`
      : '';
    return `
      <div class="cn-question">
        <div class="cn-q-text">${i+1}. ${escapeHtml(q.q)}</div>
        <div class="mcq-opts">${opts}</div>
        ${explainHtml}
      </div>`;
  }).join('');
  const allAnswered = g.answers.every(a => a !== null);
  const score = g.submitted ? g.answers.reduce((s, a, i) => s + (a === p.questions[i].ans ? 1 : 0), 0) : 0;
  const total = p.questions.length;
  modal.innerHTML = `
    <div class="kt-inner cn-reading-inner">
      <div class="kt-header">
        <div>
          <div class="kt-title">📖 ${escapeHtml(p.title)}</div>
          <div class="kt-progress">PSLE 高华阅读 · ${total} 题</div>
        </div>
        <button class="vocab-modal-close" onclick="closeChineseReading()">×</button>
      </div>
      <div class="cn-passage">${escapeHtml(p.passage)}</div>
      <div class="cn-questions">${qsHtml}</div>
      ${g.submitted
        ? `<div class="cn-result">🎉 你的成绩: <b>${score}/${total}</b> ${score === total ? '— 满分!' : score >= total * 0.7 ? '— 不错!' : '— 看解析复习'}</div>
           <button class="btn btn-primary" onclick="closeChineseReading()">完成</button>`
        : `<button class="btn btn-primary cn-submit" ${allAnswered ? '' : 'disabled'} onclick="submitChineseReading()">${allAnswered ? '✅ 提交答案' : `请先答完 (${g.answers.filter(a => a !== null).length}/${total})`}</button>`}
    </div>`;
  modal.classList.add('show');
}
function selectChineseReadingAnswer(qIdx, optIdx) {
  if (!_cnReadingState || _cnReadingState.submitted) return;
  _cnReadingState.answers[qIdx] = optIdx;
  _renderChineseReading();
}
function submitChineseReading() {
  const g = _cnReadingState;
  if (!g || g.submitted) return;
  const p = g.passage;
  const score = g.answers.reduce((s, a, i) => s + (a === p.questions[i].ans ? 1 : 0), 0);
  const total = p.questions.length;
  g.submitted = true;
  // 给奖励 (5 分基础 + 满分 +5 bonus)
  const reward = 5 + (score === total ? 5 : 0);
  state.totalPoints = (state.totalPoints || 0) + reward;
  state.logs.push({ reason: `📚 华文阅读 "${p.title}" ${score}/${total}`, points: reward, week: state.currentWeek, timestamp: Date.now() });
  // 标记 progress
  if (!state.questionBankProgress) state.questionBankProgress = {};
  state.questionBankProgress['cn_' + g.idx] = { done: true, score, max: total, lastDate: new Date().toISOString().slice(0,10) };
  saveState(state);
  if (score === total) { spawnConfetti(window.innerWidth/2, window.innerHeight/3, 40); playSound('tada'); }
  else playSound('ding');
  _renderChineseReading();
}
function closeChineseReading() {
  const m = document.getElementById('cnReadingModal');
  if (m) m.classList.remove('show');
  _cnReadingState = null;
  renderAll();
}
window.openChineseReadingBank = openChineseReadingBank;

// ============ v18.46: PSLE 4 学科真题 + 名校 prelim 题库 (所有链接 WebFetch 验证过) ============
// v18.50: 改为 page 形态 (不再 modal)
let _paperBankSubj = 'math';
function switchPaperBankSubj(subj) {
  _paperBankSubj = subj;
  renderPaperBankPage();
}
function _buildPaperBankInnerHtml(forPage) {
  const PB = window.PSLE_PAPER_BANK || {};
  const subjects = ['math', 'english', 'science', 'chinese'];
  const tabs = subjects.map(s => {
    const data = PB[s];
    const isActive = s === _paperBankSubj;
    return `<button class="pb-tab ${isActive ? 'pb-tab-active' : ''}" onclick="switchPaperBankSubj('${s}')" style="${isActive ? 'border-color:' + data.color + '; background:' + data.color + ';color:white' : ''}">${data.icon} ${data.name}</button>`;
  }).join('');
  const cur = PB[_paperBankSubj];
  const sectionsHtml = cur.sections.map(sec => `
    <div class="pb-section">
      <div class="pb-section-title">${escapeHtml(sec.title)}</div>
      <div class="pb-link-grid">
        ${sec.links.map(link => `
          <a class="pb-link-card ${link.star ? 'pb-star' : ''}" href="${link.url}" target="_blank" rel="noopener">
            <div class="pb-link-name">${link.star ? '⭐ ' : ''}${escapeHtml(link.name)}</div>
            <div class="pb-link-desc">${escapeHtml(link.desc)}</div>
            <div class="pb-link-url">🔗 ${escapeHtml(link.url.replace(/^https?:\/\//, '').split('/')[0])} ↗</div>
          </a>`).join('')}
      </div>
    </div>`).join('');
  return `
    <div class="kt-inner pb-inner">
      <div class="kt-header">
        <div>
          <div class="kt-title">📚 PSLE 真题题库</div>
          <div class="kt-progress">4 学科 · 所有链接已验证 · 真题 + P5/P6 名校 prelim</div>
        </div>
        ${forPage ? '' : '<button class="vocab-modal-close" onclick="closePaperBank()">×</button>'}
      </div>
      <div class="pb-tabs">${tabs}</div>
      ${sectionsHtml}
      <div class="pb-tip">💡 ⭐ 标记的源完全免费 + 直达对应学科 P6 专区 · 点开新窗口跳转</div>
    </div>`;
}
function renderPaperBankPage() {
  const el = document.getElementById('paperBankPageContent');
  if (!el) return;
  el.innerHTML = _buildPaperBankInnerHtml(true);
}
// 旧 modal API 保留为转发 (防存量调用): 切到 paperbank tab
function openPaperBank() {
  const btn = document.querySelector('.tab-btn[data-page="paperbank"]');
  if (btn) btn.click();
  else renderPaperBankPage();
}
function closePaperBank() {
  const m = document.getElementById('paperBankModal');
  if (m) m.classList.remove('show');
}
window.openPaperBank = openPaperBank;
window.renderPaperBankPage = renderPaperBankPage;
window.closePaperBank = closePaperBank;
window.switchPaperBankSubj = switchPaperBankSubj;
window.closeChineseReadingBank = closeChineseReadingBank;
window.openChineseReading = openChineseReading;
window.selectChineseReadingAnswer = selectChineseReadingAnswer;
window.submitChineseReading = submitChineseReading;
window.closeChineseReading = closeChineseReading;

function _rainbowSweep() {
  const sweep = document.createElement('div');
  sweep.className = 'rainbow-sweep';
  document.body.appendChild(sweep);
  setTimeout(() => sweep.remove(), 1000);
}
function openPetModal() {
  const modal = document.getElementById('petModal');
  if (!modal) return;
  const calcForm = window.getCurrentPetForm(state);
  const formIdx = Math.max(state.pet ? state.pet.formIdx || 0 : 0, calcForm.idx);
  const form = window.PET_FORMS[formIdx] || calcForm;
  const nextForm = window.PET_FORMS.find(f => f.idx === form.idx + 1);
  const streak = window._countCompletedDays ? window._countCompletedDays(state) : 0;
  const formsList = window.PET_FORMS.map(f => {
    const unlocked = streak >= f.minStreak || f.idx <= formIdx;
    const isCurrent = f.idx === form.idx;
    return `<div class="pet-form-item ${unlocked ? 'unlocked' : 'locked'} ${isCurrent ? 'current' : ''}" style="background:${f.bg || 'white'}">
      <div class="pet-form-svg">${f.svg}</div>
      <div class="pet-form-meta">${f.name} (累计打卡 ≥${f.minStreak} 天)${isCurrent ? ' ← 你在这' : ''}</div>
    </div>`;
  }).join('');
  const gundamUnlocked = streak >= 45;
  const gundamCard = `<div class="pet-form-item ${gundamUnlocked ? 'unlocked' : 'locked'}" style="background:${gundamUnlocked ? window.GUNDAM_PET.bg : 'var(--color-card-soft)'}">
    <div class="pet-form-svg" style="${gundamUnlocked ? '' : 'filter:grayscale(1);opacity:0.5'}">${window.GUNDAM_PET.svg}</div>
    <div class="pet-form-meta">🤖 命运高达 (累计打卡 ≥45 天)${gundamUnlocked ? ' ✅ 已解锁' : ` · 还差 ${45 - streak} 天`}</div>
  </div>`;
  modal.innerHTML = `
    <div class="pet-modal-inner">
      <div class="pet-modal-header">
        <span class="pet-modal-title">🐹 宠物 ${escapeHtml(state.pet.name || '')}</span>
        <button class="vocab-modal-close" onclick="closePetModal()">×</button>
      </div>
      <div class="pet-modal-body">
        <div class="pet-current"><div class="pet-current-svg">${form.svg}</div>${form.name} · 心情 ${state.pet.happiness}/100</div>
        <div class="pet-desc">${escapeHtml(form.desc)}</div>
        ${nextForm ? `<div class="pet-next">下一形态: <b>${nextForm.name}</b> (累计打卡 ≥ ${nextForm.minStreak} 天 · 还差 ${Math.max(0, nextForm.minStreak - streak)} 天)</div>` : '<div class="pet-next">已最高形态! 🎉</div>'}
        <div class="pet-rename">
          <button class="btn btn-secondary" onclick="renamePet()">✏️ 改名</button>
        </div>
        <div class="pet-forms-list">${formsList}${gundamCard}</div>
      </div>
    </div>
  `;
  modal.classList.add('show');
}
function closePetModal() {
  const m = document.getElementById('petModal');
  if (m) m.classList.remove('show');
}
function renamePet() {
  const newName = prompt('给宠物起个新名字:', state.pet.name || '球球');
  if (!newName || newName.length > 12) return;
  state.pet.name = newName;
  saveState(state);
  showToast(`✅ 宠物已改名 ${newName}`, 'happy');
  openPetModal();
}

// ============ v18 Phase 5.1: 🏆 成就墙 ============
function renderAchievementWall() {
  const card = document.getElementById('achievementWallCard');
  if (!card || !window.ACHIEVEMENTS) return;
  const unlocked = (state.achievements && state.achievements.unlocked) || [];
  const total = window.ACHIEVEMENTS.length;
  card.innerHTML = `
    <div class="ach-header">
      <span class="ach-title">🏆 成就墙</span>
      <span class="ach-count">${unlocked.length} / ${total}</span>
      <button class="btn btn-secondary ach-toggle" onclick="toggleAchWallExpanded()">${card.dataset.expanded === '1' ? '收起 ▲' : '展开 ▼'}</button>
    </div>
    ${card.dataset.expanded === '1' ? `
      <div class="ach-grid">
        ${window.ACHIEVEMENTS.map(a => {
          const isU = unlocked.indexOf(a.id) >= 0;
          return `<div class="ach-item ${isU ? 'unlocked' : 'locked'}" title="${escapeHtml(a.desc)}">
            <div class="ach-icon">${a.icon}</div>
            <div class="ach-name">${a.name}</div>
            <div class="ach-cat">${a.cat}</div>
          </div>`;
        }).join('')}
      </div>
    ` : ''}
  `;
}
function toggleAchWallExpanded() {
  const card = document.getElementById('achievementWallCard');
  card.dataset.expanded = card.dataset.expanded === '1' ? '0' : '1';
  renderAchievementWall();
}
function _showAchievementUnlock(a) {
  const modal = document.getElementById('achievementUnlockModal');
  if (!modal) return;
  modal.innerHTML = `
    <div class="ach-unlock-inner">
      <div class="ach-unlock-icon">${a.icon}</div>
      <div class="ach-unlock-title">🎉 解锁成就</div>
      <div class="ach-unlock-name">${escapeHtml(a.name)}</div>
      <div class="ach-unlock-desc">${escapeHtml(a.desc)}</div>
      <button class="btn btn-primary" onclick="closeAchievementUnlock()">太棒了!</button>
    </div>
  `;
  modal.classList.add('show');
  playSound('pop');
  spawnConfetti(window.innerWidth / 2, window.innerHeight / 3, 50);
}
function closeAchievementUnlock() {
  document.getElementById('achievementUnlockModal').classList.remove('show');
}

// 全局触发: 在任意 state 改后调
function _checkAndUnlockAch() {
  if (!window.checkAchievements) return;
  const newly = window.checkAchievements(state);
  if (newly.length > 0) {
    // v19.3: 每个成就解锁给💎水晶
    newly.forEach(a => {
      const crystalReward = (a.cat === 'PSLE' || a.cat === '隐藏') ? 20 : 10;
      state.craftCrystals = (state.craftCrystals || 0) + crystalReward;
    });
    saveState(state);
    // 一个一个弹(避免堆叠) — 显示第 1 个,用户关掉自动弹下一个
    const queue = [...newly];
    const showNext = () => {
      if (queue.length === 0) return;
      const a = queue.shift();
      _showAchievementUnlock(a);
      // 监听关闭
      const watcher = setInterval(() => {
        if (!document.getElementById('achievementUnlockModal').classList.contains('show')) {
          clearInterval(watcher);
          if (queue.length > 0) setTimeout(showNext, 500);
        }
      }, 200);
    };
    showNext();
  }
}

// ============ v18.86: 每日登录 +5 分自动奖励 ============
function _checkDailyLoginBonus() {
  const todayKey = new Date().toISOString().slice(0, 10);
  if ((state.lastLoginDate || '') === todayKey) return;
  state.lastLoginDate = todayKey;
  state.logs = state.logs || [];
  state.logs.push({ reason: '每日登录奖励', points: 5, week: state.currentWeek || 1, timestamp: Date.now() });
  recalcTotalPoints(state);
  saveState(state);
  setTimeout(() => petSay('🌟 今日登录 +5 分! 每天打开 App 就有哦～', 5000), 1200);
}

// ============ v19.3: 积分完整性校验 ============
function verifyPointsIntegrity() {
  const logTotal = (state.logs || []).reduce((s, l) => s + (l.points || 0), 0);
  const slotCalc = (function() {
    let t = 0;
    const weeksTouched = new Set();
    Object.keys(state.daily || {}).forEach(w => weeksTouched.add(parseInt(w)));
    Object.keys(state.weekly || {}).forEach(w => weeksTouched.add(parseInt(w)));
    weeksTouched.forEach(week => { t += calcWeekDailyPoints(week, state).total; });
    Object.entries(state.weekly || {}).forEach(([weekStr, weekData]) => {
      if (!weekData.checkin) return;
      const items = getWeeklyCheckinTemplate(parseInt(weekStr));
      items.forEach(item => { if (weekData.checkin[item.id]) t += item.points; });
    });
    return t;
  })();
  const expectedMin = slotCalc + logTotal;
  const actual = state.totalPoints || 0;
  const lifetime = state.lifetimeEarned || 0;
  const drift = actual - expectedMin;
  return {
    ok: drift >= 0 && actual <= lifetime,
    actual, expectedMin, lifetime, drift,
    logCount: (state.logs || []).length,
    logTotal, slotCalc,
    detail: drift < 0 ? '⚠️ 积分低于预期(可能丢失)' : drift > 100 ? '⚠️ 积分高于预期较多(暴击/buff累积)' : '✅ 正常'
  };
}
window.verifyPointsIntegrity = verifyPointsIntegrity;

// v19.3: 登录时云端对比 — 防本地数据回退
async function _checkCloudIntegrity() {
  if (!window.isFbReady || !isFbReady() || !window.getFbDoc) return;
  const fbDoc = getFbDoc();
  if (!fbDoc) return;
  try {
    const snap = await fbDoc.get();
    if (!snap.exists) return;
    const cloud = snap.data();
    const localPts = state.totalPoints || 0;
    const cloudPts = cloud.totalPoints || 0;
    const cloudLifetime = cloud.lifetimeEarned || 0;
    if (cloudPts > localPts + 5) {
      console.warn(`⚠️ 云端积分(${cloudPts})高于本地(${localPts}), 恢复云端数据`);
      Object.assign(state, cloud);
      state.totalPoints = Math.max(localPts, cloudPts);
      state.lifetimeEarned = Math.max(state.lifetimeEarned || 0, cloudLifetime);
      saveState(state);
      showToast(`☁️ 已从云端恢复最新积分 (${state.totalPoints})`, 'success');
    } else if (localPts > cloudPts + 5) {
      console.log(`本地(${localPts})高于云端(${cloudPts}), 将同步到云端`);
    }
  } catch (e) { console.warn('云端校验失败:', e); }
}


// ============ v19.3: FTUE 首次使用引导 ============
function _checkFTUE() {
  if (state.ftueDay >= 3) return;
  if (!state.ftueDay) state.ftueDay = 0;
  const totalSlotsDone = Object.values(state.daily || {}).reduce((s, w) => {
    return s + Object.values(w || {}).reduce((s2, d) => s2 + Object.keys(d || {}).length, 0);
  }, 0);
  if (totalSlotsDone === 0 && state.ftueDay === 0) {
    state.ftueDay = 1;
    saveState(state);
    setTimeout(() => {
      petSay('🐹 嘿! 我是你的学习伙伴! 今天先试试完成 1 项主线任务吧 — 很简单的!', 10000);
    }, 2000);
  } else if (totalSlotsDone >= 1 && state.ftueDay === 1) {
    state.ftueDay = 2;
    saveState(state);
    setTimeout(() => {
      petSay('🎉 太棒了! 你已经解锁了装备系统! 每完成任务 → 拿积分 → 解锁装备 → 变强!', 10000);
    }, 1500);
  } else if (totalSlotsDone >= 5 && state.ftueDay === 2) {
    state.ftueDay = 3;
    saveState(state);
    setTimeout(() => {
      petSay('⚔️ 你已经掌握了所有技能! 现在开始真正的冒险吧! 每天完成主线任务 → 战力越来越强!', 10000);
    }, 1500);
  }
}

// ============ v18 Phase 5.1: 🎁 每日抽奖 ============
function _checkDailyDrawOnInit() {
  if (!window.checkDailyDraw) return;
  const result = window.checkDailyDraw(state);
  if (!result) return;
  saveState(state);
  // 弹抽奖 modal
  const modal = document.getElementById('dailyDrawModal');
  if (!modal) return;
  let bonusHtml = '';
  if (result.bonus === 'wow') bonusHtml = `<div class="dd-bonus">🎁 连登 ${result.consecutive} 天 — 加送 wow 卡!</div>`;
  if (result.bonus === 'rare-hint') bonusHtml = `<div class="dd-bonus">🌟 连登 ${result.consecutive} 天 — 下次开盒必中稀有装备!</div>`;
  modal.innerHTML = `
    <div class="dd-inner">
      <div class="dd-icon">🎁</div>
      <div class="dd-title">今日登录奖励!</div>
      <div class="dd-frags">+${result.fragments} 个宝箱碎片</div>
      <div class="dd-progress">当前碎片: ${result.totalFragments}/7 · 满 7 自动合成 1 完整宝箱</div>
      ${result.newBoxes > 0 ? `<div class="dd-newbox">🎉 合成了 ${result.newBoxes} 个完整宝箱! tab 栏 🎁</div>` : ''}
      <div class="dd-streak">📅 连续登录 ${result.consecutive} 天</div>
      ${bonusHtml}
      <button class="btn btn-primary" onclick="closeDailyDraw()">谢谢!</button>
    </div>
  `;
  modal.classList.add('show');
  playSound('slot');
  if (result.newBoxes > 0) spawnConfetti(window.innerWidth / 2, window.innerHeight / 3, 40);
}
function closeDailyDraw() {
  document.getElementById('dailyDrawModal').classList.remove('show');
  renderAll();
}

// ============ v18 Phase 5.3: 🔁 间隔重复复习卡 ============
function renderReviewCard() {
  const card = document.getElementById('reviewCard');
  if (!card) return;
  const due = window.getDueReviews ? window.getDueReviews(state) : [];
  if (due.length === 0) {
    card.style.display = 'none';
    return;
  }
  card.style.display = '';
  // 显示第 1 个 due review
  const r = due[0];
  const [type, id] = r.key.split(':');
  let qText = '', explainText = '';
  if (type === 'wow') {
    // 找 wow 内容
    const wow = (window.ENGLISH_WOW_FACTS || []).find(w => w.tag + '_' + (window.ENGLISH_WOW_FACTS.indexOf(w)) === id) ||
                (window.WEEKLY_WOW_FACTS || []).find(w => 'w' + w.week === id);
    if (wow) { qText = wow.hook; explainText = wow.body; }
  } else if (type === 'think') {
    const t = (window.THINK_PUZZLES || []).find(p => p.week == id);
    if (t) { qText = t.question; explainText = t.explanation; }
  }
  if (!qText) {
    card.style.display = 'none';
    return;
  }
  card.innerHTML = `
    <div class="rev-header">
      <span class="rev-tag">🔁 复习提醒 · ${due.length} 个待复习</span>
    </div>
    <div class="rev-question">${escapeHtml(qText)}</div>
    <div class="rev-prompt">还记得吗?</div>
    <div class="rev-options">
      <button class="btn btn-success" onclick="submitReviewAnswer('${r.key}', true)">✅ 记得</button>
      <button class="btn btn-warn" onclick="submitReviewAnswer('${r.key}', false)">🤔 忘了</button>
    </div>
    <div class="rev-explain" style="display:none">${escapeHtml(explainText)}</div>
  `;
}
function submitReviewAnswer(key, correct) {
  if (window.submitReview) window.submitReview(state, key, correct);
  if (correct) {
    showToast('✅ 记得! +3 分 · 间隔翻倍', 'happy');
    playSound('ding');
  } else {
    const explain = document.querySelector('#reviewCard .rev-explain');
    if (explain) explain.style.display = '';
    showToast('🤔 没事, 看一下解释 · 间隔重置 3 天', 'success');
    playSound('sad');
  }
  saveState(state);
  setTimeout(() => renderAll(), correct ? 500 : 3000);
}

// ============ v18 Phase 5.3: 🌅 未来自我预览 ============
function showFutureSelfModal() {
  const modal = document.getElementById('futureSelfModal');
  if (!modal || !window.predictFutureSelf) return;
  const p = window.predictFutureSelf(state);
  modal.innerHTML = `
    <div class="fs-inner">
      <div class="fs-header">
        <span class="fs-title">🌅 看看 W73 PSLE 时的我</span>
        <button class="vocab-modal-close" onclick="closeFutureSelf()">×</button>
      </div>
      <div class="fs-body">
        <div class="fs-stat-row">
          <div class="fs-stat-col">
            <div class="fs-label">今天</div>
            <div class="fs-num">${state.totalPoints.toLocaleString()}</div>
            <div class="fs-sub">总分 · Lv ${window.CHAMUI ? window.CHAMUI.getLevelInfo(state.totalPoints).lv : '?'} · ≈ SGD ${(state.totalPoints * (window.SGD_PER_POINT || 0.05)).toFixed(0)}</div>
          </div>
          <div class="fs-arrow">→</div>
          <div class="fs-stat-col fs-future">
            <div class="fs-label">W73 预测</div>
            <div class="fs-num">${p.predictedTotal.toLocaleString()}</div>
            <div class="fs-sub">总分 · Lv ${p.predLv.lv} · ≈ SGD ${(p.predictedTotal * (window.SGD_PER_POINT || 0.05)).toFixed(0)}</div>
          </div>
        </div>
        ${p.predictedTotal >= (window.ULTIMATE_PRIZE_POINTS || 30000) ? `
          <div class="fs-cap-note">🏆 预测已超 ${(window.ULTIMATE_PRIZE_POINTS || 30000).toLocaleString()} 分终极奖线! SGD ${window.ULTIMATE_PRIZE_SGD || 1500} 等价已达成 (后续分数仍累积)</div>
        ` : ''}
        <div class="fs-summary">
          <div>📊 预测 PSLE 成绩 ≈ <b>${p.predAL !== null ? 'AL ' + p.predAL : '暂无'}</b></div>
          <div>⚔️ 预测分数装备 <b>${p.predEqCount}/29</b> 件 (按分数解锁)</div>
          <div>📅 还有 <b>${p.daysLeft}</b> 天 · 平均日加分 <b>${p.avgDaily}</b></div>
        </div>
        <div class="fs-tip">💡 当前 streak: ${(state.dailyStreak && state.dailyStreak.days) || 0} 天 — streak 保持率 ${Math.round(p.breakRate * 100)}%. streak 越稳, 预测越准!</div>
      </div>
    </div>
  `;
  modal.classList.add('show');
}
function closeFutureSelf() {
  document.getElementById('futureSelfModal').classList.remove('show');
}

// ============ v18 Phase 5.4: 🧪 mini-game 大厅 ============
function openMiniGameHub() {
  const modal = document.getElementById('miniGameHubModal');
  if (!modal) return;
  // v18.38: 每 game 每天 1 次, 都满奖, 第 2 次锁
  const stars = (d) => '★'.repeat(d) + '☆'.repeat(5 - d);
  const status = (k) => {
    const c = _getDailyGameCount(k);
    const d = window.getDifficulty ? window.getDifficulty(state, k) : 1;
    const lockState = c >= 1 ? '<span class="mgh-lock">🔒 今日已玩</span>' : '<span class="mgh-ready">▶ 可玩 (满奖)</span>';
    return `<div class="mgh-status">难度 <b>${stars(d)}</b> · ${lockState}</div>`;
  };
  modal.innerHTML = `
    <div class="mgh-inner">
      <div class="mgh-header">
        <span class="mgh-title">🎮 Mini-game 大厅</span>
        <button class="vocab-modal-close" onclick="closeMiniGameHub()">×</button>
      </div>
      <div class="mgh-rules">⚠️ 防沉迷: <b>每 game 每天 1 次, 满奖, 第 2 次锁定</b> · 10 game 全玩 ≈ 25-30 min</div>
      <div class="mgh-grid">
        <button class="mgh-game" onclick="closeMiniGameHub(); openVocabGame(${state.currentWeek})">
          📚<br><b>词汇连连看</b><br><small>6×6 配对</small>${status('vocab')}
        </button>
        <button class="mgh-game" onclick="closeMiniGameHub(); openMathGame()">
          ➗<br><b>数学速算</b><br><small>10 题限时</small>${status('math')}
        </button>
        <button class="mgh-game" onclick="closeMiniGameHub(); openSciMcqGame()">
          🧬<br><b>科学 MCQ</b><br><small>10 题概念</small>${status('scimcq')}
        </button>
        <button class="mgh-game" onclick="closeMiniGameHub(); openChineseMcqGame()">
          🇨🇳<br><b>华文 MCQ</b><br><small>10 题选择</small>${status('chinese')}
        </button>
        <button class="mgh-game" onclick="closeMiniGameHub(); openEditingGame()">
          ✏️<br><b>Editing 找错</b><br><small>50 词找 5 错</small>${status('editing')}
        </button>
        <button class="mgh-game" onclick="closeMiniGameHub(); openListenGame()">
          🎧<br><b>听写练习</b><br><small>听 1 段填 5 词</small>${status('listen')}
        </button>
        <button class="mgh-game" onclick="closeMiniGameHub(); openUnitGame()">
          ⚗️<br><b>单位换算</b><br><small>10 题限时</small>${status('unit')}
        </button>
        <button class="mgh-game" onclick="closeMiniGameHub(); openGrammarGame()">
          ✏️<br><b>Grammar MCQ</b><br><small>10 题语法</small>${status('grammar')}
        </button>
        <button class="mgh-game" onclick="closeMiniGameHub(); openClozeGame()">
          🧩<br><b>Cloze 单空</b><br><small>10 句填空</small>${status('cloze')}
        </button>
        <button class="mgh-game" onclick="closeMiniGameHub(); openSciClassifyGame()">
          🔬<br><b>科学快分类</b><br><small>拖项到正确类</small>${status('scilab')}
        </button>
      </div>
    </div>
  `;
  modal.classList.add('show');
}
function closeMiniGameHub() {
  document.getElementById('miniGameHubModal').classList.remove('show');
}

// ============ v18.28: 4 个新 mini-game ============

// === 1. 单位换算 (复用 mathGameModal) ===
let _unitGameState = null;
let _unitTimer = null;
function openUnitGame() {
  if (!_checkGameDailyLock('unit')) return;  // v18.38
  const diff = window.getDifficulty ? window.getDifficulty(state, 'unit') : 1;
  const qs = window.getUnitByDiff(diff, 10);
  const unitTimeBudget = diff >= 5 ? 180 : diff >= 4 ? 120 : 90;
  _unitGameState = { qs, idx: 0, correct: 0, wrong: 0, timeLeft: unitTimeBudget, totalTime: unitTimeBudget, diff };
  _renderUnitGame();
  if (_unitTimer) clearInterval(_unitTimer);
  _unitTimer = setInterval(() => {
    if (!_unitGameState) { clearInterval(_unitTimer); _unitTimer = null; return; }
    _unitGameState.timeLeft--;
    if (_unitGameState.timeLeft <= 0) { clearInterval(_unitTimer); _unitTimer = null; _finishUnitGame(); }
    else _updateUnitStats();
  }, 1000);
}
function _updateUnitStats() {
  const el = document.getElementById('unitStats');
  const g = _unitGameState;
  if (el && g) el.textContent = `⏱️ ${g.timeLeft}s · ✅ ${g.correct} · ❌ ${g.wrong} · ${g.idx+1}/10`;
}
function _renderUnitGame() {
  const modal = document.getElementById('mathGameModal');  // 复用容器
  if (!modal || !_unitGameState) return;
  const g = _unitGameState;
  if (g.idx >= g.qs.length) { _finishUnitGame(); return; }
  const q = g.qs[g.idx];
  modal.innerHTML = `
    <div class="mg-inner">
      <div class="mg-stats" id="unitStats">⏱️ ${g.timeLeft}s · ✅ ${g.correct} · ❌ ${g.wrong} · ${g.idx+1}/10</div>
      <div class="mg-q">⚗️ ${escapeHtml(q.q)}</div>
      <input type="text" inputmode="numeric" pattern="-?[0-9]*" id="unitInput" value="" class="mg-input" onkeydown="if(event.key==='Enter') submitUnitAnswer()" placeholder="点这里输入答案">
      <button class="btn btn-primary mg-submit" onclick="submitUnitAnswer()">提交 (Enter)</button>
      <button class="vocab-modal-close mg-close" onclick="closeUnitGame()">×</button>
    </div>`;
  modal.classList.add('show');
}
function _updateUnitQuestion() {
  const g = _unitGameState;
  if (!g || g.idx >= g.qs.length) return;
  const q = g.qs[g.idx];
  const qEl = document.querySelector('.mg-q');
  const inp = document.getElementById('unitInput');
  if (qEl) qEl.innerHTML = '⚗️ ' + escapeHtml(q.q);
  if (inp) inp.value = '';
  _updateUnitStats();
}
function submitUnitAnswer() {
  const g = _unitGameState;
  if (!g) return;
  const inp = document.getElementById('unitInput');
  if (!inp || inp.value === '') return;
  const val = parseInt(inp.value);
  const q = g.qs[g.idx];
  if (val === q.ans) { g.correct++; playSound('ding'); petExpress('pet-excited', 800); }
  else {
    g.wrong++; playSound('sad');
    showToast(`❌ 应是 ${q.ans}`, 'sad');  // v18.33
    if (window.addToErrorBank) {
      window.addToErrorBank(state, {
        gameKey: 'unit', type: 'math',
        q: q.q, correctAns: q.ans, diff: q.diff || 3,
        explain: '正确答案: ' + q.ans
      });
    }
  }
  g.idx++;
  if (g.idx >= g.qs.length) {
    if (_unitTimer) { clearInterval(_unitTimer); _unitTimer = null; }
    _finishUnitGame();
  } else _updateUnitQuestion();
}
function _finishUnitGame() {
  const g = _unitGameState;
  if (!g) return;
  let diffR = null;
  if (window.recordGameRun) diffR = window.recordGameRun(state, 'unit', g.correct, g.qs.length);
  const playNum = _bumpDailyGameCount('unit');
  const mult = _getGameMultiplier(playNum);
  const unitDiff = (state.gameStats && state.gameStats.unit && state.gameStats.unit.difficulty) || 4;
  const unitRewardMap = { 3: 4, 4: 6, 5: 10, 6: 15 };
  let baseR = 0;
  if (g.correct >= 10) baseR = unitRewardMap[unitDiff] || 2;
  else if (g.correct >= 7) baseR = Math.max(1, (unitRewardMap[unitDiff] || 2) - 1);
  const reward = Math.floor(baseR * mult * (window.getDragonBuff ? window.getDragonBuff(state) : 1.0));
  if (reward > 0) {
    state.totalPoints += reward;
    state.logs.push({ reason: `🎮 单位换算 ${g.correct}/10 (第 ${playNum} 次)`, points: reward, week: state.currentWeek, timestamp: Date.now() });
  }
  saveState(state);
  const modal = document.getElementById('mathGameModal');
  modal.innerHTML = `
    <div class="mg-inner">
      <div class="mg-result-icon">${g.correct >= 10 ? '🎉' : g.correct >= 7 ? '👍' : '🤔'}</div>
      <div class="mg-result-title">${g.correct >= 10 ? '全对!' : '完成!'} (今日第 ${playNum} 次)</div>
      <div class="mg-result-stats">${g.correct}/10 对 · ${g.wrong} 错</div>
      <div class="mg-result-reward">+${reward} 分 · ${_getMultiplierLabel(playNum)}</div>
      <button class="btn btn-primary" onclick="closeUnitGame()">知道了!</button>
    </div>`;
  if (g.correct >= 10 && mult > 0) { spawnConfetti(window.innerWidth/2, window.innerHeight/3, 40); playSound('tada'); petExpress('pet-excited', 2200); }
  if (diffR && diffR.levelChanged === 'up') { showToast(`🆙 单位换算难度升到 Lv ${diffR.newDiff}!`, 'happy'); playSound('tada'); }
  if (diffR && diffR.levelChanged === 'down') showToast(`📉 单位换算难度降到 Lv ${diffR.newDiff}`, 'sad');
  _unitGameState = null;
}
function closeUnitGame() {
  if (_unitTimer) { clearInterval(_unitTimer); _unitTimer = null; }
  document.getElementById('mathGameModal').classList.remove('show');
  _unitGameState = null;
  renderAll();
}

// === 2/3. Grammar + Cloze (共用 MCQ 框架) ===
let _mcqGameState = null;
function openGrammarGame() { _openMcqGame('grammar', 'Grammar 选择题', 'q'); }
function openClozeGame() { _openMcqGame('cloze', 'Cloze 单空填', 'sentence'); }
function openSciMcqGame() { _openMcqGame('scimcq', '科学 MCQ', 'q'); }
function openChineseMcqGame() { _openMcqGame('chinese', '华文 MCQ', 'q'); }
function _openMcqGame(key, title, qField) {
  if (!_checkGameDailyLock(key)) return;
  const diff = window.getDifficulty ? window.getDifficulty(state, key) : 4;
  const fn = key === 'grammar' ? window.getGrammarByDiff : key === 'cloze' ? window.getClozeByDiff : key === 'scimcq' ? window.getSciMcqByDiff : key === 'chinese' ? window.getChineseMcqByDiff : window.getGrammarByDiff;
  const rawQs = fn(diff, 10);
  const qs = rawQs.map(q => {
    const correctOpt = q.opts[q.ans];
    const shuffled = [...q.opts].sort(() => Math.random() - 0.5);
    const newAns = shuffled.indexOf(correctOpt);
    return Object.assign({}, q, { opts: shuffled, ans: newAns, _orig: q });
  });
  _mcqGameState = { key, title, qField, qs, idx: 0, correct: 0, wrong: 0, diff, lastFeedback: null };
  _renderMcqGame();
}
function _renderMcqGame() {
  const g = _mcqGameState;
  if (!g) return;
  let modal = document.getElementById('mcqGameModal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'mcqGameModal';
    modal.className = 'mb-result-modal';
    document.body.appendChild(modal);
  }
  if (g.idx >= g.qs.length) { _finishMcqGame(); return; }
  const q = g.qs[g.idx];
  const qText = q[g.qField];
  const optsHtml = q.opts.map((o, i) =>
    `<button class="mcq-opt" onclick="submitMcqAnswer(${i})">${String.fromCharCode(65+i)}. ${escapeHtml(o)}</button>`
  ).join('');
  modal.innerHTML = `
    <div class="mg-inner mcq-inner">
      <div class="mg-stats">${g.title} · ✅ ${g.correct} · ❌ ${g.wrong} · ${g.idx+1}/10</div>
      <div class="mg-q mcq-q">${escapeHtml(qText)}</div>
      ${q.tag ? `<div class="mcq-tag">${escapeHtml(q.tag)}</div>` : ''}
      <div class="mcq-opts">${optsHtml}</div>
      <div class="mcq-feedback"></div>
      <button class="vocab-modal-close mg-close" onclick="closeMcqGame()">×</button>
    </div>`;
  modal.classList.add('show');
}
function submitMcqAnswer(idx) {
  const g = _mcqGameState;
  if (!g) return;
  const q = g.qs[g.idx];
  const isCorrect = idx === q.ans;
  if (isCorrect) {
    g.correct++; playSound('ding'); petExpress('pet-excited', 800);
    // v19.0: 答对的题标记为 mastered (不再出)
    const poolMap = { grammar: window.GRAMMAR_QUESTIONS, cloze: window.CLOZE_QUESTIONS, scimcq: window.SCIENCE_MCQ, chinese: window.CHINESE_MCQ };
    if (poolMap[g.key] && window._markMastered) {
      window._markMastered(g.key, poolMap[g.key], q._orig || q);
      window._saveMastered(state);
    }
  } else { g.wrong++; playSound('sad'); }
  // v18.59: 错题入错题本
  if (!isCorrect && window.addToErrorBank) {
    window.addToErrorBank(state, {
      gameKey: g.key, type: 'mcq',
      q: q[g.qField] || '', opts: q.opts, ans: q.ans,
      correctAns: q.opts[q.ans],
      explain: q.explain || _generateMcqExplain(q)
    });
  }
  const opts = document.querySelectorAll('.mcq-opt');
  opts.forEach((b, i) => {
    if (i === q.ans) b.classList.add('mcq-correct');
    else if (i === idx) b.classList.add('mcq-wrong');
    b.disabled = true;
  });
  // v18.33: 显示解析 1.8s 才进下题
  const expl = q.explain || _generateMcqExplain(q);
  const fb = document.querySelector('.mcq-feedback');
  if (fb) {
    fb.innerHTML = isCorrect
      ? `✅ <b>答对!</b> ${escapeHtml(expl)}`
      : `❌ 应是 <b>${String.fromCharCode(65+q.ans)}. ${escapeHtml(q.opts[q.ans])}</b><br>💡 ${escapeHtml(expl)}`;
    fb.className = 'mcq-feedback show ' + (isCorrect ? 'fb-correct' : 'fb-wrong');
  }
  setTimeout(() => {
    g.idx++;
    if (g.idx >= g.qs.length) _finishMcqGame();
    else _renderMcqGame();
  }, isCorrect ? 1200 : 2200);  // 答错给更长时间看解析
}
function _generateMcqExplain(q) {
  const tag = q.tag || '';
  if (tag.includes('主谓陷阱')) return '主谓陷阱: neither/each/news 看似复数其实当单数, 用 is/has';
  if (tag.includes('主谓')) return '主谓一致: 第三人称单数 (he/she/it) 动词 + s/es';
  if (tag.includes('过去时')) return 'Yesterday/last week → 用过去式 (-ed)';
  if (tag.includes('将来时')) return 'Tomorrow/next... → 用 will + 动词原形';
  if (tag.includes('现在完成')) return '"已经" / "for X years" → have/has + p.p.';
  if (tag.includes('过去进行')) return '过去某时正在做 → was/were + -ing';
  if (tag.includes('现在进行')) return '现在正在做 → am/is/are + -ing';
  if (tag.includes('时态')) return '看时间词判时态: yesterday=过去, now=现在, tomorrow=将来';
  if (tag.includes('比较级')) return '比较级 +er/more (短词加 er, 长词加 more); 不能 more taller';
  if (tag.includes('最高级')) return '最高级 +est/most + the';
  if (tag.includes('副词比较')) return 'good 形 → well 副; better 是两者比较级';
  if (tag.includes('介词搭配')) return '动词+介词固定搭配: good at / interested in / careful with';
  if (tag.includes('介词')) return '常见介词: at (时点) / on (日期/上面) / in (月年/里面) / to (方向)';
  if (tag.includes('冠词')) return 'a + 辅音音; an + 元音音 (an honest 辅音 h 不发音); the = 特指';
  if (tag.includes('phrasal')) return '短语动词: come across=偶遇 / look after=照顾 / give up=放弃 / put off=推迟';
  if (tag.includes('条件句')) return 'if 从句用现在时, 主句用 will + 动词原形';
  if (tag.includes('neither/nor')) return 'neither + nor 配对 (像 either + or)';
  if (tag.includes('would rather')) return 'would rather + 动词原形 (rather than + 原形 / 名词)';
  if (tag.includes('关系代词')) return 'who=人 / which=物 / whose=所有 / whom=宾格';
  if (tag.includes('倒装')) return '否定词/hardly/no sooner 开头 → 助动词倒装到主语前';
  if (tag.includes('不可数主谓')) return '新闻 news / 信息 info / 家具 furniture 都是不可数, 用 is/has';
  return '正确答案见上, 多读几次记下来';
}
function _finishMcqGame() {
  const g = _mcqGameState;
  if (!g) return;
  let diffR = null;
  if (window.recordGameRun) diffR = window.recordGameRun(state, g.key, g.correct, g.qs.length);
  const playNum = _bumpDailyGameCount(g.key);
  const mult = _getGameMultiplier(playNum);
  // v19.0: 难度梯度积分 (高难度答对奖更多)
  const rewardMap = { 3: 4, 4: 6, 5: 10, 6: 15 };
  let baseR = 0;
  if (g.correct >= 10) baseR = rewardMap[g.diff] || 3;
  else if (g.correct >= 7) baseR = Math.max(1, (rewardMap[g.diff] || 3) - 1);
  const reward = Math.floor(baseR * mult * (window.getDragonBuff ? window.getDragonBuff(state) : 1.0));
  if (reward > 0) {
    state.totalPoints += reward;
    state.logs.push({ reason: `🎮 ${g.title} ${g.correct}/10 (第 ${playNum} 次)`, points: reward, week: state.currentWeek, timestamp: Date.now() });
  }
  saveState(state);
  const modal = document.getElementById('mcqGameModal');
  modal.innerHTML = `
    <div class="mg-inner mcq-inner">
      <div class="mg-result-icon">${g.correct >= 10 ? '🎉' : g.correct >= 7 ? '👍' : '🤔'}</div>
      <div class="mg-result-title">${g.title} (今日第 ${playNum} 次)</div>
      <div class="mg-result-stats">${g.correct}/10 对 · ${g.wrong} 错</div>
      <div class="mg-result-reward">+${reward} 分 · ${_getMultiplierLabel(playNum)}</div>
      <button class="btn btn-primary" onclick="closeMcqGame()">知道了!</button>
    </div>`;
  if (g.correct >= 10 && mult > 0) { spawnConfetti(window.innerWidth/2, window.innerHeight/3, 40); playSound('tada'); petExpress('pet-excited', 2200); }
  if (diffR && diffR.levelChanged === 'up') { showToast(`🆙 ${g.title} 难度升到 Lv ${diffR.newDiff}!`, 'happy'); playSound('tada'); }
  if (diffR && diffR.levelChanged === 'down') showToast(`📉 ${g.title} 难度降到 Lv ${diffR.newDiff}`, 'sad');
  _mcqGameState = null;
}
function closeMcqGame() {
  const m = document.getElementById('mcqGameModal');
  if (m) m.classList.remove('show');
  _mcqGameState = null;
  renderAll();
}

// === 4. Science 快分类 ===
let _sciGameState = null;
function openSciClassifyGame() {
  if (!_checkGameDailyLock('scilab')) return;  // v18.38
  const diff = window.getDifficulty ? window.getDifficulty(state, 'scilab') : 1;
  const item = window.getSciClassifyByDiff(diff);
  _sciGameState = { item, picks: {}, correct: 0, wrong: 0, diff };
  _renderSciGame();
}
function _renderSciGame() {
  const g = _sciGameState;
  if (!g) return;
  let modal = document.getElementById('sciGameModal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'sciGameModal';
    modal.className = 'mb-result-modal';
    document.body.appendChild(modal);
  }
  const total = g.item.items.length;
  const done = Object.keys(g.picks).length;
  const itemsHtml = g.item.items.map((it, i) => {
    const picked = g.picks[i];
    const isCorrect = picked !== undefined && picked === it.c;
    const isWrong = picked !== undefined && picked !== it.c;
    const cls = picked !== undefined ? (isCorrect ? 'sci-correct' : 'sci-wrong') : '';
    const chips = g.item.cats.map((c, ci) =>
      `<button class="sci-chip" onclick="sciClassifyPick(${i}, ${ci})" ${picked !== undefined ? 'disabled' : ''}>${escapeHtml(c)}</button>`
    ).join('');
    return `
      <div class="sci-row ${cls}">
        <div class="sci-name">${escapeHtml(it.n)}</div>
        ${picked !== undefined ?
          `<div class="sci-result">${isCorrect ? '✓ 对' : '✗ 错, 应是 ' + escapeHtml(g.item.cats[it.c])}</div>` :
          `<div class="sci-chips">${chips}</div>`}
      </div>`;
  }).join('');
  modal.innerHTML = `
    <div class="mg-inner sci-inner">
      <div class="mg-stats">🔬 ${escapeHtml(g.item.topic)} · ${done}/${total}</div>
      <div class="sci-list">${itemsHtml}</div>
      ${done >= total ? `<button class="btn btn-primary" onclick="_finishSciGame()">完成 — 看结果</button>` : ''}
      <button class="vocab-modal-close mg-close" onclick="closeSciGame()">×</button>
    </div>`;
  modal.classList.add('show');
}
function sciClassifyPick(itemIdx, catIdx) {
  const g = _sciGameState;
  if (!g) return;
  g.picks[itemIdx] = catIdx;
  if (catIdx === g.item.items[itemIdx].c) { g.correct++; playSound('ding'); petExpress('pet-excited', 800); }
  else {
    g.wrong++; playSound('sad');
    if (window.addToErrorBank) {
      const itm = g.item.items[itemIdx];
      window.addToErrorBank(state, {
        gameKey: 'scilab', type: 'classify',
        q: itm.name + ' → ' + g.item.categories[catIdx],
        correctAns: g.item.categories[itm.c],
        explain: itm.name + ' 属于 ' + g.item.categories[itm.c]
      });
    }
  }
  _renderSciGame();
}
function _finishSciGame() {
  const g = _sciGameState;
  if (!g) return;
  const total = g.item.items.length;
  let diffR = null;
  if (window.recordGameRun) diffR = window.recordGameRun(state, 'scilab', g.correct, total);
  const playNum = _bumpDailyGameCount('scilab');
  const mult = _getGameMultiplier(playNum);
  const sciDiff = (state.gameStats && state.gameStats.scilab && state.gameStats.scilab.difficulty) || 4;
  const sciRewardMap = { 3: 4, 4: 6, 5: 10, 6: 15 };
  let baseR = 0;
  const acc = g.correct / total;
  if (acc >= 1) baseR = sciRewardMap[sciDiff] || 2;
  else if (acc >= 0.7) baseR = Math.max(1, (sciRewardMap[sciDiff] || 2) - 1);
  const reward = Math.floor(baseR * mult * (window.getDragonBuff ? window.getDragonBuff(state) : 1.0));
  if (reward > 0) {
    state.totalPoints += reward;
    state.logs.push({ reason: `🎮 科学分类 ${g.correct}/${total} (第 ${playNum} 次)`, points: reward, week: state.currentWeek, timestamp: Date.now() });
  }
  saveState(state);
  const modal = document.getElementById('sciGameModal');
  modal.innerHTML = `
    <div class="mg-inner">
      <div class="mg-result-icon">${acc >= 1 ? '🎉' : acc >= 0.7 ? '👍' : '🤔'}</div>
      <div class="mg-result-title">${escapeHtml(g.item.topic)} (今日第 ${playNum} 次)</div>
      <div class="mg-result-stats">${g.correct}/${total} 对</div>
      <div class="mg-result-reward">+${reward} 分 · ${_getMultiplierLabel(playNum)}</div>
      <button class="btn btn-primary" onclick="closeSciGame()">知道了!</button>
    </div>`;
  if (acc >= 1 && mult > 0) { spawnConfetti(window.innerWidth/2, window.innerHeight/3, 40); playSound('tada'); }
  if (diffR && diffR.levelChanged === 'up') { showToast(`🆙 科学分类难度升到 Lv ${diffR.newDiff}!`, 'happy'); playSound('tada'); }
  if (diffR && diffR.levelChanged === 'down') showToast(`📉 科学分类难度降到 Lv ${diffR.newDiff}`, 'sad');
  _sciGameState = null;
}
function closeSciGame() {
  const m = document.getElementById('sciGameModal');
  if (m) m.classList.remove('show');
  _sciGameState = null;
  renderAll();
}

window.openUnitGame = openUnitGame;
window.submitUnitAnswer = submitUnitAnswer;
window.closeUnitGame = closeUnitGame;
window.openGrammarGame = openGrammarGame;
window.openClozeGame = openClozeGame;
window.openSciMcqGame = openSciMcqGame;
window.openChineseMcqGame = openChineseMcqGame;
window.submitMcqAnswer = submitMcqAnswer;
window.closeMcqGame = closeMcqGame;
window.openSciClassifyGame = openSciClassifyGame;
window.sciClassifyPick = sciClassifyPick;
window._finishSciGame = _finishSciGame;
window.closeSciGame = closeSciGame;

// 数学速算
let _mathGameState = null;
let _mathTimer = null;
function openMathGame() {
  if (!_checkGameDailyLock('math')) return;  // v18.38
  // v18.25: 按当前难度采样
  const diff = window.getDifficulty ? window.getDifficulty(state, 'math') : 1;
  const qs = window.getMathQuestionsByDiff ? window.getMathQuestionsByDiff(diff, 10)
           : (window.getDailyMathQuestions ? window.getDailyMathQuestions(10) : [...window.MATH_QUESTIONS].sort(() => Math.random() - 0.5).slice(0, 10));
  const mathTimeBudget = diff >= 5 ? 240 : diff >= 4 ? 150 : 90;
  _mathGameState = { qs, idx: 0, correct: 0, wrong: 0, startedAt: Date.now(), timeLeft: mathTimeBudget, totalTime: mathTimeBudget, diff };
  _renderMathGame();
  // v18.11: 计时器只更新 stats 文字, 不重渲染 input (避免 iPad 键盘跳)
  if (_mathTimer) clearInterval(_mathTimer);
  _mathTimer = setInterval(() => {
    if (!_mathGameState) { clearInterval(_mathTimer); _mathTimer = null; return; }
    _mathGameState.timeLeft -= 1;
    if (_mathGameState.timeLeft <= 0) {
      clearInterval(_mathTimer); _mathTimer = null;
      _finishMathGame();
    } else {
      _updateMathStats();
    }
  }, 1000);
}
function _updateMathStats() {
  const stats = document.getElementById('mgStats');
  const g = _mathGameState;
  if (stats && g) stats.textContent = `⏱️ ${g.timeLeft}s · ✅ ${g.correct} · ❌ ${g.wrong} · ${g.idx + 1}/10`;
}
function _renderMathGame() {
  const modal = document.getElementById('mathGameModal');
  if (!modal || !_mathGameState) return;
  const g = _mathGameState;
  if (g.idx >= g.qs.length) {
    _finishMathGame();
    return;
  }
  const q = g.qs[g.idx];
  // v18.12: 整页只在首次构建一次, 之后用 _updateMathQuestion 部分更新, 保留 input 元素
  modal.innerHTML = `
    <div class="mg-inner">
      <div class="mg-stats" id="mgStats">⏱️ ${g.timeLeft}s · ✅ ${g.correct} · ❌ ${g.wrong} · ${g.idx + 1}/10</div>
      <div class="mg-q" id="mgQ">${q.q} = ?</div>
      <input type="text" inputmode="numeric" pattern="-?[0-9]*" id="mgInput" value="" class="mg-input" onkeydown="if(event.key==='Enter') submitMathAnswer()" placeholder="点这里输入答案">
      <button class="btn btn-primary mg-submit" onclick="submitMathAnswer()">提交 (Enter)</button>
      <button class="vocab-modal-close mg-close" onclick="closeMathGame()">×</button>
    </div>
  `;
  modal.classList.add('show');
}
function _updateMathQuestion() {
  const g = _mathGameState;
  if (!g || g.idx >= g.qs.length) return;
  const q = g.qs[g.idx];
  const qEl = document.getElementById('mgQ');
  const inp = document.getElementById('mgInput');
  if (qEl) qEl.textContent = `${q.q} = ?`;
  if (inp) inp.value = '';
  _updateMathStats();
  // input 不重建, 不调 focus(), iPad 键盘保持开
}
function submitMathAnswer() {
  const g = _mathGameState;
  if (!g) return;
  const input = document.getElementById('mgInput');
  if (!input || input.value === '') return;
  const val = parseInt(input.value);
  const q = g.qs[g.idx];
  if (val === q.ans) { g.correct++; playSound('ding'); petExpress('pet-excited', 800); }
  else {
    g.wrong++; playSound('sad');
    showToast(`❌ 应是 ${q.ans}`, 'sad');  // v18.33: 错答显示正确答案
    // v18.59: 错题入错题本
    if (window.addToErrorBank) {
      window.addToErrorBank(state, {
        gameKey: 'math', type: 'math',
        q: q.q, correctAns: q.ans, diff: q.diff || 4,
        explain: '正确答案: ' + q.ans
      });
    }
  }
  g.idx++;
  if (g.idx >= g.qs.length) {
    if (_mathTimer) { clearInterval(_mathTimer); _mathTimer = null; }
    _finishMathGame();
  } else {
    _updateMathQuestion();  // v18.12: 只更新文字, 不重建 input
  }
}
function _finishMathGame() {
  const g = _mathGameState;
  if (!g) return;
  // v18.25: 记录运行 + 难度升降
  let diffResult = null;
  if (window.recordGameRun) diffResult = window.recordGameRun(state, 'math', g.correct, g.qs.length);
  // v18.24: 递减奖励
  const playNum = _bumpDailyGameCount('math');
  const mult = _getGameMultiplier(playNum);
  const mathDiff = (state.gameStats && state.gameStats.math && state.gameStats.math.difficulty) || 4;
  const mathRewardMap = { 3: 4, 4: 6, 5: 10, 6: 15 };
  let baseReward = 0;
  if (g.correct >= 10) baseReward = mathRewardMap[mathDiff] || 3;
  else if (g.correct >= 7) baseReward = Math.max(1, (mathRewardMap[mathDiff] || 3) - 1);
  const reward = Math.floor(baseReward * mult * (window.getDragonBuff ? window.getDragonBuff(state) : 1.0));
  if (reward > 0) {
    state.totalPoints += reward;
    state.logs.push({ reason: `🎮 数学速算 ${g.correct}/10 (第 ${playNum} 次)`, points: reward, week: state.currentWeek, timestamp: Date.now() });
  }
  state.mathGameRuns = (state.mathGameRuns || 0) + 1;
  saveState(state);
  const modal = document.getElementById('mathGameModal');
  modal.innerHTML = `
    <div class="mg-inner">
      <div class="mg-result-icon">${g.correct >= 10 ? '🎉' : g.correct >= 7 ? '👍' : '🤔'}</div>
      <div class="mg-result-title">${g.correct >= 10 ? '全对!' : '完成!'} (今日第 ${playNum} 次)</div>
      <div class="mg-result-stats">${g.correct}/10 对 · ${g.wrong} 错 · ${g.totalTime - g.timeLeft}s 用时</div>
      <div class="mg-result-reward">+${reward} 分 · ${_getMultiplierLabel(playNum)}</div>
      <button class="btn btn-primary" onclick="closeMathGame()">知道了!</button>
    </div>
  `;
  if (g.correct >= 10 && mult > 0) { spawnConfetti(window.innerWidth / 2, window.innerHeight / 3, 40); playSound('tada'); petExpress('pet-excited', 2200); }
  // v18.25: 难度变化提示
  if (diffResult && diffResult.levelChanged === 'up') { showToast(`🆙 数学难度升到 Lv ${diffResult.newDiff}!`, 'happy'); playSound('tada'); }
  if (diffResult && diffResult.levelChanged === 'down') showToast(`📉 数学难度降到 Lv ${diffResult.newDiff}, 继续努力`, 'sad');
  _mathGameState = null;
}
function closeMathGame() {
  if (_mathTimer) { clearInterval(_mathTimer); _mathTimer = null; }
  document.getElementById('mathGameModal').classList.remove('show');
  _mathGameState = null;
  renderAll();
}

// Editing 找错
let _editingGameState = null;
function openEditingGame() {
  if (!_checkGameDailyLock('editing')) return;  // v18.38
  // v18.25: 按当前难度采样
  const diff = window.getDifficulty ? window.getDifficulty(state, 'editing') : 1;
  const para = window.getEditingByDiff ? window.getEditingByDiff(diff)
             : (window.getDailyEditingParagraph ? window.getDailyEditingParagraph() : window.EDITING_PARAGRAPHS[0]);
  _editingGameState = { para, found: new Set(), wrong: 0, startedAt: Date.now(), diff };
  _renderEditingGame();
}
function _renderEditingGame() {
  const modal = document.getElementById('editingGameModal');
  if (!modal || !_editingGameState) return;
  const g = _editingGameState;
  // 把段落渲染为可点击的词
  const words = g.para.text.split(/\s+/);
  const errWords = g.para.errors.map(e => e.word.split(' ')[0]);  // 简化:用第一个词识别
  const wordHtml = words.map((w, i) => {
    const stripped = w.replace(/[.,!?]$/, '');
    const isErr = errWords.includes(stripped);
    const isFound = g.found.has(stripped);
    return `<span class="eg-word ${isFound ? 'eg-found' : ''}" onclick="clickEditingWord('${stripped.replace(/'/g, "\\'")}')">${w}</span>`;
  }).join(' ');
  modal.innerHTML = `
    <div class="eg-inner">
      <div class="eg-header">
        <span class="eg-title">✏️ Editing 找错 · ${g.found.size}/5 · ❌ ${g.wrong}</span>
        <button class="vocab-modal-close" onclick="closeEditingGame()">×</button>
      </div>
      <div class="eg-instr">📋 段落里有 5 个错(主谓/时态/拼写/介词/冠词). 点击错词标红.</div>
      <div class="eg-text">${wordHtml}</div>
      ${g.found.size >= 5 ? `<div class="eg-victory">🎉 全找到! +10 分 + 1 宝箱<br><button class="btn btn-primary" onclick="closeEditingGame()">太棒了!</button></div>` : ''}
    </div>
  `;
  modal.classList.add('show');
}
function clickEditingWord(word) {
  const g = _editingGameState;
  if (!g) return;
  // v18.3: errors[].word 可能是单词或短语, 取首词作为可点击 key
  const errWords = g.para.errors.map(e => (e.word || '').split(' ')[0]);
  if (g.found.has(word)) return;
  if (errWords.includes(word)) {
    g.found.add(word);
    playSound('ding');
    if (g.found.size >= 5) {
      // v18.25: 记录难度
      let diffResult = null;
      if (window.recordGameRun) diffResult = window.recordGameRun(state, 'editing', 5, 5);
      // 全对 v18.24 递减
      const playNum = _bumpDailyGameCount('editing');
      const mult = _getGameMultiplier(playNum);
      const editDiff = (state.gameStats && state.gameStats.editing && state.gameStats.editing.difficulty) || 4;
      const editRewardMap = { 3: 4, 4: 6, 5: 10, 6: 15 };
      const points = Math.floor((editRewardMap[editDiff] || 2) * mult);
      state.totalPoints += points;
      if (!state.mysteryBoxes) state.mysteryBoxes = { available: 0, opened: 0, totalSlotsAtLastEarn: 0, history: [] };
      if (playNum === 1) state.mysteryBoxes.available += 1;
      state.logs.push({ reason: `🎮 Editing 找错全对 (第 ${playNum} 次)`, points, week: state.currentWeek, timestamp: Date.now() });
      state.editingGameRuns = (state.editingGameRuns || 0) + 1;
      saveState(state);
      if (mult > 0) {
        spawnConfetti(window.innerWidth / 2, window.innerHeight / 3, 40);
        playSound('tada');
      }
      if (playNum >= 2) showToast(`🎮 第 ${playNum} 次 — ${_getMultiplierLabel(playNum)} (+${points} 分)`, 'warn');
      if (diffResult && diffResult.levelChanged === 'up') { showToast(`🆙 Editing 难度升到 Lv ${diffResult.newDiff}!`, 'happy'); playSound('tada'); }
      if (diffResult && diffResult.levelChanged === 'down') showToast(`📉 Editing 难度降到 Lv ${diffResult.newDiff}`, 'sad');
    }
  } else {
    g.wrong++;
    playSound('sad');
    if (window.addToErrorBank) {
      window.addToErrorBank(state, {
        gameKey: 'editing', type: 'editing',
        q: '点错词: ' + word,
        correctAns: g.para.errors.map(e => e.word).join(', '),
        explain: '本段错词: ' + g.para.errors.map(e => e.word + '→' + e.fix).join(', ')
      });
    }
  }
  _renderEditingGame();
}
function closeEditingGame() {
  document.getElementById('editingGameModal').classList.remove('show');
  _editingGameState = null;
  renderAll();
}

// 听写
let _listenGameState = null;
function openListenGame() {
  if (!_checkGameDailyLock('listen')) return;  // v18.38
  // v18.25: 按当前难度采样
  const diff = window.getDifficulty ? window.getDifficulty(state, 'listen') : 1;
  const item = window.getListenByDiff ? window.getListenByDiff(diff)
             : (window.getDailyListenDictation ? window.getDailyListenDictation() : window.LISTEN_DICTATIONS[0]);
  const numBlanks = (item.blanks || []).length;
  _listenGameState = { item, answers: new Array(numBlanks).fill(''), played: false, diff };
  _renderListenGame();
}
function _renderListenGame() {
  const modal = document.getElementById('listenGameModal');
  if (!modal || !_listenGameState) return;
  const g = _listenGameState;
  modal.innerHTML = `
    <div class="lg-inner">
      <div class="lg-header">
        <span class="lg-title">🎧 听写练习</span>
        <button class="vocab-modal-close" onclick="closeListenGame()">×</button>
      </div>
      <div class="lg-instr">📋 点 ▶ 播放 1 段英语 (可重听), 然后填 5 个关键词</div>
      <button class="btn btn-primary lg-play" onclick="speakListenText()">▶ ${g.played ? '重听' : '播放'}</button>
      ${g.played ? `
        <div class="lg-blanks">
          ${g.item.blanks.map((b, i) => `
            <div class="lg-blank">
              <span class="lg-blank-label">${i + 1}.</span>
              <input type="text" class="lg-input" id="lgInput${i}" oninput="_listenGameState.answers[${i}]=this.value" value="${g.answers[i] || ''}" placeholder="...">
            </div>
          `).join('')}
        </div>
        <button class="btn btn-success lg-submit" onclick="submitListenAnswers()">提交</button>
      ` : `<div class="lg-tip">先播放, 听完再填空</div>`}
    </div>
  `;
  modal.classList.add('show');
}
function speakListenText() {
  const g = _listenGameState;
  if (!g) return;
  if ('speechSynthesis' in window) {
    const u = new SpeechSynthesisUtterance(g.item.text);
    u.lang = g.item.voice || 'en-GB';
    u.rate = 0.9;
    speechSynthesis.cancel();
    speechSynthesis.speak(u);
    g.played = true;
    _renderListenGame();
  } else {
    showToast('浏览器不支持语音合成', 'sad');
  }
}
function submitListenAnswers() {
  const g = _listenGameState;
  if (!g) return;
  let correct = 0;
  for (let i = 0; i < g.item.blanks.length; i++) {
    const expected = g.item.blanks[i].toLowerCase().trim();
    const got = (g.answers[i] || '').toLowerCase().trim();
    if (expected === got) correct++;
  }
  // v18.25: 记录难度
  let diffResult = null;
  if (window.recordGameRun) diffResult = window.recordGameRun(state, 'listen', correct, g.item.blanks.length);
  // v18.24: 递减奖励
  const playNum = _bumpDailyGameCount('listen');
  const mult = _getGameMultiplier(playNum);
  const listenDiff = (state.gameStats && state.gameStats.listen && state.gameStats.listen.difficulty) || 4;
  const listenRewardMap = { 3: 4, 4: 6, 5: 10, 6: 15 };
  let baseReward = 0;
  if (correct >= 5) baseReward = listenRewardMap[listenDiff] || 2;
  else if (correct >= 3) baseReward = Math.max(1, (listenRewardMap[listenDiff] || 2) - 1);
  const reward = Math.floor(baseReward * mult * (window.getDragonBuff ? window.getDragonBuff(state) : 1.0));
  if (reward > 0) {
    state.totalPoints += reward;
    if (correct >= 5 && playNum === 1 && state.mysteryBoxes) state.mysteryBoxes.available += 1;
    state.logs.push({ reason: `🎮 听写 ${correct}/5 (第 ${playNum} 次)`, points: reward, week: state.currentWeek, timestamp: Date.now() });
  }
  state.listenGameRuns = (state.listenGameRuns || 0) + 1;
  saveState(state);
  const modal = document.getElementById('listenGameModal');
  modal.innerHTML = `
    <div class="lg-inner">
      <div class="lg-result-icon">${correct >= 5 ? '🎉' : correct >= 3 ? '👍' : '🤔'}</div>
      <div class="lg-result-title">${correct}/5 对 (今日第 ${playNum} 次)</div>
      <div class="lg-result-text">原文: ${escapeHtml(g.item.text)}</div>
      <div class="lg-result-reward">+${reward} 分${correct >= 5 && playNum === 1 ? ' + 1 宝箱' : ''} · ${_getMultiplierLabel(playNum)}</div>
      <button class="btn btn-primary" onclick="closeListenGame()">知道了!</button>
    </div>
  `;
  if (correct >= 5 && mult > 0) { spawnConfetti(window.innerWidth / 2, window.innerHeight / 3, 40); playSound('tada'); }
  if (diffResult && diffResult.levelChanged === 'up') { showToast(`🆙 听写难度升到 Lv ${diffResult.newDiff}!`, 'happy'); playSound('tada'); }
  if (diffResult && diffResult.levelChanged === 'down') showToast(`📉 听写难度降到 Lv ${diffResult.newDiff}`, 'sad');
  _listenGameState = null;
}
function closeListenGame() {
  document.getElementById('listenGameModal').classList.remove('show');
  _listenGameState = null;
  if ('speechSynthesis' in window) speechSynthesis.cancel();
  renderAll();
}

// ============ v16.3: 听力资源 modal (CNA938 直播 + 推荐播客 + BBC 外链) ============
// v16.10: 防沉迷 — 听力 modal 计时器(模块级)
let _listeningTickInterval = null;
const LISTENING_TICK_SEC = 10;  // 每 10 秒累加并保存

function _stopListeningTimer() {
  if (_listeningTickInterval) {
    clearInterval(_listeningTickInterval);
    _listeningTickInterval = null;
  }
}

function _startListeningTimer() {
  _stopListeningTimer();
  _listeningTickInterval = setInterval(() => {
    const total = window.addListeningSeconds(state, LISTENING_TICK_SEC);
    // v17.7 quest: listen-15 (累计秒数)
    _trackQuest('listen-15', LISTENING_TICK_SEC);
    saveState(state);
    const limit = window.LISTENING_DAILY_LIMIT_MIN * 60;
    const remaining = Math.max(0, limit - total);
    // 更新顶部剩余时间显示
    const el = document.getElementById('listeningRemaining');
    if (el) {
      const min = Math.floor(remaining / 60);
      const sec = remaining % 60;
      el.textContent = `今日剩余 ${min}:${String(sec).padStart(2, '0')}`;
      el.style.color = remaining < 300 ? 'var(--color-danger)' : 'var(--color-text-light)';
    }
    if (total >= limit) {
      _stopListeningTimer();
      showToast(`🔒 今日听力 ${window.LISTENING_DAILY_LIMIT_MIN} 分钟用完,明天再来!家长可解锁`, 'warn');
      closeListeningModal();
      // 立即重开会显示锁屏
      setTimeout(() => openListeningModal(state.currentWeek), 500);
    }
  }, LISTENING_TICK_SEC * 1000);
}

// 渲染锁屏(今日额度用完)
function _renderListeningLockedScreen(modal) {
  const used = window.getListeningSecondsToday(state);
  const min = Math.floor(used / 60);
  const sec = used % 60;
  modal.innerHTML = `
    <div class="vocab-modal-inner">
      <div class="vocab-modal-header">
        <div>
          <span class="vocab-modal-title">🔒 今日听力时间已用完</span>
          <span class="vocab-modal-meta">每日上限 ${window.LISTENING_DAILY_LIMIT_MIN} 分钟,防沉迷自动锁定</span>
        </div>
        <button class="vocab-modal-close" onclick="closeListeningModal()">×</button>
      </div>
      <div class="vocab-modal-body" style="display:flex;flex-direction:column;align-items:center;gap:14px;padding:32px 24px;text-align:center">
        <div style="font-size:64px">🔒</div>
        <div style="font-size:18px;font-weight:700">今天已经听了 ${min} 分 ${sec} 秒</div>
        <div style="color:var(--color-text-light);font-size:13px;line-height:1.6">
          每日上限 ${window.LISTENING_DAILY_LIMIT_MIN} 分钟,保护视力 + 避免沉迷。<br>
          明天 0:00 自动重置,可继续听。
        </div>
        <button class="btn btn-warn" onclick="unlockListeningToday()" style="margin-top:8px">🔓 家长解锁(需要密码)</button>
      </div>
      <div class="vocab-modal-footer">
        💡 防沉迷由佑子的备考冒险 v16.10 自动管理。家长解锁后会重置今日额度,可再听 ${window.LISTENING_DAILY_LIMIT_MIN} 分钟。
      </div>
    </div>
  `;
  modal.classList.add('show');
}

// 家长解锁今日听力(需要管理密码)
function unlockListeningToday() {
  if (!window.requireAdminAuth()) return;
  window.resetListeningToday(state);
  saveState(state);
  showToast(`✅ 已解锁,今日可再听 ${window.LISTENING_DAILY_LIMIT_MIN} 分钟`, 'happy');
  closeListeningModal();
  setTimeout(() => openListeningModal(state.currentWeek), 300);
}

function openListeningModal(week) {
  const modal = document.getElementById('listeningModal');
  if (!modal || !window.LISTENING_RESOURCES) return;
  // v16.10: 防沉迷锁定检查
  if (window.isListeningLocked(state)) {
    _renderListeningLockedScreen(modal);
    return;
  }
  // v16.9: 难度徽章 + 集数信息 + (playlist) 选集提示
  const meta = (r) => `
    <div class="lis-meta">
      ${r.level ? `<span class="lis-level" style="background:${r.levelColor || '#999'}">${escapeHtml(r.level)}</span>` : ''}
      ${r.episodeInfo ? `<span class="lis-eps">${escapeHtml(r.episodeInfo)}</span>` : ''}
    </div>
  `;
  const items = window.LISTENING_RESOURCES.map(r => {
    if (r.type === 'live-audio') {
      return `
        <div class="lis-item lis-live">
          <div class="lis-title">${r.title}</div>
          ${meta(r)}
          <div class="lis-desc">${escapeHtml(r.desc)}</div>
          <audio controls preload="none" src="${r.src}" style="width:100%;margin-top:8px"></audio>
          <a href="${r.fallbackUrl}" target="_blank" rel="noopener" class="lis-fallback">无法播放? 打开 CNA938 官网 →</a>
        </div>
      `;
    }
    if (r.type === 'youtube') {
      return `
        <div class="lis-item lis-youtube">
          <div class="lis-title">${r.title}</div>
          ${meta(r)}
          <div class="lis-desc">${escapeHtml(r.desc)}</div>
          <div class="lis-yt-wrap">
            <iframe src="https://www.youtube-nocookie.com/embed/${r.videoId}?rel=0"
                    title="${escapeHtml(r.title)}"
                    frameborder="0"
                    allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowfullscreen
                    loading="lazy"></iframe>
          </div>
        </div>
      `;
    }
    if (r.type === 'youtube-playlist') {
      // 频道 uploads 播放列表 — 自动连播,无限内容
      // 想换集:点视频底部"▶▶"按钮 OR 开 YouTube 全列表挑
      return `
        <div class="lis-item lis-youtube">
          <div class="lis-title">${r.title}</div>
          ${meta(r)}
          <div class="lis-desc">${escapeHtml(r.desc)}</div>
          <div class="lis-yt-wrap">
            <iframe src="https://www.youtube-nocookie.com/embed/videoseries?list=${r.playlistId}&rel=0&playsinline=1"
                    title="${escapeHtml(r.title)}"
                    frameborder="0"
                    allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowfullscreen
                    loading="lazy"></iframe>
          </div>
          <div class="lis-tip">▶ 自动连播下一集 · 想跳集:点视频底部控件最右 <b>▶▶</b> 按钮</div>
        </div>
      `;
    }
    return `
      <div class="lis-item">
        <div class="lis-title">${r.title}</div>
        <div class="lis-desc">${escapeHtml(r.desc)}</div>
        <a href="${r.url}" target="_blank" rel="noopener" class="btn btn-primary lis-link">▶ 在新标签打开播放</a>
      </div>
    `;
  }).join('');
  // v16.10: 计算剩余时间
  const usedSec = window.getListeningSecondsToday(state);
  const limitSec = window.LISTENING_DAILY_LIMIT_MIN * 60;
  const remainSec = Math.max(0, limitSec - usedSec);
  const remainMin = Math.floor(remainSec / 60);
  const remainSecOnly = remainSec % 60;
  const remainColor = remainSec < 300 ? 'var(--color-danger)' : 'var(--color-text-light)';

  modal.innerHTML = `
    <div class="vocab-modal-inner">
      <div class="vocab-modal-header">
        <div>
          <span class="vocab-modal-title">🎧 听力资源(W${week})</span>
          <span class="vocab-modal-meta">每天 10-15 min · 精听 → 不查字典先全听一遍 → 第二遍记 3-5 个新词</span>
          <span id="listeningRemaining" style="display:block;font-size:11px;font-weight:700;margin-top:4px;color:${remainColor}">⏳ 今日剩余 ${remainMin}:${String(remainSecOnly).padStart(2,'0')} (上限 ${window.LISTENING_DAILY_LIMIT_MIN} 分钟)</span>
        </div>
        <button class="vocab-modal-close" onclick="closeListeningModal()">×</button>
      </div>
      <div class="listen-rules-card">
        <div class="lr-title">🎯 听力 4 步精听法</div>
        <ol class="lr-steps">
          <li><b>第 1 遍 (3-4 min)</b>: 整段听一遍, <b>不查字典、不暂停</b>, 听个大概, 听不懂也坚持</li>
          <li><b>第 2 遍 (5-6 min)</b>: 再听一遍, 边听边捕捉 <b>3-5 个生词</b> (没听过 / 听不懂的英文)</li>
          <li>暂停记下来 (本子 / 备忘录), 然后<b>查字典 + 抄中文意思 + 例句</b></li>
          <li><b>下次再听同一段</b>, 看能不能听出这些词 (复习的关键)</li>
        </ol>
        <div class="lr-tip">💡 不需要听懂全部, 抓住"有用的 3-5 个"就赢了</div>
      </div>
      <div class="vocab-modal-body lis-grid">${items}</div>
      <div class="vocab-modal-footer">
        💡 PSLE Listening 真题录音不公开,需要用 SAP《PSLE Listening Comprehension》配套 CD。
        听力陷阱:数字 / 否定词 / 转折(although / however)。<br>
        🎯 语速建议: <b>W1-W14</b> 用儿童故事 → <b>W15-W26</b> 加科学播客 → <b>W27+</b> 才挑战 CNA938。
      </div>
    </div>
  `;
  modal.classList.add('show');
  // v16.10: 启动防沉迷计时器
  _startListeningTimer();
}
function closeListeningModal() {
  // v16.10: 停止防沉迷计时器
  _stopListeningTimer();
  const modal = document.getElementById('listeningModal');
  if (modal) {
    modal.classList.remove('show');
    // 停掉 audio 播放(避免关 modal 后还在响)
    const a = modal.querySelector('audio');
    if (a) { try { a.pause(); a.currentTime = 0; } catch (e) {} }
    // 停掉所有 YouTube iframe (清空 src 让它彻底卸载)
    modal.querySelectorAll('iframe').forEach(ifr => {
      try { ifr.src = 'about:blank'; } catch (e) {}
    });
  }
}

function openScoreModal(week, day, slot) {
  const tasks = getDailyTasks(week, day);
  const t = tasks.find(x => x.slot === slot);
  const taskText = t ? t.task : slot;
  const sc = getScore(state, week, day, slot);

  // 根据任务类型预设满分
  const subtype = taskSubtype(taskText);
  const presetMax = (subtype === '作文') ? 40 :
                    (subtype === 'Cloze 完形') ? 15 :
                    (subtype === 'Comp 阅读') ? 28 :
                    (subtype === 'Editing 改错') ? 12 :
                    (subtype === 'Grammar 语法') ? 10 :
                    (subtype === '科学综合卷' || subtype === '数学模考' || subtype === '华文模考') ? 100 :
                    20;

  const overlay = document.createElement('div');
  overlay.className = 'score-modal';
  overlay.innerHTML = `
    <div class="score-modal-card">
      <div class="score-modal-header">
        <div>
          <div class="score-modal-title">${escapeHtml(taskText)}</div>
          <div class="score-modal-meta">W${week} · ${DAY_LABELS[day]} · ${slot} · ${subtype}</div>
        </div>
        <button class="photo-modal-close" onclick="this.closest('.score-modal').remove()">✕</button>
      </div>
      <div class="score-modal-body">
        <div class="score-row">
          <label>得分 <input type="number" id="scoreInput" min="0" step="0.5" value="${sc ? sc.score : ''}" autofocus></label>
          <span class="score-divider">/</span>
          <label>满分 <input type="number" id="scoreMaxInput" min="1" step="1" value="${sc ? sc.max : presetMax}"></label>
        </div>
        <div class="score-row">
          <label class="score-note-label">备注 <input type="text" id="scoreNoteInput" placeholder="如:作文 Lesson from Nature 老师评语..." value="${sc ? escapeAttr(sc.note) : ''}"></label>
        </div>
        <div class="score-quick-tips">
          <span>常见满分:作文 40 / Cloze 15 / Comp 28 / Editing 12 / Grammar 10 / 综合卷 100</span>
        </div>
      </div>
      <div class="score-modal-actions">
        ${sc ? `<button class="btn btn-danger" onclick="deleteScore(${week}, '${day}', '${slot}')">🗑️ 删除</button>` : ''}
        <button class="btn btn-secondary" onclick="this.closest('.score-modal').remove()">取消</button>
        <button class="btn btn-primary" onclick="saveScoreFromModal(${week}, '${day}', '${slot}')">💾 保存</button>
      </div>
    </div>
  `;
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
  document.body.appendChild(overlay);
  setTimeout(() => document.getElementById('scoreInput')?.focus(), 50);
}

function saveScoreFromModal(week, day, slot) {
  const score = document.getElementById('scoreInput').value;
  const max = document.getElementById('scoreMaxInput').value;
  const note = document.getElementById('scoreNoteInput').value;
  if (score === '' || isNaN(Number(score))) {
    showToast('❌ 请输入分数', 'danger');
    return;
  }
  if (Number(score) > Number(max)) {
    if (!confirm(`得分 ${score} 超过满分 ${max},确定?`)) return;
  }
  setScore(state, week, day, slot, score, max, note);
  saveState(state);
  document.querySelector('.score-modal')?.remove();
  showToast(`📊 已记录 ${score}/${max}`, 'success');
  renderAll();
}

function deleteScore(week, day, slot) {
  if (!confirm('删除这条分数?')) return;
  setScore(state, week, day, slot, null);
  saveState(state);
  document.querySelector('.score-modal')?.remove();
  showToast('🗑️ 分数已删除', 'warn');
  renderAll();
}

// HTML 转义工具
function escapeHtml(s) {
  if (s == null) return '';
  return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function escapeAttr(s) {
  return escapeHtml(s).replace(/'/g, '&#39;');
}

// ============ v18.2 数据可视化 — 学习进度统计卡(历史页) ============
function renderProgressStatsCard() {
  const card = document.getElementById('progressStatsCard');
  if (!card) return;
  // 1) 思考题进度
  const thinkAnswered = Object.keys(state.thinkPuzzleAnswers || {}).length;
  const thinkTotal = (window.THINK_PUZZLES || []).length;
  const thinkCorrect = Object.values(state.thinkPuzzleAnswers || {}).filter(a => a.correct).length;
  const thinkPct = thinkAnswered > 0 ? Math.round(thinkCorrect / thinkAnswered * 100) : 0;
  // 2) 词汇游戏
  const vocabRuns = state.vocabGameRuns || 0;
  const vocabPerfect = state.vocabPerfectRuns || 0;
  const vocabPct = vocabRuns > 0 ? Math.round(vocabPerfect / vocabRuns * 100) : 0;
  // 3) 听力 7 天趋势
  const trendDays = [];
  const today = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const sec = (state.listeningUsage && state.listeningUsage[k] && state.listeningUsage[k].seconds) || 0;
    trendDays.push({ k, sec, label: ['日','一','二','三','四','五','六'][d.getDay()] });
  }
  const maxSec = Math.max(60, ...trendDays.map(d => d.sec));
  const trendBars = trendDays.map(d => {
    const h = Math.max(4, Math.round(d.sec / maxSec * 60));
    const min = Math.floor(d.sec / 60);
    return `<div class="ls-bar-col" title="${d.k}: ${min} 分钟">
      <div class="ls-bar-val">${min}</div>
      <div class="ls-bar" style="height:${h}px"></div>
      <div class="ls-bar-label">${d.label}</div>
    </div>`;
  }).join('');
  const totalListen = trendDays.reduce((a, b) => a + b.sec, 0);
  // 4) mini-game 总数
  const mathRuns = state.mathGameRuns || 0;
  const editingRuns = state.editingGameRuns || 0;
  const listenRuns = state.listenGameRuns || 0;
  // 5) 成就 + 宝箱 + streak best
  const achU = (state.achievements && state.achievements.unlocked.length) || 0;
  const achTotal = (window.ACHIEVEMENTS || []).length;
  const boxOpened = (state.mysteryBoxes && state.mysteryBoxes.opened) || 0;
  const streakBest = (state.dailyStreak && state.dailyStreak.bestEver) || 0;

  card.innerHTML = `
    <div class="card-title">📊 学习进度统计</div>
    <div class="ps-grid">
      <div class="ps-stat">
        <div class="ps-icon">🤔</div>
        <div class="ps-val">${thinkAnswered}/${thinkTotal}</div>
        <div class="ps-label">思考题答题进度</div>
        <div class="ps-sub">正确率 <b>${thinkPct}%</b> (${thinkCorrect} 对)</div>
      </div>
      <div class="ps-stat">
        <div class="ps-icon">🎮</div>
        <div class="ps-val">${vocabRuns}</div>
        <div class="ps-label">词汇游戏次数</div>
        <div class="ps-sub">全对 <b>${vocabPerfect}</b> 次 (${vocabPct}%)</div>
      </div>
      <div class="ps-stat">
        <div class="ps-icon">🎯</div>
        <div class="ps-val">${achU}/${achTotal}</div>
        <div class="ps-label">成就解锁</div>
        <div class="ps-sub">宝箱开 <b>${boxOpened}</b> · 最高连击 <b>${streakBest}</b> 天</div>
      </div>
      <div class="ps-stat">
        <div class="ps-icon">🧪</div>
        <div class="ps-val">${mathRuns + editingRuns + listenRuns}</div>
        <div class="ps-label">Mini-game 总次数</div>
        <div class="ps-sub">数学 <b>${mathRuns}</b> · Editing <b>${editingRuns}</b> · 听写 <b>${listenRuns}</b></div>
      </div>
    </div>
    <div class="card-title" style="margin-top:18px;font-size:16px">🎧 7 天听力时长趋势 (累计 ${Math.floor(totalListen / 60)} 分钟)</div>
    <div class="ls-trend">
      ${trendBars}
    </div>
  `;
}

// ============ 历史页 ============
function renderHistoryPage() {
  const tbody = document.getElementById('historyTableBody');
  tbody.innerHTML = WEEK_DATES.map((date, idx) => {
    const week = idx + 1;
    const isKey = KEY_WEEKS.includes(week);
    const isCurrent = week === state.currentWeek;
    const cls = isKey ? 'key-week' : (isCurrent ? 'current-week' : '');

    let accumulated = 0;
    for (let w = 1; w <= week; w++) {
      accumulated += calcWeekPoints(w);
    }
    state.logs.forEach(log => {
      if (log.week && log.week <= week) accumulated += log.points;
    });

    const weekPts = calcWeekPoints(week);
    const c = calcWeekCompletion(week, state);
    const completion = c ? `${c.done}/${c.total} (${c.percent}%)` : '-';
    const note = WEEK_THEMES[idx];

    return `
      <tr class="${cls}">
        <td><b>W${week}</b></td>
        <td>${date}</td>
        <td>${completion}</td>
        <td>${weekPts > 0 ? '+' + weekPts : '-'}</td>
        <td><b>${week <= state.currentWeek ? accumulated : '-'}</b></td>
        <td style="text-align:left; font-size:11px;">${note}</td>
      </tr>
    `;
  }).join('');

  // 兑换记录
  const exchangeList = document.getElementById('exchangeList');
  if (state.exchanges.length === 0) {
    exchangeList.innerHTML = '<p style="color: var(--color-text-light); font-style: italic;">暂无兑换记录</p>';
  } else {
    exchangeList.innerHTML = state.exchanges.map((ex, idx) => `
      <div style="background: white; border: 2px solid var(--color-text); border-radius: 8px; padding: 10px; display: flex; justify-content: space-between; align-items: center;">
        <div>
          <b>${escapeHtml(ex.item)}</b><br>
          <span style="font-size: 12px; color: var(--color-text-light);">${ex.date} · ${ex.points} 分 = SGD ${(ex.points * (window.SGD_PER_POINT || 0.05)).toFixed(2)}</span>
        </div>
        <button class="btn btn-secondary" style="font-size: 12px; padding: 4px 8px;" onclick="deleteExchange(${idx})">删除</button>
      </div>
    `).join('');
  }

  drawChart();
  renderPsleAbilityCard();    // v18.43 PSLE 能力分析 (顶部)
  renderProgressStatsCard();  // v18.2 数据可视化
  renderScoreTracking();
}

// v18.43: PSLE 能力分析 (取代旧"分数 = app 积分"思路)
// v18.65: 全面重构 — 5 板块: AL总览 / 游戏明细 / 知识树 / 错题分析 / 改进计划

const _GAME_LABELS = {
  grammar: '✏️ Grammar',  cloze: '📝 Cloze',   vocab: '📚 Vocab',
  listen:  '🎧 Listen',   editing: '✍️ Editing',
  math:    '➗ 数学速算',  unit:   '📐 单位换算',
  scilab:  '🧪 SciLab'
};
const _SUBJ_GAME_ORDER = {
  '英语': ['editing', 'cloze', 'grammar', 'vocab', 'listen'],
  '数学': ['math', 'unit'],
  '科学': ['scilab'],
  '华文': []
};
const _SUBJ_ICONS = { '英语': '📖', '数学': '➗', '科学': '🔬', '华文': '🇨🇳' };
// 英语排首位（最大缺口）
const _SUBJ_ORDER = ['英语', '数学', '科学', '华文'];

function _abBarColor(acc) {
  if (acc === null || acc === undefined) return 'ab-bar-empty';
  return acc >= 75 ? 'ab-bar-good' : acc >= 55 ? 'ab-bar-mid' : 'ab-bar-weak';
}
function _abRowClass(acc) {
  if (acc === null || acc === undefined) return 'ab-empty';
  return acc >= 75 ? 'ab-good' : acc >= 55 ? 'ab-mid' : 'ab-weak';
}
function _abTrend(recent) {
  if (!recent || recent.length < 2) return '<span class="ab-trend" style="opacity:.3">→</span>';
  const last = recent[recent.length - 1].accuracy;
  const prev = recent[recent.length - 2].accuracy;
  if (last > prev + 0.03) return '<span class="ab-trend" style="color:var(--color-success)">↑</span>';
  if (last < prev - 0.03) return '<span class="ab-trend" style="color:var(--color-danger)">↓</span>';
  return '<span class="ab-trend" style="color:var(--color-text-light)">→</span>';
}
function _accToALShort(acc) {
  if (acc === null || acc === undefined) return '?';
  if (acc >= 90) return 'AL1'; if (acc >= 82) return 'AL2'; if (acc >= 74) return 'AL3';
  if (acc >= 65) return 'AL4'; if (acc >= 55) return 'AL5'; if (acc >= 44) return 'AL6';
  return 'AL7+';
}

// 板块1: AL 预测横向条
function _renderAbilityOverview(state) {
  const bySubj = window.getSubjectAccuracy ? window.getSubjectAccuracy(state) : {};
  const stats = state.gameStats || {};
  const rows = _SUBJ_ORDER.map(s => {
    const a = bySubj[s];
    const acc = a ? a.accuracy : null;
    const pct = acc !== null ? acc : 0;
    const al = _accToALShort(acc);
    const rc = _abRowClass(acc);
    const bc = _abBarColor(acc);
    // 聚合该科所有 game 的 recent 来算趋势
    const games = _SUBJ_GAME_ORDER[s] || [];
    const allRecent = games.flatMap(g => (stats[g] && stats[g].recent) || []);
    const trend = _abTrend(allRecent.length > 0 ? allRecent.slice(-2) : []);
    const label = acc !== null
      ? `<span style="font-weight:700">${acc}%</span> <small style="color:var(--color-text-light)">答对${a.correct}/${a.total}题 · ${a.runs}局</small>`
      : '<span style="color:var(--color-text-light);font-size:12px">暂无数据</span>';
    return `
      <div class="ab-subj-row ${rc}">
        <div class="ab-subj-name">${_SUBJ_ICONS[s]} ${s}</div>
        <div class="ab-subj-al">${al}</div>
        <div class="ab-subj-bar-wrap"><div class="ab-subj-bar ${bc}" style="width:${pct}%"></div></div>
        <div class="ab-subj-pct">${label}</div>
        ${trend}
      </div>`;
  }).join('');
  return `<div class="ab-section">
    <div class="ab-section-title">🎯 各科 AL 预测</div>
    ${rows}
    <div style="font-size:11px;color:var(--color-text-light);margin-top:4px">AL1=90%+ · AL2=82%+ · AL4=65%+ · AL6=44%+（基于 mini-game 实战）</div>
  </div>`;
}

// 板块2: 每科游戏正确率明细
function _renderGameBreakdown(state) {
  const stats = state.gameStats || {};
  const sections = _SUBJ_ORDER.map(s => {
    const games = _SUBJ_GAME_ORDER[s] || [];
    if (games.length === 0) return '';
    const bySubj = window.getSubjectAccuracy ? window.getSubjectAccuracy(state) : {};
    const sa = bySubj[s];
    const summaryTag = sa
      ? `<span style="font-size:12px;font-weight:700;color:${sa.accuracy>=75?'var(--color-success)':sa.accuracy>=55?'var(--color-warn)':'var(--color-danger)'}">${sa.accuracy}%</span>`
      : '<span style="font-size:12px;color:var(--color-text-light)">暂无数据</span>';
    const rows = games.map(g => {
      const gs = stats[g];
      const recent = gs ? gs.recent : [];
      if (recent.length === 0) {
        return `<div class="ab-game-row">
          <div class="ab-game-name">${_GAME_LABELS[g] || g}</div>
          <div class="ab-game-bar-wrap"><div class="ab-game-bar ab-bar-empty" style="width:0%"></div></div>
          <div class="ab-game-pct" style="color:var(--color-text-light)">—</div>
          <div class="ab-game-detail ab-no-data">尚无数据</div>
          <div class="ab-game-trend"></div>
        </div>`;
      }
      const correct = recent.reduce((s, r) => s + r.correct, 0);
      const total = recent.reduce((s, r) => s + r.total, 0);
      const acc = total > 0 ? Math.round(correct / total * 100) : 0;
      const bc = _abBarColor(acc);
      const pctColor = acc >= 75 ? 'var(--color-success)' : acc >= 55 ? 'var(--color-warn)' : 'var(--color-danger)';
      const trend = _abTrend(recent);
      const warnTag = acc < 55 ? ' <span style="color:var(--color-danger);font-size:11px">⚠重点弱项</span>' : acc < 70 ? ' <span style="color:var(--color-warn);font-size:11px">需提升</span>' : '';
      return `<div class="ab-game-row">
        <div class="ab-game-name">${_GAME_LABELS[g] || g}${warnTag}</div>
        <div class="ab-game-bar-wrap"><div class="ab-game-bar ${bc}" style="width:${acc}%"></div></div>
        <div class="ab-game-pct" style="color:${pctColor}">${acc}%</div>
        <div class="ab-game-detail">${correct}/${total} · ${recent.length}局</div>
        ${trend}
      </div>`;
    }).join('');
    return `<div class="ab-game-group">
      <div class="ab-game-header">
        <span>${_SUBJ_ICONS[s]} ${s}</span>${summaryTag}
      </div>
      ${rows}
    </div>`;
  }).join('');
  return `<div class="ab-section">
    <div class="ab-section-title">📊 各游戏正确率明细</div>
    ${sections || '<div class="ab-empty-hint">📭 还没有 mini-game 数据，先玩 1 局解锁</div>'}
  </div>`;
}

// 板块3: 知识树各科⭐进度
function _renderKnowledgeTreeSummary(state) {
  const ks = state.knowledgeStars || {};
  const ke = state.knowledgeExplored || {};
  const cw = state.currentWeek || 1;
  const kt = window.KNOWLEDGE_TREE;
  if (!kt) return '';
  const subjOrder = ['🔬 科学', '📖 英语', '➗ 数学', '🇨🇳 华文'];
  // 匹配 KNOWLEDGE_TREE 的 key 前缀
  const subjMap = { '🔬 科学': '科学', '📖 英语': '英语', '➗ 数学': '数学', '🇨🇳 华文': '华文' };
  const blocks = Object.keys(kt).map(ktKey => {
    const nodes = kt[ktKey];
    if (!nodes || nodes.length === 0) return '';
    let totalStars = 0, maxStars = 0, mastered = 0;
    const nodeRows = nodes.map(n => {
      const isUnlocked = !n.weeks || n.weeks[0] <= cw;
      const entry = ks[n.id];
      const stars = entry ? (entry.stars || 0) : 0;
      const bestScore = entry ? (entry.bestScore || 0) : 0;
      const attempts = entry ? (entry.attempts || 0) : 0;
      const explored = !!ke[n.id];
      if (isUnlocked) { totalStars += stars; maxStars += 3; if (stars === 3) mastered++; }
      const starStr = isUnlocked
        ? ('★').repeat(stars) + ('☆').repeat(3 - stars)
        : '🔒';
      const starColor = stars === 3 ? 'var(--color-success)' : stars > 0 ? 'var(--color-warn)' : 'var(--color-text-light)';
      const statusTag = !isUnlocked ? '<span class="ab-kt-status" style="color:var(--color-text-light)">待解锁</span>'
        : stars === 3 ? '<span class="ab-kt-status" style="color:var(--color-success)">已掌握</span>'
        : explored && stars > 0 ? '<span class="ab-kt-status" style="color:var(--color-warn)">练习中</span>'
        : explored ? '<span class="ab-kt-status" style="color:var(--color-accent)">已探索</span>'
        : '<span class="ab-kt-status" style="color:var(--color-text-light)">未开始</span>';
      const scoreText = isUnlocked && attempts > 0 ? `最佳 ${bestScore}/3 · ${attempts}次` : '';
      const lockedClass = isUnlocked ? '' : 'ab-kt-locked';
      return `<div class="ab-kt-node ${lockedClass}">
        <div class="ab-kt-stars" style="color:${starColor}">${starStr}</div>
        <div class="ab-kt-name">${n.icon || ''} ${n.name}</div>
        <div class="ab-kt-score">${scoreText}</div>
        ${statusTag}
      </div>`;
    }).join('');
    const pct = maxStars > 0 ? Math.round(totalStars / maxStars * 100) : 0;
    const unlockedTotal = nodes.filter(n => !n.weeks || n.weeks[0] <= cw).length;
    return `<div class="ab-kt-subject">
      <div class="ab-kt-header">
        <span>${ktKey}</span>
        <span style="font-size:12px;color:var(--color-text-light)">${mastered}/${unlockedTotal} 已掌握 · ⭐${totalStars}/${maxStars} · ${pct}%</span>
      </div>
      ${nodeRows}
    </div>`;
  }).join('');
  return `<div class="ab-section">
    <div class="ab-section-title">🌳 知识树⭐达成情况</div>
    ${blocks}
  </div>`;
}

// 板块4: 错题本归类分析
function _renderErrorBankAnalysis(state) {
  const errors = state.wrongAnswers || [];
  if (errors.length === 0) {
    return `<div class="ab-section">
      <div class="ab-section-title">📚 错题本分析</div>
      <div class="ab-empty-hint">🎉 错题本为空——保持！答错的题会自动收录</div>
    </div>`;
  }
  // 按 gameKey 分组
  const byGame = {};
  errors.forEach(w => {
    const g = w.gameKey || '其他';
    if (!byGame[g]) byGame[g] = { count: 0, items: [], retries: 0 };
    byGame[g].count++;
    byGame[g].items.push(w);
    byGame[g].retries += (w.retries || 0);
  });
  const maxCount = Math.max(...Object.values(byGame).map(x => x.count));
  const sorted = Object.keys(byGame).sort((a, b) => byGame[b].count - byGame[a].count);
  const bars = sorted.map(g => {
    const d = byGame[g];
    const pct = Math.round(d.count / maxCount * 100);
    const label = _GAME_LABELS[g] || g;
    const pctOfTotal = Math.round(d.count / errors.length * 100);
    return `<div class="ab-err-bar-row">
      <div class="ab-err-game">${label}</div>
      <div class="ab-err-bar-wrap"><div class="ab-err-bar" style="width:${pct}%"></div></div>
      <div class="ab-err-cnt">${d.count}题 <span style="color:var(--color-text-light)">(${pctOfTotal}%)</span></div>
    </div>`;
  }).join('');
  // 按知识树节点再聚合
  const byNode = {};
  errors.forEach(w => {
    if (w.nodeId) { byNode[w.nodeId] = (byNode[w.nodeId] || 0) + 1; }
  });
  const kt = window.KNOWLEDGE_TREE;
  const nodeNames = {};
  if (kt) Object.values(kt).forEach(nodes => nodes.forEach(n => { nodeNames[n.id] = n.name; }));
  const topNodes = Object.keys(byNode).sort((a, b) => byNode[b] - byNode[a]).slice(0, 3);
  const nodeHtml = topNodes.length > 0
    ? `<div style="margin-top:8px;font-size:12px;color:var(--color-text-light)">
        💡 知识点薄弱: ${topNodes.map(id => `<b>${nodeNames[id] || id}</b>(${byNode[id]}题)`).join(' · ')}
       </div>` : '';
  return `<div class="ab-section">
    <div class="ab-section-title">📚 错题本 — 共 ${errors.length} 题</div>
    <div style="background:var(--color-card);border-radius:10px;padding:8px 0">${bars}</div>
    ${nodeHtml}
  </div>`;
}

// 板块5: 改进建议 + 下周计划（数据驱动）
function _renderImprovementPlan(state) {
  const stats = state.gameStats || {};
  const errors = state.wrongAnswers || [];
  const bySubj = window.getSubjectAccuracy ? window.getSubjectAccuracy(state) : {};
  const week = state.currentWeek || 1;

  // 找出所有游戏正确率，排序
  const gameAccs = [];
  Object.keys(_GAME_LABELS).forEach(g => {
    const gs = stats[g];
    if (!gs || !gs.recent || gs.recent.length === 0) return;
    const recent = gs.recent;
    const correct = recent.reduce((s, r) => s + r.correct, 0);
    const total = recent.reduce((s, r) => s + r.total, 0);
    const acc = total > 0 ? Math.round(correct / total * 100) : 0;
    const errCnt = errors.filter(w => w.gameKey === g).length;
    gameAccs.push({ g, acc, runs: recent.length, errCnt, subj: window.SUBJECT_OF_GAME ? window.SUBJECT_OF_GAME[g] : '?' });
  });
  gameAccs.sort((a, b) => a.acc - b.acc);  // 正确率最低排前

  // 找出知识树空缺
  const ks = state.knowledgeStars || {};
  const ke = state.knowledgeExplored || {};
  const kt = window.KNOWLEDGE_TREE;
  let unstarted = 0, practicing = 0;
  if (kt) {
    Object.values(kt).forEach(nodes => nodes.forEach(n => {
      if (!n.weeks || n.weeks[0] <= week) {
        const stars = (ks[n.id] && ks[n.id].stars) || 0;
        if (!ke[n.id]) unstarted++;
        else if (stars < 3) practicing++;
      }
    }));
  }

  if (gameAccs.length === 0) {
    return `<div class="ab-section">
      <div class="ab-section-title">🎯 改进建议</div>
      <div class="ab-empty-hint">📭 先玩几局 mini-game，系统生成专属建议</div>
    </div>`;
  }

  const items = [];
  // 优先级 1: 最弱游戏（正确率 < 60%）
  const weakGames = gameAccs.filter(x => x.acc < 60).slice(0, 2);
  weakGames.forEach(x => {
    const errText = x.errCnt > 0 ? `错题本有 ${x.errCnt} 题待复习` : '';
    items.push({ icon: '🔴', title: `优先攻: ${_GAME_LABELS[x.g] || x.g} — 正确率 ${x.acc}%（最弱）`,
      body: `每天做 1 局，目标: 连续 3 局 ≥65%。${errText ? '<br>→ ' + errText : ''}` });
  });
  // 优先级 2: 接近目标（60-72%）
  const midGames = gameAccs.filter(x => x.acc >= 60 && x.acc < 73).slice(0, 2);
  midGames.forEach(x => {
    items.push({ icon: '🟡', title: `巩固: ${_GAME_LABELS[x.g] || x.g} — ${x.acc}%（距目标 73% 还差 ${73 - x.acc}%）`,
      body: `隔天做 1 局，重点攻${x.subj}专题知识点。` });
  });
  // 优先级 3: 维持优势
  const strongSubjs = Object.keys(bySubj).filter(s => bySubj[s].accuracy >= 80);
  if (strongSubjs.length > 0) {
    items.push({ icon: '🟢', title: `维持: ${strongSubjs.join(' / ')} — 已达 AL4 目标区`,
      body: '每周 2 局保持手感即可，把时间投入弱项。' });
  }
  // 知识树提示
  if (unstarted > 0 || practicing > 0) {
    items.push({ icon: '🌳', title: `知识树: ${unstarted} 个节点未开始，${practicing} 个练习中`,
      body: `W${week} 优先解锁与当前弱项同主题的节点，看讲解 + 做练习冲⭐。` });
  }

  const html = items.map(it => `
    <div class="ab-plan-item">
      <div class="ab-plan-icon">${it.icon}</div>
      <div class="ab-plan-body">
        <div class="ab-plan-title">${it.title}</div>
        <div>${it.body}</div>
      </div>
    </div>`).join('');

  return `<div class="ab-section">
    <div class="ab-section-title">🎯 下周提升计划（数据驱动）</div>
    ${html}
  </div>`;
}

function renderPsleAbilityCard() {
  const el = document.getElementById('psleAbilityContent');
  if (!el) return;
  el.innerHTML =
    _renderAbilityOverview(state) +
    _renderGameBreakdown(state) +
    _renderKnowledgeTreeSummary(state) +
    _renderImprovementPlan(state);
  renderRadarChart();
}

// v19.3: 能力雷达图 (SVG, 模考分数驱动)
function renderRadarChart() {
  const el = document.getElementById('radarChart');
  if (!el) return;
  const scores = state.scores || {};
  const subjects = ['英语', '科学', '数学', '华文'];
  const subjectKeys = ['english', 'science', 'math', 'chinese'];
  const vals = subjectKeys.map(k => {
    const arr = (scores[k] || []).map(s => s.score / s.max * 100);
    return arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 50;
  });
  const cx = 100, cy = 100, r = 70;
  const angles = vals.map((_, i) => (Math.PI * 2 * i / vals.length) - Math.PI / 2);
  const points = vals.map((v, i) => {
    const rr = r * v / 100;
    return `${cx + rr * Math.cos(angles[i])},${cy + rr * Math.sin(angles[i])}`;
  }).join(' ');
  const gridLines = [25, 50, 75, 100].map(pct => {
    const gr = r * pct / 100;
    const gpts = angles.map(a => `${cx + gr * Math.cos(a)},${cy + gr * Math.sin(a)}`).join(' ');
    return `<polygon points="${gpts}" fill="none" stroke="rgba(255,255,255,0.1)" stroke-width="0.5"/>`;
  }).join('');
  const labels = subjects.map((s, i) => {
    const lr = r + 16;
    const x = cx + lr * Math.cos(angles[i]);
    const y = cy + lr * Math.sin(angles[i]);
    return `<text x="${x}" y="${y}" text-anchor="middle" fill="var(--color-text-light)" font-size="11">${s}</text>`;
  }).join('');
  el.innerHTML = `<svg width="200" height="200" viewBox="0 0 200 200">
    ${gridLines}
    <polygon points="${points}" fill="rgba(99,102,241,0.25)" stroke="#6366F1" stroke-width="2"/>
    ${labels}
  </svg>
  <div style="font-size:11px;color:var(--color-text-light);margin-top:4px">基于模考/真题成绩,未录入科目默认 50%</div>`;
}

// ============ 各科分数追踪(v4 历史页新增)============
function renderScoreTracking() {
  const container = document.getElementById('scoreTracking');
  if (!container) return;
  const agg = aggregateScores(state);
  if (agg.items.length === 0) {
    container.innerHTML = `<p style="color: var(--color-text-light); font-style: italic; padding: 16px; text-align: center;">📭 还没记录任何分数。在 ✅ 打卡页每个项目卡片上点 📊 输入分数</p>`;
    return;
  }

  // 1) 各科累计平均(7 类,涵盖 v14/v16 全 73 周内容)
  const subjectsOrdered = ['🔬 科学', '📖 英语阅读/词汇', '✏️ 英语写作/语法', '🗣️ 听力口试', '➗ 数学', '🇨🇳 华文', '📓 复盘/里程碑'];
  const subjectCards = subjectsOrdered
    .filter(s => agg.bySubject[s])
    .map(s => {
      const x = agg.bySubject[s];
      const color = x.avgPct >= 85 ? 'var(--color-success)' : x.avgPct >= 70 ? 'var(--color-warn)' : 'var(--color-danger)';
      return `
        <div class="score-subj-card">
          <div class="score-subj-name">${escapeHtml(s)}</div>
          <div class="score-subj-avg" style="color:${color}">${x.avgPct}%</div>
          <div class="score-subj-frac">${x.count} 项 · ${x.sum}/${x.max}</div>
        </div>
      `;
    }).join('');

  // 2) 弱项警示
  const weakHtml = agg.weakest
    ? `<div class="score-weak-banner">⚠️ 当前弱项: <b>${escapeHtml(agg.weakest.subtype)}</b> 平均 ${agg.weakest.avgPct}% (${agg.weakest.count} 次记录)。建议重点补漏</div>`
    : '';

  // 3) 各项明细 (按子类型)
  const subtypes = Object.keys(agg.bySubtype).sort((a, b) => agg.bySubtype[a].avgPct - agg.bySubtype[b].avgPct);
  const subtypeRows = subtypes.map(st => {
    const x = agg.bySubtype[st];
    const color = x.avgPct >= 85 ? 'var(--color-success)' : x.avgPct >= 70 ? 'var(--color-warn)' : 'var(--color-danger)';
    const latest = x.latest;
    return `
      <tr>
        <td><b>${escapeHtml(st)}</b></td>
        <td>${x.count} 次</td>
        <td style="color:${color};font-weight:700">${x.avgPct}%</td>
        <td>${x.sum}/${x.max}</td>
        <td style="font-size:11px;color:var(--color-text-light)">最近 W${latest.week} ${latest.score}/${latest.max}</td>
      </tr>
    `;
  }).join('');

  // 4) 周趋势(各科按周平均%)
  const weeksWithScores = Object.keys(agg.byWeekSubject).map(Number).sort((a, b) => a - b);
  const weeklyTrend = weeksWithScores.map(w => {
    const cells = subjectsOrdered.map(s => {
      const x = agg.byWeekSubject[w][s];
      if (!x) return '<td>-</td>';
      const color = x.avgPct >= 85 ? '#6BCB77' : x.avgPct >= 70 ? '#FF9F45' : '#FF5757';
      return `<td style="background:${color};color:white;font-weight:700">${x.avgPct}%</td>`;
    }).join('');
    return `<tr><td><b>W${w}</b></td>${cells}</tr>`;
  }).join('');
  const weeklyHeader = subjectsOrdered.map(s => `<th>${escapeHtml(s.split(' ')[0])}</th>`).join('');

  // 5) 月度统计(每 4 周一组)
  const monthsWithScores = Object.keys(agg.byMonth).map(Number).sort((a, b) => a - b);
  const monthlyHtml = monthsWithScores.map(m => {
    const startW = (m - 1) * 4 + 1, endW = m * 4;
    const cells = subjectsOrdered.map(s => {
      const x = agg.byMonth[m][s];
      if (!x) return '-';
      return `${escapeHtml(s.split(' ')[1] || s)} ${x.avgPct}%`;
    }).filter(c => c !== '-').join(' / ');
    return `<div class="month-row"><b>第 ${m} 月 (W${startW}-W${endW})</b>: ${cells || '无记录'}</div>`;
  }).join('');

  container.innerHTML = `
    <div class="score-overview">${subjectCards}</div>
    ${weakHtml}
    <div class="card-title" style="font-size:14px;margin-top:12px">📑 各项类型表现 (按薄弱排序)</div>
    <div style="overflow-x:auto">
      <table class="history-table">
        <thead><tr><th>类型</th><th>次数</th><th>平均</th><th>累计</th><th>最近</th></tr></thead>
        <tbody>${subtypeRows}</tbody>
      </table>
    </div>
    ${weeksWithScores.length > 0 ? `
      <div class="card-title" style="font-size:14px;margin-top:12px">📅 各周分科平均 %</div>
      <div style="overflow-x:auto">
        <table class="history-table">
          <thead><tr><th>周</th>${weeklyHeader}</tr></thead>
          <tbody>${weeklyTrend}</tbody>
        </table>
      </div>` : ''}
    ${monthsWithScores.length > 0 ? `
      <div class="card-title" style="font-size:14px;margin-top:12px">📈 月度提升趋势</div>
      <div class="month-trend">${monthlyHtml}</div>` : ''}
  `;
}

function drawChart() {
  const canvas = document.getElementById('pointsChart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const w = canvas.width = canvas.parentElement.clientWidth - 40;
  const h = canvas.height = 240;

  ctx.clearRect(0, 0, w, h);

  const dataPoints = [];
  let acc = 0;
  for (let week = 1; week <= 73; week++) {
    acc += calcWeekPoints(week);
    if (week <= state.currentWeek) {
      dataPoints.push(acc);
    }
  }
  state.logs.forEach(log => {
    if (log.week && log.week <= state.currentWeek && dataPoints[log.week - 1] !== undefined) {
      for (let w = log.week - 1; w < dataPoints.length; w++) {
        dataPoints[w] += log.points;
      }
    }
  });

  const padding = { top: 20, right: 20, bottom: 30, left: 40 };
  const chartW = w - padding.left - padding.right;
  const chartH = h - padding.top - padding.bottom;

  const maxPts = Math.max(370, ...dataPoints, 50);
  const minPts = Math.min(0, ...dataPoints);

  ctx.strokeStyle = '#f0f0f0';
  ctx.lineWidth = 1;
  for (let i = 0; i <= 5; i++) {
    const y = padding.top + (chartH * i / 5);
    ctx.beginPath();
    ctx.moveTo(padding.left, y);
    ctx.lineTo(w - padding.right, y);
    ctx.stroke();

    const val = Math.round(maxPts - (maxPts - minPts) * i / 5);
    ctx.fillStyle = '#999';
    ctx.font = '10px sans-serif';
    ctx.fillText(val, 5, y + 3);
  }

  ctx.strokeStyle = '#FFE66D';
  ctx.setLineDash([4, 4]);
  ctx.lineWidth = 2;
  KEY_WEEKS.forEach(week => {
    const x = padding.left + (chartW * (week - 1) / 72);
    ctx.beginPath();
    ctx.moveTo(x, padding.top);
    ctx.lineTo(x, h - padding.bottom);
    ctx.stroke();

    ctx.fillStyle = '#FF9F45';
    ctx.font = 'bold 10px sans-serif';
    ctx.fillText(`W${week}`, x - 8, h - 12);
  });
  ctx.setLineDash([]);

  if (dataPoints.length > 0) {
    ctx.strokeStyle = '#FF6B6B';
    ctx.lineWidth = 3;
    ctx.beginPath();
    dataPoints.forEach((pt, idx) => {
      const x = padding.left + (chartW * idx / 72);
      const y = padding.top + chartH * (1 - (pt - minPts) / (maxPts - minPts));
      if (idx === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    dataPoints.forEach((pt, idx) => {
      const x = padding.left + (chartW * idx / 72);
      const y = padding.top + chartH * (1 - (pt - minPts) / (maxPts - minPts));
      ctx.fillStyle = '#FF6B6B';
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'white';
      ctx.beginPath();
      ctx.arc(x, y, 2, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  ctx.fillStyle = '#2D3047';
  ctx.font = 'bold 12px sans-serif';
  ctx.fillText('累积积分', padding.left, 14);
}

// 渲染当前周作业照片 gallery(管理页)
async function renderPhotoGallery(weekNum) {
  const container = document.getElementById('photoGallery');
  if (!container) return;
  const wt = getWeekTasks(weekNum);
  if (!wt) { container.innerHTML = '<p>无数据</p>'; return; }

  // 拉所有当前周的照片
  const cells = [];
  for (const day of DAY_KEYS) {
    const tasks = getDailyTasks(weekNum, day);
    for (const t of tasks) {
      if (hasPhotoCached(weekNum, day, t.slot)) {
        const rec = await photoGet(weekNum, day, t.slot);
        if (rec) {
          cells.push({
            day, slot: t.slot, task: t.task, time: t.time,
            url: URL.createObjectURL(rec.blob),
            size: rec.size, savedAt: rec.savedAt
          });
        }
      }
    }
  }

  if (cells.length === 0) {
    container.innerHTML = `<p style="color: var(--color-text-light); font-style: italic; padding: 16px; text-align: center;">📭 W${weekNum} 还没传任何作业照</p>`;
    return;
  }

  container.innerHTML = `
    <div class="gallery-meta">W${weekNum} · ${WEEK_DATES[weekNum - 1]} · 共 ${cells.length} 张照片</div>
    <div class="photo-gallery">
      ${cells.map(c => `
        <div class="gallery-cell" onclick="viewPhoto(${weekNum}, '${c.day}', '${c.slot}')">
          <img src="${c.url}" alt="${escapeAttr(c.task)}" loading="lazy">
          <div class="gallery-cap">
            <b>${DAY_LABELS[c.day]} ${c.slot}</b>
            <div class="gallery-task">${escapeHtml(c.task)}</div>
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

// ============ v19.2: 家长周审照片面板 ============
let _reviewWeek = null;
function renderParentReview(weekNum) {
  const container = document.getElementById('parentReviewPanel');
  if (!container) return;
  if (_reviewWeek === null) _reviewWeek = weekNum;
  const wk = _reviewWeek;

  const cp = state.cloudPhotos || {};
  // 找出所有有照片的周
  const allWeeks = [...new Set(Object.keys(cp).map(k => parseInt(k.split('_')[0])))].sort((a,b) => b-a);
  const totalPhotos = Object.keys(cp).length;
  const totalPending = Object.values(cp).filter(v => !v.reviewed).length;

  // 周导航栏
  let navHtml = `<div style="display:flex;align-items:center;gap:8px;margin-bottom:12px;flex-wrap:wrap">
    <button class="btn btn-secondary" style="font-size:12px;padding:3px 8px" onclick="_reviewPrevWeek()">◀</button>
    <span style="font-weight:700;font-size:14px">W${wk}</span>
    <button class="btn btn-secondary" style="font-size:12px;padding:3px 8px" onclick="_reviewNextWeek()">▶</button>
    <span style="font-size:12px;color:var(--color-text-light)">全部 ${totalPhotos} 张 · ${totalPending} 张待审</span>
  </div>`;

  const weekPrefix = `${wk}_`;
  const entries = Object.entries(cp).filter(([k]) => k.startsWith(weekPrefix));

  if (entries.length === 0) {
    container.innerHTML = navHtml + `<p style="color:var(--color-text-light);font-style:italic;text-align:center;padding:16px">☁️ W${wk} 还没有云端照片</p>`;
    return;
  }

  const pending = entries.filter(([, v]) => !v.reviewed);
  const reviewed = entries.filter(([, v]) => v.reviewed);

  let html = navHtml + `<div style="margin-bottom:12px;font-size:13px;color:var(--color-text-light)">W${wk} · 共 ${entries.length} 张 · <b style="color:var(--color-primary)">${pending.length} 张待审</b></div>`;

  if (pending.length > 0) {
    html += `<div class="photo-gallery" style="margin-bottom:16px">`;
    pending.forEach(([key, info]) => {
      const parts = key.split('_');
      const week = parseInt(parts[0]);
      const day = parts[1];
      const slot = parts.slice(2).join('_');
      const tasks = getDailyTasks(week, day);
      const t = tasks.find(x => x.slot === slot);
      const taskText = t ? t.task : slot;
      const uploadDate = new Date(info.uploadedAt).toLocaleString('zh-CN', { month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit' });
      html += `
        <div class="gallery-cell" style="border:3px solid var(--color-primary);position:relative">
          <img src="${info.url}" alt="${escapeAttr(taskText)}" loading="lazy" style="cursor:pointer" onclick="window.open('${info.url}','_blank')">
          <div class="gallery-cap">
            <b>${DAY_LABELS[day] || day} ${slot}</b>
            <div class="gallery-task">${escapeHtml(taskText)}</div>
            <div style="font-size:11px;color:var(--color-text-light)">${uploadDate}</div>
          </div>
          <div style="display:flex;gap:6px;padding:6px;justify-content:center">
            <button class="btn btn-success" style="font-size:12px;padding:4px 10px" onclick="_parentApprove(${week},'${day}','${slot}')">✅ 通过</button>
            <button class="btn btn-danger" style="font-size:12px;padding:4px 10px" onclick="_parentReject(${week},'${day}','${slot}')">❌ 驳回</button>
          </div>
        </div>`;
    });
    html += `</div>`;
  }

  if (reviewed.length > 0) {
    html += `<details style="margin-top:8px"><summary style="cursor:pointer;font-size:13px;color:var(--color-text-light)">已审核 (${reviewed.length} 张)</summary><div class="photo-gallery" style="margin-top:8px">`;
    reviewed.forEach(([key, info]) => {
      const parts = key.split('_');
      const week = parseInt(parts[0]);
      const day = parts[1];
      const slot = parts.slice(2).join('_');
      const tasks = getDailyTasks(week, day);
      const t = tasks.find(x => x.slot === slot);
      const taskText = t ? t.task : slot;
      const badge = info.rejected
        ? `<span style="color:var(--color-danger);font-weight:700">❌ 驳回</span>${info.rejectReason ? ` · ${escapeHtml(info.rejectReason)}` : ''}`
        : `<span style="color:var(--color-success);font-weight:700">✅ 通过</span>`;
      html += `
        <div class="gallery-cell" style="border:2px solid ${info.rejected ? 'var(--color-danger)' : 'var(--color-success)'};opacity:0.85">
          <img src="${info.url}" alt="${escapeAttr(taskText)}" loading="lazy" onclick="window.open('${info.url}','_blank')" style="cursor:pointer">
          <div class="gallery-cap">
            <b>${DAY_LABELS[day] || day} ${slot}</b> · ${badge}
            <div class="gallery-task">${escapeHtml(taskText)}</div>
          </div>
        </div>`;
    });
    html += `</div></details>`;
  }

  container.innerHTML = html;
}

function _parentApprove(week, day, slot) {
  if (!requireAdminAuth()) return;
  window.approveCloudPhoto(week, day, slot);
  showToast('✅ 已通过审核', 'success');
}

function _parentReject(week, day, slot) {
  if (!requireAdminAuth()) return;
  const reason = prompt('驳回原因(可留空):') || '';
  const tasks = getDailyTasks(week, day);
  const t = tasks.find(x => x.slot === slot);
  const taskText = t ? t.task : slot;
  const pts = slotPoints(week, slot);
  window.rejectCloudPhoto(week, day, slot, reason);
  showToast(`❌ 已驳回「${taskText}」— 扣除 ${pts} 分`, 'danger');
}

window._parentApprove = _parentApprove;
window._parentReject = _parentReject;

function _reviewPrevWeek() {
  if (_reviewWeek > 1) { _reviewWeek--; renderParentReview(_reviewWeek); }
}
function _reviewNextWeek() {
  if (_reviewWeek < 73) { _reviewWeek++; renderParentReview(_reviewWeek); }
}
window._reviewPrevWeek = _reviewPrevWeek;
window._reviewNextWeek = _reviewNextWeek;

// ============ 管理页 ============
function renderAdminPage() {
  // v19.3: 积分完整性校验展示
  const integrityEl = document.getElementById('adminIntegrity');
  if (integrityEl) {
    const v = verifyPointsIntegrity();
    integrityEl.innerHTML = `
      <div style="padding:10px 12px;border-radius:8px;background:${v.ok ? 'rgba(0,255,136,0.08)' : 'rgba(255,51,102,0.12)'};border:1px solid ${v.ok ? 'var(--color-success)' : 'var(--color-danger)'};margin-bottom:12px;font-size:13px;color:var(--color-text)">
        <b>${v.detail}</b><br>
        实际: ${v.actual} | 预期下限: ${v.expectedMin} | 终身: ${v.lifetime} | 差: +${v.drift}<br>
        <span style="color:var(--color-text-light)">slot基础=${v.slotCalc} + logs=${v.logTotal} | 日志${v.logCount}条</span>
      </div>`;
  }

  // 异步渲染照片 gallery
  renderPhotoGallery(state.currentWeek).catch(e => console.error(e));
  // v19.2: 家长周审面板
  renderParentReview(state.currentWeek);

  const logList = document.getElementById('adminLogList');
  if (state.logs.length === 0) {
    logList.innerHTML = '<p style="color: var(--color-text-light); font-style: italic;">暂无加分记录</p>';
    return;
  }

  const sorted = [...state.logs].sort((a, b) => b.timestamp - a.timestamp);
  logList.innerHTML = sorted.map((log, idx) => {
    const isAdd = log.points > 0;
    const date = new Date(log.timestamp).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
    return `
      <div style="background: var(--color-card); border: 1px solid rgba(255,255,255,0.15); border-radius: 8px; padding: 10px; margin-bottom: 6px; display: flex; justify-content: space-between; align-items: center; color: #FFFFFF;">
        <div>
          <b style="color:#FFFFFF;">${escapeHtml(log.reason)}</b><br>
          <span style="font-size: 11px; color: #94A3B8;">W${log.week} · ${date}</span>
        </div>
        <div style="display: flex; align-items: center; gap: 8px;">
          <span style="font-family: ZCOOL KuaiLe, cursive; font-size: 22px; color: ${isAdd ? 'var(--color-success)' : 'var(--color-danger)'};">${isAdd ? '+' : ''}${log.points}</span>
          <button class="btn btn-secondary" style="font-size: 11px; padding: 4px 8px;" onclick="deleteLog(${state.logs.indexOf(log)})">删</button>
        </div>
      </div>
    `;
  }).join('');
}

// ============ v16: 家长密码门控 ============
// 父母管理页所有 加/减/删 操作前调用 requireAdminAuth()
// 首次使用提示设置密码; 通过后 sessionStorage 缓存 15 分钟免重输
const ADMIN_AUTH_KEY = 'chamui_admin_auth_until';
const ADMIN_AUTH_TTL_MS = 15 * 60 * 1000;  // 15 分钟

function isAdminAuthed() {
  const until = parseInt(sessionStorage.getItem(ADMIN_AUTH_KEY) || '0', 10);
  return until > Date.now();
}

function clearAdminAuth() {
  sessionStorage.removeItem(ADMIN_AUTH_KEY);
}

// 返回 true 如果通过(已认证 / 输入正确 / 首次设置成功)
function requireAdminAuth() {
  if (isAdminAuthed()) return true;
  // 首次使用 — 没设密码,要求设置一个
  if (!state.adminPassword) {
    const pw1 = prompt('🔐 首次使用 — 请设置家长密码(用来保护加分/减分/删除操作):');
    if (!pw1 || pw1.length < 4) {
      showToast('密码至少 4 位,操作取消', 'sad');
      return false;
    }
    const pw2 = prompt('再输一次确认:');
    if (pw1 !== pw2) {
      showToast('两次密码不一致,操作取消', 'sad');
      return false;
    }
    state.adminPassword = pw1;
    saveState(state);
    sessionStorage.setItem(ADMIN_AUTH_KEY, String(Date.now() + ADMIN_AUTH_TTL_MS));
    showToast('✅ 家长密码已设置,15 分钟内免重输', 'happy');
    return true;
  }
  // 已设密码 — 提示输入
  const pw = prompt('🔐 请输入家长密码(15 分钟内免重输):');
  if (pw === null) return false;  // 用户取消
  if (pw !== state.adminPassword) {
    showToast('密码错误', 'sad');
    return false;
  }
  sessionStorage.setItem(ADMIN_AUTH_KEY, String(Date.now() + ADMIN_AUTH_TTL_MS));
  showToast('✅ 已认证,15 分钟内免重输', 'happy');
  return true;
}

function resetAdminPassword() {
  // 必须先用旧密码认证
  if (!requireAdminAuth()) return;
  const pw1 = prompt('🔐 新家长密码(至少 4 位):');
  if (!pw1 || pw1.length < 4) { showToast('密码至少 4 位,取消', 'sad'); return; }
  const pw2 = prompt('再输一次确认:');
  if (pw1 !== pw2) { showToast('两次不一致,取消', 'sad'); return; }
  state.adminPassword = pw1;
  saveState(state);
  clearAdminAuth();  // 强制下次重输,确保新密码生效
  showToast('✅ 家长密码已更新', 'happy');
}

function addPoints(reason, points) {
  // v16: 家长密码门控
  if (!requireAdminAuth()) return;
  const oldPoints = state.totalPoints;

  state.logs.push({
    reason,
    points,
    week: state.currentWeek,
    timestamp: Date.now()
  });

  if (reason === '老师反馈学习问题') {
    state.sadUntil = Date.now() + 24 * 60 * 60 * 1000;
  }
  if (reason === '4 周无问题奖励') {
    state.streakBonusCount = (state.streakBonusCount || 0) + 1;
  }
  if (reason === '月小测达标') {
    state.monthlyTestPass = (state.monthlyTestPass || 0) + 1;
  }
  if (!state.milestones) state.milestones = {};
  if (reason.includes('W14')) state.milestones.W14 = true;
  if (reason.includes('W20')) state.milestones.W20 = true;
  if (reason.includes('W26')) state.milestones.W26 = true;
  // v5: 新增二三阶段 + PSLE 三大考
  if (reason.includes('W42')) state.milestones.W42 = true;
  if (reason.includes('W52')) state.milestones.W52 = true;
  if (reason.includes('W65')) state.milestones.W65 = true;
  if (reason.includes('W68')) state.milestones.W68 = true;
  if (reason.includes('W72')) state.milestones.W72 = true;
  if (reason.includes('W73')) state.milestones.W73 = true;

  recalcTotalPoints(state);
  saveState(state);

  if (points > 0) {
    showToast(`✨ ${reason} +${points} 分`, 'success');
    checkLevelUp(oldPoints, state.totalPoints);
  } else {
    showToast(`💔 ${reason} ${points} 分`, 'danger');
  }

  renderAll();
}

function deleteLog(idx) {
  // v16: 家长密码门控
  if (!requireAdminAuth()) return;
  if (!confirm('确定删除这条加分记录?')) return;
  state.logs.splice(idx, 1);
  recalcTotalPoints(state);
  saveState(state);
  renderAll();
  showToast('已删除', 'warn');
}

// ============ 兑换 ============
function addExchange() {
  const item = prompt('兑换的礼物名称?');
  if (!item) return;
  const points = parseInt(prompt('用了多少积分?'));
  if (isNaN(points) || points <= 0) return;
  if (points > state.totalPoints) {
    if (!confirm(`积分不够(当前 ${state.totalPoints} 分),仍要记录吗?`)) return;
  }
  // 单次终极大奖封顶 SGD 1500 (= 30000 积分 @ 0.05/分)
  const SGD = points * (window.SGD_PER_POINT || 0.05);
  const CAP = window.ULTIMATE_PRIZE_SGD || 1500;
  const CAP_PTS = window.ULTIMATE_PRIZE_POINTS || 30000;
  if (SGD > CAP) {
    if (!confirm(`这次兑换 SGD ${SGD.toFixed(0)} 超过单次终极大奖封顶 SGD ${CAP} (=${CAP_PTS} 积分)。建议拆成多次。仍要继续?`)) return;
  }

  state.exchanges.push({
    item,
    points,
    date: new Date().toLocaleDateString('zh-CN'),
    timestamp: Date.now()
  });

  state.logs.push({
    reason: `兑换:${item}`,
    points: -points,
    week: state.currentWeek,
    timestamp: Date.now(),
    isExchange: true
  });

  recalcTotalPoints(state);
  saveState(state);
  renderAll();
  showToast(`🎁 已兑换:${item}`, 'success');
}

function deleteExchange(idx) {
  if (!confirm('删除这条兑换记录会退回积分,确定?')) return;
  const ex = state.exchanges[idx];
  state.exchanges.splice(idx, 1);
  const logIdx = state.logs.findIndex(l => l.isExchange && l.reason === `兑换:${ex.item}` && l.points === -ex.points);
  if (logIdx >= 0) state.logs.splice(logIdx, 1);
  recalcTotalPoints(state);
  saveState(state);
  renderAll();
}

// ============ 升级动画 ============
function checkLevelUp(oldPoints, newPoints) {
  const oldLv = CHAMUI.getLevelInfo(oldPoints).lv;
  const newLv = CHAMUI.getLevelInfo(newPoints).lv;
  if (newLv > oldLv) {
    showLevelUpAnimation(newLv);
  }
}

function showLevelUpAnimation(newLevel) {
  const levelInfo = CHAMUI.levels[newLevel - 1];
  const overlay = document.createElement('div');
  overlay.className = 'level-up-overlay';
  overlay.innerHTML = `
    <div class="level-up-card">
      <div class="level-up-title">🎉 升 级 啦!</div>
      <div class="level-up-subtitle">Lv ${newLevel} · ${levelInfo.name}</div>
      <div style="font-size: 14px; margin-top: 8px; color: var(--color-text);">${levelInfo.title}</div>
    </div>
  `;
  document.body.appendChild(overlay);
  // 升级 = 最大高潮:震屏 + 100 撒花 + 大 +N
  shakeScreen();
  spawnConfetti(window.innerWidth / 2, window.innerHeight / 2, 100);
  setTimeout(() => spawnConfetti(window.innerWidth / 4, window.innerHeight / 2, 40), 200);
  setTimeout(() => spawnConfetti(window.innerWidth * 3 / 4, window.innerHeight / 2, 40), 400);
  setTimeout(() => {
    overlay.style.opacity = '0';
    overlay.style.transition = 'opacity 0.4s';
    setTimeout(() => overlay.remove(), 400);
  }, 2500);
}

// ============ Toast ============
function showToast(msg, type = 'success') {
  const t = document.createElement('div');
  const isCrit = type === 'crit';
  t.className = `toast ${isCrit ? 'crit' : type}`;
  t.textContent = msg;
  if (isCrit) t.style.fontSize = '18px';
  document.getElementById('toastContainer').appendChild(t);
  setTimeout(() => {
    t.style.opacity = '0';
    t.style.transition = 'opacity 0.3s';
    setTimeout(() => t.remove(), 300);
  }, isCrit ? 4000 : 2200);
}

// ============ 工具 ============
function exportData() {
  const json = JSON.stringify(state, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `chamui_psle_${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('📥 数据已导出', 'success');
}

function importData(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const imported = JSON.parse(e.target.result);
      if (!confirm('导入会覆盖当前数据,确定继续吗?')) return;
      state = Object.assign(getDefaultState(), imported);
      if (!state.daily) state.daily = {};
      if (!state.scores) state.scores = {};
      recalcTotalPoints(state);
      saveState(state);
      renderAll();
      showToast('📤 数据已导入', 'success');
    } catch (e) {
      showToast('❌ 导入失败:文件格式错误', 'danger');
    }
  };
  reader.readAsText(file);
  event.target.value = '';
}

function manualWeekChange() {
  const w = prompt('切换到第几周?(1-73)', state.currentWeek);
  const week = parseInt(w);
  if (isNaN(week) || week < 1 || week > 73) {
    showToast('❌ 周数无效', 'danger');
    return;
  }
  state.currentWeek = week;
  // 切周后默认选今天(若在该周内)否则 Mon
  selectedDay = todayDayKeyForWeek(week) || 'Mon';
  saveState(state);
  renderAll();
  showToast(`✅ 已切换到第 ${week} 周`, 'success');
}

function resetData() {
  if (!confirm('⚠️ 这会删除所有数据(包括云端 Firestore 历史)!确定吗?')) return;
  if (!confirm('真的真的确定吗?这无法恢复!')) return;
  state = getDefaultState();
  saveState(state, { force: true });  // 用户明确要重置 → 绕过空默认值安全闸
  renderAll();
  showToast('🗑️ 数据已重置', 'warn');
}

// ============ 事件绑定 ============
function bindEvents() {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const page = btn.dataset.page;
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById(`page-${page}`).classList.add('active');

      if (page === 'history') {
        setTimeout(drawChart, 100);
      }
      if (page === 'knowledge') {
        renderKnowledgeTreePage();
      }
      if (page === 'essay') {
        renderEssayPage().catch(err => console.error('renderEssayPage', err));
      }
      if (page === 'paperbank') {
        renderPaperBankPage();
      }
      if (page === 'admin') {
        renderPhotoGallery(state.currentWeek).catch(() => {});
        // v18: 累加 admin 打开次数 (隐藏成就 hidden_admin)
        state.adminPageOpens = (state.adminPageOpens || 0) + 1;
        saveState(state);
        _checkAndUnlockAch();
      }
    });
  });

  document.getElementById('prevWeekBtn').addEventListener('click', () => {
    const viewW = _displayWeek || state.currentWeek;
    if (viewW > 1) {
      _displayWeek = viewW - 1;
      selectedDay = todayDayKeyForWeek(_displayWeek) || 'Mon';
      renderCheckinPage();
    }
  });
  document.getElementById('nextWeekBtn').addEventListener('click', () => {
    const viewW = _displayWeek || state.currentWeek;
    if (viewW < 73) {
      _displayWeek = viewW + 1;
      selectedDay = todayDayKeyForWeek(_displayWeek) || 'Mon';
      renderCheckinPage();
    }
  });
}

// 启动
init().catch(e => console.error('init 失败:', e));

// 暴露给全局(供 inline onclick 使用)
window.selectDay = selectDay;
window.toggleDailyCheck = toggleDailyCheck;
window.spawnFloatPoints = spawnFloatPoints;
window.spawnConfetti = spawnConfetti;
window.shakeScreen = shakeScreen;
window.pulseScoreBlock = pulseScoreBlock;
window.openReportModal = openReportModal;
window.printReport = printReport;
window.pickPhotoForSlot = pickPhotoForSlot;
window.viewPhoto = viewPhoto;
window.replacePhoto = replacePhoto;
window.deletePhoto = deletePhoto;
window.openScoreModal = openScoreModal;
window.saveScoreFromModal = saveScoreFromModal;
window.deleteScore = deleteScore;
window.showAdminHint = showAdminHint;
window.addPoints = addPoints;
window.deleteLog = deleteLog;
window.addExchange = addExchange;
window.deleteExchange = deleteExchange;
window.exportData = exportData;
window.importData = importData;
window.manualWeekChange = manualWeekChange;
window.resetData = resetData;
window.setActiveSkin = setActiveSkin;
window.showToast = showToast;
window.openVocabModal = openVocabModal;
window.closeVocabModal = closeVocabModal;
window.openListeningModal = openListeningModal;
window.closeListeningModal = closeListeningModal;
window.unlockListeningToday = unlockListeningToday;
window.toggleEquipment = toggleEquipment;
// v17.1
window.renderStreakBlock = renderStreakBlock;
// v17.5 Phase 2
window.openMysteryBoxModal = openMysteryBoxModal;
window.closeMysteryBoxResult = closeMysteryBoxResult;
window.submitThinkAnswer = submitThinkAnswer;
// v17.7 Phase 3
window.claimDailyQuest = claimDailyQuest;
// v17.7 Phase 4
window.openVocabGame = openVocabGame;
window.closeVocabGame = closeVocabGame;
window.vocabGameClickEn = vocabGameClickEn;
window.vocabGameClickZh = vocabGameClickZh;
// v18 Phase 5.1
window.openPetModal = openPetModal;
window.closePetModal = closePetModal;
window.renamePet = renamePet;
window.toggleAchWallExpanded = toggleAchWallExpanded;
window.closeAchievementUnlock = closeAchievementUnlock;
window.closeDailyDraw = closeDailyDraw;
// v18 Phase 5.3
window.submitReviewAnswer = submitReviewAnswer;
window.showFutureSelfModal = showFutureSelfModal;
window.closeFutureSelf = closeFutureSelf;
// v18 Phase 5.4
window.playSound = playSound;
window.openMiniGameHub = openMiniGameHub;
window.closeMiniGameHub = closeMiniGameHub;
window.openMathGame = openMathGame;
window.submitMathAnswer = submitMathAnswer;
window.closeMathGame = closeMathGame;
window.openEditingGame = openEditingGame;
window.clickEditingWord = clickEditingWord;
window.closeEditingGame = closeEditingGame;
window.openListenGame = openListenGame;
window.speakListenText = speakListenText;
window.submitListenAnswers = submitListenAnswers;
window.closeListenGame = closeListenGame;
// v17.6: Streak rules modal
window.showStreakRulesModal = function() {
  const m = document.getElementById('streakRulesModal');
  if (m) m.classList.add('show');
};
window.closeStreakRulesModal = function() {
  const m = document.getElementById('streakRulesModal');
  if (m) m.classList.remove('show');
};
window.requireAdminAuth = requireAdminAuth;
window.resetAdminPassword = resetAdminPassword;
window.clearAdminAuth = clearAdminAuth;
window.isAdminAuthed = isAdminAuthed;
