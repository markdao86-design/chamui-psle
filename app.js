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

  renderIronRule();
  renderWeeklyCoach();
  renderMasterTipCard();
  renderEquipment();
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
  const c = getWeeklyCoaching(state);
  const tip = c.masterTip;
  if (!tip) {
    el.innerHTML = '';
    return;
  }
  // tip.title 形如 "🔬 P4 Plant Transport ⭐ — 芹菜染色实验答题模板"
  // 拆成 subject 和 title 两段更好看
  let subject = '', title = tip.title;
  const dashIdx = tip.title.indexOf(' — ');
  if (dashIdx > 0) {
    subject = tip.title.substring(0, dashIdx);
    title = tip.title.substring(dashIdx + 3);
  }
  el.innerHTML = `
    <div class="master-tip-header">🌟 本周名师秘诀</div>
    ${subject ? `<div class="master-tip-subject">${escapeHtml(subject)}</div>` : ''}
    <div class="master-tip-title">${escapeHtml(title)}</div>
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
        <div><b>完成率</b><div style="font-size:36px">${r.completion.percent}%</div><div style="color:#666">${r.completion.done}/${r.completion.total} 个 slot</div></div>
        <div><b>本周得分</b><div style="font-size:36px;color:#FF6B6B">${r.points.weekTotal}</div><div style="color:#666">slot ${r.points.slot} + combo ${r.points.combo} + 复盘 ${r.points.review}</div></div>
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

      ${missedRows ? `<h2>📝 本周漏掉的 slot</h2>
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
  grid.innerHTML = CHAMUI.equipment.map(eq => {
    const unlocked = CHAMUI.checkEquipmentUnlocked(eq.id, state);
    return `
      <div class="equipment-item ${unlocked ? 'unlocked' : 'locked'}">
        <span class="equipment-icon">${eq.icon}</span>
        <div class="equipment-name">${eq.name}</div>
        <div class="equipment-condition">${unlocked ? '✓ 已解锁' : eq.hint}</div>
      </div>
    `;
  }).join('');
  renderSkinGrid();
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
        ? `<button class="vocab-btn" onclick="event.stopPropagation(); openVocabModal(${week})" title="本周学科词表">📚</button>`
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
      slotsHtml += `<div class="combo-banner">🔥 当日全勾!额外 +${DAY_COMBO_POINTS} combo!</div>`;
    } else {
      const left = dayTasks.length - dayTasks.filter(t => getDailyCheck(state, week, selectedDay, t.slot)).length;
      slotsHtml += `<div class="combo-hint">💡 还差 <b>${left}</b> 个,全勾再拿 <b>+${DAY_COMBO_POINTS}</b> combo</div>`;
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
    status = `🟡 还差 ${need} 个 slot 达 ${Math.round(WEEKLY_REVIEW_THRESHOLD * 100)}% — 拿 +${WEEKLY_REVIEW_POINTS} 复盘奖`;
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
      <span class="pts-piece">slot ${dp.slot}</span>
      <span class="pts-piece">combo ${dp.combo}</span>
      <span class="pts-piece">复盘 ${dp.review}</span>
      <span class="pts-piece pts-hint">${isHard ? '⭐ 难章周 全 +1' : '段3=1 段1/2=2 周末=3'}</span>
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
  saveState(state);

  const newDayComplete = isDayComplete(state, week, day);
  const newOnTrack = (calcWeekCompletion(week, state) || {}).onTrack;
  const pts = slotPoints(week, slot);

  if (!wasChecked) {
    // 浮动 +N 动画(高分 slot 用大字)
    spawnFloatPoints(`+${pts}`, evt, pts >= 3);
    // 大分数块脉动
    pulseScoreBlock();
    // 当日 combo 触发(撒花 + 震屏 + 大数字)
    if (newDayComplete && !oldDayComplete) {
      showToast(`🔥 当日全勾!combo +${DAY_COMBO_POINTS}`, 'success');
      shakeScreen();
      const cx = (evt && evt.clientX) || window.innerWidth / 2;
      const cy = (evt && evt.clientY) || window.innerHeight / 2;
      spawnConfetti(cx, cy, 35);
      setTimeout(() => spawnFloatPoints(`COMBO +${DAY_COMBO_POINTS}!`, evt, true), 200);
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

// ============ v16.3: 听力资源 modal (CNA938 直播 + 推荐播客 + BBC 外链) ============
function openListeningModal(week) {
  const modal = document.getElementById('listeningModal');
  if (!modal || !window.LISTENING_RESOURCES) return;
  const items = window.LISTENING_RESOURCES.map(r => {
    if (r.type === 'live-audio') {
      return `
        <div class="lis-item lis-live">
          <div class="lis-title">${r.title}</div>
          <div class="lis-desc">${escapeHtml(r.desc)}</div>
          <audio controls preload="none" src="${r.src}" style="width:100%;margin-top:8px"></audio>
          <a href="${r.fallbackUrl}" target="_blank" rel="noopener" class="lis-fallback">无法播放? 打开 CNA938 官网 →</a>
        </div>
      `;
    }
    if (r.type === 'youtube') {
      // 用 youtube-nocookie 域名 (隐私优化, 一些网络下也更稳)
      // 不写 autoplay — 孩子手动点 YouTube 自带的播放按钮
      return `
        <div class="lis-item lis-youtube">
          <div class="lis-title">${r.title}</div>
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
    return `
      <div class="lis-item">
        <div class="lis-title">${r.title}</div>
        <div class="lis-desc">${escapeHtml(r.desc)}</div>
        <a href="${r.url}" target="_blank" rel="noopener" class="btn btn-primary lis-link">▶ 在新标签打开播放</a>
      </div>
    `;
  }).join('');
  modal.innerHTML = `
    <div class="vocab-modal-inner">
      <div class="vocab-modal-header">
        <div>
          <span class="vocab-modal-title">🎧 听力资源(W${week})</span>
          <span class="vocab-modal-meta">每天 10-15 min · 精听 → 不查字典先全听一遍 → 第二遍记 3-5 个新词</span>
        </div>
        <button class="vocab-modal-close" onclick="closeListeningModal()">×</button>
      </div>
      <div class="vocab-modal-body" style="display:flex;flex-direction:column;gap:12px">${items}</div>
      <div class="vocab-modal-footer">
        💡 PSLE Listening 真题录音不公开,需要用 SAP《PSLE Listening Comprehension》配套 CD。
        听力陷阱:数字 / 否定词 / 转折(although / however)。<br>
        🎯 语速建议: <b>W1-W14</b> 用儿童故事 → <b>W15-W26</b> 加科学播客 → <b>W27+</b> 才挑战 CNA938。
      </div>
    </div>
  `;
  modal.classList.add('show');
}
function closeListeningModal() {
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

  // 1) 各科累计平均
  const subjectsOrdered = ['🔬 科学', '📖 英语阅读/词汇', '✏️ 英语写作/语法', '🗣️ 听力口试', '➗ 数学', '🇨🇳 华文'];
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
window.requireAdminAuth = requireAdminAuth;
window.resetAdminPassword = resetAdminPassword;
window.clearAdminAuth = clearAdminAuth;
window.isAdminAuthed = isAdminAuthed;
