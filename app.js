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
  // v19.15c: 启动自动算 currentWeek (today vs WEEK_DATES, 不再依赖手动切换)
  if (window.computeCurrentWeekFromToday) {
    state.currentWeek = window.computeCurrentWeekFromToday();
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
  // v19.3: 每日 mini-game 局数重置
  const _today = new Date().toDateString();
  if (state._lastGameDate !== _today) { state._lastGameDate = _today; state.gameDailyCount = null; saveState(state); }
  // v19.4e: 如果复习队列为空，塞入种子复习项（确保新用户/清缓存后也有内容）
  if (!state.spacedRepetition || !state.spacedRepetition.reviews || Object.keys(state.spacedRepetition.reviews).length === 0) {
    state.spacedRepetition = { reviews: {} };
    const seeds = [
      { key: 'wow:eng_0', hook: 'PSLE Paper 2 顶端 10 分: Synthesis' },
      { key: 'wow:eng_1', hook: 'Phrasal Verbs 是 PSLE 必考' },
      { key: 'wow:eng_2', hook: 'Reported Speech 时态后移规则' },
      { key: 'think:5', hook: '科学: 食物链能量流动' }
    ];
    seeds.forEach(s => {
      state.spacedRepetition.reviews[s.key] = { firstSeen: Date.now() - 86400000 * 4, lastReviewed: Date.now() - 86400000 * 4, intervalDays: 3, correctStreak: 0 };
    });
    saveState(state);
  }
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
    // v19.9: 真考 18 道错题自动入错题本 (基于孩子 2026.5 Paper 2 真考批改)
    if (window.loadPaper2RealErrors) {
      const added = window.loadPaper2RealErrors(state);
      if (added > 0) {
        saveState(state);
        showToast(`📓 加载了 ${added} 道真考错题到错题本 — 优先复习!`, 'happy');
      }
    }
    // v19.11: 启动积分快照定时器 (每 10 min 备份 totalPoints + logs 到 Firestore + localStorage)
    if (window.startSnapshotTimer) {
      window.startSnapshotTimer(() => state);
    }
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
  // v19.15c: 每次重渲先同步 currentWeek (防 user 跨日打开 app 时 stale)
  if (window.computeCurrentWeekFromToday) {
    const newWeek = window.computeCurrentWeekFromToday();
    if (newWeek !== state.currentWeek) {
      state.currentWeek = newWeek;
      saveState(state);
    }
  }
  renderHeader();
  renderDashboard();
  renderCheckinPage();
  renderHistoryPage();
  renderAdminPage();
  // v19.14m bug 修: 我的 tab active 时刷新装备 grid (之前 toggleEquipment 后 grid 不更新)
  const charPageActive = document.getElementById('page-character');
  if (charPageActive && charPageActive.classList.contains('active') && typeof renderCharacterPage === 'function') {
    renderCharacterPage();
  }
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
  renderGameHubCard(); // v19.3: 每日挑战入口
  renderChallengeCard(); // v19.4: 限时挑战赛 (W15-W30)
  renderAchievementWall();  // v18 Phase 5.1
  renderReviewCard();  // v18 Phase 5.3
  // v19.14a: 主页极简 → 2 卡 (今日 3 件事 + 目标校 1 校)
  // 旧 5 卡 (admissionForecast / paper2Sprint / oralCheckin / subjectVocab / scienceChapter)
  // 全部内容收纳进"今日 3 件事" + 目标校单卡 + 详情下沉到对应 tab
  renderTodayThreeCard();
  renderTargetSchoolMini();
  // 仍然 render 旧卡 (HTML 容器若存在则填充), 兼容性: 若 HTML 删了对应容器, 这些 render 无副作用
  if (document.getElementById('admissionForecastCard')) renderAdmissionForecastCard();
  if (document.getElementById('paper2SprintCard')) renderPaper2SprintCard();
  if (document.getElementById('oralCheckinCard')) renderOralCheckinCard();
  if (document.getElementById('subjectVocabCard')) renderSubjectVocabCard();
  if (document.getElementById('scienceChapterCard')) renderScienceChapterCard();
  // v19.12: 学习画像移到二级 "我的" tab, 主页不渲染 (避免信息超载)
  // renderLearningPortraitCard();
  renderWeeklyCoach();
  // renderMasterTipCard(); // v18.71: 已合并到 wowCard
  renderDragonProgress();  // v18.55
  renderErrorBankCard();   // v18.59
  renderCompTrackerCard(); // v19.5: 作文质量追踪
  renderWeakChallengeCard(); // v19.5: 弱科挑战
  renderFocusAreasCard();  // v19.5: 模考诊断重点
  renderFlashcardWidget(); // v19.5: 词汇闪卡入口
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

// v19.7: Paper 2 弱点突击卡 (实考 AL6 后置顶, 严肃风, 不撒花)
function renderPaper2SprintCard() {
  const card = document.getElementById('paper2SprintCard');
  if (!card || !window.getPaper2SprintStatus) return;
  const s = window.getPaper2SprintStatus(state);
  const accColor = (a) => a === null ? '#999' : a >= 75 ? '#4ECDC4' : a >= 60 ? '#FFA500' : '#FF6B6B';
  const accLabel = (a) => a === null ? '未练' : a + '%';
  const dailyTargetCloze = 10, dailyTargetSST = 5;  // 建议日量
  card.innerHTML = `
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
      <div style="font-size:14px;font-weight:900;color:#FF6B6B">🎯 Paper 2 弱点突击</div>
      <div style="margin-left:auto;font-size:11px;color:#666">实考 AL6 → 目标 AL 4</div>
    </div>
    <div style="font-size:11px;color:#666;margin-bottom:8px;line-height:1.5">
      Cloze (25 分) + Synthesis (8 分) = Paper 2 33 分关键 · 建议每天 ${dailyTargetCloze} Cloze + ${dailyTargetSST} SST
    </div>
    <div style="background:#FFF;border:1px solid #DDD;border-radius:6px;padding:8px;margin-bottom:6px">
      <div style="display:flex;justify-content:space-between;align-items:center;font-size:12px;margin-bottom:4px">
        <span>🧩 Cloze 单空填</span>
        <span style="color:${accColor(s.cloze.recentAcc)}">近 5 次 ${accLabel(s.cloze.recentAcc)} ${s.cloze.overallAcc !== null ? `· 总 ${s.cloze.overallAcc}%` : ''}</span>
      </div>
      <div style="background:#EEE;border-radius:4px;height:8px;overflow:hidden;margin-bottom:4px">
        <div style="background:linear-gradient(90deg,#FFA500,#4ECDC4);height:100%;width:${s.cloze.pct}%;transition:width 0.4s"></div>
      </div>
      <div style="display:flex;justify-content:space-between;align-items:center;font-size:11px;color:#666">
        <span>${s.cloze.done} / ${s.cloze.target} 题</span>
        <button onclick="openClozeGame()" style="padding:3px 10px;background:#FF6B6B;color:#FFF;border:none;border-radius:4px;font-size:11px;font-weight:700;cursor:pointer">立即练 →</button>
      </div>
    </div>
    <div style="background:#FFF;border:1px solid #DDD;border-radius:6px;padding:8px">
      <div style="display:flex;justify-content:space-between;align-items:center;font-size:12px;margin-bottom:4px">
        <span>🔄 SST 句型转换</span>
        <span style="color:${accColor(s.sst.recentAcc)}">近 5 次 ${accLabel(s.sst.recentAcc)} ${s.sst.overallAcc !== null ? `· 总 ${s.sst.overallAcc}%` : ''}</span>
      </div>
      <div style="background:#EEE;border-radius:4px;height:8px;overflow:hidden;margin-bottom:4px">
        <div style="background:linear-gradient(90deg,#FFA500,#4ECDC4);height:100%;width:${s.sst.pct}%;transition:width 0.4s"></div>
      </div>
      <div style="display:flex;justify-content:space-between;align-items:center;font-size:11px;color:#666">
        <span>${s.sst.done} / ${s.sst.target} 题</span>
        <button onclick="openSstGame()" style="padding:3px 10px;background:#FF6B6B;color:#FFF;border:none;border-radius:4px;font-size:11px;font-weight:700;cursor:pointer">立即练 →</button>
      </div>
    </div>
    <div style="margin-top:8px;padding:8px;background:linear-gradient(135deg,#FFE0E0,#FFF0F0);border-radius:6px;text-align:center">
      <button onclick="openPaper2MockGame()" style="padding:8px 20px;background:linear-gradient(135deg,#FF6B6B,#FF4444);color:#FFF;border:none;border-radius:6px;font-weight:900;font-size:13px;cursor:pointer;box-shadow:0 2px 6px rgba(255,107,107,0.3)">
        🎯 Paper 2 模拟卷 (28 min · 15 Cloze + 8 SST)
      </button>
      <div style="font-size:10px;color:#888;margin-top:4px">完整真考节奏 + 自动算预测 AL</div>
    </div>
    <div style="font-size:10px;color:#888;margin-top:6px;text-align:center;font-style:italic">
      💡 每天保持节奏, 突击周后 Cloze 正确率应稳定 ≥70%, SST ≥65%
    </div>
  `;
}
window.renderPaper2SprintCard = renderPaper2SprintCard;

// v19.12: 角色 / 装备 / 双龙 / 皮肤 / 学习画像 / 兑换 全部移到二级 "👤 我的" tab
function renderCharacterPage() {
  const el = document.getElementById('characterPageContent');
  if (!el) return;
  // 检查是否首次构建
  if (!el.querySelector('#charPage_characterSvg')) {
    el.innerHTML = `
      <div class="character-card" style="margin-bottom:12px;position:relative">
        <div class="character-display" style="position:relative">
          <div class="character-svg" id="charPage_characterSvg"></div>
          <!-- v19.14c: 宠物 widget 还原到角色旁 (我的 tab 内, 不在主页) -->
          <div class="pet-widget" id="charPage_petWidget" style="position:absolute;right:8px;bottom:8px;width:90px;height:90px"></div>
        </div>
        <div class="character-name" id="charPage_characterName">萌新佑子</div>
        <div class="character-title-big" id="charPage_characterTitle">刚入门的勇士</div>
        <span class="level-badge">LV <span id="charPage_charLevelDisplay">1</span></span>
        <div style="text-align:center;margin-top:8px;font-size:12px;color:var(--color-text-light)">
          总分: <b id="charPage_pts">0</b> · 击败 <b id="charPage_beat">0</b>% P5 学生
        </div>
        <!-- v19.14c: 平日 lock 提示横幅 -->
        <div id="charPage_lockBanner" style="display:none;margin-top:10px;padding:10px;background:linear-gradient(135deg,#FFF8E1,#FFE082);border-radius:6px;font-size:12px;color:#5D4037;text-align:center;line-height:1.5">
          📅 <b>平日装备 + 皮肤穿戴已锁</b> · 宠物在休息 💤<br>
          <span style="font-size:11px;color:#888">周末打开 → 换装备 + 喂宠物 + 看动画</span>
        </div>
      </div>

      <div class="card" id="charPage_learningPortrait"></div>
      <div class="card" id="charPage_dragonProgress"></div>
      <div class="card">
        <div class="card-title">⚔️ 装备收集</div>
        <p style="color: var(--color-text-light); font-size: 13px; margin-bottom: 12px;">每达成条件解锁一件装备!</p>
        <div class="equipment-grid" id="charPage_equipmentGrid"></div>
      </div>
      <div class="card">
        <div class="card-title">👕 皮肤更衣室</div>
        <div class="skin-grid" id="charPage_skinGrid"></div>
      </div>
      <div class="card">
        <div class="card-title">📊 本周学习画像</div>
        <div id="charPage_portraitContent"></div>
      </div>
      <div class="card achievement-wall-card" id="charPage_achievementWall"></div>
    `;
  }
  // 复用现有 render 逻辑 — 重定向到 character page 的元素
  // 简化: 直接复制现有的 character-card / equipment / dragon 内容
  if (window.CHAMUI && window.CHAMUI.renderCharacter) {
    const svg = document.getElementById('charPage_characterSvg');
    if (svg) svg.innerHTML = window.CHAMUI.renderCharacter(state);
  }
  const pts = state.totalPoints || 0;
  const lv = window.CHAMUI ? window.CHAMUI.getLevelInfo(pts) : { name: '?', title: '?', lv: 1 };
  const dragonTitle = (window.CHAMUI && window.CHAMUI.getDragonTitle) ? window.CHAMUI.getDragonTitle(state) : '';
  document.getElementById('charPage_characterName').textContent = lv.name + dragonTitle;
  document.getElementById('charPage_characterTitle').textContent = lv.title;
  document.getElementById('charPage_charLevelDisplay').textContent = lv.lv;
  document.getElementById('charPage_pts').textContent = pts.toLocaleString();
  if (typeof studentBeatPercent === 'function') {
    document.getElementById('charPage_beat').textContent = studentBeatPercent(pts);
  }
  // v19.14j: 撤回 v19.14c 装备视觉灰锁 — 装备随时可换
  const lockBanner = document.getElementById('charPage_lockBanner');
  if (lockBanner) lockBanner.style.display = 'none';
  const grid = document.getElementById('charPage_equipmentGrid');
  if (grid && window.CHAMUI) {
    const disabled = new Set(state.equipmentDisabled || []);
    const HIDDEN = new Set(['silver_dragon', 'dragon']);
    grid.innerHTML = window.CHAMUI.equipment.filter(eq => !HIDDEN.has(eq.id)).map(eq => {
      const unlocked = window.CHAMUI.checkEquipmentUnlocked(eq.id, state);
      const equipped = unlocked && !disabled.has(eq.id);
      const cls = !unlocked ? 'locked' : (equipped ? 'unlocked equipped' : 'unlocked unequipped');
      const click = unlocked ? `onclick="toggleEquipment('${eq.id}')"` : '';
      const status = !unlocked ? eq.hint : equipped ? '✓ 穿戴中' : '👜 已收藏';
      return `<div class="equipment-item ${cls}" ${click}>
        <span class="equipment-icon">${eq.icon}</span>
        <div class="equipment-name">${eq.name}</div>
        <div class="equipment-condition" style="font-size:9px">${status}</div>
      </div>`;
    }).join('');
  }
  // v19.14j: 撤回 v19.14c 宠物 zZz 平日休眠 — 心理学家"误读间歇强化"警告 + 用户去 lock 方向
  // 宠物一直活跃 (颜色 + 动画 + 喂食 enabled)
  const petEl = document.getElementById('charPage_petWidget');
  if (petEl && window.getCurrentPetForm) {
    if (!state.pet) state.pet = { name: '球球', formIdx: 0, spawnedAt: Date.now(), feedCount: 0, happiness: 100, lastFedDate: null };
    const calcForm = window.getCurrentPetForm(state);
    state.pet.formIdx = Math.max(state.pet.formIdx || 0, calcForm.idx);
    const form = window.PET_FORMS[state.pet.formIdx] || calcForm;
    const happy = state.pet.happiness || 0;
    petEl.innerHTML = `<div class="pet-svg-wrap">${form.svg}</div>`;
    petEl.style.cursor = 'pointer';
    petEl.title = `${state.pet.name || '球球'} (${form.name}) · 心情 ${happy}/100\n点击查看/改名`;
    petEl.onclick = window.openPetModal || (() => {});
    petEl.classList.remove('pet-sleepy');
    if (happy >= 70) petEl.classList.add('pet-happy');
    else if (happy < 30) petEl.classList.add('pet-sad');
  }
  // 皮肤 grid (复用 renderSkinGrid 如果存在, 否则简化版)
  if (typeof renderSkinGrid === 'function') {
    // renderSkinGrid 用了 #skinGrid 这个 ID, 临时改 ID
    const origSkin = document.getElementById('skinGrid');
    const charSkin = document.getElementById('charPage_skinGrid');
    if (charSkin) {
      charSkin.id = 'skinGrid';
      if (origSkin) origSkin.id = '_origSkinGrid';
      renderSkinGrid();
      charSkin.id = 'charPage_skinGrid';
      if (origSkin) origSkin.id = 'skinGrid';
    }
  }
  // 双龙进度卡
  if (typeof renderDragonProgress === 'function') {
    const origDragon = document.getElementById('dragonProgressCard');
    const charDragon = document.getElementById('charPage_dragonProgress');
    if (charDragon) {
      charDragon.id = 'dragonProgressCard';
      if (origDragon) origDragon.id = '_origDragonProgressCard';
      renderDragonProgress();
      charDragon.id = 'charPage_dragonProgress';
      if (origDragon) origDragon.id = 'dragonProgressCard';
    }
  }
  // 学习画像
  if (typeof renderLearningPortraitCard === 'function') {
    const orig = document.getElementById('learningPortraitCard');
    const ch = document.getElementById('charPage_learningPortrait');
    if (ch) {
      ch.id = 'learningPortraitCard';
      if (orig) orig.id = '_origLearningPortraitCard';
      renderLearningPortraitCard();
      ch.id = 'charPage_learningPortrait';
      if (orig) orig.id = 'learningPortraitCard';
    }
  }
  // 成就墙
  if (typeof renderAchievementWall === 'function') {
    const orig = document.getElementById('achievementWallCard');
    const ch = document.getElementById('charPage_achievementWall');
    if (ch) {
      ch.id = 'achievementWallCard';
      if (orig) orig.id = '_origAchievementWallCard';
      renderAchievementWall();
      ch.id = 'charPage_achievementWall';
      if (orig) orig.id = 'achievementWallCard';
    }
  }
}
window.renderCharacterPage = renderCharacterPage;

// v19.12: 主页置顶 — 目标校录取概率仪表盘 (无 SGD/钱字眼)
function renderAdmissionForecastCard() {
  const card = document.getElementById('admissionForecastCard');
  if (!card || !window.getAdmissionForecasts) return;
  const f = window.getAdmissionForecasts(state);
  const { bySubject, total_AL, sgRank_pct, schools, ifEnglishImproved } = f;

  // 学校按 tier + cop 排序
  const byTier = { top: [], high: [], mid: [] };
  schools.forEach(s => { (byTier[s.tier] || byTier.mid).push(s); });
  const probColor = (p) => p >= 80 ? '#2E7D32' : p >= 50 ? '#FFA500' : p >= 20 ? '#E67E22' : '#C62828';
  const probIcon = (p) => p >= 80 ? '✅' : p >= 50 ? '⚠️' : '❌';

  const renderSchool = (s) => `
    <div style="display:flex;justify-content:space-between;align-items:center;padding:4px 0;font-size:12px">
      <span>${s.emoji} ${s.name} <span style="color:#888;font-size:10px">(COP ${s.cop})</span></span>
      <span style="color:${probColor(s.probability)};font-weight:900">${probIcon(s.probability)} ${s.probability}%</span>
    </div>
  `;

  // 算英语提到 AL3 的杠杆效应 (top 校)
  const topSchool = schools.find(s => s.tier === 'top');
  const topIfImproved = ifEnglishImproved.schools.find(s => s.id === topSchool.id);
  const leverageMsg = (topSchool && topIfImproved && topIfImproved.probability > topSchool.probability)
    ? `💡 <b>英语 AL${bySubject.english_AL} → AL3</b> = ${topSchool.name} 录取 <b>${topSchool.probability}% → ${topIfImproved.probability}%</b> (+${topIfImproved.probability - topSchool.probability}%) 🚀`
    : '💡 当前预测稳定, 继续保持';

  card.innerHTML = `
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px">
      <div style="font-size:15px;font-weight:900">🏫 你的目标校 录取概率</div>
      <div style="margin-left:auto;font-size:11px;color:#666">基于综合 PSLE 预测 AL</div>
    </div>
    <div style="background:#F0F8FF;border-radius:6px;padding:8px;margin-bottom:8px;font-size:12px;display:flex;justify-content:space-between">
      <span>综合 AL: <b style="font-size:14px;color:#FF6B6B">${total_AL}</b> (英${bySubject.english_AL}+数${bySubject.math_AL}+科${bySubject.science_AL}+华${bySubject.chinese_AL})</span>
      <span>击败 <b>${sgRank_pct === 5 ? '95+' : (100-sgRank_pct)}%</b> P6 学生</span>
    </div>

    ${byTier.top.length ? `
    <div style="margin-bottom:6px">
      <div style="font-size:11px;color:#666;font-weight:700;margin-bottom:2px">🏛️ 顶级校 (DP 6-8)</div>
      ${byTier.top.map(renderSchool).join('')}
    </div>` : ''}

    ${byTier.high.length ? `
    <div style="margin-bottom:6px">
      <div style="font-size:11px;color:#666;font-weight:700;margin-bottom:2px">🏫 中上校 (DP 8-10)</div>
      ${byTier.high.map(renderSchool).join('')}
    </div>` : ''}

    ${byTier.mid.length ? `
    <div style="margin-bottom:8px">
      <div style="font-size:11px;color:#666;font-weight:700;margin-bottom:2px">🏫 中等校 (DP 11+)</div>
      ${byTier.mid.map(renderSchool).join('')}
    </div>` : ''}

    <div style="background:linear-gradient(135deg,#FFF3E0,#FFE0B2);border-radius:6px;padding:8px;font-size:12px;color:#5D4037;text-align:center">
      ${leverageMsg}
    </div>
    <button onclick="openPaper2MockGame()" style="width:100%;margin-top:8px;padding:10px;background:#FF6B6B;color:#FFF;border:none;border-radius:6px;font-weight:900;cursor:pointer;font-size:13px">
      🎯 立即做 Paper 2 模拟卷 (28 min)
    </button>
  `;
}
window.renderAdmissionForecastCard = renderAdmissionForecastCard;

// ============================================================
// v19.14a: 主页极简 — 2 张卡 (今日 3 件事 + 目标校 1 校)
// 取代 v19.12-13 的 5 卡布局, 直接对接 5 专家评审决议
// ============================================================

// A1: 今日 3 件事 sticky 卡 — v19.14b 加平日/周末分化
function renderTodayThreeCard() {
  const card = document.getElementById('todayThreeCard');
  if (!card) return;
  const isWeekday = window.isWeekdayToday ? window.isWeekdayToday() : true;
  // v19.15 P0-3: 卡片标题/计数器按平日 vs 周末分化 (周末改"自选推荐", 心理上从义务→自主)
  let headerTitle = '🎯 今日要做的 3 件事';
  let headerColor = '#FF6B6B';
  let counterFn = (done) => `${done} / 3 完成`;

  // v19.15e: 暗调 + 青色发光风格, 匹配打卡页 .checkin-item (未做高亮 / 已做灰掉)
  const item = (icon, label, sub, done, onclick, color) => `
    <div onclick="${onclick}" style="display:flex;align-items:center;gap:10px;padding:14px;background:${done ? 'rgba(80,80,80,0.08)' : 'linear-gradient(135deg, rgba(0,212,255,0.08), rgba(0,212,255,0.02))'};border:${done ? '1px solid rgba(120,120,120,0.18)' : '1px solid rgba(0,212,255,0.45)'};box-shadow:${done ? 'none' : '0 0 12px rgba(0,212,255,0.10), inset 0 0 0 1px rgba(0,212,255,0.05)'};border-radius:8px;margin-bottom:8px;cursor:pointer;min-height:64px;transition:all 0.2s;${done ? 'opacity:0.45;filter:grayscale(0.6);' : ''}">
      <div style="font-size:24px;width:32px;text-align:center">${done ? '✅' : icon}</div>
      <div style="flex:1">
        <div style="font-size:15px;font-weight:700;color:${done ? '#9E9E9E' : '#E0E0E0'};${done ? 'text-decoration:line-through;' : ''}">${label}</div>
        <div style="font-size:12px;color:${done ? '#777' : '#A0A0A0'};margin-top:2px">${sub}</div>
      </div>
      <div style="color:${done ? '#777' : color};font-size:20px">›</div>
    </div>
  `;

  const todayCounts = ((state.gameDailyCount && state.gameDailyCount.counts) || {});
  const todayPaper2 = window.getTodayClozeSstCount ? window.getTodayClozeSstCount(state) : 0;

  let itemsHtml, doneCount, headerSub, tipHtml;

  if (isWeekday) {
    // 平日 3 件事: Oral + Cloze+SST + 科学章节
    const oral = window.getOralStatus ? window.getOralStatus(state) : { todaySec: 0, targetSec: 1500, pct: 0, done: false };
    const oralDone = oral.done || oral.todaySec >= 1500;
    const paper2Done = todayPaper2 >= 15;
    const week = state.currentWeek || 1;
    const chapter = window.getCurrentScienceChapter ? window.getCurrentScienceChapter(week) : null;
    const sciDone = (todayCounts.scimcq || 0) >= 1 || (todayCounts.sci_oe || 0) >= 1;
    doneCount = (oralDone?1:0) + (paper2Done?1:0) + (sciDone?1:0);
    headerSub = `平日 · 英语 70% + 科学 30%`;
    // v19.14k: 科学章节内细分进度 + 今日 S2 段具体任务 (对接 WEEK_TASKS day-by-day)
    let chapterSubProgress = '', todayS2Task = '';
    if (chapter && chapter.weeks) {
      const chapterTotalWeeks = chapter.weeks[1] - chapter.weeks[0] + 1;
      const chapterWeekIdx = week - chapter.weeks[0] + 1;
      if (chapterTotalWeeks > 1) {
        // 难章 2 周: 第 1 周 = 概念建立, 第 2 周 = 深化与应用
        const phase = chapterWeekIdx === 1 ? '概念建立' : '深化与应用';
        chapterSubProgress = ` · 第 ${chapterWeekIdx}/${chapterTotalWeeks} 周 ${phase}`;
      }
      // 今日 S2 段具体任务 (从 WEEK_TASKS 取)
      const todayKey = (typeof todayDayKeyForWeek === 'function') ? todayDayKeyForWeek(week) : null;
      if (todayKey && window.WEEK_TASKS && window.WEEK_TASKS[week - 1]) {
        const days = window.WEEK_TASKS[week - 1].days;
        const dayTasks = days && days[todayKey];
        if (dayTasks) {
          // 平日找 S2 段, 周末找 WSS/WUS
          const taskText = dayTasks.S2 || dayTasks.WSS || dayTasks.WUS || '';
          // 只取 🔬 开头的科学任务
          if (taskText && taskText.match(/🔬|科学|Plant|Digestive|Heat|Light|Magnet|Diversity|Photosynthesis|Respiration|Matter|Force|Cell|Experiment/i)) {
            todayS2Task = taskText.length > 36 ? taskText.substring(0, 34) + '…' : taskText;
          }
        }
      }
    }
    const sciSub = chapter
      ? (todayS2Task
          ? `<b>今天</b>: ${escapeHtml(todayS2Task)}<br><span style="font-size:10px;color:#888">${escapeHtml(chapter.title)} ${chapter.stars}${chapterSubProgress}</span>`
          : `${escapeHtml(chapter.title)} ${chapter.stars}${chapterSubProgress} · 含概念图`)
      : '科学 MCQ + OE 训练';
    itemsHtml = [
      item('🗣️', 'Oral 25 min', `${Math.round(oral.todaySec/60)}/25 min · 抽 PSLE 口试题`, oralDone, 'openOralPracticeModal()', '#0277BD'),
      item('🎯', '10 Cloze + 5 SST', `今日 ${todayPaper2}/15 题 · 英语 AL6→AL2 关键`, paper2Done, 'openPaper2MockGame()', '#FF6B6B'),
      item('🔬', chapter ? '本周科学 1 节' : '科学练习', sciSub, sciDone, chapter && chapter.diagram ? `openConceptDiagram('${chapter.diagram}'); setTimeout(openScienceOEGame, 100)` : 'openSciMcqGame()', '#2E7D32')
    ].join('');
    tipHtml = `<div style="margin-top:8px;padding:8px;background:linear-gradient(135deg, rgba(255,184,0,0.10), rgba(255,107,53,0.05));border:1px solid rgba(255,184,0,0.30);border-radius:6px;font-size:11px;color:#FFD180;line-height:1.5;text-align:center">
      📅 <b>数学 / 华文 周末才开放</b> — 平日全力攻英语 (AL6 → AL2 是综合 AL 4-5 最大杠杆)
    </div>`;
  } else {
    // v19.15 P0-3: 周末改"自选推荐"模式 — 从"必做 3 件"→"挑 1-2 件就好, 休息也算赢"
    // 心理学家警告: 周末双科爆发风险 → 改自主规划框架
    const mathDone = (todayCounts.math || 0) >= 1;
    const chineseDone = (todayCounts.chinese || 0) >= 1;
    const cloze5Done = todayPaper2 >= 5;
    const sciDone = (todayCounts.scimcq || 0) >= 1 || (todayCounts.sci_oe || 0) >= 1;
    const item3Done = cloze5Done && sciDone;
    doneCount = (mathDone?1:0) + (chineseDone?1:0) + (item3Done?1:0);
    headerTitle = '🌿 周末推荐 · 自选';
    headerColor = '#2E7D32';
    counterFn = (done) => done === 0 ? '休息日 · 自由安排' : `已挑 ${done} 件 · 1-2 件就够`;
    headerSub = `周末灵活安排 · 休息也算赢 (PSLE 是 17 月马拉松, 不靠冲刺)`;
    itemsHtml = [
      item('➗', '数学 P5/P6 (可选)', '10 题 · 维持 AL1 · 30 分钟内', mathDone, 'openMathGame()', '#FFA000'),
      item('🇨🇳', '华文阅读 (可选)', '10 题 · 维持 AL1 · 20 分钟内', chineseDone, 'openChineseMcqGame()', '#C62828'),
      item('📖', '英语+科学 保手感 (可选)', `Cloze ${todayPaper2}/5 + 1 套科学 · 15 分钟内`, item3Done, cloze5Done ? 'openSciMcqGame()' : 'openClozeGame()', '#7B1FA2')
    ].join('');
    tipHtml = `<div style="margin-top:8px;padding:8px;background:linear-gradient(135deg, rgba(0,255,136,0.10), rgba(46,125,50,0.05));border:1px solid rgba(0,255,136,0.30);border-radius:6px;font-size:11px;color:#A5D6A7;line-height:1.5;text-align:center">
      🛋️ <b>挑 1-2 件就好</b> · 周日下午 14-18 完全休息 (手册硬红线) · 累了直接关 app, 不掉 streak
    </div>`;
  }

  card.innerHTML = `
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
      <div style="font-size:17px;font-weight:900;color:${headerColor}">${headerTitle}</div>
      <div style="margin-left:auto;font-size:12px;color:#666">${counterFn(doneCount)}</div>
    </div>
    <div style="font-size:11px;color:#888;margin-bottom:10px">${headerSub}</div>
    ${itemsHtml}
    ${tipHtml}
  `;
}
window.renderTodayThreeCard = renderTodayThreeCard;

// A5: 目标校 1 校提示 (取代 8 校列表)
function renderTargetSchoolMini() {
  const card = document.getElementById('targetSchoolMini');
  if (!card || !window.getAdmissionForecasts) return;
  const f = window.getAdmissionForecasts(state);
  const { bySubject, total_AL, schools, ifEnglishImproved } = f;
  // 默认主目标校 = 用户存的 mainTargetSchool, 否则取第一个 top tier
  const mainId = state.mainTargetSchool || (schools.find(s => s.tier === 'top') || schools[0]).id;
  const main = schools.find(s => s.id === mainId) || schools[0];
  const mainImproved = ifEnglishImproved.schools.find(s => s.id === main.id);
  const probColor = main.probability >= 80 ? '#2E7D32' : main.probability >= 50 ? '#FFA500' : '#C62828';
  const lift = mainImproved ? mainImproved.probability - main.probability : 0;
  // v19.15e: 暗调 + 青色发光 + 校牌色 (匹配打卡页)
  const probColorBright = main.probability >= 80 ? '#66BB6A' : main.probability >= 50 ? '#FFB74D' : '#EF5350';
  card.innerHTML = `
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px">
      <div style="font-size:15px;font-weight:900;color:#4FC3F7">🏫 目标校 · ${main.name}</div>
      <button onclick="openAllSchoolsModal()" style="margin-left:auto;background:none;border:none;color:#4FC3F7;font-size:12px;cursor:pointer;text-decoration:underline">查看全部 8 校 →</button>
    </div>
    <div style="display:flex;align-items:center;gap:12px;background:linear-gradient(135deg, rgba(0,212,255,0.08), rgba(0,212,255,0.02));border:1px solid rgba(0,212,255,0.30);box-shadow:0 0 10px rgba(0,212,255,0.08);border-radius:8px;padding:12px">
      <div style="text-align:center;flex:0 0 80px">
        <div style="font-size:28px;color:${probColorBright};font-weight:900;line-height:1">${main.probability}%</div>
        <div style="font-size:11px;color:#A0A0A0;margin-top:2px">录取概率</div>
      </div>
      <div style="flex:1;font-size:12px;color:#E0E0E0;line-height:1.6">
        <div>当前综合 AL: <b style="color:#FF8A65">${total_AL}</b> (英${bySubject.english_AL}+数${bySubject.math_AL}+科${bySubject.science_AL}+华${bySubject.chinese_AL})</div>
        <div>${main.name} COP: <b style="color:#FFD180">${main.cop}</b></div>
        ${lift > 0 ? `<div style="margin-top:4px;padding:6px;background:linear-gradient(135deg, rgba(255,184,0,0.12), rgba(255,107,53,0.06));border:1px solid rgba(255,184,0,0.30);border-radius:4px"><b style="color:#FFB74D">💡 英语 AL${bySubject.english_AL} → AL3</b> = 录取 <b style="color:#FFD180">${main.probability}% → ${mainImproved.probability}%</b> (+${lift}%)</div>` : ''}
      </div>
    </div>
  `;
}
window.renderTargetSchoolMini = renderTargetSchoolMini;

// v19.15i: 8 校全列表 modal (从 "查看全部 8 校 →" 触发)
function openAllSchoolsModal() {
  if (!window.getAdmissionForecasts) { showToast('数据未就绪', 'warn'); return; }
  const f = window.getAdmissionForecasts(state);
  const { bySubject, total_AL, schools, ifEnglishImproved } = f;
  const byTier = { top: [], high: [], mid: [] };
  schools.forEach(s => { (byTier[s.tier] || byTier.mid).push(s); });
  const probColor = (p) => p >= 80 ? '#66FFB0' : p >= 50 ? '#FFB74D' : p >= 20 ? '#FF8A65' : '#EF5350';
  const probIcon = (p) => p >= 80 ? '✅' : p >= 50 ? '⚠️' : '❌';
  const tierLabel = { top: '🏛️ 顶级校 (DP 6-8)', high: '🏫 中上校 (DP 8-10)', mid: '🏫 中等校 (DP 11+)' };
  const renderSchool = (s) => {
    const improved = ifEnglishImproved.schools.find(x => x.id === s.id);
    const lift = improved ? improved.probability - s.probability : 0;
    return `
    <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 10px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:6px;margin-bottom:6px;font-size:13px">
      <div style="flex:1">
        <div style="color:#E0E0E0;font-weight:700">${s.emoji} ${s.name} <span style="color:#94A3B8;font-size:11px;font-weight:400">(COP ${s.cop})</span></div>
        ${lift > 0 ? `<div style="color:#FFB74D;font-size:10px;margin-top:2px">英语 → AL3 可提到 ${improved.probability}% (+${lift}%)</div>` : ''}
      </div>
      <span style="color:${probColor(s.probability)};font-weight:900;font-size:15px;margin-left:8px">${probIcon(s.probability)} ${s.probability}%</span>
    </div>
  `;};
  let modal = document.getElementById('allSchoolsModal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'allSchoolsModal';
    modal.className = 'vocab-modal';
    modal.onclick = (e) => { if (e.target === modal) closeAllSchoolsModal(); };
    document.body.appendChild(modal);
  }
  modal.innerHTML = `
    <div class="kt-inner cn-reading-inner" style="max-width:520px;background:var(--color-card);border:1px solid rgba(0,212,255,0.30);box-shadow:0 0 20px rgba(0,212,255,0.10)">
      <div class="kt-header">
        <div>
          <div class="kt-title" style="color:#4FC3F7">🏫 全部 ${schools.length} 校 录取概率</div>
          <div class="kt-progress">综合 AL <b style="color:#FF8A65">${total_AL}</b> · 英${bySubject.english_AL} 数${bySubject.math_AL} 科${bySubject.science_AL} 华${bySubject.chinese_AL}</div>
        </div>
        <button class="vocab-modal-close" onclick="closeAllSchoolsModal()">×</button>
      </div>
      <div style="max-height:60vh;overflow-y:auto;padding:4px">
        ${byTier.top.length ? `<div style="color:#4FC3F7;font-weight:700;font-size:12px;margin:8px 0 4px">${tierLabel.top}</div>${byTier.top.map(renderSchool).join('')}` : ''}
        ${byTier.high.length ? `<div style="color:#4FC3F7;font-weight:700;font-size:12px;margin:12px 0 4px">${tierLabel.high}</div>${byTier.high.map(renderSchool).join('')}` : ''}
        ${byTier.mid.length ? `<div style="color:#4FC3F7;font-weight:700;font-size:12px;margin:12px 0 4px">${tierLabel.mid}</div>${byTier.mid.map(renderSchool).join('')}` : ''}
      </div>
      <div style="background:linear-gradient(135deg, rgba(255,184,0,0.12), rgba(255,107,53,0.06));border:1px solid rgba(255,184,0,0.30);border-radius:6px;padding:10px;margin-top:10px;font-size:12px;color:#FFD180;text-align:center;line-height:1.6">
        💡 英语 AL${bySubject.english_AL} → AL3 是杠杆点 · 每提升 1 个 AL 录取概率大幅上升
      </div>
    </div>`;
  modal.classList.add('show');
}
function closeAllSchoolsModal() {
  const m = document.getElementById('allSchoolsModal');
  if (m) m.classList.remove('show');
}
window.openAllSchoolsModal = openAllSchoolsModal;
window.closeAllSchoolsModal = closeAllSchoolsModal;

// ============================================================
// v19.13: 5 大新模块 render + 游戏逻辑 (对齐手册 v14)
// ============================================================

// --------- 1. Oral 25min/天 打卡 + 题库 ---------
function renderOralCheckinCard() {
  const card = document.getElementById('oralCheckinCard');
  if (!card || !window.getOralStatus) return;
  const s = window.getOralStatus(state);
  const minDone = Math.round(s.todaySec / 60);
  const minTarget = Math.round(s.targetSec / 60);
  const barColor = s.pct >= 100 ? '#4ECDC4' : s.pct >= 50 ? '#FFA500' : '#FF8A65';
  card.innerHTML = `
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
      <div style="font-size:14px;font-weight:900;color:#0277BD">🗣️ 今日 Oral 训练</div>
      <div style="margin-left:auto;font-size:11px;color:#666">目标 ${minTarget} min/天 · Paper 4 占 30 分</div>
    </div>
    <div style="font-size:11px;color:#666;margin-bottom:8px;line-height:1.5">
      孩子英语 AL6, Oral 口试是失分大头. 每天用<b>豆包 App</b>对话或<b>朗读 1 段英文</b>录音回听.
    </div>
    <div style="background:#EEE;border-radius:4px;height:10px;overflow:hidden;margin-bottom:6px">
      <div style="background:${barColor};height:100%;width:${s.pct}%;transition:width 0.4s"></div>
    </div>
    <div style="display:flex;justify-content:space-between;align-items:center;font-size:12px;margin-bottom:8px">
      <span style="color:#0277BD;font-weight:700">${minDone} / ${minTarget} min ${s.done ? '✅' : ''}</span>
      <span style="color:#888;font-size:10px">累计 ${s.totalSessions} 次练习</span>
    </div>
    <div style="display:flex;gap:6px">
      <!-- v19.14d (英语+心理 2 票): 删 quickOralCheckin 假打卡按钮, 只留抽题 -->
      <button onclick="openOralPracticeModal()" style="flex:1;padding:8px;background:linear-gradient(135deg,#0277BD,#01579B);color:#FFF;border:none;border-radius:6px;font-weight:700;font-size:12px;cursor:pointer">
        🎤 抽一题 PSLE Oral · 必须答完才算
      </button>
    </div>
  `;
}
window.renderOralCheckinCard = renderOralCheckinCard;

let _oralModalQ = null;
function openOralPracticeModal(seed) {
  if (!window.getOralQuestion) return;
  const q = window.getOralQuestion(seed);
  if (!q) { showToast('暂无题库', 'warn'); return; }
  _oralModalQ = q;
  let modal = document.getElementById('oralPracticeModal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'oralPracticeModal';
    modal.className = 'mb-result-modal';
    document.body.appendChild(modal);
  }
  modal.innerHTML = `
    <div class="mg-inner" style="max-width:520px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
        <div style="font-size:14px;font-weight:900;color:#0277BD">🎤 PSLE Oral 练习</div>
        <button onclick="closeOralModal()" style="background:rgba(255,255,255,0.10);border:2px solid var(--color-text);color:var(--color-text);width:34px;height:34px;border-radius:50%;font-size:20px;font-weight:900;cursor:pointer;line-height:1;display:flex;align-items:center;justify-content:center">×</button>
      </div>
      <div style="background:#E1F5FE;border-radius:6px;padding:10px;margin-bottom:10px">
        <div style="font-size:11px;color:#0277BD;font-weight:700;margin-bottom:4px">📂 ${q.topic} · ${q.cat}</div>
        <div style="font-size:14px;color:#01579B;font-weight:600;line-height:1.5">${escapeHtml(q.q)}</div>
      </div>
      <div style="background:#FFF8E1;border-radius:6px;padding:8px;margin-bottom:10px;font-size:11px;color:#5D4037">
        💡 ${escapeHtml(q.hint)}
      </div>
      <div style="background:#F5F5F5;border-radius:6px;padding:10px;margin-bottom:10px;font-size:11px;color:#555">
        <b>建议流程</b> (2-3 min):<br>
        1. 朗读题目 1 遍 · 2. 思考 30s · 3. 对豆包/家长<b>口头</b>回答 1-2 min<br>
        4. <b>用一句话告诉爸妈你刚刚说了什么</b> (填下面框, ≥10 字才能 +3 分)
      </div>
      <!-- v19.14d (英语+心理 2 票): 反向验证 textarea, 替代假打卡 -->
      <textarea id="oralReverseInput" placeholder="比如: 我说了我喜欢妈妈做的咖喱因为味道很香, 还讲了上次和妈妈一起做菜的经历..." style="width:100%;min-height:80px;padding:8px;border:1px solid #DDD;border-radius:6px;font-size:13px;font-family:inherit;box-sizing:border-box;margin-bottom:8px;resize:vertical"></textarea>
      <div style="display:flex;gap:6px">
        <button onclick="openOralPracticeModal()" style="flex:1;padding:10px;background:#FFA000;color:#FFF;border:none;border-radius:6px;font-weight:700;cursor:pointer">🔄 换一题</button>
        <button onclick="completeOralPractice()" style="flex:2;padding:10px;background:linear-gradient(135deg,#4ECDC4,#26A69A);color:#FFF;border:none;border-radius:6px;font-weight:900;cursor:pointer">✅ 提交反向验证 (+3 分)</button>
      </div>
    </div>
  `;
  modal.classList.add('show');
}
function closeOralModal() {
  const m = document.getElementById('oralPracticeModal');
  if (m) { m.classList.remove('show'); m.innerHTML = ''; }
  _oralModalQ = null;
}
function completeOralPractice() {
  if (!_oralModalQ || !window.recordOralPractice) { closeOralModal(); return; }
  // v19.14d: 反向验证 — 必须填 ≥10 字, 防止 1 秒钟点完应付
  const inp = document.getElementById('oralReverseInput');
  const text = (inp && inp.value || '').trim();
  if (text.length < 10) {
    showToast('❌ 必须用一句话告诉爸妈你刚说了什么 (≥10 字), 不能空手点 +3 分', 'warn');
    if (inp) inp.focus();
    return;
  }
  window.recordOralPractice(state, _oralModalQ.id, 180);  // 3 min/题
  // 存反向验证文本到 oralPractice.sessions 末项
  if (state.oralPractice && state.oralPractice.sessions && state.oralPractice.sessions.length) {
    state.oralPractice.sessions[state.oralPractice.sessions.length - 1].reverseText = text;
  }
  showToast('🎤 +3 分 · 反向验证已记 · 累计 Oral +3 min', 'success');
  closeOralModal();
  if (typeof renderAll === 'function') renderAll();
  else renderOralCheckinCard();
}
// v19.14d: quickOralCheckin 函数完全删除 — 不再给一键 +5min 假打卡
window.openOralPracticeModal = openOralPracticeModal;
window.closeOralModal = closeOralModal;
window.completeOralPractice = completeOralPractice;
window.quickOralCheckin = function() { showToast('⚠️ 一键打卡已禁用 (v19.14d) — 用"抽一题"做反向验证', 'warn'); };

// --------- 2. 学科英语词汇 500 (今日 5 词 + mini-game) ---------
function renderSubjectVocabCard() {
  const card = document.getElementById('subjectVocabCard');
  if (!card || !window.getDailySubjectVocab) return;
  const words = window.getDailySubjectVocab(state, 5);
  const sv = state.subjectVocabStats || { totalRuns: 0, totalCorrect: 0, totalTried: 0 };
  const acc = sv.totalTried ? Math.round(sv.totalCorrect / sv.totalTried * 100) : null;
  const today = (window.todayKey ? window.todayKey() : new Date().toISOString().slice(0,10));
  const todayCnt = (sv.byDate && sv.byDate[today]) || 0;
  const doneTag = todayCnt >= 5 ? '<span style="color:#4ECDC4;font-weight:900">✅ 已练</span>' : '<span style="color:#FFA500">未练</span>';
  const wordsHtml = words.map(w => `
    <div style="display:flex;justify-content:space-between;align-items:center;padding:4px 6px;background:#F5F5F5;border-radius:4px;margin-bottom:3px;font-size:12px">
      <span style="color:#1565C0;font-weight:700">${escapeHtml(w.en)}</span>
      <span style="color:#777;font-size:11px">${escapeHtml(w.zh)} <span style="font-size:9px;color:#999">(${w.cat})</span></span>
    </div>
  `).join('');
  card.innerHTML = `
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
      <div style="font-size:14px;font-weight:900;color:#1565C0">📚 今日学科英语 5 词</div>
      <div style="margin-left:auto;font-size:11px">${doneTag} · 今日 ${todayCnt}/5</div>
    </div>
    <div style="font-size:11px;color:#666;margin-bottom:6px;line-height:1.4">
      手册 v14 关键: 中国孩子题干读不懂会污染数学/科学 AL1. 数学 200 + 科学 300 共 500 词。
    </div>
    ${wordsHtml}
    <div style="display:flex;gap:6px;margin-top:8px">
      <button onclick="openSubjectVocabGame()" style="flex:1;padding:8px;background:linear-gradient(135deg,#1565C0,#0D47A1);color:#FFF;border:none;border-radius:6px;font-weight:700;font-size:12px;cursor:pointer">
        🎯 测一下 (5 题)
      </button>
      ${acc !== null ? `<div style="padding:8px;background:#E8F5E9;color:#2E7D32;border-radius:6px;font-size:11px;font-weight:700">总命中 ${acc}%</div>` : ''}
    </div>
  `;
}
window.renderSubjectVocabCard = renderSubjectVocabCard;

let _svGame = null;
function openSubjectVocabGame() {
  if (!window.getDailySubjectVocab) return;
  const words = window.getDailySubjectVocab(state, 5);
  const pool = (window.SUBJECT_VOCAB_MATH || []).concat(window.SUBJECT_VOCAB_SCIENCE || []);
  // 给每题生成 3 个干扰项 (同一 cat 优先)
  const questions = words.map(w => {
    const distractorsPool = pool.filter(p => p.zh !== w.zh && p.en !== w.en);
    const sameCat = distractorsPool.filter(p => p.cat === w.cat);
    const dst = (sameCat.length >= 3 ? sameCat : distractorsPool);
    const shuffled = dst.slice().sort(() => Math.random() - 0.5).slice(0, 3);
    const opts = [w.zh, ...shuffled.map(d => d.zh)].sort(() => Math.random() - 0.5);
    return { w, opts, correctIdx: opts.indexOf(w.zh) };
  });
  _svGame = { questions, qIdx: 0, correct: 0, picks: [] };
  _renderSvGame();
}
function _renderSvGame() {
  const g = _svGame;
  if (!g) return;
  let modal = document.getElementById('svGameModal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'svGameModal';
    modal.className = 'mb-result-modal';
    document.body.appendChild(modal);
  }
  if (g.qIdx >= g.questions.length) {
    const pct = Math.round(g.correct / g.questions.length * 100);
    if (window.recordSubjectVocabRun) window.recordSubjectVocabRun(state, g.correct, g.questions.length);
    modal.innerHTML = `
      <div class="mg-inner" style="max-width:480px;text-align:center">
        <div style="font-size:18px;font-weight:900;margin-bottom:10px">🎯 完成!</div>
        <div style="font-size:32px;color:${pct>=80?'#4ECDC4':pct>=60?'#FFA500':'#FF6B6B'};font-weight:900;margin:14px 0">${g.correct} / ${g.questions.length}</div>
        <div style="color:#666;margin-bottom:12px">+${g.correct} 积分 · ${pct >= 80 ? '🌟 优秀, 继续保持' : pct >= 60 ? '👍 还行, 多练几遍' : '💪 这批先背熟, 明天重测'}</div>
        <button onclick="closeSvGame()" style="padding:10px 30px;background:#4ECDC4;color:#FFF;border:none;border-radius:6px;font-weight:700;cursor:pointer">关闭</button>
      </div>
    `;
    modal.classList.add('show');
    return;
  }
  const q = g.questions[g.qIdx];
  // v19.14e (英语 P3): 改 zh → en typing production (原 en → zh 4 选 1 是 recognition, 对 AL5 孩子无效)
  // 心理学降门槛: 首字母提示 + Levenshtein ≤1 + 单复数容错 + 跳过按钮
  const showHint = g._showHint || false;
  const hintLetters = q.w.en.substring(0, Math.ceil(q.w.en.length / 3));  // 前 1/3 字母
  modal.innerHTML = `
    <div class="mg-inner" style="max-width:480px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
        <div style="font-size:13px;color:#1565C0;font-weight:700">📚 学科英语 · ${g.qIdx + 1}/${g.questions.length} · 中→英 production</div>
        <button onclick="closeSvGame()" style="background:rgba(255,255,255,0.10);border:2px solid var(--color-text);color:var(--color-text);width:34px;height:34px;border-radius:50%;font-size:20px;font-weight:900;cursor:pointer;line-height:1;display:flex;align-items:center;justify-content:center">×</button>
      </div>
      <div style="text-align:center;background:#E3F2FD;border-radius:8px;padding:18px;margin-bottom:12px">
        <div style="font-size:11px;color:#1565C0;margin-bottom:4px">${q.w.cat}</div>
        <div style="font-size:26px;color:#0D47A1;font-weight:900">${escapeHtml(q.w.zh)}</div>
        <div style="font-size:11px;color:#888;margin-top:6px">敲出英文 (大小写不计 · 拼写容错 ≤1 字母 · 单复数都行)</div>
      </div>
      <input id="svInput" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false"
             placeholder="${showHint ? `首字母: ${hintLetters}___` : '在这里敲英文 (Enter 提交)'}"
             style="width:100%;padding:12px;font-size:18px;border:2px solid #1565C0;border-radius:6px;box-sizing:border-box;margin-bottom:8px"
             onkeydown="if(event.key==='Enter'){event.preventDefault();svSubmitTyping();}">
      <div style="display:flex;gap:6px">
        <button onclick="svHint()" style="flex:1;padding:8px;background:#FFA000;color:#FFF;border:none;border-radius:6px;font-weight:700;font-size:12px;cursor:pointer">💡 首字母提示</button>
        <button onclick="svSkip()" style="flex:1;padding:8px;background:#9E9E9E;color:#FFF;border:none;border-radius:6px;font-weight:700;font-size:12px;cursor:pointer">⏭ 跳过</button>
        <button onclick="svSubmitTyping()" style="flex:2;padding:8px;background:linear-gradient(135deg,#1565C0,#0D47A1);color:#FFF;border:none;border-radius:6px;font-weight:900;font-size:13px;cursor:pointer">提交</button>
      </div>
    </div>
  `;
  modal.classList.add('show');
  // 自动 focus + 3s 无输入弹首字母提示
  setTimeout(() => {
    const inp = document.getElementById('svInput');
    if (inp) inp.focus();
  }, 80);
  if (g._hintTimer) clearTimeout(g._hintTimer);
  if (!showHint) {
    g._hintTimer = setTimeout(() => {
      const inp = document.getElementById('svInput');
      if (inp && !inp.value) {
        inp.placeholder = `想 3 秒了? 首字母: ${hintLetters}___`;
      }
    }, 3000);
  }
}

// Levenshtein 距离 (简版, 用于词汇拼写容错)
function _levenshtein(a, b) {
  const m = a.length, n = b.length;
  if (!m) return n;
  if (!n) return m;
  const d = Array.from({length: m + 1}, (_, i) => [i, ...Array(n).fill(0)]);
  for (let j = 0; j <= n; j++) d[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      d[i][j] = a[i-1] === b[j-1] ? d[i-1][j-1] : 1 + Math.min(d[i-1][j-1], d[i-1][j], d[i][j-1]);
    }
  }
  return d[m][n];
}

