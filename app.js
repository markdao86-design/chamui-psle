/**
 * 主应用逻辑 (v2 — 每日打卡 + 周汇总)
 * 渲染 + 交互 + 升级动画
 */

// 全局状态(初始空,init 里 await loadStateAsync 后填)
let state = getDefaultState();

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
  // 启动时若当前真实日期在本周内,默认选今天
  const today = todayDayKeyForWeek(state.currentWeek);
  if (today) selectedDay = today;
  bindEvents();
  renderAll();
  updateSyncBadge(typeof getFbStatus === 'function' ? getFbStatus() : 'local');
  // 异步拉照片 key cache,完了再 rerender
  refreshPhotoKeyCache().then(() => renderAll()).catch(() => {});
  // v18 Phase 5.1: 每日抽奖检查 + 成就 init 检查
  setTimeout(() => {
    _checkDailyDrawOnInit();
    _checkAndUnlockAch();
  }, 800);
  // 订阅 Firestore 远端变化
  if (typeof subscribeFirestore === 'function' && isFbReady && isFbReady()) {
    subscribeFirestore(remoteData => {
      state = Object.assign(getDefaultState(), remoteData);
      if (!state.daily) state.daily = {};
      if (!state.scores) state.scores = {};
      recalcTotalPoints(state);
      renderAll();
      showToast('☁️ 已收到远程更新', 'success');
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
  document.getElementById('characterName').textContent = levelInfo.name;
  document.getElementById('characterTitle').textContent = levelInfo.title;
  document.getElementById('charLevelDisplay').textContent = levelInfo.lv;

  // 大字总分 + 击败比例
  const bigScoreEl = document.getElementById('bigScoreNum');
  if (bigScoreEl) bigScoreEl.textContent = points;
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

  // v17.6: renderIronRule() 已移除
  renderWowCard();  // v17.1
  renderMysteryBoxCard();  // v17.5
  renderDailyQuestCard();  // v17.7 Phase 3
  renderPetWidget();  // v18 Phase 5.1
  renderAchievementWall();  // v18 Phase 5.1
  renderReviewCard();  // v18 Phase 5.3
  renderWeeklyCoach();
  renderMasterTipCard();
  renderEquipment();
}

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
  modal.innerHTML = `
    <div class="mb-result-inner" style="border-color:#A788E0">
      <div class="mb-result-icon">🔒</div>
      <div class="mb-result-title">还没有可开宝箱</div>
      <div class="mb-rules-full">${_mysteryRulesHtml()}</div>
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
      <div class="think-tip">🧠 答错也加 5 分 — 思考过程比答对更重要</div>
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
        <span class="think-points">${answer.correct ? '+10 分' : '+5 分'}</span>
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
    showToast(`🤔 思考题 +5 分 — 看下面的解释吧`, 'success');
    playSound('sad');
  }
  _checkAndUnlockAch();
  renderAll();
}

// v17.3: 每日 Wow 事实卡 — 默认展开 + 大字 + 高亮(英语/科学按日轮换)
function renderWowCard() {
  const card = document.getElementById('wowCard');
  if (!card || !window.getTodayWowFact) return;
  const wow = window.getTodayWowFact(state.currentWeek);
  if (!wow) {
    card.style.display = 'none';
    return;
  }
  card.style.display = '';
  card.style.borderLeftColor = wow.subjectColor || '#A788E0';
  // v17.3: 默认展开 (孩子第一眼就看到完整解释), 用户可点击收起
  if (card.dataset.expanded === undefined || card.dataset.expanded === '') {
    card.dataset.expanded = '1';
  }
  const expanded = card.dataset.expanded === '1';
  card.innerHTML = `
    <div class="wow-header">
      <span class="wow-tag" style="color:${wow.subjectColor};border-color:${wow.subjectColor}">
        🤯 ${wow.subjectIcon} ${wow.subject} · ${wow.tag}
      </span>
      <span class="wow-toggle">${expanded ? '收起 ▲' : '点击展开 ▼'}</span>
    </div>
    <div class="wow-hook">${escapeHtml(wow.hook)}</div>
    ${expanded ? `<div class="wow-body">${escapeHtml(wow.body)}</div>` : ''}
  `;
  card.onclick = () => {
    card.dataset.expanded = expanded ? '0' : '1';
    renderWowCard();
    // v17.7 quest: 看 wow 算 1 次
    if (card.dataset.expanded === '1') {
      _trackQuest('wow-1', 1);
      // v18 Phase 5.3: enqueue 复习(类型 wow)
      if (window.enqueueReview) {
        const wow = window.getTodayWowFact(state.currentWeek);
        const id = wow.subjectKey === 'science' ? 'w' + wow.week : (wow.tag + '_' + (window.ENGLISH_WOW_FACTS.indexOf(window.ENGLISH_WOW_FACTS.find(w => w.hook === wow.hook))));
        window.enqueueReview(state, 'wow', id);
      }
      // v18 wowSeenCount 累加
      state.wowSeenCount = (state.wowSeenCount || 0) + 1;
      saveState(state);
      _checkAndUnlockAch();
    }
  };
}

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
  // v18.12: header 用学科色作为深底, 文字白
  const subjColor = tip.dailySubjectColor || '#A788E0';
  el.style.borderLeftColor = subjColor;
  el.innerHTML = `
    <div class="master-tip-header" style="background:${subjColor}">🌟 今日名师秘诀 · ${tip.dailySubject}</div>
    <div class="master-tip-subject" style="background:${subjColor}">${escapeHtml(tip.subject)}</div>
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
    <li>${m.dayLabel} ${m.slot} <span style="color:#666">— ${escapeHtml(m.task)}</span></li>
  `).join('');
  const keyMissingRows = r.keySlotsMissing.map(k => `
    <li><b style="color:#FF9F45">🎯 必做</b> ${DAY_LABELS[k.day]} ${k.slot} — ${escapeHtml(k.task)}</li>
  `).join('');
  const diagnosisHtml = r.coachDiagnosis.map(d => `<li>${escapeHtml(d)}</li>`).join('');
  const focusList = r.coachFocus && r.coachFocus.points.length
    ? `<ul>${r.coachFocus.points.map(p => `<li>${escapeHtml(p)}</li>`).join('')}</ul>` : '';
  const weakHtml = r.coachWeakAdvice
    ? `<p><b>弱项:${escapeHtml(r.coachWeakAdvice.subject)}</b> 平均 ${r.coachWeakAdvice.avgPct}%</p><p>${escapeHtml(r.coachWeakAdvice.advice)}</p>`
    : '<p style="color:#666">暂无明显弱项;继续保持各科均衡</p>';
  const nextHtml = r.nextWeek ? `
    <p><b>W${r.nextWeek.week} ${escapeHtml(r.nextWeek.dateRange)} — ${escapeHtml(r.nextWeek.theme)}${r.nextWeek.isHard ? ' ⭐ 难章周' : ''}</b></p>
    ${r.nextWeek.focus.length ? `<ul>${r.nextWeek.focus.map(p => `<li>${escapeHtml(p)}</li>`).join('')}</ul>` : ''}
  ` : '<p style="color:#666">已是最后一周</p>';

  return `
    <div class="report-doc">
      <div class="report-head">
        <h1>📋 佑子 PSLE 备考 — 第 ${r.week} 周报告</h1>
        <div class="report-sub">${escapeHtml(r.theme)}${r.isHard ? ' ⭐ 难章周' : ''} · ${escapeHtml(r.dateRange)} · 生成于 ${escapeHtml(r.generatedAt)}</div>
      </div>

      <h2>1️⃣ 本周完成情况</h2>
      <div class="report-grid">
        <div><b>完成率</b><div style="font-size:36px">${r.completion.percent}%</div><div style="color:#666">${r.completion.done}/${r.completion.total} 个项目</div></div>
        <div><b>本周得分</b><div style="font-size:36px;color:#FF6B6B">${r.points.weekTotal}</div><div style="color:#666">项目分 ${r.points.slot} + 全勤 ${r.points.combo} + 复盘 ${r.points.review}</div></div>
        <div><b>累计 / 等级</b><div style="font-size:24px">⭐ ${r.points.grandTotal}</div><div style="color:#666">Lv${r.level.lv} ${escapeHtml(r.level.name)}</div></div>
        <div><b>击败同岛同学</b><div style="font-size:24px;color:#A788E0">${r.beat.pct}%</div><div style="color:#666">约 ${r.beat.count.toLocaleString('en-US')} 名</div></div>
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

// ============ 智慧教练(v4 主页新模块)============
function renderWeeklyCoach() {
  const container = document.getElementById('coachContent');
  const meta = document.getElementById('coachMeta');
  if (!container) return;
  const c = getWeeklyCoaching(state);
  if (meta) meta.textContent = `W${state.currentWeek} · ${c.phase}`;

  const diagHtml = `
    <div class="coach-section">
      <div class="coach-section-title">📊 本周诊断</div>
      <div class="coach-diag-list">
        ${c.diagnosis.map(d => `<div>${escapeHtml(d)}</div>`).join('')}
      </div>
    </div>
  `;

  const focusHtml = c.focus && c.focus.points.length ? `
    <div class="coach-section">
      <div class="coach-section-title">🎯 本周重点</div>
      <div class="coach-focus">
        <div class="coach-focus-title">${escapeHtml(c.focus.title)}</div>
        <ul>${c.focus.points.map(p => `<li>${escapeHtml(p)}</li>`).join('')}</ul>
      </div>
    </div>
  ` : '';

  const weakHtml = c.weakAdvice ? `
    <div class="coach-section">
      <div class="coach-section-title">💡 提升建议</div>
      <div class="coach-weak">
        <b>${escapeHtml(c.weakAdvice.subject)}</b> 平均 ${c.weakAdvice.avgPct}% — ${escapeHtml(c.weakAdvice.advice)}
      </div>
    </div>
  ` : '';

  // v16: 周日 19:30 复盘 5 步 (只有今天是周日才显示)
  let sundayHtml = '';
  if (new Date().getDay() === 0 && window.SUNDAY_REVIEW_STEPS) {
    sundayHtml = `
      <div class="coach-section sunday-review-section">
        <div class="coach-section-title">🗓️ 今天周日 19:30-21:00 复盘时间(1.5h)</div>
        <ol style="margin:6px 0 0 18px;padding:0;font-size:13px;line-height:1.7">
          ${window.SUNDAY_REVIEW_STEPS.map(s => `<li>${escapeHtml(s.replace(/^[①②③④⑤]\s?/, ''))}</li>`).join('')}
        </ol>
      </div>
    `;
  }

  // 名师秘诀已移到右栏独立卡(renderMasterTipCard),这里不再重复渲染
  container.innerHTML = sundayHtml + diagHtml + focusHtml + weakHtml;
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
  grid.innerHTML = CHAMUI.equipment.map(eq => {
    const unlocked = CHAMUI.checkEquipmentUnlocked(eq.id, state);
    const equipped = unlocked && !disabled.has(eq.id);
    const cls = !unlocked ? 'locked' : (equipped ? 'unlocked equipped' : 'unlocked unequipped');
    const click = unlocked ? `onclick="toggleEquipment('${eq.id}')"` : '';
    const cursor = unlocked ? 'cursor:pointer' : 'cursor:default';
    const status = !unlocked ? eq.hint
      : equipped ? '✓ 穿戴中(点击卸下)'
      : '👜 已收藏(点击穿戴)';
    return `
      <div class="equipment-item ${cls}" style="${cursor}" ${click} title="${unlocked ? (equipped ? '点击卸下' : '点击穿戴') : '未解锁'}">
        <span class="equipment-icon">${eq.icon}</span>
        <div class="equipment-name">${eq.name}</div>
        <div class="equipment-condition">${status}</div>
      </div>
    `;
  }).join('');
  renderSkinGrid();
}

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

// ============ 打卡页 (v2 — 每日) ============
function renderCheckinPage() {
  const week = state.currentWeek;
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
  let slotsHtml;
  if (dayTasks.length === 0) {
    slotsHtml = `<div class="empty-day">📭 这一天没有安排任务</div>`;
  } else {
    slotsHtml = dayTasks.map(t => {
      const checked = getDailyCheck(state, week, selectedDay, t.slot);
      const hasPhoto = hasPhotoCached(week, selectedDay, t.slot);
      const isKey = isKeySlot(week, selectedDay, t.slot);
      const pts = slotPoints(week, t.slot);
      const tip = getTaskTip(t.task);
      const sc = getScore(state, week, selectedDay, t.slot);
      const photoBtn = hasPhoto
        ? `<button class="photo-btn has-photo" onclick="event.stopPropagation(); viewPhoto(${week}, '${selectedDay}', '${t.slot}')" title="看作业照">📸</button>`
        : `<button class="photo-btn" onclick="event.stopPropagation(); pickPhotoForSlot(${week}, '${selectedDay}', '${t.slot}')" title="传作业照">📷</button>`;
      const scoreBtn = sc
        ? `<button class="score-btn has-score" onclick="event.stopPropagation(); openScoreModal(${week}, '${selectedDay}', '${t.slot}')" title="${escapeAttr(sc.note || '')}">📊 ${sc.score}/${sc.max}</button>`
        : `<button class="score-btn" onclick="event.stopPropagation(); openScoreModal(${week}, '${selectedDay}', '${t.slot}')" title="记分数">📊</button>`;
      // v16: 学科词汇按钮 — 任务内含 "30 词" / "DeepSeek 词汇" / "Vocabulary U" / "拼写" / "用法测" 时出现
      const isVocabTask = /30 词|DeepSeek 词汇|Vocabulary U|拼写 \+ 用法测|学科词汇/.test(t.task);
      const vocabAvailable = window.getVocabForWeek && window.getVocabForWeek(week) !== null;
      const vocabBtn = (isVocabTask && vocabAvailable)
        ? `<button class="vocab-btn" onclick="event.stopPropagation(); openVocabModal(${week})" title="本周学科词表">📚</button>
           <button class="vocab-game-btn" onclick="event.stopPropagation(); openVocabGame(${week})" title="🎮 词汇连连看 (赢 +10 + 1 宝箱)">🎮</button>`
        : '';
      // v16.3: 听力资源按钮 — 任务含 CNA938 / okto / Listening / 听力 时出现
      const isListenTask = /CNA938|okto|Listening|听力|🎧/.test(t.task);
      const listenBtn = isListenTask
        ? `<button class="listen-btn" onclick="event.stopPropagation(); openListeningModal(${week})" title="听力资源(CNA938 直播 + 播客)">🔊</button>`
        : '';
      const keyChip = isKey ? `<span class="key-chip" title="必做关键项目,影响周复盘奖">🎯 必做</span>` : '';
      const tipLine = tip ? `<div class="checkin-tip">${escapeHtml(tip)}</div>` : '';
      return `
        <div class="checkin-item ${checked ? 'checked' : ''} ${isKey ? 'key-slot' : ''}" data-slot="${t.slot}"
             onclick="toggleDailyCheck(${week}, '${selectedDay}', '${t.slot}', event)">
          <div class="checkin-content">
            <div class="check-circle"></div>
            <div class="checkin-info">
              <div class="checkin-title">${escapeHtml(t.task)} ${keyChip}</div>
              <div class="checkin-desc">⏰ ${escapeHtml(t.time)}</div>
              ${tipLine}
            </div>
          </div>
          ${scoreBtn}
          ${vocabBtn}
          ${listenBtn}
          ${photoBtn}
          <div class="checkin-points">+${pts}</div>
        </div>
      `;
    }).join('');
    // Day combo banner
    if (allDoneToday) {
      slotsHtml += `<div class="combo-banner">🔥 当日全勾!额外 +${DAY_COMBO_POINTS} 分全勤奖!</div>`;
    } else {
      const left = dayTasks.length - dayTasks.filter(t => getDailyCheck(state, week, selectedDay, t.slot)).length;
      slotsHtml += `<div class="combo-hint">💡 还差 <b>${left}</b> 个,全勾再拿 <b>+${DAY_COMBO_POINTS}</b> 分全勤奖</div>`;
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

  list.innerHTML = goalBanner + dayTabs + `<div class="day-slots">${slotsHtml}</div>` + summary + adminHtml;
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

  return `
    <div class="week-summary card">
      <div class="card-title">📊 本周汇总分析</div>
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

function selectDay(day) {
  selectedDay = day;
  renderCheckinPage();
}

function toggleDailyCheck(week, day, slot, evt) {
  const oldPoints = state.totalPoints;
  const oldDayComplete = isDayComplete(state, week, day);
  const oldOnTrack = (calcWeekCompletion(week, state) || {}).onTrack;
  const wasChecked = getDailyCheck(state, week, day, slot);

  setDailyCheck(state, week, day, slot, !wasChecked);
  recalcTotalPoints(state);

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
  }
  saveState(state);
  // v18 Phase 5.1: 检查成就(在保存后调,避免新成就改 state 没存)
  if (!wasChecked) _checkAndUnlockAch();

  const newDayComplete = isDayComplete(state, week, day);
  const newOnTrack = (calcWeekCompletion(week, state) || {}).onTrack;
  const pts = slotPoints(week, slot);

  if (!wasChecked) {
    // 浮动 +N 动画(高分 slot 用大字)
    spawnFloatPoints(`+${pts}`, evt, pts >= 3);
    // 大分数块脉动
    pulseScoreBlock();
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
function pickPhotoForSlot(week, day, slot) {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';
  input.capture = 'environment';
  input.style.display = 'none';
  input.onchange = async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    showToast('📤 正在压缩上传…', 'success');
    try {
      const blob = await compressImage(file);
      await photoPut(week, day, slot, blob);
      await refreshPhotoKeyCache();
      showToast(`📸 已存证 (${Math.round(blob.size / 1024)} KB)`, 'success');
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
  if (!rec) {
    showToast('❌ 找不到照片', 'warn');
    return;
  }
  const url = URL.createObjectURL(rec.blob);
  const date = new Date(rec.savedAt).toLocaleString('zh-CN');
  const tasks = getDailyTasks(week, day);
  const t = tasks.find(x => x.slot === slot);
  const taskText = t ? t.task : slot;

  const overlay = document.createElement('div');
  overlay.className = 'photo-modal';
  overlay.innerHTML = `
    <div class="photo-modal-card">
      <div class="photo-modal-header">
        <div>
          <div class="photo-modal-title">${escapeHtml(taskText)}</div>
          <div class="photo-modal-meta">W${week} · ${DAY_LABELS[day]} · ${slot} · 上传 ${date} · ${Math.round(rec.size / 1024)} KB</div>
        </div>
        <button class="photo-modal-close" onclick="this.closest('.photo-modal').remove(); URL.revokeObjectURL('${url}')">✕</button>
      </div>
      <img class="photo-modal-img" src="${url}" alt="作业照">
      <div class="photo-modal-actions">
        <button class="btn btn-secondary" onclick="replacePhoto(${week}, '${day}', '${slot}'); this.closest('.photo-modal').remove();">🔄 换一张</button>
        <button class="btn btn-danger" onclick="deletePhoto(${week}, '${day}', '${slot}'); this.closest('.photo-modal').remove();">🗑️ 删除</button>
      </div>
    </div>
  `;
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      overlay.remove();
      URL.revokeObjectURL(url);
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
  const v = window.getVocabForWeek ? window.getVocabForWeek(weekN) : null;
  if (!v) {
    showToast('本周没有学科词汇游戏可玩', 'sad');
    return;
  }
  // 从 section 中随机取 6 个有翻译的词
  const allWords = (v.section.words || []).filter(w => window.VOCAB_MEANINGS && window.VOCAB_MEANINGS[w]);
  if (allWords.length < 6) {
    showToast(`本周词汇翻译数据不足(只有 ${allWords.length} 个), 暂不能玩`, 'sad');
    return;
  }
  // 洗牌选 6 个
  const shuffled = [...allWords].sort(() => Math.random() - 0.5).slice(0, 6);
  const pairs = shuffled.map(w => ({ en: w, zh: window.getVocabMeaning(w) }));
  // 中文列另独立洗牌
  const zhShuffled = [...pairs].sort(() => Math.random() - 0.5);
  _vocabGameState = {
    pairs, zhShuffled,
    selectedEn: null, selectedZh: null,
    matched: new Set(),
    wrong: 0,
    startedAt: Date.now(),
    weekN
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
            return `<button class="vg-tile vg-en ${isSelected ? 'selected' : ''} ${isMatched ? 'matched' : ''}"
              onclick="vocabGameClickEn(${i})" ${isMatched ? 'disabled' : ''}>${escapeHtml(p.en)}</button>`;
          }).join('')}
        </div>
        <div class="vg-col">
          ${g.zhShuffled.map((p, i) => {
            const isSelected = g.selectedZh === i;
            const isMatched = g.matched.has(p.en);
            return `<button class="vg-tile vg-zh ${isSelected ? 'selected' : ''} ${isMatched ? 'matched' : ''}"
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
      // 全完成 — 给奖励
      state.totalPoints += 10;
      if (!state.mysteryBoxes) state.mysteryBoxes = { available: 0, opened: 0, totalSlotsAtLastEarn: 0, history: [] };
      state.mysteryBoxes.available += 1;
      state.logs.push({
        reason: `🎮 词汇连连看 W${g.weekN} 全对(${g.wrong} 错)`,
        points: 10, week: state.currentWeek, timestamp: Date.now()
      });
      // v18 vocabPerfectRuns 用于成就
      if (g.wrong === 0) state.vocabPerfectRuns = (state.vocabPerfectRuns || 0) + 1;
      state.vocabGameRuns = (state.vocabGameRuns || 0) + 1;
      saveState(state);
      spawnConfetti(window.innerWidth / 2, window.innerHeight / 3, 60);
      playSound('tada');
      _checkAndUnlockAch();
      setTimeout(() => renderAll(), 300);
    }
  } else {
    g.wrong += 1;
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
  const form = window.getCurrentPetForm(state);
  state.pet.formIdx = form.idx;
  const happy = state.pet.happiness || 0;
  const isSad = happy < 30;
  const inAshes = window.isStreakInAshes && window.isStreakInAshes(state);
  // v18.10: SVG 自绘 7 形态 — 直接渲染 form.svg
  w.style.background = (isSad || inAshes) ? '#E8E8E8' : (form.bg || 'white');
  w.innerHTML = `<div class="pet-svg-wrap ${isSad || inAshes ? 'pet-sad' : ''}">${form.svg}</div>`;
  // v18.7: 高级形态加金色光环
  w.classList.toggle('pet-king', form.idx >= 6);
  w.classList.toggle('pet-warrior', form.idx === 5);
  w.setAttribute('data-name', `${state.pet.name || '球球'} · ${form.name} ${isSad ? '😢' : ''}`);
  w.title = `${state.pet.name || '球球'} (${form.name})\n心情 ${happy}/100\n点击查看详情/改名`;
  w.onclick = openPetModal;
}
function openPetModal() {
  const modal = document.getElementById('petModal');
  if (!modal) return;
  const form = window.getCurrentPetForm(state);
  const nextForm = window.PET_FORMS.find(f => f.idx === form.idx + 1);
  const streak = (state.dailyStreak && state.dailyStreak.bestEver) || 0;
  const formsList = window.PET_FORMS.map(f => {
    const unlocked = streak >= f.minStreak;
    const isCurrent = f.idx === form.idx;
    return `<div class="pet-form-item ${unlocked ? 'unlocked' : 'locked'} ${isCurrent ? 'current' : ''}" style="background:${f.bg || 'white'}">
      <div class="pet-form-svg">${f.svg}</div>
      <div class="pet-form-meta">${f.name} (连续打卡 ≥${f.minStreak} 天)${isCurrent ? ' ← 你在这' : ''}</div>
    </div>`;
  }).join('');
  modal.innerHTML = `
    <div class="pet-modal-inner">
      <div class="pet-modal-header">
        <span class="pet-modal-title">🐹 宠物 ${escapeHtml(state.pet.name || '')}</span>
        <button class="vocab-modal-close" onclick="closePetModal()">×</button>
      </div>
      <div class="pet-modal-body">
        <div class="pet-current"><div class="pet-current-svg">${form.svg}</div>${form.name} · 心情 ${state.pet.happiness}/100</div>
        <div class="pet-desc">${escapeHtml(form.desc)}</div>
        ${nextForm ? `<div class="pet-next">下一形态: <b>${nextForm.name}</b> (连续打卡 ≥ ${nextForm.minStreak} 天 · 还差 ${Math.max(0, nextForm.minStreak - streak)} 天)</div>` : '<div class="pet-next">已最高形态! 🎉</div>'}
        <div class="pet-rename">
          <button class="btn btn-secondary" onclick="renamePet()">✏️ 改名</button>
        </div>
        <div class="pet-forms-list">${formsList}</div>
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
            <div class="fs-num">${state.totalPoints}</div>
            <div class="fs-sub">总分 · Lv ${window.CHAMUI ? window.CHAMUI.getLevelInfo(state.totalPoints).lv : '?'}</div>
          </div>
          <div class="fs-arrow">→</div>
          <div class="fs-stat-col fs-future">
            <div class="fs-label">W73 预测</div>
            <div class="fs-num">${p.predictedTotal}</div>
            <div class="fs-sub">总分 · Lv ${p.predLv.lv}</div>
          </div>
        </div>
        <div class="fs-summary">
          <div>📊 预测 PSLE 成绩 ≈ <b>AL ${p.predAL}</b></div>
          <div>⚔️ 预测装备 <b>${p.predEqCount}/45</b></div>
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
  modal.innerHTML = `
    <div class="mgh-inner">
      <div class="mgh-header">
        <span class="mgh-title">🎮 Mini-game 大厅</span>
        <button class="vocab-modal-close" onclick="closeMiniGameHub()">×</button>
      </div>
      <div class="mgh-grid">
        <button class="mgh-game" onclick="closeMiniGameHub(); openVocabGame(${state.currentWeek})">
          📚<br><b>词汇连连看</b><br><small>6×6 配对, 全对 +10 + 1 宝箱</small>
        </button>
        <button class="mgh-game" onclick="closeMiniGameHub(); openMathGame()">
          ➗<br><b>数学速算</b><br><small>30 秒答 10 题</small>
        </button>
        <button class="mgh-game" onclick="closeMiniGameHub(); openEditingGame()">
          ✏️<br><b>Editing 找错</b><br><small>50 词找 5 错</small>
        </button>
        <button class="mgh-game" onclick="closeMiniGameHub(); openListenGame()">
          🎧<br><b>听写练习</b><br><small>听 1 段填 5 词</small>
        </button>
      </div>
    </div>
  `;
  modal.classList.add('show');
}
function closeMiniGameHub() {
  document.getElementById('miniGameHubModal').classList.remove('show');
}

// 数学速算
let _mathGameState = null;
let _mathTimer = null;
function openMathGame() {
  // v18.3: 按今日轮换 (同一天稳定 10 题, 跨天换)
  const qs = window.getDailyMathQuestions ? window.getDailyMathQuestions(10) : [...window.MATH_QUESTIONS].sort(() => Math.random() - 0.5).slice(0, 10);
  _mathGameState = { qs, idx: 0, correct: 0, wrong: 0, startedAt: Date.now(), timeLeft: 30 };
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
  if (!input || input.value === '') return;  // 不提交空值
  const val = parseInt(input.value);
  const q = g.qs[g.idx];
  if (val === q.ans) { g.correct++; playSound('ding'); }
  else { g.wrong++; playSound('sad'); }
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
  let reward = 0;
  if (g.correct >= 10) reward = 8;
  else if (g.correct >= 7) reward = 5;
  if (reward > 0) {
    state.totalPoints += reward;
    state.logs.push({ reason: `🎮 数学速算 ${g.correct}/10`, points: reward, week: state.currentWeek, timestamp: Date.now() });
  }
  state.mathGameRuns = (state.mathGameRuns || 0) + 1;
  saveState(state);
  const modal = document.getElementById('mathGameModal');
  modal.innerHTML = `
    <div class="mg-inner">
      <div class="mg-result-icon">${g.correct >= 10 ? '🎉' : g.correct >= 7 ? '👍' : '🤔'}</div>
      <div class="mg-result-title">${g.correct >= 10 ? '全对!' : '完成!'}</div>
      <div class="mg-result-stats">${g.correct}/10 对 · ${g.wrong} 错 · ${30 - g.timeLeft}s 用时</div>
      <div class="mg-result-reward">+${reward} 分</div>
      <button class="btn btn-primary" onclick="closeMathGame()">知道了!</button>
    </div>
  `;
  if (g.correct >= 10) { spawnConfetti(window.innerWidth / 2, window.innerHeight / 3, 40); playSound('tada'); }
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
  // v18.3: 按今日轮换
  const para = window.getDailyEditingParagraph ? window.getDailyEditingParagraph() : window.EDITING_PARAGRAPHS[0];
  _editingGameState = { para, found: new Set(), wrong: 0, startedAt: Date.now() };
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
      // 全对
      state.totalPoints += 10;
      if (!state.mysteryBoxes) state.mysteryBoxes = { available: 0, opened: 0, totalSlotsAtLastEarn: 0, history: [] };
      state.mysteryBoxes.available += 1;
      state.logs.push({ reason: '🎮 Editing 找错全对', points: 10, week: state.currentWeek, timestamp: Date.now() });
      state.editingGameRuns = (state.editingGameRuns || 0) + 1;
      saveState(state);
      spawnConfetti(window.innerWidth / 2, window.innerHeight / 3, 40);
      playSound('tada');
    }
  } else {
    g.wrong++;
    playSound('sad');
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
  // v18.3: 按今日轮换
  const item = window.getDailyListenDictation ? window.getDailyListenDictation() : window.LISTEN_DICTATIONS[0];
  _listenGameState = { item, answers: ['', '', '', '', ''], played: false };
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
  let reward = 0;
  if (correct >= 5) reward = 10;
  else if (correct >= 3) reward = 5;
  if (reward > 0) {
    state.totalPoints += reward;
    if (correct >= 5 && state.mysteryBoxes) state.mysteryBoxes.available += 1;
    state.logs.push({ reason: `🎮 听写 ${correct}/5`, points: reward, week: state.currentWeek, timestamp: Date.now() });
  }
  state.listenGameRuns = (state.listenGameRuns || 0) + 1;
  saveState(state);
  const modal = document.getElementById('listenGameModal');
  modal.innerHTML = `
    <div class="lg-inner">
      <div class="lg-result-icon">${correct >= 5 ? '🎉' : correct >= 3 ? '👍' : '🤔'}</div>
      <div class="lg-result-title">${correct}/5 对</div>
      <div class="lg-result-text">原文: ${escapeHtml(g.item.text)}</div>
      <div class="lg-result-reward">+${reward} 分${correct >= 5 ? ' + 1 宝箱' : ''}</div>
      <button class="btn btn-primary" onclick="closeListenGame()">知道了!</button>
    </div>
  `;
  if (correct >= 5) { spawnConfetti(window.innerWidth / 2, window.innerHeight / 3, 40); playSound('tada'); }
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
          <span style="font-size: 12px; color: var(--color-text-light);">${ex.date} · ${ex.points} 分 = SGD ${(ex.points * (window.SGD_PER_POINT || 0.25)).toFixed(2)}</span>
        </div>
        <button class="btn btn-secondary" style="font-size: 12px; padding: 4px 8px;" onclick="deleteExchange(${idx})">删除</button>
      </div>
    `).join('');
  }

  drawChart();
  renderProgressStatsCard();  // v18.2 数据可视化
  renderScoreTracking();
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

// ============ 管理页 ============
function renderAdminPage() {
  // 异步渲染照片 gallery
  renderPhotoGallery(state.currentWeek).catch(e => console.error(e));

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
      <div style="background: white; border: 2px solid ${isAdd ? 'var(--color-success)' : 'var(--color-danger)'}; border-radius: 8px; padding: 10px; margin-bottom: 6px; display: flex; justify-content: space-between; align-items: center;">
        <div>
          <b>${escapeHtml(log.reason)}</b><br>
          <span style="font-size: 11px; color: var(--color-text-light);">W${log.week} · ${date}</span>
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
  // v16: 单次终极大奖封顶 SGD 1500 (= 6000 积分 @ 0.25/分)
  const SGD = points * (window.SGD_PER_POINT || 0.25);
  const CAP = window.ULTIMATE_PRIZE_SGD || 1500;
  const CAP_PTS = window.ULTIMATE_PRIZE_POINTS || 6000;
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
  t.className = `toast ${type}`;
  t.textContent = msg;
  document.getElementById('toastContainer').appendChild(t);
  setTimeout(() => {
    t.style.opacity = '0';
    t.style.transition = 'opacity 0.3s';
    setTimeout(() => t.remove(), 300);
  }, 2200);
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
    if (state.currentWeek > 1) {
      state.currentWeek--;
      selectedDay = todayDayKeyForWeek(state.currentWeek) || 'Mon';
      saveState(state);
      renderAll();
    }
  });
  document.getElementById('nextWeekBtn').addEventListener('click', () => {
    if (state.currentWeek < 73) {
      state.currentWeek++;
      selectedDay = todayDayKeyForWeek(state.currentWeek) || 'Mon';
      saveState(state);
      renderAll();
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
