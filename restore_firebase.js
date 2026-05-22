#!/usr/bin/env node
/**
 * restore_firebase.js — 一次性数据恢复脚本 (v19.10)
 * 把 firebase_check.json (5/13 06:22 peak, 3486 分, 408 logs) 写回 Firestore
 *
 * 步骤:
 *   1. 拉 live state 作为安全备份 → firebase_before_restore_<ts>.json
 *   2. 读 firebase_check.json 的 fields
 *   3. PATCH /chamui-psle/databases/(default)/documents/chamui/main
 *   4. 验证: 重新拉 live, 应是 3486
 *
 * 注: 公共 apiKey, Firestore rules 公开读写. 实际操作时孩子 app 应关闭, 否则
 *     subscribe 回推会再次覆盖. 推荐运行时让孩子 iPad 关掉 app.
 */

const fs = require('fs');
const https = require('https');

const PROJECT_ID = 'chamui-psle';
const DOC_PATH = 'chamui/main';
const URL = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/${DOC_PATH}`;
const SOURCE_FILE = 'firebase_check.json';

function httpReq(method, url, body) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const opts = {
      method, hostname: u.hostname, path: u.pathname + u.search,
      headers: { 'Content-Type': 'application/json' }
    };
    const req = https.request(opts, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        if (res.statusCode === 200) resolve(JSON.parse(data));
        else reject(new Error(`HTTP ${res.statusCode}: ${data}`));
      });
    });
    req.on('error', reject);
    if (body) req.write(typeof body === 'string' ? body : JSON.stringify(body));
    req.end();
  });
}

(async () => {
  console.log('🔥 数据恢复脚本 v19.10');
  console.log('=========================\n');

  // 1. 备份 live
  console.log('[1/4] 拉 live state 作为安全备份...');
  let liveDoc;
  try {
    liveDoc = await httpReq('GET', URL);
  } catch (e) {
    console.error('❌ 拉 live 失败:', e.message);
    process.exit(1);
  }
  const ts = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
  const backupName = `firebase_before_restore_${ts}.json`;
  fs.writeFileSync(backupName, JSON.stringify(liveDoc, null, 2));
  console.log(`  ✅ live 已备份 → ${backupName}`);
  const livePts = liveDoc.fields?.totalPoints?.integerValue;
  console.log(`  当前 live totalPoints: ${livePts}\n`);

  // 2. 读源数据
  console.log(`[2/4] 读源数据 ${SOURCE_FILE}...`);
  if (!fs.existsSync(SOURCE_FILE)) {
    console.error(`❌ ${SOURCE_FILE} 不存在`);
    process.exit(1);
  }
  const sourceDoc = JSON.parse(fs.readFileSync(SOURCE_FILE, 'utf8'));
  const sourcePts = sourceDoc.fields?.totalPoints?.integerValue;
  const sourceLogs = sourceDoc.fields?.logs?.arrayValue?.values?.length;
  console.log(`  源数据: totalPoints=${sourcePts}, logs=${sourceLogs} 条`);
  console.log(`  源 updateTime: ${sourceDoc.updateTime}\n`);

  // 3. 写回 Firestore
  console.log(`[3/4] PATCH 写回 Firestore (live ${livePts} → restore ${sourcePts})...`);
  console.log('  ⚠️ 确保孩子 iPad / 浏览器已关闭 app, 否则会被 subscribe 回推覆盖!\n');
  if (process.argv.indexOf('--yes') < 0) {
    console.log('  ⚠️ 加 --yes 参数确认执行 (避免误操作)');
    console.log('  例: node restore_firebase.js --yes\n');
    process.exit(0);
  }

  // Firestore PATCH 需要把 fields 整个写回
  const updatePayload = { fields: sourceDoc.fields };
  // 用 updateMask 包含所有 fields, 这样未在 source 中的字段会被删除
  const fieldKeys = Object.keys(sourceDoc.fields);
  const maskParams = fieldKeys.map(k => `updateMask.fieldPaths=${encodeURIComponent(k)}`).join('&');
  const patchURL = `${URL}?${maskParams}`;

  try {
    const result = await httpReq('PATCH', patchURL, updatePayload);
    console.log('  ✅ PATCH 成功');
    console.log(`  新 updateTime: ${result.updateTime}\n`);
  } catch (e) {
    console.error('❌ PATCH 失败:', e.message);
    console.error('  原因可能: Firestore rules 不允许写 / 权限问题');
    console.error(`  备份在: ${backupName} (可手动恢复)`);
    process.exit(1);
  }

  // 4. 验证
  console.log('[4/4] 验证...');
  await new Promise(r => setTimeout(r, 1500));
  const verifyDoc = await httpReq('GET', URL);
  const verifyPts = verifyDoc.fields?.totalPoints?.integerValue;
  const verifyLogs = verifyDoc.fields?.logs?.arrayValue?.values?.length;
  console.log(`  验证: totalPoints=${verifyPts}, logs=${verifyLogs} 条`);
  if (verifyPts === sourcePts) {
    console.log('  ✅ 数据恢复成功! 孩子下次打开 app 应看到 3486 分\n');
  } else {
    console.log(`  ⚠️ 验证不一致 (期望 ${sourcePts}, 实际 ${verifyPts})\n`);
  }

  console.log('=========================');
  console.log('  ✅ 全部完成');
  console.log('=========================');
  console.log(`\n📋 备份文件: ${backupName} (如需回滚)`);
  console.log('💡 建议: 让孩子下次打开 app 时强刷 (Ctrl+Shift+R) 拉新数据');
})();