function svHint() {
  if (!_svGame) return;
  _svGame._showHint = true;
  _renderSvGame();
}

function svSkip() {
  const g = _svGame;
  if (!g) return;
  const q = g.questions[g.qIdx];
  // 跳过 = 当作答错, 加入错题本但不扣分
  if (window.addToErrorBank) {
    window.addToErrorBank(state, {
      gameKey: 'subject_vocab', type: 'typing',
      q: q.w.zh, correctAns: q.w.en,
      explain: `${q.w.zh} = ${q.w.en} (跳过, 没敲)`,
      topic: q.w.cat
    });
  }
  // 显示答案 1 秒再下一题
  const modal = document.getElementById('svGameModal');
  if (modal) {
    const inp = modal.querySelector('#svInput');
    if (inp) {
      inp.value = q.w.en;
      inp.style.borderColor = '#9E9E9E';
      inp.style.background = '#F5F5F5';
    }
  }
  setTimeout(() => { g._showHint = false; g.qIdx++; _renderSvGame(); }, 1100);
}

function svSubmitTyping() {
  const g = _svGame;
  if (!g) return;
  const inp = document.getElementById('svInput');
  if (!inp) return;
  const userTyped = (inp.value || '').trim();
  if (!userTyped) { showToast('请先敲入英文 (或点跳过)', 'warn'); inp.focus(); return; }
  const q = g.questions[g.qIdx];
  const target = q.w.en.toLowerCase().trim();
  const typed = userTyped.toLowerCase();
  // 容错: 完全相等 / Levenshtein ≤ 1 / 单复数 +/- s, es, y→ies
  const lev = _levenshtein(typed, target);
  const isPluralVariant =
    typed === target + 's' || typed + 's' === target ||
    typed === target + 'es' || typed + 'es' === target ||
    (target.endsWith('y') && typed === target.slice(0, -1) + 'ies') ||
    (typed.endsWith('y') && target === typed.slice(0, -1) + 'ies');
  const ok = typed === target || lev <= 1 || isPluralVariant;
  if (ok) {
    g.correct++;
    playSound && playSound('ding');
    inp.style.borderColor = '#4CAF50';
    inp.style.background = '#E8F5E9';
  } else {
    playSound && playSound('sad');
    // 加入错题本 + 拼写错误本
    if (!state.spellingErrors) state.spellingErrors = [];
    state.spellingErrors.push({
      zh: q.w.zh, target: q.w.en, typed: userTyped,
      date: Date.now(), cat: q.w.cat, lev
    });
    if (state.spellingErrors.length > 200) state.spellingErrors = state.spellingErrors.slice(-200);
    if (window.addToErrorBank) {
      window.addToErrorBank(state, {
        gameKey: 'subject_vocab', type: 'typing',
        q: q.w.zh, correctAns: q.w.en,
        explain: `${q.w.zh} = ${q.w.en} (你写: ${userTyped}, lev=${lev})`,
        topic: q.w.cat
      });
    }
    inp.style.borderColor = '#FF6B6B';
    inp.style.background = '#FFEBEE';
    // 显示正确答案
    setTimeout(() => {
      inp.value = `${userTyped} → ${q.w.en}`;
    }, 150);
  }
  if (g._hintTimer) { clearTimeout(g._hintTimer); g._hintTimer = null; }
  // 1.5s 后下一题
  setTimeout(() => { g._showHint = false; g.qIdx++; _renderSvGame(); }, ok ? 900 : 1800);
}
function svPick(i) {
  const g = _svGame;
  if (!g) return;
  const q = g.questions[g.qIdx];
  const isRight = i === q.correctIdx;
  if (isRight) {
    g.correct++;
    playSound && playSound('ding');
  } else {
    playSound && playSound('sad');
    if (window.addToErrorBank) {
      window.addToErrorBank(state, {
        gameKey: 'subject_vocab',
        type: 'mcq',
        q: `${q.w.en} (${q.w.cat})`,
        correctAns: q.w.zh,
        explain: `${q.w.en} = ${q.w.zh}`,
        topic: q.w.cat
      });
    }
  }
  // 显示一秒结果再下一题
  const modal = document.getElementById('svGameModal');
  if (modal) {
    const btns = modal.querySelectorAll('button[onclick^="svPick"]');
    btns.forEach((b, idx) => {
      if (idx === q.correctIdx) b.style.background = '#C8E6C9';
      if (idx === i && !isRight) b.style.background = '#FFCDD2';
      b.disabled = true;
    });
  }
  setTimeout(() => { g.qIdx++; _renderSvGame(); }, 900);
}
function closeSvGame() {
  const m = document.getElementById('svGameModal');
  if (m) { m.classList.remove('show'); m.innerHTML = ''; }
  _svGame = null;
  if (typeof renderAll === 'function') renderAll();
}
window.openSubjectVocabGame = openSubjectVocabGame;
window.svPick = svPick;
window.svSubmitTyping = svSubmitTyping;
window.svHint = svHint;
window.svSkip = svSkip;
window._levenshtein = _levenshtein;
window.closeSvGame = closeSvGame;

