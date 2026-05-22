#!/usr/bin/env node
/**
 * dump_firebase.js — 拉取孩子 Firebase 上的真实状态
 * 用法: node dump_firebase.js [--full]
 *   不加 --full: 只显示关键指标 (totalPoints / ⭐ / 错题本 / Cloze 正确率 等)
 *   --full: 同时把完整 state dump 到 firebase_dump_<timestamp>.json
 *
 * 原理: 调 Firestore REST API 拉 chamui/main 文档. 公开 API key, 无需 auth.
 */

const fs = require('fs');
const https = require('https');

const PROJECT_ID = 'chamui-psle';
const DOC_PATH = 'chamui/main';
const URL = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/${DOC_PATH}`;

const isFullDump = process.argv.includes('--full');

// 拉数据
function fetch(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let body = '';
      res.on('data', c => body += c);
      res.on('end', () => {
        if (res.statusCode === 200) resolve(JSON.parse(body));
        else reject(new Error(`HTTP ${res.statusCode}: ${body}`));
      });
    }).on('error', reject);
  });
}

// Firestore field format → 纯 JS
function parseField(f) {
  if (!f) return null;
  if ('integerValue' in f) return parseInt(f.integerValue);
  if ('doubleValue' in f) return parseFloat(f.doubleValue);
  if ('stringValue' in f) return f.stringValue;
  if ('booleanValue' in f) return f.booleanValue;
  if ('nullValue' in f) return null;
  if ('timestampValue' in f) return f.timestampValue;
  if ('mapValue' in f) {
    const out = {};
    const fields = (f.mapValue.fields || {});
    for (const k of Object.keys(fields)) out[k] = parseField(fields[k]);
    return out;
  }
  if ('arrayValue' in f) {
    return ((f.arrayValue.values) || []).map(parseField);
  }
  return null;
}
function flatten(doc) {
  if (!doc.fields) return {};
  const out = {};
  for (const k of Object.keys(doc.fields)) out[k] = parseField(doc.fields[k]);
  return out;
}

(async () => {
  console.log(`🔥 拉取 Firebase: ${PROJECT_ID}/chamui/main ...`);
  let doc;
  try {
    doc = await fetch(URL);
  } catch (e) {
    console.error('❌ 拉取失败:', e.message);
    console.error('如果是权限错误, 检查 firestore.rules 是否允许公开读 (开发模式)');
    process.exit(1);
  }
  const state = flatten(doc);
  const updateTime = doc.updateTime || '?';

  // ===== 关键指标 =====
  const pts = state.totalPoints || 0;
  const week = state.currentWeek || 1;
  const stars = Object.values(state.knowledgeStars || {}).reduce((s, e) => s + (e?.stars || 0), 0);
  const wrongs = (state.wrongAnswers || []).length;
  const wrongByGame = {};
  (state.wrongAnswers || []).forEach(w => { wrongByGame[w.gameKey] = (wrongByGame[w.gameKey] || 0) + 1; });

  // Paper 2 突击 (v19.7+)
  const p2 = state.paper2Sprint || {};
  const p2Cloze = p2.progress?.cloze || 0;
  const p2Sst = p2.progress?.sst || 0;
  const p2ClozeRecent = (p2.recent?.cloze || []);
  const p2SstRecent = (p2.recent?.sst || []);
  const recentAcc = (arr) => {
    if (!arr.length) return null;
    const c = arr.reduce((s, x) => s + (x.correct || 0), 0);
    const t = arr.reduce((s, x) => s + (x.total || 0), 0);
    return t ? Math.round(c / t * 100) + '%' : null;
  };

  // 各 mini-game 难度
  const diffs = {};
  Object.entries(state.gameStats || {}).forEach(([k, v]) => { diffs[k] = v?.difficulty || '?'; });

  // 双龙
  const silverUnlocked = !!state.dragonsUnlocked?.silver;
  const goldUnlocked = !!state.dragonsUnlocked?.gold;

  // Streak
  const streak = state.dailyStreak?.days || 0;
  const streakBest = state.dailyStreak?.bestEver || 0;

  // 装备
  const totalUnlocked = (() => {
    // 简化: 算装备没法在这跑 CHAMUI.checkEquipmentUnlocked, 用 totalPoints 粗估
    return null;
  })();

  // ===== 输出 =====
  console.log('\n========================================');
  console.log(`  📊 Firebase 状态 (更新于 ${updateTime})`);
  console.log('========================================\n');

  console.log(`📅 第 ${week} 周 (W${week} / 73)`);
  console.log(`💰 总积分: ${pts.toLocaleString()} 分 (= SGD ${(pts * 0.05).toFixed(2)})`);
  console.log(`🔥 Streak: ${streak} 天 (历史最高 ${streakBest})`);
  console.log(`⭐ 知识树: ${stars} / 105 (${Math.round(stars/105*100)}%)`);
  console.log(`📓 错题本: ${wrongs} 题待清`);
  if (Object.keys(wrongByGame).length) {
    console.log('   分布:', Object.entries(wrongByGame).map(([k,v]) => `${k}=${v}`).join(' '));
  }

  console.log('\n🎯 Paper 2 弱点突击:');
  console.log(`   Cloze: ${p2Cloze}/100 题 · 近 5 次 ${recentAcc(p2ClozeRecent) || '未练'}`);
  console.log(`   SST: ${p2Sst}/50 题 · 近 5 次 ${recentAcc(p2SstRecent) || '未练'}`);

  console.log('\n🎮 各 mini-game 难度 (5 级自适应):');
  Object.entries(diffs).forEach(([k, v]) => console.log(`   ${k}: Lv ${v}`));

  console.log('\n🐉 双龙状态:');
  console.log(`   🐲 银龙 (10000 分): ${silverUnlocked ? '✅ 已觉醒' : `${Math.round(pts/10000*100)}% (差 ${Math.max(0,10000-pts)} 分)`}`);
  console.log(`   🐉 金龙 (105⭐ + 10000 分): ${goldUnlocked ? '✅ 已觉醒' : `⭐ ${Math.round(stars/105*100)}% · 分 ${Math.round(pts/10000*100)}%`}`);

  // ===== 判断进度 =====
  console.log('\n📈 进度评估:');
  const pace = pts / Math.max(1, week);
  console.log(`   平均速度: ${Math.round(pace)} 分/周`);
  if (pace > 500) console.log('   ⚠️ 节奏过快 — 可能在刷分, 需检查 Cloze/SST 正确率');
  else if (pace > 200) console.log('   ✅ 节奏积极');
  else if (pace > 80) console.log('   ✅ 节奏稳健');
  else console.log('   ⚠️ 节奏偏慢');

  const remainWeeks = 73 - week;
  const proj = pts + pace * remainWeeks;
  console.log(`   W73 预估: ${Math.round(proj).toLocaleString()} 分 (按当前节奏)`);
  console.log(`   银龙 (10000) 可达?: ${proj >= 10000 ? '✅' : '❌ (差 ' + Math.round(10000-proj) + ' 分)'}`);

  // ===== 可选: 完整 dump =====
  if (isFullDump) {
    const ts = new Date().toISOString().slice(0,19).replace(/[:T]/g, '-');
    const fname = `firebase_dump_${ts}.json`;
    fs.writeFileSync(fname, JSON.stringify({ updateTime, state }, null, 2));
    console.log(`\n💾 完整 state 已保存 → ${fname}`);
  } else {
    console.log('\n💡 加 --full 参数可保存完整 state JSON');
  }
  console.log('');
})();
