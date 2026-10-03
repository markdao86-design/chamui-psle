// 清理 Firebase Hosting 旧版本 (Spark 计划 10GB 存储配额, 每次部署都存一版; 超了就 429 不能部署)
// 用法: node tools/prune_hosting_versions.js [keep=5]   —— 保留最近 keep 个 FINALIZED 版本, 其余删除 (当前 live 版本永远不删)
const path = require('path');
const ft = path.join(__dirname, '..', 'node_modules', 'firebase-tools');
const auth = require(ft + '/lib/auth');
const { setRefreshToken } = auth;
const { Client } = require(ft + '/lib/apiv2');
const SITE = 'chamui-psle', KEEP = Number(process.argv[2] || 5);
(async () => {
  const acct = auth.getGlobalDefaultAccount(); if (!acct) throw new Error('no account');
  setRefreshToken(acct.tokens.refresh_token);
  const tok = await auth.getAccessToken(acct.tokens.refresh_token, []);
  const c = new Client({ urlPrefix: 'https://firebasehosting.googleapis.com', apiVersion: 'v1beta1', auth: false });
  const H = { headers: { Authorization: 'Bearer ' + tok.access_token } };
  const rel = await c.get(`/sites/${SITE}/releases`, Object.assign({ queryParams: { pageSize: 1 } }, H));
  const live = rel.body.releases && rel.body.releases[0] && rel.body.releases[0].version && rel.body.releases[0].version.name;
  let versions = [], pageToken;
  do {
    const r = await c.get(`/sites/${SITE}/versions`, Object.assign({ queryParams: Object.assign({ pageSize: 100 }, pageToken ? { pageToken } : {}) }, H));
    versions = versions.concat(r.body.versions || []); pageToken = r.body.nextPageToken;
  } while (pageToken);
  versions.sort((a, b) => String(b.createTime).localeCompare(String(a.createTime)));
  console.log('versions', versions.length, 'live', live);
  let kept = 0, del = 0, bytes = 0;
  for (const v of versions) {
    if (v.name === live) { kept++; continue; }
    if (v.status === 'FINALIZED' && kept < KEEP) { kept++; continue; }
    try { await c.delete(`/${v.name}`, H); del++; bytes += Number(v.versionBytes || 0); } catch (e) { console.log('skip', v.name, e.message.slice(0, 80)); }
  }
  console.log('deleted', del, 'freed ~', (bytes / 1048576).toFixed(0), 'MB; kept', kept);
})().catch(e => { console.error(e.message); process.exit(1); });