// --------- 5. 科学章节里程碑卡 (W1-W14 P3-P4 系统过) ---------
function renderScienceChapterCard() {
  const card = document.getElementById('scienceChapterCard');
  if (!card || !window.getCurrentScienceChapter) return;
  const week = state.currentWeek || 1;
  const cur = window.getCurrentScienceChapter(week);
  const next = (window.SCIENCE_CHAPTERS || []).find(c => c.weeks[0] > week);
  const weekInChapter = week - cur.weeks[0] + 1;
  const chapterWeeks = cur.weeks[1] - cur.weeks[0] + 1;
  const diffColor = cur.difficulty === '难' ? '#C62828' : cur.difficulty === '中' ? '#FFA000' : cur.difficulty === '易' ? '#2E7D32' : '#7B1FA2';
  const diagramBtn = cur.diagram ? `<button onclick="openConceptDiagram('${cur.diagram}')" style="padding:8px 12px;background:linear-gradient(135deg,#2E7D32,#1B5E20);color:#FFF;border:none;border-radius:6px;font-weight:700;font-size:12px;cursor:pointer;margin-top:6px">🗺️ 看本章概念图</button>` : '';
  card.innerHTML = `
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
      <div style="font-size:14px;font-weight:900;color:#2E7D32">🔬 本周科学 (W${week})</div>
      <div style="margin-left:auto;font-size:11px;color:#666">手册 v14 P3-P4 系统过</div>
    </div>
    <div style="background:#E8F5E9;border-radius:8px;padding:10px;margin-bottom:6px">
      <div style="display:flex;align-items:center;gap:6px;margin-bottom:6px">
        <span style="font-size:15px;font-weight:900;color:#1B5E20">${escapeHtml(cur.title)} ${cur.stars}</span>
        <span style="margin-left:auto;padding:2px 8px;background:${diffColor};color:#FFF;border-radius:3px;font-size:10px;font-weight:700">${cur.difficulty}</span>
      </div>
      <div style="font-size:12px;color:#388E3C;margin-bottom:4px">🎯 ${escapeHtml(cur.focus)}</div>
      <div style="font-size:10px;color:#666">第 ${weekInChapter}/${chapterWeeks} 周 · 章节范围 W${cur.weeks[0]}-W${cur.weeks[1]}</div>
    </div>
    ${diagramBtn}
    <div style="display:flex;gap:6px;margin-top:6px">
      <button onclick="openScienceOEGame()" style="flex:1;padding:8px;background:#FFA000;color:#FFF;border:none;border-radius:6px;font-weight:700;font-size:12px;cursor:pointer">🧪 OE 答题训练</button>
      <button onclick="openSciMcqGame && openSciMcqGame()" style="flex:1;padding:8px;background:#7B1FA2;color:#FFF;border:none;border-radius:6px;font-weight:700;font-size:12px;cursor:pointer">🔬 科学 MCQ</button>
    </div>
    ${next ? `<div style="font-size:10px;color:#888;margin-top:6px;text-align:center">下章 W${next.weeks[0]}: ${escapeHtml(next.title)} ${next.stars}</div>` : ''}
  `;
}
window.renderScienceChapterCard = renderScienceChapterCard;

// --------- 6. 科学 OE 答题训练 mini-game ---------
let _sciOeGame = null;
// v19.14f (科学专家新发现 #3): OE 入口也按章节过滤 — 章节卡承诺兑现
function openScienceOEGame(chapterFilter) {
  if (!window.SCIENCE_OE_QUESTIONS) { showToast('OE 题库未加载', 'warn'); return; }
  const cur = chapterFilter
    ? (window.SCIENCE_CHAPTERS || []).find(c => c.chapterId === chapterFilter)
    : (window.getCurrentScienceChapter ? window.getCurrentScienceChapter(state.currentWeek || 1) : null);
  const all = window.SCIENCE_OE_QUESTIONS.slice();
  let pool = all;
  if (cur && cur.keywords && cur.keywords.length) {
    const kws = cur.keywords.map(k => k.toLowerCase());
    const onChapter = all.filter(q => {
      const text = ((q.topic || '') + ' ' + q.q + ' ' + (q.model || '')).toLowerCase();
      return kws.some(k => text.includes(k));
    });
    if (onChapter.length >= 3) {
      // 本章 + 1-2 题综合
      const otherPool = all.filter(q => !onChapter.includes(q));
      const supplementCount = Math.max(0, 5 - onChapter.length);
      pool = [...onChapter, ...otherPool.sort(() => Math.random()-0.5).slice(0, supplementCount + 2)];
      setTimeout(() => showToast(`🧪 ${cur.title} 章节 ${onChapter.length} 题`, 'success'), 100);
    }
  }
  const shuffled = pool.sort(() => Math.random() - 0.5).slice(0, 5);
  _sciOeGame = { questions: shuffled, qIdx: 0, scores: [], answers: [], step: 'principles', chapter: cur };
  _renderSciOe();
}
function _renderSciOe() {
  const g = _sciOeGame;
  if (!g) return;
  let modal = document.getElementById('sciOeModal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'sciOeModal';
    modal.className = 'mb-result-modal';
    document.body.appendChild(modal);
  }
  // 第 0 步: 先看 5 条 OE 原则
  if (g.step === 'principles') {
    const rules = (window.SCIENCE_OE_PRINCIPLES || []).map((r, i) => `
      <div style="background:#FFF;border-left:3px solid #C62828;padding:6px 10px;margin-bottom:6px">
        <div style="font-size:12px;color:#C62828;font-weight:900">${i+1}. ${escapeHtml(r.rule)}</div>
        <div style="font-size:11px;color:#555;margin-top:2px">${escapeHtml(r.why)}</div>
      </div>
    `).join('');
    modal.innerHTML = `
      <div class="mg-inner" style="max-width:520px">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
          <div style="font-size:14px;font-weight:900;color:#E65100">🧪 PSLE 科学 OE 答题 5 原则</div>
          <button onclick="closeSciOe()" style="background:rgba(255,255,255,0.10);border:2px solid var(--color-text);color:var(--color-text);width:34px;height:34px;border-radius:50%;font-size:20px;font-weight:900;cursor:pointer;line-height:1;display:flex;align-items:center;justify-content:center">×</button>
        </div>
        <div style="background:#FFEBEE;border-radius:6px;padding:10px;margin-bottom:10px">
          ${rules}
        </div>
        <button onclick="sciOeStart()" style="width:100%;padding:12px;background:linear-gradient(135deg,#FFA000,#E65100);color:#FFF;border:none;border-radius:6px;font-weight:900;cursor:pointer">⏯️ 开始练 5 题 OE</button>
      </div>
    `;
    modal.classList.add('show');
    return;
  }
  // 完成
  if (g.qIdx >= g.questions.length) {
    const total = g.scores.reduce((a,b) => a+b, 0);
    const max = g.questions.length * 2;
    const pct = Math.round(total / max * 100);
    state.totalPoints = (state.totalPoints || 0) + total * 3;
    if (window.recordGameRun) window.recordGameRun(state, 'sci_oe', total, max);
    if (window.saveState) window.saveState(state);
    modal.innerHTML = `
      <div class="mg-inner" style="max-width:520px;text-align:center">
        <div style="font-size:18px;font-weight:900;margin-bottom:10px">🧪 OE 训练完成!</div>
        <div style="font-size:30px;color:${pct>=80?'#4ECDC4':pct>=50?'#FFA500':'#FF6B6B'};font-weight:900;margin:14px 0">${total} / ${max} 分</div>
        <div style="color:#666;margin-bottom:12px">+${total * 3} 积分 · ${pct >= 80 ? '🌟 OE 模板熟练!' : pct >= 50 ? '👍 不错, 多对照 model answer 找差距' : '💪 重温 5 条原则, 关键词必须用上'}</div>
        <button onclick="closeSciOe()" style="padding:10px 30px;background:#4ECDC4;color:#FFF;border:none;border-radius:6px;font-weight:700;cursor:pointer">关闭</button>
      </div>
    `;
    return;
  }
  // 答题
  const q = g.questions[g.qIdx];
  const showModel = g.scores[g.qIdx] !== undefined;
  // 检查孩子答案
  const userAns = (g.answers[g.qIdx] || '').trim();
  let warnings = [];
  if (userAns) {
    const lowerAns = userAns.toLowerCase();
    // v19.14d: 加强弱 opener 检测 (含 I agree / It is / True / 反问)
    const weakOpener = /^(yes[\.,\s]|no[\.,\s]|yes$|no$|i\s+agree|it\s+is|true[\.,\s]|true$|false[\.,\s]|false$|sure[\.,\s])/i;
    if (weakOpener.test(userAns)) warnings.push('❌ 不能用 Yes/No/I agree/It is/True 等弱 opener 开头 (PSLE 直接 0 分)');
    // v19.14f (科学专家新发现): 修子串匹配漏洞 — 用 word boundary + 词干, 防"heat"匹配"wheat"/"school"匹配"cool"
    const matchedKw = q.keywords.filter(k => {
      const stem = k.toLowerCase().replace(/(s|ed|ing|es|ies|ied|er|est)$/, '');
      const safeStem = stem.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');  // 转义特殊字符
      const re = new RegExp('\\b' + safeStem + '(s|ed|ing|es|ies|ied|er|est)?\\b', 'i');
      return re.test(userAns);
    });
    if (matchedKw.length < q.keywords.length / 2) {
      warnings.push(`⚠️ 关键词不够 (用了 ${matchedKw.length}/${q.keywords.length}: ${q.keywords.join(', ')})`);
    }
    if (lowerAns.length < 30) warnings.push('⚠️ 答案太短, OE 通常需 2-3 句');
  }
  modal.innerHTML = `
    <div class="mg-inner" style="max-width:560px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
        <div style="font-size:13px;color:#E65100;font-weight:700">🧪 科学 OE · ${g.qIdx + 1}/${g.questions.length} · ${q.topic}</div>
        <button onclick="closeSciOe()" style="background:rgba(255,255,255,0.10);border:2px solid var(--color-text);color:var(--color-text);width:34px;height:34px;border-radius:50%;font-size:20px;font-weight:900;cursor:pointer;line-height:1;display:flex;align-items:center;justify-content:center">×</button>
      </div>
      <div style="background:#FFF3E0;border-radius:6px;padding:10px;margin-bottom:10px">
        <div style="font-size:13px;color:#BF360C;font-weight:600;line-height:1.5">${escapeHtml(q.q)}</div>
      </div>
      ${showModel ? (() => {
        // v19.14d (科学专家 P1): 删用户 0/1/2 自评, 改硬规则自动评分
        // 规则: 关键词全中 → 2 / ≥⌈n/2⌉ → 1 / 否则 0; Yes/No opener 封顶 1; 长度 <50 封顶 1; 比较题缺 than → 封顶 1; 用 it 指代 → 封顶 1
        const userAnsTrim = userAns.trim();
        const lowerAns = userAnsTrim.toLowerCase();
        // v19.14f: 同上, word boundary + stem 词干, 防误判
        const matchedKw = q.keywords.filter(k => {
          const stem = k.toLowerCase().replace(/(s|ed|ing|es|ies|ied|er|est)$/, '');
          const safeStem = stem.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          const re = new RegExp('\\b' + safeStem + '(s|ed|ing|es|ies|ied|er|est)?\\b', 'i');
          return re.test(userAnsTrim);
        });
        const half = Math.ceil(q.keywords.length / 2);
        let autoScore = matchedKw.length >= q.keywords.length ? 2 : matchedKw.length >= half ? 1 : 0;
        const reasons = [];
        // 各种 cap 检查
        if (weakOpener.test(userAnsTrim)) { autoScore = Math.min(autoScore, 1); reasons.push('❌ 弱 opener → 封顶 1 分'); }
        if (lowerAns.length < 50) { autoScore = Math.min(autoScore, 1); reasons.push('⚠️ 答案 < 50 字符 → 封顶 1 分'); }
        // 比较题 (问 hotter/colder/faster/slower/larger 之类) 缺 than
        const isCompareQ = /(hotter|colder|faster|slower|larger|smaller|greater|less|more|better|brighter|denser)/i.test(q.q + ' ' + q.model);
        if (isCompareQ && !/\bthan\b/i.test(userAnsTrim)) { autoScore = Math.min(autoScore, 1); reasons.push('⚠️ 比较题缺 "than" → 封顶 1 分'); }
        // 用 it 模糊指代 (不带具体名词)
        if (/\bit\b\s+(is|has|was|will|can|does|gets)/i.test(userAnsTrim) && userAnsTrim.length < 120) {
          autoScore = Math.min(autoScore, 1); reasons.push('⚠️ 用 "it" 模糊指代 → 应重复名词');
        }
        // v19.14h (科学专家 #2): 反向题封顶 — 题问 INCORRECT/NOT/wrong 时, 答案必须有否定词, 否则封顶 1
        const isReverseQ = /\b(incorrect|not\s+correct|why\s+his\s+statement|wrong|why\s+is\s+this\s+wrong)\b/i.test(q.q) ||
                           /does\s+NOT|does\s+not|NOT\s+a\s+|NOT\s+digest|NOT\s+produce/i.test(q.model || '');
        if (isReverseQ) {
          const hasNegation = /\b(not|n['']t|cannot|never|no\s+|none|nor|neither)\b/i.test(userAnsTrim);
          if (!hasNegation) {
            autoScore = Math.min(autoScore, 1);
            reasons.push('❌ 反向题 (NOT/INCORRECT) 但答案无否定词 → 封顶 1 分');
          }
        }
        const scoreColor = autoScore === 2 ? '#2E7D32' : autoScore === 1 ? '#FFA000' : '#C62828';
        const scoreIcon = autoScore === 2 ? '✅' : autoScore === 1 ? '⚠️' : '❌';
        const nextLabel = (g.qIdx + 1 >= g.questions.length) ? '完成 →' : '下一题 →';
        return `
        <div style="background:#E8F5E9;border-left:3px solid #2E7D32;padding:10px;margin-bottom:10px">
          <div style="font-size:11px;color:#1B5E20;font-weight:900;margin-bottom:4px">✅ Model Answer (关键词: ${q.keywords.join(', ')})</div>
          <div style="font-size:12px;color:#1B5E20;line-height:1.6">${escapeHtml(q.model)}</div>
        </div>
        <div style="background:${autoScore === 0 ? '#FFEBEE' : autoScore === 1 ? '#FFF3E0' : '#E8F5E9'};border-left:4px solid ${scoreColor};border-radius:6px;padding:12px;margin-bottom:10px">
          <div style="font-size:18px;font-weight:900;color:${scoreColor};margin-bottom:6px">${scoreIcon} 自动评分: ${autoScore} / 2 分</div>
          <div style="font-size:11px;color:#555;line-height:1.5">
            <b>关键词命中</b>: ${matchedKw.length}/${q.keywords.length} (${matchedKw.length > 0 ? matchedKw.join(', ') : '无'})<br>
            <b>答案长度</b>: ${userAnsTrim.length} 字符 (≥50 才满分)<br>
            ${reasons.length ? '<b>扣分点</b>:<br>' + reasons.join('<br>') : '<b>✓ 无 opener / than / it 扣分</b>'}
          </div>
        </div>
        <button onclick="sciOeScore(${autoScore})" style="width:100%;padding:12px;background:linear-gradient(135deg,${scoreColor},${scoreColor});color:#FFF;border:none;border-radius:6px;font-weight:900;cursor:pointer;font-size:13px">${nextLabel}</button>
      `;
      })() : `
        <textarea id="sciOeInput" placeholder="用 2-3 句答, 必含关键词, 不能 Yes/No 开头..." style="width:100%;min-height:90px;padding:8px;border:1px solid #DDD;border-radius:6px;font-size:13px;font-family:inherit;box-sizing:border-box;margin-bottom:6px"></textarea>
        ${warnings.length ? `<div style="background:#FFF3E0;border-radius:4px;padding:6px;margin-bottom:8px;font-size:11px;color:#BF360C">${warnings.join('<br>')}</div>` : ''}
        <button onclick="sciOeCheck()" style="width:100%;padding:10px;background:linear-gradient(135deg,#FFA000,#E65100);color:#FFF;border:none;border-radius:6px;font-weight:700;cursor:pointer">📋 提交 + 看 Model Answer</button>
      `}
    </div>
  `;
  modal.classList.add('show');
}
function sciOeStart() {
  if (!_sciOeGame) return;
  _sciOeGame.step = 'questions';
  _renderSciOe();
}
function sciOeCheck() {
  const g = _sciOeGame;
  if (!g) return;
  const inp = document.getElementById('sciOeInput');
  g.answers[g.qIdx] = inp ? inp.value : '';
  g.scores[g.qIdx] = -1;  // 占位, 等用户自评
  _renderSciOe();
}
function sciOeScore(score) {
  const g = _sciOeGame;
  if (!g) return;
  g.scores[g.qIdx] = score;
  // 如果 0 分, 加入错题本
  if (score === 0 && window.addToErrorBank) {
    const q = g.questions[g.qIdx];
    window.addToErrorBank(state, {
      gameKey: 'sci_oe', type: 'oe',
      q: q.q,
      correctAns: q.model,
      explain: '关键词: ' + q.keywords.join(', '),
      topic: q.topic
    });
  }
  g.qIdx++;
  _renderSciOe();
}
function closeSciOe() {
  const m = document.getElementById('sciOeModal');
  if (m) { m.classList.remove('show'); m.innerHTML = ''; }
  _sciOeGame = null;
  if (typeof renderAll === 'function') renderAll();
}
window.openScienceOEGame = openScienceOEGame;
window.sciOeStart = sciOeStart;
window.sciOeCheck = sciOeCheck;
window.sciOeScore = sciOeScore;
window.closeSciOe = closeSciOe;

// --------- 7. 概念图 modal (4 张静态 SVG) ---------
function openConceptDiagram(id) {
  if (!window.getConceptDiagram) return;
  const d = window.getConceptDiagram(id);
  if (!d) { showToast('未找到概念图: ' + id, 'warn'); return; }
  let modal = document.getElementById('conceptDiagModal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'conceptDiagModal';
    modal.className = 'mb-result-modal';
    document.body.appendChild(modal);
  }
  modal.innerHTML = `
    <div class="mg-inner" style="max-width:900px;width:95%">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
        <div>
          <div style="font-size:15px;font-weight:900;color:#2E7D32">🗺️ ${escapeHtml(d.title)}</div>
          <div style="font-size:11px;color:#666">${escapeHtml(d.subtitle)}</div>
        </div>
        <button onclick="closeConceptDiagram()" style="background:rgba(255,255,255,0.10);border:2px solid var(--color-text);color:var(--color-text);width:36px;height:36px;border-radius:50%;font-size:22px;font-weight:900;cursor:pointer;line-height:1;display:flex;align-items:center;justify-content:center">×</button>
      </div>
      <div style="background:#FAFAFA;border-radius:6px;padding:6px;margin-bottom:10px;max-height:65vh;overflow:auto">
        ${d.svg}
      </div>
      <div style="background:#FFEBEE;border-left:3px solid #C62828;padding:8px 10px;border-radius:4px;font-size:12px;color:#C62828">
        💡 <b>核心要点</b>: ${escapeHtml(d.pitfall)}
      </div>
      <div style="display:flex;gap:6px;margin-top:10px;flex-wrap:wrap">
        ${['plant_transport', 'digestive', 'light', 'heat'].map(k => {
          const dd = window.getConceptDiagram(k);
          if (!dd) return '';
          const active = k === id;
          return `<button onclick="openConceptDiagram('${k}')" style="flex:1;min-width:100px;padding:8px;background:${active ? 'linear-gradient(135deg,#2E7D32,#1B5E20)' : '#FFF'};color:${active ? '#FFF' : '#2E7D32'};border:1px solid #2E7D32;border-radius:6px;font-weight:700;font-size:11px;cursor:pointer">${escapeHtml(dd.title.split(' — ')[0])}</button>`;
        }).join('')}
      </div>
    </div>
  `;
  modal.classList.add('show');
}
function closeConceptDiagram() {
  const m = document.getElementById('conceptDiagModal');
  if (m) { m.classList.remove('show'); m.innerHTML = ''; }
}
window.openConceptDiagram = openConceptDiagram;
window.closeConceptDiagram = closeConceptDiagram;

// v19.8 P0-2: 本周学习画像 (v19.12 移到二级 "我的" tab, 主页不渲染)
// 心理学原理: 内在动机需要"能力反馈"而不是"行为奖励"
function renderLearningPortraitCard() {
  const card = document.getElementById('learningPortraitCard');
  if (!card) return;
  const week = state.currentWeek || 1;
  // 本周打卡次数 (主线)
  const daysChecked = (() => {
    const w = state.daily?.[week];
    if (!w) return 0;
    return Object.keys(w).filter(d => Object.values(w[d] || {}).some(v => v)).length;
  })();
  // 本周 mini-game 数据 (用 logs 推算)
  const weekLogs = (state.logs || []).filter(l => l.week === week);
  const gameRuns = weekLogs.filter(l => /Game|游戏|mini-game/.test(l.reason || '')).length;
  // 知识树 ⭐ 总数
  const totalStars = Object.values(state.knowledgeStars || {}).reduce((s, e) => s + (e.stars || 0), 0);
  // v19.15h: 修 bug — 显示 raw state.gameStats.difficulty 可能 <4 (旧 state 持久化), 改用 getDifficulty 强制 minFloor=4
  const diffs = ['math', 'cloze', 'sst', 'grammar', 'editing', 'vocab'].map(k => ({
    key: k,
    label: {math:'数学', cloze:'Cloze', sst:'SST', grammar:'语法', editing:'改错', vocab:'词汇'}[k],
    diff: window.getDifficulty ? window.getDifficulty(state, k) : 4
  }));
  // Paper 2 突击进度
  const p2 = window.getPaper2SprintStatus ? window.getPaper2SprintStatus(state) : null;
  // 错题本数据
  const wrongs = state.wrongAnswers || [];
  const wrongByGame = wrongs.reduce((acc, w) => { acc[w.gameKey] = (acc[w.gameKey] || 0) + 1; return acc; }, {});

  // v19.15h: 整张卡改暗调 + 青色 accent (匹配主题)
  card.innerHTML = `
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px">
      <div style="font-size:14px;font-weight:900;color:#E0E0E0">📊 本周学习画像</div>
      <div style="margin-left:auto;font-size:11px;color:#94A3B8">W${week} · 实力数据 (不是积分)</div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px">
      <div style="background:linear-gradient(135deg, rgba(0,212,255,0.10), rgba(0,212,255,0.02));border-left:3px solid #4FC3F7;padding:6px 10px;border-radius:4px">
        <div style="font-size:10px;color:#A0A0A0">📅 打卡天数</div>
        <div style="font-size:16px;font-weight:900;color:#4FC3F7">${daysChecked}/7 天</div>
      </div>
      <div style="background:linear-gradient(135deg, rgba(255,138,101,0.10), rgba(255,138,101,0.02));border-left:3px solid #FF8A65;padding:6px 10px;border-radius:4px">
        <div style="font-size:10px;color:#A0A0A0">🎮 Mini-game 次数</div>
        <div style="font-size:16px;font-weight:900;color:#FF8A65">${gameRuns} 次</div>
      </div>
      <div style="background:linear-gradient(135deg, rgba(255,184,0,0.10), rgba(255,184,0,0.02));border-left:3px solid #FFB74D;padding:6px 10px;border-radius:4px">
        <div style="font-size:10px;color:#A0A0A0">⭐ 知识树掌握</div>
        <div style="font-size:16px;font-weight:900;color:#FFB74D">${totalStars}/105 ⭐</div>
      </div>
      <div style="background:linear-gradient(135deg, rgba(167,136,224,0.10), rgba(167,136,224,0.02));border-left:3px solid #B39DDB;padding:6px 10px;border-radius:4px">
        <div style="font-size:10px;color:#A0A0A0">📓 错题待清</div>
        <div style="font-size:16px;font-weight:900;color:#B39DDB">${wrongs.length} 题</div>
      </div>
    </div>
    <div style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:4px;padding:8px 10px;font-size:11px;line-height:1.8;color:#E0E0E0">
      <div style="font-weight:700;margin-bottom:4px;color:#4FC3F7">🎯 各科当前难度 <span style="font-weight:400;font-size:10px;color:#A0A0A0">(Lv 1-6, 起步 Lv 4, 最近 3 次 ≥80% 升级, 最近 2 次 ≤40% 降级)</span></div>
      ${diffs.map(d => `<span style="display:inline-block;margin-right:10px;font-weight:700;color:${d.diff >= 5 ? '#66FFB0' : d.diff >= 4 ? '#FFB74D' : '#EF5350'}">${d.label} Lv ${d.diff}</span>`).join('')}
    </div>
    ${p2 && (p2.cloze.done > 0 || p2.sst.done > 0) ? `
    <div style="background:linear-gradient(135deg, rgba(255,51,102,0.10), rgba(255,51,102,0.02));border:1px solid rgba(255,51,102,0.30);border-radius:4px;padding:8px 10px;font-size:11px;line-height:1.5;margin-top:6px;border-left:3px solid #FF3366">
      <div style="font-weight:700;color:#FF6B9D;margin-bottom:3px">🎯 Paper 2 突击进度</div>
      <div style="color:#E0E0E0">Cloze ${p2.cloze.done}/${p2.cloze.target} 题 ${p2.cloze.recentAcc !== null ? `· 近 5 次 ${p2.cloze.recentAcc}%` : ''}</div>
      <div style="color:#E0E0E0">SST ${p2.sst.done}/${p2.sst.target} 题 ${p2.sst.recentAcc !== null ? `· 近 5 次 ${p2.sst.recentAcc}%` : ''}</div>
    </div>` : ''}
    <div style="text-align:center;font-size:10px;color:#94A3B8;margin-top:6px;font-style:italic">
      💡 真正的进步看这里, 不在积分和装备
    </div>
  `;
}
window.renderLearningPortraitCard = renderLearningPortraitCard;

// v19.9: 错题本卡 (区分真考错题 + app 错题)
function renderErrorBankCard() {
  const card = document.getElementById('errorBankCard');
  if (!card) return;
  const wrongs = state.wrongAnswers || [];
  if (wrongs.length === 0) {
    card.style.display = 'none';
    return;
  }
  card.style.display = '';
  const realExam = wrongs.filter(w => w.source === 'paper2-real').length;
  const appErrors = wrongs.length - realExam;
  // v19.14j (UI 专家): "待复习" → "已收集 N 题" (绿系收集感), 进一步去羞耻
  // 颜色: 蓝灰 #607D8B → 绿 #66BB6A, 标签 "重点" → "已收集"
  card.style.borderLeft = '4px solid #66BB6A';
  // 算 Leitner 毕业进度 (collected = 答对至少 1 次的题数)
  const collectedItems = wrongs.filter(w => (w.correctStreak || 0) >= 1);
  const masteredItems = wrongs.filter(w => (w.correctStreak || 0) >= 2);
  card.innerHTML = `
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
      <div style="font-size:14px;font-weight:900;color:#2E7D32">📓 已收集 ${wrongs.length} 题 🌱</div>
      <div style="margin-left:auto;font-size:11px;color:#666">${collectedItems.length} 题已答对 1+ 次 · ${masteredItems.length} 题接近毕业</div>
    </div>
    ${realExam > 0 ? `
    <div style="background:linear-gradient(135deg,#E8F5E9,#C8E6C9);border:1px solid #81C784;border-radius:6px;padding:8px;margin-bottom:6px">
      <div style="display:flex;justify-content:space-between;align-items:center">
        <div style="font-size:12px;font-weight:900;color:#1B5E20">🌟 Paper 2 真题集 (${realExam} 题)</div>
        <button onclick="openErrorBank()" style="padding:4px 12px;background:#66BB6A;color:#FFF;border:none;border-radius:4px;font-size:11px;font-weight:700;cursor:pointer">练一题 →</button>
      </div>
      <div style="font-size:10px;color:#2E7D32;margin-top:4px">从 Paper 2 真考收集的精华题 · 连续 3 次答对自动毕业 +5 分</div>
    </div>` : ''}
    ${appErrors > 0 ? `
    <div style="background:#F1F8E9;border:1px solid #AED581;border-radius:6px;padding:8px">
      <div style="display:flex;justify-content:space-between;align-items:center">
        <div style="font-size:12px;color:#33691E">🌱 平日收集: ${appErrors} 题</div>
        ${realExam === 0 ? `<button onclick="openErrorBank()" style="padding:4px 12px;background:#66BB6A;color:#FFF;border:none;border-radius:4px;font-size:11px;font-weight:700;cursor:pointer">练 →</button>` : ''}
      </div>
    </div>` : ''}
  `;
}
window.renderErrorBankCard = renderErrorBankCard;

// ============= v19.5: 作文质量追踪卡 =============
function renderCompTrackerCard() {
  const el = document.getElementById('compTrackerCard');
  if (!el) return;
  const wn = state.currentWeek || 1;
  const status = getCompStatus(state, wn);
  const steps = [
    { key: 'submitted', label: '交稿', icon: '📝' },
    { key: 'reviewed', label: '批改', icon: '✏️' },
    { key: 'rewritten', label: '重写', icon: '🔄' }
  ];
  const done = steps.filter(s => status[s.key]).length;
  const pct = Math.round(done / 3 * 100);
  el.innerHTML = `
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
      <span style="font-size:18px">✒️</span>
      <span style="font-weight:600;font-size:14px">本周作文进度</span>
      <span style="margin-left:auto;font-size:12px;color:var(--color-text-light)">${done}/3 步</span>
    </div>
    <div style="display:flex;gap:6px;margin-bottom:8px">
      ${steps.map(s => `
        <button class="comp-step-btn ${status[s.key] ? 'done' : ''}" onclick="markCompStep('${s.key}')" ${status[s.key] ? 'disabled' : ''}>
          ${s.icon} ${s.label} ${status[s.key] ? '✅' : ''}
        </button>
      `).join('')}
    </div>
    <div style="height:4px;background:#eee;border-radius:2px;overflow:hidden">
      <div style="height:100%;width:${pct}%;background:linear-gradient(90deg,#10B981,#059669);transition:width .3s"></div>
    </div>
    ${done < 3 ? `<div style="font-size:11px;color:#D97706;margin-top:6px">⚠️ 完成全部 3 步才获得作文 slot 全额积分</div>` : `<div style="font-size:11px;color:#059669;margin-top:6px">✅ 本周作文完成! 积分全额发放</div>`}
  `;
  el.style.display = '';
}
function markCompStep(step) {
  setCompStep(state, state.currentWeek, step);
  saveState(state);
  renderAll();
  showToast('✒️ 作文进度已更新', 'success');
}

// ============= v19.5: 弱科挑战卡 =============
function renderWeakChallengeCard() {
  const el = document.getElementById('weakChallengeCard');
  if (!el) return;
  const challenge = getWeeklyWeakChallenge(state);
  if (!challenge) { el.style.display = 'none'; return; }
  const progress = getWeakChallengeProgress(state);
  const done = progress.done || 0;
  const required = challenge.required;
  const completed = done >= required;
  el.innerHTML = `
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
      <span style="font-size:18px">🎯</span>
      <span style="font-weight:600;font-size:14px">弱科挑战: ${challenge.subject}</span>
      <span style="margin-left:auto;font-size:12px;padding:2px 8px;border-radius:10px;background:${completed ? '#D1FAE5' : '#FEF3C7'};color:${completed ? '#065F46' : '#92400E'}">${done}/${required}</span>
    </div>
    <div style="font-size:12px;color:var(--color-text-light);margin-bottom:8px">
      本周做 ${required} 次 ${challenge.subject} mini-game 可获 +${challenge.bonus} 分 bonus
    </div>
    <div style="height:4px;background:#eee;border-radius:2px;overflow:hidden">
      <div style="height:100%;width:${Math.min(100, done/required*100)}%;background:linear-gradient(90deg,#F59E0B,#D97706);transition:width .3s"></div>
    </div>
    ${completed ? `<div style="font-size:11px;color:#059669;margin-top:6px">✅ 弱科挑战已完成! +${challenge.bonus} 分已发放</div>` : `<div style="font-size:11px;color:#6B7280;margin-top:6px">可玩: ${challenge.games.join(' / ')}</div>`}
  `;
  el.style.display = '';
}

// ============= v19.5: 模考诊断重点卡 =============
function renderFocusAreasCard() {
  const el = document.getElementById('focusAreasCard');
  if (!el) return;
  const areas = getFocusAreas(state);
  if (!areas || areas.length === 0) {
    // 显示"录入模考"入口
    el.innerHTML = `
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
        <span style="font-size:18px">📊</span>
        <span style="font-weight:600;font-size:14px">月度模考诊断</span>
      </div>
      <div style="font-size:12px;color:var(--color-text-light);margin-bottom:8px">录入模考成绩，自动生成下月训练重点</div>
      <button class="btn-sm" onclick="showMockExamInput()">📝 录入模考成绩</button>
    `;
    el.style.display = '';
    return;
  }
  const priorityColor = { high: '#DC2626', medium: '#D97706' };
  el.innerHTML = `
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
      <span style="font-size:18px">📊</span>
      <span style="font-weight:600;font-size:14px">训练重点 (模考诊断)</span>
      <button style="margin-left:auto;font-size:11px;padding:2px 6px;border:1px solid #ddd;border-radius:4px;cursor:pointer" onclick="showMockExamInput()">更新</button>
    </div>
    ${areas.map(a => `
      <div style="display:flex;align-items:center;gap:6px;padding:4px 0;border-bottom:1px solid #f0f0f0">
        <span style="font-size:10px;padding:1px 5px;border-radius:3px;background:${priorityColor[a.priority] || '#6B7280'}22;color:${priorityColor[a.priority] || '#6B7280'};font-weight:600">${a.priority === 'high' ? '紧急' : '关注'}</span>
        <span style="font-size:13px;font-weight:500">${a.subject}</span>
        <span style="font-size:11px;color:var(--color-text-light);margin-left:auto">${a.detail}</span>
      </div>
    `).join('')}
  `;
  el.style.display = '';
}

function showMockExamInput() {
  const html = `
    <div style="padding:16px">
      <h3 style="margin:0 0 12px">📝 录入本月模考成绩</h3>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
        <label style="font-size:12px">英语 <input id="mockEng" type="number" min="0" max="100" placeholder="0-100" style="width:100%;padding:6px;border:1px solid #ddd;border-radius:4px"></label>
        <label style="font-size:12px">数学 <input id="mockMath" type="number" min="0" max="100" placeholder="0-100" style="width:100%;padding:6px;border:1px solid #ddd;border-radius:4px"></label>
        <label style="font-size:12px">科学 <input id="mockSci" type="number" min="0" max="100" placeholder="0-100" style="width:100%;padding:6px;border:1px solid #ddd;border-radius:4px"></label>
        <label style="font-size:12px">华文 <input id="mockChi" type="number" min="0" max="100" placeholder="0-100" style="width:100%;padding:6px;border:1px solid #ddd;border-radius:4px"></label>
      </div>
      <div style="display:flex;gap:8px;margin-top:12px">
        <button class="btn-primary" onclick="submitMockExam()">提交</button>
        <button class="btn-sm" onclick="closeModal()">取消</button>
      </div>
    </div>
  `;
  showModal(html);
}
function submitMockExam() {
  const eng = parseInt(document.getElementById('mockEng').value) || 0;
  const math = parseInt(document.getElementById('mockMath').value) || 0;
  const sci = parseInt(document.getElementById('mockSci').value) || 0;
  const chi = parseInt(document.getElementById('mockChi').value) || 0;
  if (eng === 0 && math === 0 && sci === 0 && chi === 0) {
    showToast('请至少输入一科成绩', 'warn');
    return;
  }
  const areas = addMockExam(state, { eng, math, sci, chi });
  saveState(state);
  closeModal();
  renderAll();
  showToast(`📊 已录入模考 (英${eng}/数${math}/科${sci}/华${chi})`, 'success');
}

// ============= v19.5: 词汇闪卡页 =============
let _fcSession = null;

function renderVocabPage() {
  const el = document.getElementById('vocabPageContent');
  if (!el) return;
  if (_fcSession) { _renderFlashcardSession(); return; }
  const stats = getFlashcardStats(state);
  const due = getAllDueFlashcards(state);
  const dueCount = Math.min(due.length, 20);
  const pct = stats.total > 0 ? Math.round(stats.mastered / stats.total * 100) : 0;
  el.innerHTML = `
    <h2 style="margin:0 0 8px;font-size:18px">📇 PSLE 词汇闪卡</h2>
    <div style="display:flex;align-items:center;gap:12px;margin-bottom:12px">
      <span style="font-size:13px;color:var(--color-text-light)">已掌握 ${stats.mastered}/${stats.total}</span>
      <div style="flex:1;height:6px;background:#334155;border-radius:3px;overflow:hidden">
        <div style="height:100%;width:${pct}%;background:linear-gradient(90deg,#10B981,#059669);transition:width .3s"></div>
      </div>
      <span style="font-size:12px;font-weight:600;color:#10B981">${pct}%</span>
    </div>
    ${dueCount > 0 ? `
      <div class="card" style="margin-bottom:12px;border-left:3px solid #F59E0B">
        <div style="display:flex;align-items:center;justify-content:space-between">
          <div>
            <div style="font-weight:600;font-size:14px">🔥 今日待复习: ${dueCount} 词</div>
            <div style="font-size:11px;color:var(--color-text-light)">含 ${due.filter(d=>d.isNew).length} 个新词</div>
          </div>
          <button class="btn-primary" onclick="startFlashcardSession(null)">开始复习</button>
        </div>
      </div>
    ` : `<div class="card" style="margin-bottom:12px;border-left:3px solid #10B981"><div style="font-weight:600;color:#10B981">✅ 今日复习已完成!</div></div>`}
    <div style="font-size:14px;font-weight:600;margin-bottom:8px">卡组选择:</div>
    <div class="fc-deck-grid">
      ${FLASHCARD_DECKS.map(deck => {
        const mastered = deck.words.filter(w => state.flashcardSRS && state.flashcardSRS[w] && state.flashcardSRS[w].mastered).length;
        const deckDue = getFlashcardsDue(state, deck.id).length;
        return `<div class="fc-deck-item" onclick="startFlashcardSession('${deck.id}')">
          <div class="fc-deck-name">${deck.name}</div>
          <div class="fc-deck-progress">${mastered}/${deck.words.length} 掌握${deckDue > 0 ? ` · <span style="color:#F59E0B">${deckDue}词待复习</span>` : ''}</div>
        </div>`;
      }).join('')}
    </div>
    <div style="margin-top:16px;padding:12px;background:#1E293B;border-radius:8px">
      <div style="font-size:13px;font-weight:600;margin-bottom:6px">📊 艾宾浩斯进度</div>
      <div style="display:flex;gap:16px;font-size:12px;color:var(--color-text-light)">
        <span>🆕 新词: ${stats.newCount}</span>
        <span>📖 学习中: ${stats.learning}</span>
        <span>✅ 已掌握: ${stats.mastered}</span>
      </div>
    </div>
  `;
}

function startFlashcardSession(deckId) {
  let words;
  if (deckId) {
    words = getFlashcardsDue(state, deckId).slice(0, 15);
  } else {
    words = getAllDueFlashcards(state).slice(0, 20).map(d => d.word);
  }
  if (words.length === 0) { showToast('该卡组暂无待复习词', 'info'); return; }
  _fcSession = { words, idx: 0, flipped: false, results: [] };
  _renderFlashcardSession();
}

function _renderFlashcardSession() {
  const el = document.getElementById('vocabPageContent');
  if (!el || !_fcSession) return;
  const s = _fcSession;
  if (s.idx >= s.words.length) { _endFlashcardSession(); return; }
  const word = s.words[s.idx];
  const meaning = getVocabMeaning(word);
  const hardEntry = (window.VOCAB_HARD || []).find(v => v.en === word);
  const sentence = hardEntry ? hardEntry.sent : '';
  el.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">
      <button class="btn-sm" onclick="exitFlashcardSession()">← 返回</button>
      <span style="font-size:13px;color:var(--color-text-light)">${s.idx + 1} / ${s.words.length}</span>
    </div>
    <div class="fc-card ${s.flipped ? 'flipped' : ''}" onclick="flipFlashcard()">
      <div class="fc-card-inner">
        <div class="fc-card-front">
          <div class="fc-card-word">${word}</div>
          <div class="fc-card-hint">点击翻转看中文</div>
        </div>
        <div class="fc-card-back">
          <div class="fc-card-meaning">${meaning}</div>
          ${sentence ? `<div class="fc-card-sentence">${sentence}</div>` : ''}
        </div>
      </div>
    </div>
    <div class="fc-btns">
      <button class="fc-btn-dont" onclick="answerFlashcard(false)">❌ 不认识</button>
      <button class="fc-btn-know" onclick="answerFlashcard(true)">✅ 认识</button>
    </div>
    <div style="height:6px;background:#334155;border-radius:3px;margin-top:16px;overflow:hidden">
      <div style="height:100%;width:${Math.round((s.idx / s.words.length) * 100)}%;background:#60A5FA;transition:width .3s"></div>
    </div>
  `;
}

function flipFlashcard() {
  if (!_fcSession) return;
  _fcSession.flipped = !_fcSession.flipped;
  _renderFlashcardSession();
}

function answerFlashcard(correct) {
  if (!_fcSession) return;
  const word = _fcSession.words[_fcSession.idx];
  const result = reviewFlashcard(state, word, correct);
  _fcSession.results.push({ word, correct, pts: result.pts });
  _fcSession.idx++;
  _fcSession.flipped = false;
  saveState(state);
  _renderFlashcardSession();
}

function _endFlashcardSession() {
  const el = document.getElementById('vocabPageContent');
  if (!el || !_fcSession) return;
  const s = _fcSession;
  const correctCount = s.results.filter(r => r.correct).length;
  const totalPts = s.results.reduce((sum, r) => sum + r.pts, 0);
  el.innerHTML = `
    <div style="text-align:center;padding:24px 0">
      <div style="font-size:48px;margin-bottom:12px">🎉</div>
      <h3 style="margin:0 0 8px">本轮完成!</h3>
      <div style="font-size:14px;color:var(--color-text-light);margin-bottom:16px">
        认识 ${correctCount}/${s.words.length} · 获得 +${totalPts} 积分
      </div>
      <div style="display:flex;gap:8px;justify-content:center">
        <button class="btn-primary" onclick="exitFlashcardSession()">返回卡组</button>
        <button class="btn-sm" onclick="startFlashcardSession(null)">继续复习</button>
      </div>
    </div>
  `;
  _fcSession = null;
  renderHeader();
}

function exitFlashcardSession() {
  _fcSession = null;
  renderVocabPage();
}

// 主页闪卡入口卡
function renderFlashcardWidget() {
  const el = document.getElementById('flashcardWidgetCard');
  if (!el) return;
  const due = getAllDueFlashcards(state);
  const stats = getFlashcardStats(state);
  if (due.length === 0 && stats.mastered === 0) { el.style.display = 'none'; return; }
  const pct = stats.total > 0 ? Math.round(stats.mastered / stats.total * 100) : 0;
  el.innerHTML = `
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
      <span style="font-size:18px">📇</span>
      <span style="font-weight:600;font-size:14px">词汇闪卡</span>
      <span style="margin-left:auto;font-size:12px;color:${due.length > 0 ? '#F59E0B' : '#10B981'}">${due.length > 0 ? due.length + ' 词待复习' : '✅ 今日完成'}</span>
    </div>
    <div style="display:flex;align-items:center;gap:8px">
      <div style="flex:1;height:4px;background:#334155;border-radius:2px;overflow:hidden">
        <div style="height:100%;width:${pct}%;background:#10B981"></div>
      </div>
      <span style="font-size:11px;color:var(--color-text-light)">${stats.mastered}/${stats.total}</span>
    </div>
  `;
  el.style.display = '';
  el.style.cursor = 'pointer';
  el.onclick = () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.querySelector('[data-page="vocab"]').classList.add('active');
    document.getElementById('page-vocab').classList.add('active');
    renderVocabPage();
  };
}

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
// v19.15i: 防沉迷 — 我的 tab 装备/皮肤/宠物切换日次数封顶 (周末也限)
function _checkAvatarActionCap() {
  const today = new Date().toISOString().slice(0, 10);
  if (!state.dailyAvatarActions || state.dailyAvatarActions.date !== today) {
    state.dailyAvatarActions = { date: today, count: 0 };
  }
  const hard = window.DAILY_AVATAR_ACTIONS_HARD || 15;
  if (state.dailyAvatarActions.count >= hard) {
    showToast(`🔒 今日装备/皮肤/宠物切换已达 ${hard} 次, 明天再玩 · 真正进步在打卡和 mini-game`, 'warn');
    return false;
  }
  return true;
}
function _bumpAvatarAction() {
  const today = new Date().toISOString().slice(0, 10);
  if (!state.dailyAvatarActions || state.dailyAvatarActions.date !== today) {
    state.dailyAvatarActions = { date: today, count: 0 };
  }
  state.dailyAvatarActions.count++;
  const c = state.dailyAvatarActions.count;
  const soft = window.DAILY_AVATAR_ACTIONS_SOFT || 8;
  if (c === soft) {
    showToast(`🛋️ 今日装备/皮肤已切换 ${c} 次, 别忘学习 (PSLE 是 17 月马拉松)`, 'warn');
  }
}

function toggleEquipment(equipId) {
  const unlocked = CHAMUI.checkEquipmentUnlocked(equipId, state);
  if (!unlocked) { showToast('该装备还没解锁哦', 'sad'); return; }
  // v19.15i: 防沉迷封顶 (周末也限)
  if (!_checkAvatarActionCap()) return;
  // v19.14j: 撤回 v19.14c 装备平日 lock — 心理学家"5 lock 累积致弃用" + 用户反馈"周六还失灵"
  // 装备穿戴随时可用, 不再 lock
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
  _bumpAvatarAction();  // v19.15i 防沉迷计数
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
  // v19.15i: 防沉迷封顶
  if (!_checkAvatarActionCap()) return;
  // v19.14j: 撤回 v19.14c 皮肤平日 lock — 同装备, 不再阻挠
  state.activeSkin = skinId;
  _bumpAvatarAction();  // v19.15i 防沉迷计数
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
  // v19.15c: 过去周也可点击打卡 (走 carry-forward 路径或直接 toggleDailyCheck), 只对未来周设 view-only
  const isViewOnly = (week > state.currentWeek);
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
  // v19.14b: 用 getDailyTasksFiltered — 平日过滤掉数学/华文 slot, 周末注入 WSC/WUC 华文
  const dayTasksRaw = (window.getDailyTasksFiltered || getDailyTasks)(week, selectedDay);
  // v19.6: 加练池 slot (OR/WSE/WSL/WUE1/WUE2) 从打卡页彻底移除, 进本周池子
  const dayTasks = dayTasksRaw.filter(t => !(window.POOL_TARGET && window.POOL_TARGET[t.slot]));
  const allDoneToday = dayTasks.length > 0 && dayTasks.every(t => getDailyCheck(state, week, selectedDay, t.slot));

  // v19.2: 分层逻辑 (v19.6 后 tier 2/3 实际只剩 WSR/WSV/WUP 等已删除的软任务, dayTasks 已过滤)
  const tier1Tasks = dayTasks.filter(t => (SLOT_TIER[t.slot] || 3) === 1);
  const tier2Tasks = dayTasks.filter(t => (SLOT_TIER[t.slot] || 3) === 2);
  const tier3Tasks = dayTasks.filter(t => (SLOT_TIER[t.slot] || 3) === 3);
  const tier1AllDone = tier1Tasks.length > 0 && tier1Tasks.every(t => getDailyCheck(state, week, selectedDay, t.slot));
  const tier2AllDone = tier2Tasks.length === 0 || tier2Tasks.every(t => getDailyCheck(state, week, selectedDay, t.slot));
  const now = new Date();
  const pastBedtime = now.getHours() > BEDTIME_HOUR || (now.getHours() === BEDTIME_HOUR && now.getMinutes() >= BEDTIME_MIN);

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
      // v19.6: pool slot 已被 dayTasks filter 移除, 这里 tier 2/3 只剩软任务(若有), 默认收起
      const tierHidden = tier !== 1;
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
    // v19.6: 主线-only combo + 加练池引导 (删除老解锁钩 + 日完美 combo)
    if (tier1AllDone) {
      slotsHtml += `<div class="combo-banner" style="background:linear-gradient(135deg,rgba(0,255,136,0.08),rgba(0,212,255,0.06))">🎯 主线全勤! +${CORE_COMBO} 分 · 想加练去本周池子 👇</div>`;
      if (pastBedtime) {
        slotsHtml += `<div class="combo-hint">🌙 21:30 到了, 该休息了! 明天继续 💪</div>`;
      }
    } else {
      const coreLeft = tier1Tasks.filter(t => !getDailyCheck(state, week, selectedDay, t.slot)).length;
      slotsHtml += `<div class="combo-hint">🎯 主线还差 <b>${coreLeft}</b> 个 → 全勾拿 <b>+${CORE_COMBO}</b> 主线全勤奖</div>`;
    }
    // v19.6: 加练池卡 (主线下方, 始终显示)
    slotsHtml += renderWeeklyPoolCard(week);
    // v19.15c: 补做池 (carry-forward, 最近 4 周未打), 仅当前周显示
    if (week === state.currentWeek && window.getCarryForwardTasks) {
      const carryItems = window.getCarryForwardTasks(state, week, 4) || [];
      if (carryItems.length > 0) {
        const shown = carryItems.slice(0, 50);
        slotsHtml += `
          <details class="carry-forward-card" style="margin:14px 0;border:2px dashed rgba(255,184,0,0.45);border-radius:10px;padding:10px 14px;background:linear-gradient(135deg,rgba(255,184,0,0.06),rgba(255,107,53,0.04))">
            <summary style="cursor:pointer;font-weight:900;color:#FF9800;font-size:14px;list-style:none">
              📦 补做池 (${carryItems.length} 项, 最近 4 周) — 补打拿 ×0.7 分
            </summary>
            <div style="margin-top:10px;display:flex;flex-direction:column;gap:6px;font-size:13px">
              ${shown.map(c => `
                <div class="carry-item" style="display:flex;align-items:center;gap:10px;padding:10px 12px;background:rgba(0,0,0,0.18);border:1px solid rgba(255,184,0,0.25);border-radius:8px;cursor:pointer;transition:all 0.15s" onclick="doCarryForwardCheckin(${c.srcWeek},'${c.srcDay}','${escapeAttr(c.slot)}')">
                  <div style="font-size:10px;color:#FFB300;font-weight:700;white-space:nowrap">W${c.srcWeek} ${c.srcDay}</div>
                  <div style="flex:1;color:#E0E0E0">${escapeHtml(c.task)}</div>
                  <div style="font-weight:900;color:#FF9800;font-size:16px;white-space:nowrap">+${c.pts}</div>
                </div>
              `).join('')}
              ${carryItems.length > 50 ? `<div style="text-align:center;color:#888;font-size:11px;padding:6px">… 还有 ${carryItems.length - 50} 项 (本批先打前 50)</div>` : ''}
              <div style="text-align:center;color:#888;font-size:11px;padding:6px;line-height:1.5">💡 补打 ×0.7 分 · 不需照片 · 不计入今日封顶 · 鼓励补但不鼓励拖延</div>
            </div>
          </details>
        `;
      }
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

// ============ v19.6: 本周加练池 ============
// 5 项 (OR/WSE/WSL/WUE1/WUE2), 全部 1 次/周, 想做就点 [+1]
// 删 LS/VC/VB (mini-game 大厅替代) + 删 WSR/WSV/WUP (软任务非硬技能)
const POOL_SLOT_META = {
  OR:   { icon: '🗣️', name: 'Oral 口语录音 (35min)',    hint: '英语短语录音 + 自己回听', subj: '英语' },
  WSE:  { icon: '📝', name: '周四作业/错题集 (1h)',     hint: '周末优先做完, 趁记忆热',    subj: '英语' },
  WSL:  { icon: '🎧', name: '周末听力 4 步精听 (15min)', hint: '听感觉→挑生词→查记本→复听', subj: '英语' },
  WUE1: { icon: '📚', name: '美玲周五作业 part 1 (1h)',  hint: '英语作业核心部分',          subj: '英语' },
  WUE2: { icon: '✍️', name: '美玲周五作业 part 2 (45min)', hint: '+ cloze 收尾',           subj: '英语' }
};

function renderWeeklyPoolCard(week) {
  if (!window.POOL_TARGET) return '';
  const prog = window.getPoolProgress(state, week);
  const isCur = week === state.currentWeek;
  const expandKey = `pool_expanded_${week}`;
  const expanded = sessionStorage.getItem(expandKey) === '1';
  const headerCls = prog.full ? 'pool-card-full' : '';
  let rows = '';
  if (expanded) {
    rows = prog.items.map(it => {
      const meta = POOL_SLOT_META[it.slot] || { icon: '📋', name: it.slot, hint: '', subj: '' };
      const pts = (window.SLOT_BASE_POINTS && window.SLOT_BASE_POINTS[it.slot]) || 5;
      const done = it.done >= it.max;
      const btn = done
        ? `<span class="pool-done-tag">✓ 已做</span>`
        : (isCur
            ? `<button class="pool-add-btn" onclick="event.stopPropagation(); addPoolAndScore('${it.slot}')">＋ 做 1 次 (+${pts})</button>`
            : `<span class="pool-readonly-tag">只读</span>`);
      return `
        <div class="pool-row ${done ? 'pool-row-done' : ''}">
          <div class="pool-row-icon">${meta.icon}</div>
          <div class="pool-row-info">
            <div class="pool-row-name">${escapeHtml(meta.name)} <span class="pool-row-prog">${it.done}/${it.max}</span></div>
            <div class="pool-row-hint">${escapeHtml(meta.hint)}</div>
          </div>
          <div class="pool-row-action">${btn}</div>
        </div>`;
    }).join('');
  }
  const tipLine = `<div class="pool-tip">💡 想多练听力/词汇/华文 → 去 <b>mini-game 大厅</b> (做了不用打卡也练到)</div>`;
  const perfectLine = `<div class="pool-tip">🌟 主线 7 天全勤 + 池子 5/5 = 周完美 +${window.WEEKLY_PERFECT_BONUS || 30} 分</div>`;
  return `
    <div class="weekly-pool-card ${headerCls}">
      <div class="pool-header" onclick="event.stopPropagation(); _togglePoolCard('${expandKey}')">
        <div class="pool-header-left">
          <span class="pool-icon">📋</span>
          <span class="pool-title">本周加练池</span>
          <span class="pool-progress-num">${prog.done}/${prog.total}</span>
        </div>
        <div class="pool-header-right">
          <div class="pool-progress-bar"><div class="pool-progress-fill" style="width:${Math.round(prog.done/prog.total*100)}%"></div></div>
          <span class="pool-toggle">${expanded ? '▼' : '▶'}</span>
        </div>
      </div>
      ${expanded ? `<div class="pool-rows">${rows}${tipLine}${perfectLine}</div>` : ''}
    </div>`;
}

function _togglePoolCard(key) {
  const cur = sessionStorage.getItem(key) === '1';
  sessionStorage.setItem(key, cur ? '0' : '1');
  renderCheckinPage();
}
window._togglePoolCard = _togglePoolCard;

function addPoolAndScore(slotKey) {
  if (!window.POOL_TARGET || !window.POOL_TARGET[slotKey]) return;
  const week = state.currentWeek;
  const cur = ((state.weeklyPool && state.weeklyPool[week]) || {})[slotKey] || 0;
  const max = window.POOL_TARGET[slotKey];
  if (cur >= max) { showToast('本周该项已做满 ✓', 'warn'); return; }
  const ok = window.addPoolEntry(state, week, slotKey);
  if (!ok) return;
  const pts = (window.SLOT_BASE_POINTS && window.SLOT_BASE_POINTS[slotKey]) || 5;
  // v19.6: 池子加练 = 直接加分 (绕开 calcSlotReward 的 daily check 系统, 因为它不绑 day)
  state.totalPoints += pts;
  state.logs.push({
    reason: `📋 加练 ${slotKey} (本周 ${cur+1}/${max})`,
    points: pts,
    week,
    timestamp: Date.now()
  });
  showToast(`📋 +${pts} 分 · 本周加练池 ${cur+1}/${max}`, 'happy');
  playSound('ding');
  // 周完美判定
  _checkWeeklyPerfect(week);
  saveState(state);
  renderAll();
}
window.addPoolAndScore = addPoolAndScore;

function _checkWeeklyPerfect(week) {
  if (!window.calcWeeklyPerfect) return;
  const r = window.calcWeeklyPerfect(state, week);
  if (r.eligible && !r.given) {
    window.grantWeeklyPerfect(state, week);
    showToast(`🌟 周完美! +${window.WEEKLY_PERFECT_BONUS} 分 (主线全勤+池子 5/5)`, 'success');
    shakeScreen();
    spawnConfetti(window.innerWidth / 2, window.innerHeight / 3, 60);
    setTimeout(() => spawnFloatPoints(`🌟 周完美 +${window.WEEKLY_PERFECT_BONUS}!`, null, true), 200);
    playSound('tada');
  }
}
window._checkWeeklyPerfect = _checkWeeklyPerfect;

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
  // v19.3: 防连点冷却 2s → v19.10 改 3s (配合 recalc 兜底, 双保险防刷分)
  const cooldownKey = `${week}_${day}_${slot}`;
  const now = Date.now();
  if (!toggleDailyCheck._lastToggle) toggleDailyCheck._lastToggle = {};
  if (toggleDailyCheck._lastToggle[cooldownKey] && now - toggleDailyCheck._lastToggle[cooldownKey] < 3000) {
    showToast('⏳ 操作太快, 请稍等 3 秒', 'warn');
    return;
  }
  toggleDailyCheck._lastToggle[cooldownKey] = now;

  const oldPoints = state.totalPoints;
  const oldDayComplete = isDayComplete(state, week, day);
  const oldOnTrack = (calcWeekCompletion(week, state) || {}).onTrack;
  const wasChecked = getDailyCheck(state, week, day, slot);

  // v19.15c: 只 block 未来周 (防误勾), 过去周允许补打 (走暴击关 + 走"slot_carry"独立日志)
  if (!wasChecked && week > state.currentWeek) {
    showToast('⚠️ 不能提前打卡未来周', 'warn');
    return;
  }

  // v18.22 + v19.15b: 打卡必须先有照片 (取消勾选不限制). v19.15b 弹 modal 含 3 选项: 拍照/相册/软打卡-50%
  if (!wasChecked) {
    const hasPhoto = hasPhotoCached(week, day, slot);
    if (!hasPhoto) {
      pickPhotoForSlot(week, day, slot, true);  // fromGuard=true → 显示软打卡逃生口
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
    // v19.5: 质量门槛提示
    if (reward.qualityMult && reward.qualityMult < 1) {
      const subj = window.SLOT_SUBJECT && window.SLOT_SUBJECT[slot];
      setTimeout(() => showToast(`⚠️ ${subj || '该科'}正确率不足60%，积分×${reward.qualityMult} — 做 mini-game 提升!`, 'warn'), 600);
    }
    // v19.14a B1: 打卡分砸半 + 日封顶 5 项 + 周封顶 200
    const todayCount = window.countTodaySlotChecks ? window.countTodaySlotChecks(state) : 0;
    const weekTotal = window.calcWeekSlotPoints ? window.calcWeekSlotPoints(state, week) : 0;
    const DAILY_CAP = window.DAILY_SLOT_CAP || 5;
    const WEEK_CAP = window.WEEKLY_CHECKIN_CAP || 200;
    let v14_capReason = '';
    if (todayCount >= DAILY_CAP) {
      reward.pts = 0;
      v14_capReason = ` [日封顶 ${DAILY_CAP} 项, +0]`;
    } else if (weekTotal >= WEEK_CAP) {
      reward.pts = 0;
      v14_capReason = ` [周封顶 ${WEEK_CAP} 分, +0]`;
    } else if (weekTotal + reward.pts > WEEK_CAP) {
      reward.pts = Math.max(0, WEEK_CAP - weekTotal);
      v14_capReason = ` [周封顶剩 ${reward.pts}]`;
    }
    const critExtra = reward.pts - (reward.base || slotPoints(week, slot));
    if (critExtra > 0) {
      state.totalPoints += critExtra;
      if (!state.lifetimeEarned || state.totalPoints > state.lifetimeEarned) state.lifetimeEarned = state.totalPoints;
    } else if (reward.pts === 0) {
      // 完全被封顶: 不该把 base 也算进去 → 撤回前面 recalc 加的 base
      state.totalPoints = Math.max(0, state.totalPoints - (reward.base || slotPoints(week, slot)));
    }
    state.logs.push({
      reason: `✅ 打卡 W${week} ${day} ${slot}${reward.isCrit ? ' 💥暴击' : ''} +${reward.pts}${v14_capReason}`,
      points: critExtra,
      type: 'slot',
      week: state.currentWeek,
      timestamp: Date.now()
    });
    if (v14_capReason) showToast('⚠️ 打卡分' + v14_capReason.trim() + ' — 改去做 Cloze/SST 提英语 AL', 'warn');
  } else {
    // v19.3: 取消时找到对应的打卡log并扣回暴击分
    // v19.10: 修复 — 找不到 slot log 时 recalc 兜底, 不 push undo log (防快速连点刷分 bug)
    let undoAmount = 0;
    let foundIdx = -1;
    for (let i = state.logs.length - 1; i >= 0; i--) {
      const log = state.logs[i];
      if (log.type === 'slot' && log.reason && log.reason.includes(`W${week} ${day} ${slot}`)) {
        undoAmount = log.points || 0;
        foundIdx = i;
        break;
      }
    }
    if (foundIdx >= 0) {
      state.logs.splice(foundIdx, 1);
      if (undoAmount > 0) state.totalPoints = Math.max(0, state.totalPoints - undoAmount);
      state.logs.push({
        reason: `↩️ 取消 W${week} ${day} ${slot}`,
        points: -undoAmount,
        type: 'slot_undo',
        week: state.currentWeek,
        timestamp: Date.now()
      });
    } else {
      // v19.10: 找不到原 slot log (可能因快速连点导致 log 紊乱) — recalc 兜底, 不 push undo log
      console.warn(`[v19.10] 找不到 ${week}/${day}/${slot} 的 slot log, recalc 兜底防刷分`);
      recalcTotalPoints(state);
    }
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
      // v19.7: 降游戏性 — 删撒花 (只 toast)
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
        // v19.7: streak 里程碑保留小撒花 (真值得庆祝)
        spawnConfetti(window.innerWidth / 2, window.innerHeight / 2, 20);
      } else {
        // 普通累计
        showToast(`🔥 连续 ${streakBump.days} 天 — 不能断!`, 'happy');
      }
    }
    // 当日 combo 触发(撒花 + 震屏 + 大数字)
    if (newDayComplete && !oldDayComplete) {
      showToast(`🔥 当日全勾!全勤奖 +${DAY_COMBO_POINTS}`, 'success');
      // v19.7: 降游戏性 — 删震屏 + 撒花减半 + 删大字, 只保留 toast + 小撒花
      const cx = (evt && evt.clientX) || window.innerWidth / 2;
      const cy = (evt && evt.clientY) || window.innerHeight / 2;
      spawnConfetti(cx, cy, 15);
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
    // v19.6: 主线打卡可能凑齐周完美
    _checkWeeklyPerfect(week);
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
function pickPhotoForSlot(week, day, slot, fromGuard) {
  // v19.15d: 取消软打卡 — 必须上传作业照才能打卡 (用户决议 2026-05-23)
  // fromGuard=true 时显示强提示横幅, 但不再给"不传照片只标记"的逃生口
  const overlay = document.createElement('div');
  overlay.className = 'photo-source-modal';
  const guardHeader = fromGuard ? `
    <div class="photo-source-guard-banner">
      📸 <b>打卡必须先传作业照</b> · 防止假勾刷分 — 学习真过了才算
    </div>
  ` : '';
  overlay.innerHTML = `
    <div class="photo-source-card">
      ${guardHeader}
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

// v19.15b: 软打卡 — 无照片打卡, 分数 ×0.5, 标记 state.softCheckins 供后续审计/补传
function softCheckin(week, day, slot) {
  // v19.15c: 同 toggleDailyCheck, 只 block 未来周
  if (week > state.currentWeek) {
    showToast('⚠️ 不能提前打卡未来周', 'warn');
    return;
  }
  if (getDailyCheck(state, week, day, slot)) {
    showToast('已打过卡了, 重复无效', 'warn');
    return;
  }
  // 标记软打卡 (供后续审计 + 上传照片时补差)
  if (!state.softCheckins) state.softCheckins = {};
  state.softCheckins[`${week}_${day}_${slot}`] = { date: new Date().toISOString(), promotedAt: null };

  setDailyCheck(state, week, day, slot, true);
  recalcTotalPoints(state);

  // 计算软打卡奖励 (full reward × 0.5, 不给暴击)
  let reward = { pts: slotPoints(week, slot), isCrit: false, base: slotPoints(week, slot) };
  if (window.calcSlotReward) {
    reward = window.calcSlotReward(state, slot, week);
  }
  const fullPts = reward.pts || reward.base || slotPoints(week, slot);
  const softPts = Math.floor(fullPts * 0.5);
  // recalc 已加了 base, 现在调整到 soft (即 -base + softPts)
  const adjust = softPts - (reward.base || slotPoints(week, slot));
  state.totalPoints = Math.max(0, (state.totalPoints || 0) + adjust);
  if (!state.lifetimeEarned || state.totalPoints > state.lifetimeEarned) state.lifetimeEarned = state.totalPoints;

  state.logs.push({
    reason: `🤚 软打卡 W${week} ${day} ${slot} +${softPts} [无照片 ×0.5, 全 ${fullPts}]`,
    points: softPts,
    type: 'slot_soft',
    week: state.currentWeek,
    timestamp: Date.now()
  });
  saveState(state);
  showToast(`🤚 软打卡 +${softPts} 分 (×0.5, 全 ${fullPts}) · 传作业照可补差 +${fullPts - softPts}`, 'happy');
  renderAll();
}
window.softCheckin = softCheckin;

// v19.15c: 补打过去周未打的 slot (carry-forward), 给原分 × 0.7, 不需照片, 不计入今日封顶
function doCarryForwardCheckin(srcWeek, srcDay, slot) {
  if (srcWeek >= state.currentWeek) {
    showToast('⚠️ 补做只对过去周生效, 当前周走正常打卡', 'warn');
    return;
  }
  if (getDailyCheck(state, srcWeek, srcDay, slot)) {
    showToast('已打过, 重复无效', 'warn');
    renderAll();
    return;
  }
  const full = slotPoints(srcWeek, slot) || 0;
  const pts = Math.floor(full * 0.7);
  setDailyCheck(state, srcWeek, srcDay, slot, true);
  state.totalPoints = (state.totalPoints || 0) + pts;
  if (!state.lifetimeEarned || state.totalPoints > state.lifetimeEarned) state.lifetimeEarned = state.totalPoints;
  state.logs.push({
    reason: `🔁 补打 W${srcWeek} ${srcDay} ${slot} +${pts} (×0.7, 原 ${full})`,
    points: pts,
    type: 'slot_carry',
    week: state.currentWeek,  // log 归当前周 (用户操作时间), 但 srcWeek/srcDay/slot 可追溯原任务
    srcWeek, srcDay, slot,
    timestamp: Date.now()
  });
  saveState(state);
  showToast(`🔁 补打 W${srcWeek} ${srcDay} ${slot} +${pts} (×0.7, 原 ${full})`, 'happy');
  renderAll();
}
window.doCarryForwardCheckin = doCarryForwardCheckin;

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
      // v19.15b: 若此 slot 是软打卡过的, 补差另 50% 分 + 标记 promoted
      const softKey = `${week}_${day}_${slot}`;
      if (state.softCheckins && state.softCheckins[softKey] && !state.softCheckins[softKey].promotedAt) {
        let reward = { pts: slotPoints(week, slot), base: slotPoints(week, slot) };
        if (window.calcSlotReward) reward = window.calcSlotReward(state, slot, week);
        const fullPts = reward.pts || reward.base || slotPoints(week, slot);
        const promotedDelta = fullPts - Math.floor(fullPts * 0.5);
        state.totalPoints = (state.totalPoints || 0) + promotedDelta;
        if (!state.lifetimeEarned || state.totalPoints > state.lifetimeEarned) state.lifetimeEarned = state.totalPoints;
        state.softCheckins[softKey].promotedAt = new Date().toISOString();
        state.logs.push({
          reason: `📸 软打卡升级 W${week} ${day} ${slot} +${promotedDelta} (补差到全分 ${fullPts})`,
          points: promotedDelta,
          type: 'slot_soft_promote',
          week: state.currentWeek,
          timestamp: Date.now()
        });
        saveState(state);
        showToast(`🎉 软打卡升级 +${promotedDelta} 分! 现在 W${week} ${day} ${slot} 是全分 ${fullPts}`, 'happy');
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

// ============ v19.3: 每日挑战 mini-game 入口 ============
const _GAME_LABELS_HUB = { grammar: 'Grammar MCQ', cloze: 'Cloze 完形填空', vocab: '词汇连连看', math: '数学挑战', sst: 'SST 句型转换' };
const _GAME_SUBJECTS = { grammar: 'PSLE英语Paper2', cloze: 'PSLE英语Paper2', vocab: 'PSLE英语词汇', math: 'PSLE数学', sst: 'PSLE英语Paper2' };

function getTodayGameType() {
  const d = new Date().getDay(); // 0=Sun
  return ['grammar', 'cloze', 'sst', 'vocab', 'cloze', 'sst', 'grammar'][d];
}

function renderGameHubCard() {
  let el = document.getElementById('gameHubCard');
  if (!el) {
    el = document.createElement('div');
    el.id = 'gameHubCard';
    const heroSection = document.querySelector('.hero-section');
    if (heroSection) heroSection.parentNode.insertBefore(el, heroSection.nextSibling);
    else return;
  }
  const gameType = getTodayGameType();
  const diff = (state.gameStats && state.gameStats[gameType]) ? state.gameStats[gameType].difficulty : 4;
  const count = _getDailyGameCount(gameType);
  const rewardLabel = count === 0 ? '🎯 满奖' : '🔄 练习模式';

  el.innerHTML = `<div class="game-hub-card">
    <div class="game-hub-title">⚔️ 每日挑战 · ${_GAME_LABELS_HUB[gameType]}</div>
    <div class="game-hub-sub">${_GAME_SUBJECTS[gameType]}重点 · 难度 Lv${diff} · ${rewardLabel}</div>
    <button class="game-hub-btn" onclick="startDailyGame()">开始挑战!</button>
    <div style="margin-top:8px;text-align:center">
      <a href="javascript:void(0)" onclick="openMiniGameHub()" style="font-size:12px;color:var(--color-primary)">🎮 所有游戏大厅 (12 种 mini-game)</a>
    </div>
  </div>`;
}

function startDailyGame() {
  const gameType = getTodayGameType();
  _bumpDailyGameCount(gameType);
  saveState(state);
  switch (gameType) {
    case 'grammar': openGrammarGame(); break;
    case 'cloze': openClozeGame(); break;
    case 'vocab': openVocabGame(state.currentWeek); break;
    case 'math': openMathGame(); break;
    case 'sst': openSstGame(); break;
    default: openGrammarGame();
  }
}
window.startDailyGame = startDailyGame;

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
    state.gameDailyCount = { date: today, counts: { vocab: 0, math: 0, editing: 0, listen: 0, unit: 0, grammar: 0, cloze: 0, scilab: 0, sst: 0, comp_oe: 0, scimcq: 0, chinese: 0 } };
  }
  return state.gameDailyCount.counts[gameKey] || 0;
}
function _bumpDailyGameCount(gameKey) {
  _getDailyGameCount(gameKey);  // ensure init
  state.gameDailyCount.counts[gameKey] = (state.gameDailyCount.counts[gameKey] || 0) + 1;
  // v19.15 P0-3: 沉迷闸 — 每日 mini-game 总局数软提示 (10 软警告 / 15 强劝休息)
  const counts = state.gameDailyCount.counts || {};
  const totalToday = Object.values(counts).reduce((a, b) => a + (b || 0), 0);
  const soft = window.DAILY_GAME_SOFT_WARN || 10;
  const hard = window.DAILY_GAME_HARD_NUDGE || 15;
  if (totalToday === soft) {
    showToast(`🛋️ 今日已练 ${totalToday} 局, 注意休息 · PSLE 是 17 月马拉松, 不靠冲刺`, 'warn');
  } else if (totalToday === hard) {
    showToast(`🛑 今日 ${totalToday} 局太多了! 真的该关 app 休息了 (爸妈也心疼眼睛 + 大脑)`, 'warn');
  }
  return state.gameDailyCount.counts[gameKey];
}
// v19.4: 第 1 次满奖, 之后 0 分但可继续练习
function _getGameMultiplier(playNum) {
  return playNum === 1 ? 1 : 0;
}
function _getMultiplierLabel(playNum) {
  return playNum === 1 ? '满奖 100%' : '练习模式 (不计分)';
}
// 检查游戏是否可玩, 不可玩则弹提示并返回 false
function _checkGameDailyLock(gameKey) {
  // v19.14b: 平日 hard lock — math/chinese/unit 平日完全不能玩
  if (window.WEEKDAY_LOCKED_GAMES && window.WEEKDAY_LOCKED_GAMES.includes(gameKey)) {
    if (window.isWeekdayToday && window.isWeekdayToday()) {
      const gameLabel = { math: '数学速算', chinese: '华文 MCQ', unit: '单位换算' }[gameKey] || gameKey;
      showToast(`🔒 ${gameLabel} 周末才开放 — 平日全力攻英语 AL6 → AL2 (综合 AL 4-5 最大杠杆)`, 'warn');
      return false;
    }
  }
  // v19.4: 取消日次数锁, 允许无限练习 (第 2 次起不给积分, 但能玩)
  // v19.14a B6/B7: 弱科燃料 + 软门槛 — 强项 game 需先做 Paper 2 (Cloze/SST ≥ 5 题)
  if (window.STRONG_SUBJECT_GAMES && window.STRONG_SUBJECT_GAMES.includes(gameKey)) {
    const todayCnt = (state.gameDailyCount && state.gameDailyCount.counts) || {};
    const playedBefore = todayCnt[gameKey] || 0;
    const FREE_PLAYS = 2;  // 前 2 次免费 (弱科燃料)
    if (playedBefore < FREE_PLAYS) return true;
    // 第 3+ 次需 Paper 2 门槛
    const gateOpen = window.isPaper2GateOpen ? window.isPaper2GateOpen(state) : true;
    if (!gateOpen) {
      const cur = window.getTodayClozeSstCount ? window.getTodayClozeSstCount(state) : 0;
      showToast(`🔒 ${gameKey} 今日已玩 ${playedBefore} 次. 完成 5 题 Cloze 或 SST 解锁 (现 ${cur}/5)`, 'warn');
      // 弹打开 Paper 2 突击的对话框
      if (confirm(`💪 强项已玩 ${playedBefore} 次, 现在花 2 min 做 5 题 Cloze 解锁继续?\n\n(英语 AL6 → AL2 是综合 AL 4-5 的最大杠杆)`)) {
        if (window.openClozeGame) window.openClozeGame();
      }
      return false;
    }
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
    scilab:  { name: '🔬 科学快分类', open: 'openSciClassifyGame()' },
    sst:     { name: '🔄 SST 句型转换', open: 'openSstGame()' },
    comp_oe: { name: '📖 阅读理解 OE', open: 'openCompOeGame()' }
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
    editing: '🔍 Editing', vocab: '📚 词汇', listen: '🎧 听力', scilab: '🔬 科学',
    sci_oe: '🧪 科学 OE', subject_vocab: '📚 学科词汇', chinese: '🇨🇳 华文', sst: '🔄 SST', scimcq: '🧬 科学 MCQ'
  };
  const breakdown = Object.entries(byGame).map(([k, v]) =>
    `<div class="eb-stat"><span class="eb-stat-label">${GAME_LABEL[k] || k}</span><span class="eb-stat-num">${v}</span></div>`
  ).join('');
  // v19.14i (英语专家): Cloze 错题按 topic 主题聚类显示
  const byTopic = window.errorBankByTopic ? window.errorBankByTopic(state, 'cloze') : {};
  const TOPIC_LABEL = {
    travel: '✈️ travel', school: '🏫 school', nature: '🌳 nature', emotion: '😊 emotion',
    food: '🍱 food', family: '👨‍👩‍👧 family', sport: '⚽ sport', weather: '🌤 weather', general: '📦 general'
  };
  const topicEntries = Object.entries(byTopic).filter(([, v]) => v.count > 0);
  const topicHtml = topicEntries.length > 0 ? `
    <div style="margin-top:12px;background:#E3F2FD;border-radius:8px;padding:10px">
      <div style="font-size:13px;font-weight:900;color:#1565C0;margin-bottom:6px">🧩 Cloze 错题主题聚类 (按 PSLE 高频主题)</div>
      <div style="display:flex;flex-wrap:wrap;gap:6px">
        ${topicEntries.sort((a, b) => b[1].count - a[1].count).map(([t, v]) => `
          <div style="background:#FFF;border:1px solid #BBDEFB;border-radius:6px;padding:6px 10px;font-size:12px">
            <span style="font-weight:700">${TOPIC_LABEL[t] || t}</span>
            <span style="color:#1565C0;margin-left:4px">${v.count}</span>
            ${v.threeThingsCount > 0 ? `<span style="color:#4CAF50;margin-left:4px;font-size:10px">✓${v.threeThingsCount}</span>` : ''}
          </div>
        `).join('')}
      </div>
      <div style="font-size:10px;color:#666;margin-top:6px">💡 同主题词集中练 (手册 v14 方法): travel 错多 → 下周 5 题 travel 主题</div>
    </div>
  ` : '';
  modal.innerHTML = `
    <div class="kt-inner cn-reading-inner">
      <div class="kt-header">
        <div>
          <div class="kt-title">📓 待复习清单</div>
          <div class="kt-progress">共 <b>${wrongs.length}</b> 题待掌握 · Leitner 3 次答对毕业</div>
        </div>
        <button class="vocab-modal-close" onclick="closeErrorBank()">×</button>
      </div>
      <div style="background:#ECEFF1;border:2px dashed #607D8B;border-radius:10px;padding:12px;margin-bottom:12px;font-size:13px;color:#455A64">
        💡 错题反复练 = 真正消灭弱点。<b>连续 3 次答对</b>自动毕业, 每次 +1 巩固分, 毕业 +5 分。
      </div>
      <div class="eb-stats">${breakdown}</div>
      ${topicHtml}
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
  // v19.9: 真考错题优先 (paper2-real source 排前), 同源内随机
  const real = wrongs.filter(w => w.source === 'paper2-real').sort(() => Math.random() - 0.5);
  const others = wrongs.filter(w => w.source !== 'paper2-real').sort(() => Math.random() - 0.5);
  _errorBankState = { items: [...real, ...others], idx: 0, correct: 0, removed: [] };
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
  // v19.9: 真考错题红色高亮标记
  const isRealExam = item.source === 'paper2-real';
  const cardBg = isRealExam ? 'background:linear-gradient(135deg,#FFF0F0,#FFE0E0);border:2px solid #FF6B6B;' : '';
  const tagPrefix = isRealExam ? '🔥 真考错题 · ' : '';
  const tagBg = isRealExam ? 'background:#FF6B6B;color:#FFF' : 'background:rgba(0,212,255,0.1);color:var(--color-primary)';
  // v19.9: SST 类需要显示 rule
  const ruleHtml = item.rule ? `<div style="background:#FFF8E0;border-left:3px solid #FFA500;padding:6px 10px;margin-bottom:10px;font-size:12px;color:#5D4500"><b>📝 题目要求:</b> ${escapeHtml(item.rule)}</div>` : '';
  modal.innerHTML = `
    <div class="kt-inner cn-reading-inner" style="${cardBg}">
      <div class="kt-header">
        <div>
          <div class="kt-title">${isRealExam ? '🔥 ' : '📓 '}错题复习 · ${g.idx + 1}/${g.items.length}</div>
          <div class="kt-progress">✅ 已答对 ${g.correct} · 累计入库 ${(state.wrongAnswers||[]).length} 题</div>
        </div>
        <button class="vocab-modal-close" onclick="closeErrorBank()">×</button>
      </div>
      <div style="${tagBg};font-size:11px;padding:4px 10px;border-radius:6px;display:inline-block;margin-bottom:8px;font-weight:${isRealExam ? '900' : '400'}">${tagPrefix}${tag}${item.tag && isRealExam ? ' · ' + escapeHtml(item.tag) : ''}${item.subj ? ' · ' + escapeHtml(item.subj) : ''}${item.retries ? ' · 已重做 ' + item.retries + ' 次' : ''}</div>
      ${ruleHtml}
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
      // v19.15 P0-1: Leitner 巩固积分封顶 — 毕业一次性 +5, 不再每答对 +2 (防错题本变积分水泵)
      const w = (state.wrongAnswers || []).find(w => w.id === item.id);
      if (w) {
        w.correctStreak = (w.correctStreak || 0) + 1;
        const grad = window.LEITNER_GRADUATION || 3;
        if (w.correctStreak >= grad) {
          // v19.15a hotfix: 用 {force:true} 跳过 markErrorAnsweredCorrect 的内部 +1/+5
          // (否则会双重计分: mark +1 巩固 + mark +5 毕业 + 我们 +5 = +11/题)
          window.removeFromErrorBank(state, { force: true, id: item.id });
          g.removed.push(item.id);
          state.totalPoints = (state.totalPoints || 0) + 5;
          state.logs.push({ reason: '🎓 错题毕业 (Leitner 3 连对)', points: 5, week: state.currentWeek, timestamp: Date.now() });
          showToast('🎓 +5 错题毕业!', 'happy');
        } else {
          const intervals = [1, 3, 7];
          w.nextReview = Date.now() + (intervals[w.correctStreak - 1] || 7) * 86400000;
        }
      }
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
      // v19.15 P0-1: Leitner 巩固积分封顶 — 毕业一次性 +5, 不再每答对 +2 (防错题本变积分水泵)
      const w = (state.wrongAnswers || []).find(w => w.id === item.id);
      if (w) {
        w.correctStreak = (w.correctStreak || 0) + 1;
        const grad = window.LEITNER_GRADUATION || 3;
        if (w.correctStreak >= grad) {
          // v19.15a hotfix: 用 {force:true} 跳过 markErrorAnsweredCorrect 的内部 +1/+5
          // (否则会双重计分: mark +1 巩固 + mark +5 毕业 + 我们 +5 = +11/题)
          window.removeFromErrorBank(state, { force: true, id: item.id });
          g.removed.push(item.id);
          state.totalPoints = (state.totalPoints || 0) + 5;
          state.logs.push({ reason: '🎓 错题毕业 (Leitner 3 连对)', points: 5, week: state.currentWeek, timestamp: Date.now() });
          showToast('🎓 +5 错题毕业!', 'happy');
        } else {
          const intervals = [1, 3, 7];
          w.nextReview = Date.now() + (intervals[w.correctStreak - 1] || 7) * 86400000;
        }
      }
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

// ============ v18.31 + v19.14e P4: PSLE 作文 modal + 3 层"升级"闭环 + 模板词检查 ============
async function openCompositionModal(week) {
  const p = window.getCompositionPrompt(week);
  if (!p) { showToast('本周无作文题', 'sad'); return; }
  let modal = document.getElementById('compositionModal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'compositionModal';
    modal.className = 'kt-modal';
    document.body.appendChild(modal);
  }
  // v19.14e: 3 层照片槽 (Draft 1 / Draft 2 升级 / 老师批改)
  let hasV1 = false, hasV2 = false, hasTeacher = false, hasLegacy = false;
  try { hasV1 = !!((await window.photoGet(week, 'Wed', 'ESSAY_V1')) || {}).blob; } catch (e) {}
  try { hasV2 = !!((await window.photoGet(week, 'Wed', 'ESSAY_V2')) || {}).blob; } catch (e) {}
  try { hasTeacher = !!((await window.photoGet(week, 'Wed', 'ESSAY_TEACHER')) || {}).blob; } catch (e) {}
  try { hasLegacy = !!((await window.photoGet(week, 'Wed', 'ESSAY')) || {}).blob; } catch (e) {}
  // 兼容旧数据: 若有 legacy ESSAY, 当作 V1
  if (hasLegacy && !hasV1) hasV1 = true;

  // v19.14e: 模板词命中检查 (前 10 高级词, 孩子勾选用上的)
  if (!state.essayChecks) state.essayChecks = {};
  const checked = state.essayChecks[week] || {};
  const templateWords = (window.ESSAY_TEMPLATES && window.ESSAY_TEMPLATES.highVocab || []).slice(0, 10);
  const hitCount = templateWords.filter(w => checked[w.word]).length;
  const hitRatio = templateWords.length ? hitCount / templateWords.length : 0;
  // v19.14i (UI 专家 B 方案): 60% 锁改软提示 — 不锁上传, 但 V2 奖励按命中率调整 (+5 vs +10)
  const canUploadV2 = true;  // 永远可上传
  const hitTier = hitRatio >= 0.6 ? 'full' : hitRatio >= 0.3 ? 'half' : 'low';

  const picsHtml = p.pictures.map(pic => `<li>${escapeHtml(pic)}</li>`).join('');
  const wordCheckboxes = templateWords.map(w => `
    <label style="display:inline-flex;align-items:center;gap:3px;margin:2px 6px 2px 0;font-size:11px;cursor:pointer;padding:3px 6px;background:${checked[w.word] ? '#C8E6C9' : '#FFF'};border:1px solid #DDD;border-radius:3px">
      <input type="checkbox" ${checked[w.word] ? 'checked' : ''} onchange="toggleEssayCheck(${week}, '${escapeAttr(w.word)}')" style="margin:0">
      ${escapeHtml(w.word)}
    </label>
  `).join('');

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

      <!-- v19.14e P4: 3 层升级闭环 -->
      <div class="comp-section" style="background:linear-gradient(135deg,#FFF8E1,#FFE082);border-radius:8px;padding:12px;margin-top:10px">
        <div class="comp-label" style="color:#BF360C;font-weight:900">🔄 升级闭环 (手册 v14: 改 = 进步)</div>

        <div style="background:#FFF;border-radius:6px;padding:8px;margin-top:8px">
          <div style="display:flex;align-items:center;gap:8px;font-size:13px;font-weight:700">
            ${hasV1 ? '✅' : '①'} <span>Draft 1 (初稿)</span>
            <button onclick="uploadEssayV(${week}, 'V1')" style="margin-left:auto;padding:4px 10px;background:#1565C0;color:#FFF;border:none;border-radius:4px;font-size:11px;cursor:pointer">${hasV1 ? '🔄 替换' : '📷 上传'}</button>
            ${hasV1 ? `<button onclick="viewEssayV(${week}, 'V1')" style="padding:4px 8px;background:none;border:1px solid #1565C0;color:#1565C0;border-radius:4px;font-size:11px;cursor:pointer">查看</button>` : ''}
          </div>
        </div>

        <div style="background:#FFF;border-radius:6px;padding:8px;margin-top:6px">
          <div style="font-size:12px;font-weight:700;color:#5D4037;margin-bottom:4px">📋 模板词自查 (用了几个?)</div>
          <div style="line-height:1.8">${wordCheckboxes}</div>
          <div style="font-size:11px;color:${hitTier === 'full' ? '#2E7D32' : hitTier === 'half' ? '#FFA000' : '#FF6B6B'};margin-top:4px;font-weight:700">
            命中: ${hitCount}/${templateWords.length} (${Math.round(hitRatio*100)}%) ·
            ${hitTier === 'full' ? '✅ V2 升级奖 +10 分' : hitTier === 'half' ? '⚠️ V2 升级奖 +5 分 (≥60% 才 +10)' : '💪 V2 升级奖 +2 分 (≥30% 才 +5, ≥60% 才 +10)'}
          </div>
        </div>

        <div style="background:#FFF;border-radius:6px;padding:8px;margin-top:6px">
          <div style="display:flex;align-items:center;gap:8px;font-size:13px;font-weight:700">
            ${hasV2 ? '✅' : '②'} <span>Draft 2 (升级版 — 改 5 句不是重写全文)</span>
            <button onclick="uploadEssayV(${week}, 'V2')" style="margin-left:auto;padding:4px 10px;background:#7B1FA2;color:#FFF;border:none;border-radius:4px;font-size:11px;cursor:pointer">${hasV2 ? '🔄 替换' : '📷 上传'}</button>
            ${hasV2 ? `<button onclick="viewEssayV(${week}, 'V2')" style="padding:4px 8px;background:none;border:1px solid #7B1FA2;color:#7B1FA2;border-radius:4px;font-size:11px;cursor:pointer">查看</button>` : ''}
          </div>
          <div style="font-size:10px;color:#888;margin-top:4px">v19.14i: 不再硬锁 — V2 奖励按模板词命中率给 (+10/+5/+2), 鼓励真用词不假勾</div>
        </div>

        <div style="background:#FFF;border-radius:6px;padding:8px;margin-top:6px">
          <div style="display:flex;align-items:center;gap:8px;font-size:13px;font-weight:700">
            ${hasTeacher ? '✅' : '③'} <span>老师批改 (可选, 父母监督上传)</span>
            <button onclick="uploadEssayV(${week}, 'TEACHER')" style="margin-left:auto;padding:4px 10px;background:#2E7D32;color:#FFF;border:none;border-radius:4px;font-size:11px;cursor:pointer">${hasTeacher ? '🔄 替换' : '📷 上传'}</button>
            ${hasTeacher ? `<button onclick="viewEssayV(${week}, 'TEACHER')" style="padding:4px 8px;background:none;border:1px solid #2E7D32;color:#2E7D32;border-radius:4px;font-size:11px;cursor:pointer">查看</button>` : ''}
          </div>
        </div>

        ${(hasV1 && hasV2) ? `<div style="background:linear-gradient(135deg,#E8F5E9,#C8E6C9);border-radius:6px;padding:8px;margin-top:8px;text-align:center;font-size:12px;color:#1B5E20;font-weight:900">🎉 升级闭环已完成 +10 分! 这一周作文从"写完"升级到"练熟"</div>` : ''}
      </div>

      <div class="comp-actions" style="margin-top:10px">
        <button class="btn btn-secondary" onclick="openEssayLibrary()">📚 作文模板库 (背诵)</button>
      </div>
    </div>
  `;
  modal.classList.add('show');
}

// v19.14e P4: 模板词勾选
function toggleEssayCheck(week, word) {
  if (!state.essayChecks) state.essayChecks = {};
  if (!state.essayChecks[week]) state.essayChecks[week] = {};
  state.essayChecks[week][word] = !state.essayChecks[week][word];
  saveState(state);
  // 重 render modal 刷新命中率
  openCompositionModal(week);
}

// v19.14e P4: 上传指定版本 (V1 / V2 / TEACHER)
function uploadEssayV(week, version) {
  const slot = version === 'V1' ? 'ESSAY_V1' : version === 'V2' ? 'ESSAY_V2' : 'ESSAY_TEACHER';
  const label = version === 'V1' ? '初稿 Draft 1' : version === 'V2' ? '升级 Draft 2' : '老师批改';
  const overlay = document.createElement('div');
  overlay.className = 'photo-source-modal';
  overlay.innerHTML = `
    <div class="photo-source-card">
      <div class="photo-source-title">📝 上传 W${week} ${label}</div>
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
  overlay.addEventListener('click', async (e) => {
    if (e.target === overlay) overlay.remove();
    const btn = e.target.closest('.photo-source-btn');
    if (!btn) return;
    const source = btn.dataset.source;
    overlay.remove();
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    if (source === 'camera') input.capture = 'environment';
    input.onchange = async (ev) => {
      const file = ev.target.files && ev.target.files[0];
      if (!file) return;
      showToast('📤 压缩上传中…', 'success');
      try {
        const blob = await compressImage(file);
        await window.photoPut(week, 'Wed', slot, blob);
        await refreshPhotoKeyCache();
        // v19.14i (UI 专家 B): V2 奖励按模板词命中率分级 (+10/+5/+2), 鼓励真用词不假勾
        // v19.14h P0: 加 dedupe 防"替换上传"刷分
        if (version === 'V2') {
          const v1Rec = await window.photoGet(week, 'Wed', 'ESSAY_V1');
          if (!state.essayUpgradeBonus) state.essayUpgradeBonus = {};
          const alreadyAwarded = !!state.essayUpgradeBonus[week];
          if (v1Rec && v1Rec.blob && !alreadyAwarded) {
            // 算命中率决定奖励
            const checked = (state.essayChecks || {})[week] || {};
            const templateWordsT = (window.ESSAY_TEMPLATES && window.ESSAY_TEMPLATES.highVocab || []).slice(0, 10);
            const hitCntT = templateWordsT.filter(w => checked[w.word]).length;
            const hitRatioT = templateWordsT.length ? hitCntT / templateWordsT.length : 0;
            const bonus = hitRatioT >= 0.6 ? 10 : hitRatioT >= 0.3 ? 5 : 2;
            state.essayUpgradeBonus[week] = Date.now();
            state.totalPoints = (state.totalPoints || 0) + bonus;
            state.logs.push({ reason: `📝 W${week} 作文升级 (命中 ${Math.round(hitRatioT*100)}%) +${bonus}`, points: bonus, week: state.currentWeek, timestamp: Date.now() });
            saveState(state);
            showToast(`🎉 升级闭环完成 +${bonus} 分! (命中 ${hitCntT}/${templateWordsT.length} 模板词)`, 'happy');
          } else if (alreadyAwarded) {
            showToast(`✅ W${week} V2 已替换 (升级奖已发过)`, 'success');
          }
        }
        showToast(`📝 W${week} ${label}已存 (${Math.round(blob.size/1024)} KB)`, 'success');
        openCompositionModal(week);  // 刷新
      } catch (err) {
        console.error(err);
        showToast('❌ 上传失败:' + err.message, 'danger');
      }
    };
    document.body.appendChild(input);
    input.click();
    setTimeout(() => input.remove(), 5000);
  });
}

async function viewEssayV(week, version) {
  const slot = version === 'V1' ? 'ESSAY_V1' : version === 'V2' ? 'ESSAY_V2' : 'ESSAY_TEACHER';
  const label = version === 'V1' ? '初稿 Draft 1' : version === 'V2' ? '升级 Draft 2' : '老师批改';
  try {
    let rec = await window.photoGet(week, 'Wed', slot);
    // V1 fallback 旧 ESSAY
    if (version === 'V1' && (!rec || !rec.blob)) rec = await window.photoGet(week, 'Wed', 'ESSAY');
    if (!rec || !rec.blob) { showToast(`没找到 W${week} ${label}`, 'sad'); return; }
    const url = URL.createObjectURL(rec.blob);
    const overlay = document.createElement('div');
    overlay.className = 'photo-modal';
    overlay.innerHTML = `
      <div class="photo-modal-card">
        <div class="photo-modal-header">
          <div>
            <div class="photo-modal-title">📝 W${week} ${label}</div>
            <div class="photo-modal-meta">${Math.round(rec.size/1024)} KB</div>
          </div>
          <button class="photo-modal-close" onclick="this.closest('.photo-modal').remove(); URL.revokeObjectURL('${url}')">✕</button>
        </div>
        <img class="photo-modal-img" src="${url}" alt="${label} W${week}">
      </div>`;
    document.body.appendChild(overlay);
  } catch (e) {
    showToast('读取失败:' + e.message, 'danger');
  }
}

window.toggleEssayCheck = toggleEssayCheck;
window.uploadEssayV = uploadEssayV;
window.viewEssayV = viewEssayV;
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
  // v19.13: 作文 page 顶部加"模板库" (开头 5 + 转折 5 + 结尾 5 + 50 高级词)
  const T = window.ESSAY_TEMPLATES || { openings:[], transitions:[], endings:[], highVocab:[] };
  const renderTpl = (arr, color) => arr.map(t => `
    <details style="background:#FFF;border-left:3px solid ${color};border-radius:4px;padding:6px 10px;margin-bottom:6px">
      <summary style="cursor:pointer;font-size:13px;font-weight:700;color:${color}">${escapeHtml(t.label)} <span style="font-size:10px;color:#888;font-weight:400">— ${escapeHtml(t.usage)}</span></summary>
      <div style="font-size:12px;color:#333;line-height:1.6;margin-top:6px;font-style:italic">"${escapeHtml(t.tpl)}"</div>
    </details>
  `).join('');
  const vocabHtml = T.highVocab.map(v => `
    <details style="background:#F5F5F5;border-radius:4px;padding:4px 8px;margin-bottom:3px">
      <summary style="cursor:pointer;font-size:12px;font-weight:700;color:#1565C0">${escapeHtml(v.word)} <span style="color:#666;font-weight:400">— ${escapeHtml(v.meaning)}</span></summary>
      <div style="font-size:11px;color:#555;margin-top:4px;font-style:italic">e.g. ${escapeHtml(v.example)}</div>
    </details>
  `).join('');
  const tplLibHtml = `
    <div style="background:linear-gradient(135deg,#FFF8E1,#FFE082);border-radius:8px;padding:12px;margin-bottom:14px">
      <div style="font-size:15px;font-weight:900;color:#E65100;margin-bottom:6px">📝 作文模板库 (手册 v14: 套用 → 拿 30+ 分关键)</div>
      <div style="font-size:11px;color:#5D4037;margin-bottom:10px;line-height:1.4">
        每周作文从这 15 个模板里选 1 开 + 1 转 + 1 结 套用, 配 3-5 个高级词。背熟比临场想强。
      </div>
      <details open>
        <summary style="cursor:pointer;font-size:13px;font-weight:900;color:#BF360C;margin-bottom:6px">🎬 5 个开头模板 (展开)</summary>
        ${renderTpl(T.openings, '#BF360C')}
      </details>
      <details>
        <summary style="cursor:pointer;font-size:13px;font-weight:900;color:#7B1FA2;margin-top:8px;margin-bottom:6px">🔀 5 个转折模板 (展开)</summary>
        ${renderTpl(T.transitions, '#7B1FA2')}
      </details>
      <details>
        <summary style="cursor:pointer;font-size:13px;font-weight:900;color:#1565C0;margin-top:8px;margin-bottom:6px">🎯 5 个结尾模板 (展开)</summary>
        ${renderTpl(T.endings, '#1565C0')}
      </details>
      <details>
        <summary style="cursor:pointer;font-size:13px;font-weight:900;color:#2E7D32;margin-top:8px;margin-bottom:6px">📚 50 个高级词汇 (P5 少用, 每周用 3-5 个)</summary>
        <div style="margin-top:6px;max-height:280px;overflow-y:auto">${vocabHtml}</div>
      </details>
    </div>
  `;
  return `
    <div class="kt-inner">
      ${tplLibHtml}
      <div class="kt-header">
        <div>
          <div class="kt-title">📚 73 周作文清单</div>
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
    return `<div class="pet-form-item ${unlocked ? 'unlocked' : 'locked'} ${isCurrent ? 'current' : ''}">
      <div class="pet-form-svg">${f.svg}</div>
      <div class="pet-form-meta">${f.name} (累计打卡 ≥${f.minStreak} 天)${isCurrent ? ' ← 你在这' : ''}</div>
    </div>`;
  }).join('');
  const gundamUnlocked = streak >= 45;
  const gundamCard = `<div class="pet-form-item ${gundamUnlocked ? 'unlocked' : 'locked'}">
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
  // v19.14b: 平日 math/chinese/unit hard lock — 灰显示 + 🔒 角标
  const isWeekday = window.isWeekdayToday ? window.isWeekdayToday() : true;
  const locked = (k) => isWeekday && window.WEEKDAY_LOCKED_GAMES && window.WEEKDAY_LOCKED_GAMES.includes(k);
  const stars = (d) => '★'.repeat(d) + '☆'.repeat(5 - d);
  const status = (k) => {
    if (locked(k)) {
      return `<div class="mgh-status" style="color:#999">🔒 <b>周末专属</b> · 平日不开放</div>`;
    }
    const c = _getDailyGameCount(k);
    const d = window.getDifficulty ? window.getDifficulty(state, k) : 1;
    const lockState = c >= 1 ? '<span class="mgh-lock">🔄 练习模式</span>' : '<span class="mgh-ready">▶ 可玩 (满奖)</span>';
    return `<div class="mgh-status">难度 <b>${stars(d)}</b> · ${lockState}</div>`;
  };
  // v19.14b: 锁定 game 按钮 style + onclick (点击只弹 toast, 不关闭 hub)
  const lockStyle = (k) => locked(k) ? 'opacity:0.45;filter:grayscale(0.7);position:relative' : '';
  const lockClick = (k, normalClick) => locked(k)
    ? `event.stopPropagation(); showToast('🔒 ${({math:'数学速算',chinese:'华文 MCQ',unit:'单位换算'})[k] || k} 周末才开放 — 平日攻英语 AL6→AL2', 'warn')`
    : normalClick;
  modal.innerHTML = `
    <div class="mgh-inner">
      <div class="mgh-header">
        <span class="mgh-title">🎮 Mini-game 大厅</span>
        <button class="vocab-modal-close" onclick="closeMiniGameHub()">×</button>
      </div>
      <div class="mgh-rules">📋 每 game 第 1 次满奖, 之后可继续练但不计分 · 想练多少练多少!</div>
      <div class="mgh-grid">
        <button class="mgh-game" onclick="closeMiniGameHub(); openVocabGame(${state.currentWeek})">
          📚<br><b>词汇连连看</b><br><small>6×6 配对</small>${status('vocab')}
        </button>
        <button class="mgh-game" style="${lockStyle('math')}" onclick="${lockClick('math', 'closeMiniGameHub(); openMathGame()')}">
          ➗<br><b>数学速算</b><br><small>10 题限时</small>${status('math')}
        </button>
        <button class="mgh-game" onclick="closeMiniGameHub(); openSciMcqGame()">
          🧬<br><b>科学 MCQ</b><br><small>10 题概念</small>${status('scimcq')}
        </button>
        <button class="mgh-game" style="${lockStyle('chinese')}" onclick="${lockClick('chinese', 'closeMiniGameHub(); openChineseMcqGame()')}">
          🇨🇳<br><b>华文 MCQ</b><br><small>10 题选择</small>${status('chinese')}
        </button>
        <button class="mgh-game" onclick="closeMiniGameHub(); openEditingGame()">
          ✏️<br><b>Editing 找错</b><br><small>50 词找 5 错</small>${status('editing')}
        </button>
        <button class="mgh-game" onclick="closeMiniGameHub(); openListenGame()">
          🎧<br><b>听写练习</b><br><small>听 1 段填 5 词</small>${status('listen')}
        </button>
        <button class="mgh-game" style="${lockStyle('unit')}" onclick="${lockClick('unit', 'closeMiniGameHub(); openUnitGame()')}">
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
        <button class="mgh-game" onclick="closeMiniGameHub(); openSstGame()">
          🔄<br><b>SST 句型转换</b><br><small>10 题变换</small>${status('sst')}
        </button>
        <button class="mgh-game" onclick="closeMiniGameHub(); openCompOeGame()">
          📖<br><b>阅读理解 OE</b><br><small>读文+自评</small>${status('comp_oe')}
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
  if (g.correct >= 10 && mult > 0) { spawnConfetti(window.innerWidth/2, window.innerHeight/3, 15); playSound('tada'); petExpress('pet-excited', 2200); }
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
// v19.14f (科学专家 P3): openSciMcqGame 加 chapter 参数, 按当前周对应章节过滤题库
function openSciMcqGame(chapterFilter) {
  const cur = chapterFilter
    ? (window.SCIENCE_CHAPTERS || []).find(c => c.chapterId === chapterFilter)
    : (window.getCurrentScienceChapter ? window.getCurrentScienceChapter(state.currentWeek || 1) : null);
  const title = '科学 MCQ' + (cur ? ' · ' + cur.title : '');
  _openMcqGame('scimcq', title, 'q', cur);
}
function openChineseMcqGame() { _openMcqGame('chinese', '华文 MCQ', 'q'); }
function openSstGame() { _openMcqGame('sst', 'SST 句型转换', 'q'); }

// v19.8 P1-5: Paper 2 混合卷限时模式 (28 min, 15 Cloze + 8 SST 模拟真考)
function openPaper2MockGame() {
  const clozeDiff = window.getDifficulty ? window.getDifficulty(state, 'cloze') : 4;
  const sstDiff = window.getDifficulty ? window.getDifficulty(state, 'sst') : 4;
  const clozeQs = (window.getClozeByDiff(clozeDiff, 15) || []).map(q => Object.assign({}, q, { _section: 'cloze', _qField: 'sentence' }));
  const sstQs = (window.getSstByDiff(sstDiff, 8) || []).map(q => Object.assign({}, q, { _section: 'sst', _qField: 'q' }));
  // Shuffle opts each q
  const allQs = [...clozeQs, ...sstQs].map(q => {
    const correctOpt = q.opts[q.ans];
    const shuffled = [...q.opts].sort(() => Math.random() - 0.5);
    return Object.assign({}, q, { opts: shuffled, ans: shuffled.indexOf(correctOpt) });
  });
  if (allQs.length < 5) { showToast('题库不足, 请先刷一些 Cloze + SST', 'sad'); return; }
  _mcqGameState = {
    key: 'paper2mock',
    title: '🎯 Paper 2 模拟卷',
    qField: 'sentence',  // dynamic per q
    qs: allQs,
    idx: 0,
    correct: 0,
    wrong: 0,
    diff: Math.max(clozeDiff, sstDiff),
    startTime: Date.now(),
    timeLimitMs: 28 * 60 * 1000,  // 28 min
    isMock: true
  };
  _renderMcqGame();
  // 启动倒计时
  if (window._mockTimer) clearInterval(window._mockTimer);
  window._mockTimer = setInterval(() => {
    if (!_mcqGameState || !_mcqGameState.isMock) {
      clearInterval(window._mockTimer);
      window._mockTimer = null;
      return;
    }
    const elapsed = Date.now() - _mcqGameState.startTime;
    const remain = Math.max(0, _mcqGameState.timeLimitMs - elapsed);
    const mins = Math.floor(remain / 60000);
    const secs = Math.floor((remain % 60000) / 1000);
    const timerEl = document.getElementById('mockTimer');
    if (timerEl) {
      timerEl.textContent = `⏱ ${mins}:${String(secs).padStart(2, '0')}`;
      timerEl.style.color = remain < 5 * 60 * 1000 ? '#FF6B6B' : '#666';
    }
    if (remain <= 0) {
      clearInterval(window._mockTimer);
      window._mockTimer = null;
      _finishMcqGame();  // 时间到自动收卷
    }
  }, 1000);
}
window.openPaper2MockGame = openPaper2MockGame;
function _openMcqGame(key, title, qField, chapter) {
  if (!_checkGameDailyLock(key)) return;
  const diff = window.getDifficulty ? window.getDifficulty(state, key) : 4;
  const fn = key === 'grammar' ? window.getGrammarByDiff : key === 'cloze' ? window.getClozeByDiff : key === 'scimcq' ? window.getSciMcqByDiff : key === 'chinese' ? window.getChineseMcqByDiff : key === 'sst' ? window.getSstByDiff : window.getGrammarByDiff;
  let rawQs = fn(diff, 10);
  // v19.14j: scimcq 章节 filter 升级 — 优先用 _chapterId tag (准确), fallback keyword 子串
  if (key === 'scimcq' && chapter && chapter.chapterId && window.SCIENCE_MCQ) {
    // v19.14j: 先 lazy tag (启动后第一次会跑)
    if (window.tagScimcqChapters && window.SCIENCE_MCQ[0] && window.SCIENCE_MCQ[0]._chapterId === undefined) {
      window.tagScimcqChapters();
    }
    // 优先用 _chapterId 精确匹配
    let filtered = window.SCIENCE_MCQ.filter(q => q._chapterId === chapter.chapterId);
    // fallback: keyword 子串匹配 (兼容旧)
    if (filtered.length < 5 && chapter.keywords && chapter.keywords.length) {
      const kws = chapter.keywords.map(k => k.toLowerCase());
      filtered = window.SCIENCE_MCQ.filter(q => {
        const text = (q.q + ' ' + (q.opts || []).join(' ') + ' ' + (q.explain || '')).toLowerCase();
        return kws.some(k => text.includes(k));
      });
    }
    if (filtered.length >= 5) {
      // 取本章 8 题 + 综合 2 题 防偏
      const onChapter = filtered.sort(() => Math.random() - 0.5).slice(0, 8);
      const others = fn(diff, 2);
      rawQs = [...onChapter, ...others];
      setTimeout(() => showToast(`📚 ${chapter.title} 章节 ${onChapter.length} 题 + 2 综合`, 'success'), 100);
    } else {
      setTimeout(() => showToast(`本章题量不足 (${filtered.length}<5), 走全库 diff ${diff}`, 'warn'), 100);
    }
  }
  const qs = rawQs.map(q => {
    const correctOpt = q.opts[q.ans];
    const shuffled = [...q.opts].sort(() => Math.random() - 0.5);
    const newAns = shuffled.indexOf(correctOpt);
    return Object.assign({}, q, { opts: shuffled, ans: newAns, _orig: q });
  });
  _mcqGameState = { key, title, qField, qs, idx: 0, correct: 0, wrong: 0, diff, lastFeedback: null, chapter };
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
  // v19.8: 混合卷动态 qField (Cloze 用 sentence, SST 用 q)
  const dynQField = q._qField || g.qField;
  const qText = q[dynQField];
  const ruleHtml = q.rule ? `<div class="mcq-rule">📝 ${escapeHtml(q.rule)}</div>` : '';
  const isSst = g.key === 'sst' || q._section === 'sst';
  const sectionBadge = g.isMock ? `<span style="background:${q._section==='sst'?'#A788E0':'#4ECDC4'};color:#FFF;font-size:10px;padding:2px 6px;border-radius:3px;margin-right:6px">${q._section==='sst'?'SST':'Cloze'}</span>` : '';
  const timerHtml = g.isMock ? `<span id="mockTimer" style="margin-left:8px;font-weight:900">⏱ --:--</span>` : '';
  const optsHtml = q.opts.map((o, i) =>
    `<button class="mcq-opt" onclick="submitMcqAnswer(${i})">${String.fromCharCode(65+i)}. ${escapeHtml(o)}</button>`
  ).join('');
  modal.innerHTML = `
    <div class="mg-inner mcq-inner">
      <div class="mg-stats">${sectionBadge}${g.title} · ✅ ${g.correct} · ❌ ${g.wrong} · ${g.idx+1}/${g.qs.length}${timerHtml}</div>
      <div class="mg-q mcq-q">${escapeHtml(qText)}</div>
      ${ruleHtml}
      ${q.tag && !g.isMock ? `<div class="mcq-tag">${escapeHtml(q.tag)}</div>` : ''}
      <div class="mcq-opts${isSst ? ' sst-opts' : ''}">${optsHtml}</div>
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
    const poolMap = { grammar: window.GRAMMAR_QUESTIONS, cloze: window.CLOZE_QUESTIONS, scimcq: window.SCIENCE_MCQ, chinese: window.CHINESE_MCQ, sst: window.SST_QUESTIONS };
    if (poolMap[g.key] && window._markMastered) {
      window._markMastered(g.key, poolMap[g.key], q._orig || q);
      window._saveMastered(state);
    }
  } else { g.wrong++; playSound('sad'); }
  // v18.59: 错题入错题本 + v19.14e: Cloze 加 topic 自动归类 (travel/school/nature/emotion 等)
  if (!isCorrect && window.addToErrorBank) {
    const correctWord = q.opts && q.opts[q.ans];
    const topic = (g.key === 'cloze' && window.guessClozeTopic) ? window.guessClozeTopic(q[g.qField] + ' ' + correctWord) : null;
    window.addToErrorBank(state, {
      gameKey: g.key, type: 'mcq',
      q: q[g.qField] || '', opts: q.opts, ans: q.ans,
      correctAns: correctWord,
      explain: q.explain || _generateMcqExplain(q),
      topic: topic,  // v19.14e: 主题词 (travel/school/...) 用于错题本聚类
      correctWord: correctWord  // 给后面 3 件事卡用
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

    // v19.14e/h/l: Cloze 错题"3 件事卡" — v19.14l 同义词改 3 选 1 MCQ (心理学家原建议, 接受度 30→75%)
    if (!isCorrect && g.key === 'cloze') {
      const word = q.opts[q.ans];
      const fp = (q[g.qField] || '') + '|' + word;
      g._pendingCloze3 = { fp, word };
      // v19.14l: 查字典看能否走 MCQ 模式
      const synOpts = window.getClozeSynonymOptions ? window.getClozeSynonymOptions(word) : null;
      let synBlockHtml;
      if (synOpts) {
        // MCQ 模式 (字典覆盖词)
        synBlockHtml = `
          <div style="font-size:11px;color:#555;font-weight:700;margin-bottom:6px">📝 同义词 3 选 1 (找跟 "<b>${escapeHtml(word)}</b>" 意思最接近的):</div>
          <div style="display:flex;flex-direction:column;gap:4px;margin-bottom:6px" data-correct-idx="${synOpts.correctIdx}" data-correct-syn="${escapeAttr(synOpts.correctSyn)}">
            ${synOpts.opts.map((o, i) => `<button onclick="pickClozeSyn(${i})" data-idx="${i}" class="c3-syn-opt" style="padding:8px;background:#FFF;border:1px solid #CCC;border-radius:4px;font-size:13px;cursor:pointer;text-align:left">${String.fromCharCode(65+i)}. ${escapeHtml(o)}</button>`).join('')}
          </div>
          <input id="c3-syn" type="hidden" value="">
        `;
      } else {
        // Fallback: 字典无此词, 走旧 input 模式
        synBlockHtml = `
          <div style="font-size:11px;color:#555;font-weight:700;margin-bottom:4px">📝 同义词 (字典无 "<b>${escapeHtml(word)}</b>", 自己想一个 ≥3 字英文):</div>
          <input id="c3-syn" placeholder="同义词 (如 glad / pleased)" style="width:100%;padding:5px;font-size:12px;margin-bottom:3px;border:1px solid #CCC;border-radius:4px;box-sizing:border-box">
        `;
      }
      fb.insertAdjacentHTML('beforeend', `
        <div id="cloze3things" data-fp="${escapeAttr(fp)}" data-word="${escapeAttr(word)}" data-mode="${synOpts ? 'mcq' : 'input'}" style="margin-top:8px;padding:8px;background:#FFF;border-radius:4px;border:1px solid #DDD">
          ${synBlockHtml}
          <input id="c3-pos" placeholder="词性 n./v./adj./adv. (可空)" style="width:48%;padding:5px;font-size:12px;border:1px solid #CCC;border-radius:4px;box-sizing:border-box">
          <input id="c3-col" placeholder="搭配 (good AT, 可空)" style="width:48%;padding:5px;font-size:12px;margin-left:4%;border:1px solid #CCC;border-radius:4px;box-sizing:border-box">
          <div style="display:flex;gap:4px;margin-top:6px">
            <button onclick="saveCloze3ThingsAndNext()" style="flex:2;padding:8px;background:#4ECDC4;color:#FFF;border:none;border-radius:4px;font-size:12px;font-weight:700;cursor:pointer">✅ 保存 +2 分 + 下一题</button>
            <button onclick="skipCloze3ThingsAndNext()" style="flex:1;padding:8px;background:#9E9E9E;color:#FFF;border:none;border-radius:4px;font-size:12px;cursor:pointer">⏭ 跳过</button>
          </div>
        </div>
      `);
      // v19.14h: 答错且有 3 件事卡 → 不自动跳, 等用户点保存/跳过
      return;
    }
  }
  // 答对 1.2s / 答错非 Cloze 2.2s 后跳
  setTimeout(() => {
    g.idx++;
    if (g.idx >= g.qs.length) _finishMcqGame();
    else _renderMcqGame();
  }, isCorrect ? 1200 : 2200);
}

// v19.14h: 保存 3 件事并进入下一题 (显式按钮替代倒计时)
function saveCloze3ThingsAndNext() {
  const ok = saveCloze3Things();
  if (ok) _advanceMcqNext();
}
function skipCloze3ThingsAndNext() {
  const c3 = document.getElementById('cloze3things');
  if (c3) c3.innerHTML = '<div style="color:#9E9E9E;font-size:11px;text-align:center;padding:4px">⏭ 跳过</div>';
  _advanceMcqNext();
}
function _advanceMcqNext() {
  const g = _mcqGameState;
  if (!g) return;
  setTimeout(() => {
    g.idx++;
    if (g.idx >= g.qs.length) _finishMcqGame();
    else _renderMcqGame();
  }, 400);
}

// v19.14l: Cloze 3 件事 MCQ 模式 — 点击选项
function pickClozeSyn(idx) {
  const c3 = document.getElementById('cloze3things');
  if (!c3) return;
  const correctIdx = parseInt(c3.querySelector('[data-correct-idx]').getAttribute('data-correct-idx'));
  const correctSyn = c3.querySelector('[data-correct-syn]').getAttribute('data-correct-syn');
  // 视觉反馈
  c3.querySelectorAll('.c3-syn-opt').forEach((b, i) => {
    if (i === correctIdx) { b.style.background = '#C8E6C9'; b.style.borderColor = '#2E7D32'; }
    else if (i === idx) { b.style.background = '#FFCDD2'; b.style.borderColor = '#C62828'; }
    b.disabled = true;
  });
  // 把选中值塞到 c3-syn (hidden input), 供 saveCloze3Things 读取
  const synInput = document.getElementById('c3-syn');
  if (synInput) synInput.value = correctSyn;  // 总是存正确同义词, 即使选错 (孩子已经看到正确答案)
  c3.setAttribute('data-mcq-picked', idx === correctIdx ? '1' : '0');
}
window.pickClozeSyn = pickClozeSyn;

// v19.14e + v19.14h + v19.14l: Cloze 3 件事卡 - 保存 (MCQ 模式 + input 模式 双兼容)
function saveCloze3Things() {
  const c3 = document.getElementById('cloze3things');
  if (!c3) return false;
  const syn = (document.getElementById('c3-syn') || {}).value || '';
  const pos = (document.getElementById('c3-pos') || {}).value || '';
  const col = (document.getElementById('c3-col') || {}).value || '';
  const synTrim = syn.trim();
  const fp = c3.getAttribute('data-fp') || '';
  const word = (c3.getAttribute('data-word') || '').toLowerCase();
  const mode = c3.getAttribute('data-mode') || 'input';
  // v19.14l: MCQ 模式校验 — 必须先点了选项 (synInput 有值)
  if (mode === 'mcq') {
    if (!synTrim) {
      showToast('❌ 请先点 A/B/C 选一个同义词', 'warn');
      return false;
    }
    // MCQ 模式不再做质量校验 (字典已保证质量), 直接保存
  } else {
    // input 模式 - 字典无此词, 走质量校验
    if (synTrim.length < 3) {
      showToast('❌ 同义词 ≥3 字符英文 (如 glad / pleased)', 'warn');
      const sy = document.getElementById('c3-syn'); if (sy) sy.focus();
      return false;
    }
    if (!/^[a-zA-Z\s,\/\-']+$/.test(synTrim)) {
      showToast('❌ 同义词必须是英文 (不能含数字/中文)', 'warn');
      return false;
    }
    if (synTrim.toLowerCase() === word || synTrim.toLowerCase().includes(word)) {
      showToast('❌ 同义词不能是原词本身, 想个意思接近的词', 'warn');
      const sy = document.getElementById('c3-syn'); if (sy) sy.focus();
      return false;
    }
  }
  // v19.14h: 用 fingerprint 找题, 不再依赖 wrongs[-1]
  const wrongs = state.wrongAnswers || [];
  let entry = null;
  for (let i = wrongs.length - 1; i >= 0; i--) {
    if (wrongs[i].gameKey === 'cloze' && (wrongs[i]._fp || '').startsWith(fp.split('|')[0].substring(0, 30))) {
      entry = wrongs[i]; break;
    }
  }
  // fallback: 找最后一条 cloze (兼容旧逻辑)
  if (!entry) {
    for (let i = wrongs.length - 1; i >= 0; i--) {
      if (wrongs[i].gameKey === 'cloze') { entry = wrongs[i]; break; }
    }
  }
  if (entry) {
    entry.synonym = synTrim;
    entry.wordClass = pos.trim();
    entry.collocation = col.trim();
    entry.threeThings = true;
  }
  state.totalPoints = (state.totalPoints || 0) + 2;
  state.logs.push({ reason: '📝 Cloze 3 件事查 +2', points: 2, week: state.currentWeek, timestamp: Date.now() });
  saveState(state);
  c3.innerHTML = '<div style="color:#4ECDC4;font-weight:900;text-align:center;padding:8px">✅ 已保存 +2 分</div>';
  return true;
}
function skipCloze3Things() {
  const c3 = document.getElementById('cloze3things');
  if (c3) c3.innerHTML = '<div style="color:#9E9E9E;font-size:11px;text-align:center;padding:4px">⏭ 跳过</div>';
}
window.saveCloze3Things = saveCloze3Things;
window.skipCloze3Things = skipCloze3Things;
window.saveCloze3ThingsAndNext = saveCloze3ThingsAndNext;
window.skipCloze3ThingsAndNext = skipCloze3ThingsAndNext;
window._advanceMcqNext = _advanceMcqNext;
// escapeAttr helper (若不存在)
if (typeof window.escapeAttr === 'undefined') {
  window.escapeAttr = function(s) { return String(s || '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]); };
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
  // v19.7: Paper 2 突击进度 (Cloze + SST)
  if (window.bumpPaper2Sprint && (g.key === 'cloze' || g.key === 'sst')) {
    window.bumpPaper2Sprint(state, g.key, g.correct, g.qs.length);
  }
  const playNum = _bumpDailyGameCount(g.key);
  const mult = _getGameMultiplier(playNum);
  // v19.14a B2: Cloze/SST 改按题计分 + 衰减 (其他 game 走旧 rewardMap)
  let reward = 0;
  let v14_clozeSstLog = '';
  if ((g.key === 'cloze' || g.key === 'sst') && window.clozeSstReward) {
    // 累计今日 cloze+sst 答题数 (分游戏统计, 用占位 key)
    if (!state.gameDailyCount) state.gameDailyCount = { date: new Date().toISOString().slice(0,10), counts: {} };
    const cnt = state.gameDailyCount.counts;
    const todayBefore = (cnt._cloze_q || 0) + (cnt._sst_q || 0);
    reward = window.clozeSstReward(todayBefore, g.correct);
    cnt['_' + g.key + '_q'] = (cnt['_' + g.key + '_q'] || 0) + g.correct;
    v14_clozeSstLog = `[今日累计 ${todayBefore + g.correct} 题]`;
  } else {
    // v19.0: 难度梯度积分 (高难度答对奖更多)
    const rewardMap = { 3: 4, 4: 6, 5: 10, 6: 15 };
    let baseR = 0;
    if (g.correct >= 10) baseR = rewardMap[g.diff] || 3;
    else if (g.correct >= 7) baseR = Math.max(1, (rewardMap[g.diff] || 3) - 1);
    reward = Math.floor(baseR * mult * (window.getDragonBuff ? window.getDragonBuff(state) : 1.0));
  }
  if (reward > 0) {
    state.totalPoints += reward;
    state.logs.push({ reason: `🎮 ${g.title} ${g.correct}/10 (第 ${playNum} 次) ${v14_clozeSstLog}`, points: reward, week: state.currentWeek, timestamp: Date.now() });
  }
  saveState(state);
  // v19.4: 更新限时挑战赛进度
  const accuracy = Math.round(g.correct / g.qs.length * 100);
  if (window.updateChallengeProgress) window.updateChallengeProgress(g.key, accuracy);
  const modal = document.getElementById('mcqGameModal');
  // v19.8 P1-5: Paper 2 模拟卷专属收卷面板 (预测 AL + 拆分 Cloze/SST 正确率)
  if (g.isMock) {
    const clozeQs = g.qs.filter(q => q._section === 'cloze');
    const sstQs = g.qs.filter(q => q._section === 'sst');
    // 按 section 统计 (需要回溯哪些答对了, 这里近似 — 假设 correct 平均分布)
    const clozeCorrect = Math.round(g.correct * clozeQs.length / g.qs.length);
    const sstCorrect = g.correct - clozeCorrect;
    const elapsedMin = Math.round((Date.now() - g.startTime) / 60000);
    // 估 PSLE Paper 2 AL (Cloze 25 分 + SST 10 分): 用正确率算
    const clozePct = clozeQs.length ? clozeCorrect / clozeQs.length : 0;
    const sstPct = sstQs.length ? sstCorrect / sstQs.length : 0;
    const estPaper2Score = Math.round(clozePct * 25 + sstPct * 10);  // 35 满分
    const estAL = estPaper2Score >= 31 ? 'AL 2-3' : estPaper2Score >= 27 ? 'AL 4' : estPaper2Score >= 22 ? 'AL 5' : estPaper2Score >= 17 ? 'AL 6' : 'AL 7+';
    if (window.bumpPaper2Sprint) {
      window.bumpPaper2Sprint(state, 'cloze', clozeCorrect, clozeQs.length);
      window.bumpPaper2Sprint(state, 'sst', sstCorrect, sstQs.length);
    }
    // v19.12: 记录到 paper2ALHistory (用于综合 AL 预测)
    if (window.recordPaper2AL) {
      const numericAL = parseInt((estAL.match(/\d+/) || ['6'])[0]);
      window.recordPaper2AL(state, numericAL, estPaper2Score, 35);
    }
    modal.innerHTML = `
      <div class="mg-inner mcq-inner" style="max-width:480px">
        <div class="mg-result-icon">${accuracy >= 75 ? '🎉' : accuracy >= 60 ? '👍' : '🤔'}</div>
        <div class="mg-result-title">🎯 Paper 2 模拟卷收卷</div>
        <div style="background:#FFF3E0;border-radius:6px;padding:12px;margin:10px 0;text-align:left">
          <div style="font-weight:900;color:#FF6B6B;font-size:16px;margin-bottom:6px">📊 预测 Paper 2: ${estAL}</div>
          <div style="font-size:13px;line-height:1.8">
            🧩 Cloze: <b>${clozeCorrect}/${clozeQs.length}</b> 对 (${Math.round(clozePct*100)}%)<br>
            🔄 SST: <b>${sstCorrect}/${sstQs.length}</b> 对 (${Math.round(sstPct*100)}%)<br>
            ⏱ 用时 ${elapsedMin} 分钟 (限 28 分钟)
          </div>
        </div>
        <div class="mg-result-reward">+${reward} 分 · 实战训练奖励</div>
        <div style="font-size:11px;color:#666;margin:8px 0">💡 真考目标 ${accuracy >= 75 ? '已达 AL 4!继续保持' : 'AL 4 需要 ≥75% (现 ' + accuracy + '%), 再来一卷'}</div>
        <button class="btn btn-primary" onclick="closeMcqGame()">知道了!</button>
      </div>`;
    if (window._mockTimer) { clearInterval(window._mockTimer); window._mockTimer = null; }
  } else {
    modal.innerHTML = `
      <div class="mg-inner mcq-inner">
        <div class="mg-result-icon">${g.correct >= 10 ? '🎉' : g.correct >= 7 ? '👍' : '🤔'}</div>
        <div class="mg-result-title">${g.title} (今日第 ${playNum} 次)</div>
        <div class="mg-result-stats">${g.correct}/10 对 · ${g.wrong} 错</div>
        <div class="mg-result-reward">+${reward} 分 · ${_getMultiplierLabel(playNum)}</div>
        <button class="btn btn-primary" onclick="closeMcqGame()">知道了!</button>
      </div>`;
  }
  if (g.correct >= 10 && mult > 0) { spawnConfetti(window.innerWidth/2, window.innerHeight/3, 15); playSound('tada'); petExpress('pet-excited', 2200); }
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

// ============ v19.4: 模考分追踪 ============
function renderMockExamTracker() {
  const el = document.getElementById('mockExamTracker');
  if (!el) return;
  const exams = state.mockExams || [];
  const summary = window.getMockExamSummary ? window.getMockExamSummary(state) : null;

  let summaryHtml = '';
  if (summary) {
    const color = summary.totalAL <= 6 ? '#22c55e' : summary.totalAL <= 8 ? '#fbbf24' : '#ef4444';
    summaryHtml = `
      <div class="mock-summary" style="background:rgba(255,255,255,0.05);border-radius:10px;padding:12px;margin-bottom:12px;">
        <div style="font-size:20px;font-weight:700;color:${color};text-align:center;">总 AL ${summary.totalAL}</div>
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:6px;margin-top:8px;text-align:center;font-size:12px;">
          <div>英 AL${summary.alEng}<br><small>${summary.latest.eng}分</small></div>
          <div>数 AL${summary.alMath}<br><small>${summary.latest.math}分</small></div>
          <div>科 AL${summary.alSci}<br><small>${summary.latest.sci}分</small></div>
          <div>华 AL${summary.alChi}<br><small>${summary.latest.chi}分</small></div>
        </div>
        ${summary.improvement > 0 ? `<div style="text-align:center;margin-top:6px;color:#22c55e;font-size:12px;">📈 比首次模考进步 ${summary.improvement} 个 AL!</div>` : ''}
        <div style="text-align:center;margin-top:4px;color:var(--color-text-light);font-size:11px;">共 ${summary.count} 次模考记录</div>
      </div>`;
  }

  const historyHtml = exams.slice().reverse().slice(0, 5).map(e => {
    const total = window.scoreToAL(e.eng||0) + window.scoreToAL(e.math||0) + window.scoreToAL(e.sci||0) + window.scoreToAL(e.chi||0);
    return `<div style="font-size:11px;padding:4px 0;border-bottom:1px solid rgba(255,255,255,0.06);">${e.date} · 英${e.eng} 数${e.math} 科${e.sci} 华${e.chi} · <b>AL${total}</b>${e.note ? ' · '+e.note : ''}</div>`;
  }).join('');

  el.innerHTML = `
    <h3 style="font-size:14px;margin-bottom:8px;">📊 模考分追踪</h3>
    ${summaryHtml}
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:6px;margin-bottom:8px;">
      <input type="number" id="mockEng" placeholder="英语" min="0" max="100" style="padding:6px;border-radius:6px;border:1px solid rgba(255,255,255,0.2);background:rgba(0,0,0,0.3);color:#fff;font-size:12px;">
      <input type="number" id="mockMath" placeholder="数学" min="0" max="100" style="padding:6px;border-radius:6px;border:1px solid rgba(255,255,255,0.2);background:rgba(0,0,0,0.3);color:#fff;font-size:12px;">
      <input type="number" id="mockSci" placeholder="科学" min="0" max="100" style="padding:6px;border-radius:6px;border:1px solid rgba(255,255,255,0.2);background:rgba(0,0,0,0.3);color:#fff;font-size:12px;">
      <input type="number" id="mockChi" placeholder="华文" min="0" max="100" style="padding:6px;border-radius:6px;border:1px solid rgba(255,255,255,0.2);background:rgba(0,0,0,0.3);color:#fff;font-size:12px;">
    </div>
    <div style="display:flex;gap:6px;margin-bottom:10px;">
      <input type="text" id="mockNote" placeholder="备注 (如: W26总模考)" style="flex:1;padding:6px;border-radius:6px;border:1px solid rgba(255,255,255,0.2);background:rgba(0,0,0,0.3);color:#fff;font-size:12px;">
      <button onclick="saveMockExam()" style="padding:6px 14px;border-radius:6px;background:#6366f1;color:#fff;border:none;font-size:12px;cursor:pointer;">保存</button>
    </div>
    ${historyHtml ? `<div style="margin-top:6px;">${historyHtml}</div>` : '<div style="font-size:11px;color:var(--color-text-light);">暂无模考记录, 输入分数后点保存</div>'}
  `;
}
function saveMockExam() {
  const eng = parseInt(document.getElementById('mockEng').value) || 0;
  const math = parseInt(document.getElementById('mockMath').value) || 0;
  const sci = parseInt(document.getElementById('mockSci').value) || 0;
  const chi = parseInt(document.getElementById('mockChi').value) || 0;
  const note = (document.getElementById('mockNote').value || '').trim();
  if (eng === 0 && math === 0 && sci === 0 && chi === 0) { showToast('请至少输入一科分数', 'warn'); return; }
  if (!state.mockExams) state.mockExams = [];
  state.mockExams.push({ date: new Date().toISOString().slice(0, 10), eng, math, sci, chi, note });
  saveState(state);
  showToast('✅ 模考分已保存!', 'success');
  renderMockExamTracker();
}
window.saveMockExam = saveMockExam;

// ============ v19.4: 限时挑战赛 (W15-W30 中期激励) ============
function getActiveChallenge() {
  const w = state.currentWeek || 1;
  if (w < 15 || w > 30) return null;
  const challenges = [
    { id: 'grammar_streak', name: '🔥 Grammar 7日连胜', game: 'grammar', days: 7, target: 80, reward: 50 },
    { id: 'cloze_streak', name: '🧩 Cloze 7日连胜', game: 'cloze', days: 7, target: 80, reward: 50 },
    { id: 'sst_master', name: '🔄 SST 5日全对', game: 'sst', days: 5, target: 90, reward: 80 },
    { id: 'vocab_blitz', name: '📚 词汇连续7天', game: 'vocab', days: 7, target: 70, reward: 40 },
  ];
  const idx = (w - 15) % challenges.length;
  return challenges[idx];
}

function renderChallengeCard() {
  let el = document.getElementById('challengeCard');
  const challenge = getActiveChallenge();
  if (!challenge) { if (el) el.innerHTML = ''; return; }
  if (!el) {
    el = document.createElement('div');
    el.id = 'challengeCard';
    const hub = document.getElementById('gameHubCard');
    if (hub) hub.parentNode.insertBefore(el, hub.nextSibling);
    else return;
  }
  if (!state.challengeProgress) state.challengeProgress = {};
  const prog = state.challengeProgress[challenge.id] || { streak: 0, lastDate: null, completed: false };
  const today = new Date().toISOString().slice(0, 10);
  const isToday = prog.lastDate === today;

  if (prog.completed) {
    el.innerHTML = `<div class="game-hub-card" style="border-color:#22c55e;">
      <div class="game-hub-title">🏆 ${challenge.name} — 完成!</div>
      <div class="game-hub-sub">已获得 +${challenge.reward} 奖励积分</div>
    </div>`;
  } else {
    el.innerHTML = `<div class="game-hub-card" style="border-color:#f59e0b;">
      <div class="game-hub-title">${challenge.name}</div>
      <div class="game-hub-sub">连续 ${challenge.days} 天 ${challenge.game} 正确率 ≥${challenge.target}% · 进度 ${prog.streak}/${challenge.days} · 奖励 +${challenge.reward}分</div>
      ${isToday ? '<div class="game-hub-sub" style="color:#22c55e;">✅ 今日已完成</div>' : '<div class="game-hub-sub" style="color:#fbbf24;">⏳ 今日尚未挑战</div>'}
    </div>`;
  }
}

function updateChallengeProgress(gameKey, accuracy) {
  const challenge = getActiveChallenge();
  if (!challenge || challenge.game !== gameKey) return;
  if (!state.challengeProgress) state.challengeProgress = {};
  const id = challenge.id;
  if (!state.challengeProgress[id]) state.challengeProgress[id] = { streak: 0, lastDate: null, completed: false };
  const prog = state.challengeProgress[id];
  if (prog.completed) return;
  const today = new Date().toISOString().slice(0, 10);
  if (prog.lastDate === today) return;

  if (accuracy >= challenge.target) {
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    if (prog.lastDate === yesterday || prog.streak === 0) {
      prog.streak++;
    } else {
      prog.streak = 1;
    }
    prog.lastDate = today;
    if (prog.streak >= challenge.days) {
      prog.completed = true;
      state.totalPoints = (state.totalPoints || 0) + challenge.reward;
      state.lifetimeEarned = (state.lifetimeEarned || 0) + challenge.reward;
      showToast(`🏆 挑战赛完成! +${challenge.reward} 分!`, 'success');
    }
  } else {
    prog.streak = 0;
    prog.lastDate = today;
  }
  saveState(state);
  renderChallengeCard();
}
window.updateChallengeProgress = updateChallengeProgress;

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
  // v19.4: 模考分追踪
  renderMockExamTracker();

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

      // v19.15d: 点 ✅ 打卡 tab 时强制跳到当周 + 今日 (防 _displayWeek 残留旧值)
      if (page === 'checkin') {
        if (window.computeCurrentWeekFromToday) {
          state.currentWeek = window.computeCurrentWeekFromToday();
        }
        _displayWeek = null;  // 用 state.currentWeek
        const todayKey = todayDayKeyForWeek(state.currentWeek);
        if (todayKey) selectedDay = todayKey;
        renderCheckinPage();
      }
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
      if (page === 'vocab') {
        renderVocabPage();
      }
      // v19.12: 角色/装备/双龙/皮肤/学习画像/兑换 全部移到 "我的" tab
      if (page === 'character') {
        renderCharacterPage();
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

// ============ v19.4: Comprehension OE 训练 ============
let _compOeState = null;
function openCompOeGame() {
  const passages = window.COMP_OE_PASSAGES;
  if (!passages || passages.length === 0) { showToast('暂无阅读材料', 'warn'); return; }
  const diff = window.getDifficulty ? window.getDifficulty(state, 'comp_oe') : 3;
  const pool = passages.filter(p => p.diff <= diff + 1 && p.diff >= diff - 1);
  const chosen = pool.length > 0 ? pool[Math.floor(Math.random() * pool.length)] : passages[0];
  _compOeState = { passage: chosen, qIdx: 0, scores: [], revealed: [] };
  _renderCompOe();
}
function _renderCompOe() {
  const g = _compOeState;
  if (!g) return;
  let modal = document.getElementById('compOeModal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'compOeModal';
    modal.className = 'mb-result-modal';
    document.body.appendChild(modal);
  }
  const p = g.passage;
  const q = p.questions[g.qIdx];
  const totalQ = p.questions.length;
  const isRevealed = g.revealed[g.qIdx];
  const typeLabel = q.type === 'literal' ? '📖 Literal' : q.type === 'inferential' ? '🧠 Inferential' : '💭 Evaluative';
  const passageHtml = g.qIdx === 0 ? `<div class="comp-passage">${escapeHtml(p.passage)}</div>` : `<div class="comp-passage-mini">📄 <em>${escapeHtml(p.title)}</em> (scroll up if needed)</div>`;
  // v19.14e (英语+心理 共识): 定位法每题都显示 — Q1 默认展开示范, 后题折叠不占屏
  const isQ1 = g.qIdx === 0;
  const locationMethodHtml = `
    <details ${isQ1 ? 'open' : ''} style="background:linear-gradient(135deg,#E8F5E9,#C8E6C9);border-left:4px solid #2E7D32;border-radius:6px;padding:8px 10px;margin-bottom:10px">
      <summary style="font-size:12px;font-weight:900;color:#1B5E20;cursor:pointer;outline:none">📍 OE 定位法 3 步 ${isQ1 ? '(必看)' : '(点开复习)'}</summary>
      <div style="font-size:11px;color:#2E7D32;line-height:1.6;margin-top:6px">
        <b>① 先看题</b>: 圈出题目里的关键词 (who/what/where/why)<br>
        <b>② 再回原文找</b>: 不是先读全文, 是带着问题去定位<br>
        <b>③ 答案必含原文核心词</b>: 直接抄原文关键词不算违规, 是得分必要条件<br>
        <b>自评 rubric</b>: 0=没找到位置 / 1=找到但概括偏 / 2=含原文核心词且完整
      </div>
    </details>
  `;
  modal.innerHTML = `
    <div class="mg-inner comp-oe-inner">
      <div class="mg-stats">📖 Comprehension OE · ${p.title} · Q${g.qIdx+1}/${totalQ}</div>
      ${g.qIdx === 0 ? `<div class="comp-passage">${escapeHtml(p.passage)}</div>` : ''}
      ${locationMethodHtml}
      <div class="comp-q-box">
        <div class="comp-type">${typeLabel} · ${q.marks} mark${q.marks > 1 ? 's' : ''}</div>
        <div class="comp-q">${escapeHtml(q.q)}</div>
      </div>
      ${isRevealed ? `
        <div class="comp-model">
          <div class="comp-model-label">✅ Model Answer:</div>
          <div class="comp-model-text">${escapeHtml(q.model)}</div>
          <div class="comp-self-score">你答对了多少?
            <button onclick="compOeScore(0)">❌ 0分</button>
            <button onclick="compOeScore(1)">⚠️ 1分</button>
            ${q.marks >= 2 ? '<button onclick="compOeScore(2)">✅ 2分</button>' : ''}
          </div>
        </div>` : `
        <div class="comp-think">💡 先在脑中组织答案 (30 秒后可查看)</div>
        <button class="comp-reveal-btn" id="compRevealBtn" disabled onclick="compOeReveal()">⏳ 思考中... 30s</button>
        <script>
          (function(){
            var btn=document.getElementById('compRevealBtn'),t=30;
            var iv=setInterval(function(){t--;if(t<=0){clearInterval(iv);btn.disabled=false;btn.textContent='查看 Model Answer';}else{btn.textContent='⏳ 思考中... '+t+'s';}},1000);
          })();
        </script>
      `}
      <button class="vocab-modal-close mg-close" onclick="closeCompOe()">×</button>
    </div>`;
  modal.classList.add('show');
}
function compOeReveal() {
  if (!_compOeState) return;
  _compOeState.revealed[_compOeState.qIdx] = true;
  _renderCompOe();
}
function compOeScore(score) {
  const g = _compOeState;
  if (!g) return;
  g.scores[g.qIdx] = score;
  g.qIdx++;
  if (g.qIdx >= g.passage.questions.length) {
    _finishCompOe();
  } else {
    _renderCompOe();
  }
}
function _finishCompOe() {
  const g = _compOeState;
  const total = g.scores.reduce((a, b) => a + b, 0);
  const max = g.passage.questions.reduce((a, q) => a + q.marks, 0);
  const pct = Math.round(total / max * 100);
  const pts = Math.round(pct / 10);
  state.totalPoints = (state.totalPoints || 0) + pts;
  if (window.recordGameRun) window.recordGameRun(state, 'comp_oe', total, max);
  saveState(state);
  const modal = document.getElementById('compOeModal');
  if (modal) {
    modal.innerHTML = `
      <div class="mg-inner comp-oe-inner">
        <div class="mg-stats">📖 Comprehension OE · 完成!</div>
        <div class="comp-result">
          <div class="comp-result-score">${total}/${max} marks · ${pct}%</div>
          <div class="comp-result-pts">+${pts} 积分</div>
          <div class="comp-result-tip">${pct >= 80 ? '🌟 优秀! 继续保持!' : pct >= 50 ? '👍 不错! 注意 model answer 的关键词' : '💪 加油! 多练 PEEL 答题模板'}</div>
        </div>
        <button class="game-hub-btn" onclick="closeCompOe()">关闭</button>
      </div>`;
  }
  renderAll();
}
function closeCompOe() {
  const m = document.getElementById('compOeModal');
  if (m) { m.classList.remove('show'); m.innerHTML = ''; }
  _compOeState = null;
}
window.openCompOeGame = openCompOeGame;
window.compOeReveal = compOeReveal;
window.compOeScore = compOeScore;
window.closeCompOe = closeCompOe;
