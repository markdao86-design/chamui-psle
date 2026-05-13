/**
 * 佑子角色 SVG 生成器 — v18.13 全新身比 + 42 装备真穿戴感
 * 12 级配置 + 3 套身体模板 (young/teen/hero) + 42 件装备
 */

const CHAMUI = {
  // 12 级配置 (v5 — 73 周拉伸,Lv12 = 满级 PSLE 王者)
  levels: [
    { lv: 1,  name: '萌新佑子',   title: '刚入门的勇士',     minPoints: 0,    color: '#FFB6D9' },
    { lv: 2,  name: '学徒佑子',   title: '戴上学士帽',       minPoints: 60,   color: '#FFB6D9' },
    { lv: 3,  name: '笔尖佑子',   title: '挥舞铅笔剑',       minPoints: 140,  color: '#FFC4DD' },
    { lv: 4,  name: '书童佑子',   title: '背起书包',         minPoints: 240,  color: '#FFC4DD' },
    { lv: 5,  name: '研究佑子',   title: '科学探险家',       minPoints: 360,  color: '#FFD4E5' },
    { lv: 6,  name: '战士佑子',   title: '披上披风',         minPoints: 500,  color: '#FFD4E5' },
    { lv: 7,  name: '学霸佑子',   title: '智慧加身',         minPoints: 660,  color: '#FFE4ED' },
    { lv: 8,  name: '王者佑子',   title: 'P5 王者',          minPoints: 840,  color: '#FFE4ED' },
    { lv: 9,  name: '🌟 神级佑子',title: 'P6 突破者',         minPoints: 1100, color: '#FFD96B' },
    { lv: 10, name: '🚀 火箭佑子',title: '冲刺王',           minPoints: 1500, color: '#FFA500' },
    { lv: 11, name: '💎 钻石佑子',title: 'PSLE 顶尖',        minPoints: 2200, color: '#4ECDC4' },
    { lv: 12, name: '👑 PSLE 大师',title: 'PSLE 满级满分',   minPoints: 3500, color: '#FFD700' }
  ],

  // 装备系统(v6 — 42 件)
  equipment: [
    { id: 'note',     icon: '📒', name: '笔记本',     condition: 'points',    value: 5,    hint: '累积 5 分(第一天打 1 个项目就拿)' },
    { id: 'apple',    icon: '🍎', name: '健康苹果',   condition: 'points',    value: 15,   hint: '累积 15 分(第一天 2-3 slot)' },
    { id: 'hat',      icon: '🎓', name: '学士帽',     condition: 'points',    value: 30,   hint: '累积 30 分(W1 周三)' },
    { id: 'cup',      icon: '🥤', name: '能量水杯',   condition: 'points',    value: 50,   hint: '累积 50 分(W1 周末)' },
    { id: 'sword',    icon: '✏️', name: '铅笔剑',     condition: 'points',    value: 75,   hint: '累积 75 分' },
    { id: 'cookie',   icon: '🍪', name: '幸运饼干',   condition: 'points',    value: 110,  hint: '累积 110 分' },
    { id: 'bag',      icon: '🎒', name: '书包',       condition: 'points',    value: 160,  hint: '累积 160 分' },
    { id: 'sock',     icon: '🧦', name: '幸运袜',     condition: 'points',    value: 220,  hint: '累积 220 分' },
    { id: 'glasses',  icon: '👓', name: '聪明眼镜',   condition: 'points',    value: 290,  hint: '累积 290 分' },
    { id: 'watch',    icon: '⌚', name: '时间手表',   condition: 'points',    value: 370,  hint: '累积 370 分' },
    { id: 'headphone',icon: '🎧', name: '听力耳机',   condition: 'points',    value: 460,  hint: '累积 460 分' },
    { id: 'phone',    icon: '📱', name: '智能手机',   condition: 'points',    value: 560,  hint: '累积 560 分' },
    { id: 'cake',     icon: '🎂', name: '生日蛋糕',   condition: 'points',    value: 680,  hint: '累积 680 分' },
    { id: 'rocket',   icon: '🚀', name: '冲刺火箭',   condition: 'points',    value: 820,  hint: '累积 820 分' },
    { id: 'crystal',  icon: '🔮', name: '水晶球',     condition: 'points',    value: 980,  hint: '累积 980 分' },
    { id: 'diamond',  icon: '💎', name: '智慧钻石',   condition: 'points',    value: 1180, hint: '累积 1180 分(传说级)' },
    { id: 'pearl',    icon: '🦪', name: '珍珠项链',   condition: 'points',    value: 1290, hint: '累积 1290 分(v18.57)' },
    { id: 'galaxy',   icon: '🌌', name: '银河披风',   condition: 'points',    value: 1400, hint: '累积 1400 分(神级)' },
    { id: 'magic',    icon: '🪄', name: '魔法棒',     condition: 'points',    value: 1650, hint: '累积 1650 分' },
    { id: 'lightning',icon: '⚡', name: '闪电袖标',   condition: 'points',    value: 1900, hint: '累积 1900 分' },
    { id: 'aurora',   icon: '🌠', name: '极光斗篷',   condition: 'points',    value: 2050, hint: '累积 2050 分(v18.57)' },
    { id: 'star',     icon: '⭐', name: '星辰勋章',   condition: 'points',    value: 2200, hint: '累积 2200 分(P6 学者)' },
    { id: 'orbit',    icon: '🛸', name: '轨道飞船',   condition: 'points',    value: 2350, hint: '累积 2350 分(v18.57)' },
    { id: 'planet',   icon: '🪐', name: '土星之环',   condition: 'points',    value: 2500, hint: '累积 2500 分' },
    { id: 'nebula',   icon: '🌫️', name: '星云粉尘',   condition: 'points',    value: 2700, hint: '累积 2700 分(v18.57)' },
    { id: 'sun',      icon: '☀️', name: '太阳皇冠',   condition: 'points',    value: 2850, hint: '累积 2850 分' },
    { id: 'phoenix',  icon: '🦅', name: '凤凰羽',     condition: 'points',    value: 3200, hint: '累积 3200 分(浴火重生)' },
    { id: 'rainbow',  icon: '🌈', name: '彩虹光环',   condition: 'points',    value: 3550, hint: '累积 3550 分' },
    { id: 'volcano',  icon: '🌋', name: '火山战靴',   condition: 'points',    value: 3950, hint: '累积 3950 分(刷题狂魔)' },
    { id: 'comet',    icon: '☄️', name: '彗星轨迹',   condition: 'points',    value: 4350, hint: '累积 4350 分' },
    { id: 'unicorn',  icon: '🦄', name: '独角兽伙伴', condition: 'points',    value: 4750, hint: '累积 4750 分(神兽级)' },
    { id: 'medal',    icon: '🥇', name: '金牌得主',   condition: 'points',    value: 5300, hint: '累积 5300 分(冲刺王)' },
    // v19.2: 死区填补装备 (5300-10000)
    { id: 'holy_sword', icon: '🗡️', name: '圣剑',    condition: 'points',    value: 6000, hint: '累积 6000 分 · ⚔️ 暴击率 +12%' },
    { id: 'castle',   icon: '🏰', name: '城堡盾',     condition: 'points',    value: 6800, hint: '累积 6800 分 · ⚔️ 全局 +20%' },
    { id: 'wolf',     icon: '🐺', name: '狼伙伴',     condition: 'points',    value: 7600, hint: '累积 7600 分 · ⚔️ combo ×1.3' },
    { id: 'ocean',    icon: '🌊', name: '海洋之心',   condition: 'points',    value: 8500, hint: '累积 8500 分 · ⚔️ 每日 +8' },
    { id: 'trident',  icon: '🔱', name: '三叉戟',     condition: 'points',    value: 9200, hint: '累积 9200 分 · ⚔️ mini-game +5' },
    // v18.55: 双层龙 — 银龙(打卡线) + 金龙(深学线)
    { id: 'silver_dragon', icon: '🐲', name: '银龙伙伴', condition: 'points', value: 10000, hint: '累积 10000 分 = SGD 500 (打卡之王 — 习惯养成奖励)' },
    { id: 'dragon',   icon: '🐉', name: '金龙伙伴',   condition: 'points',    value: 30000, hint: '105/105 ⭐ + ≥10000 分 = SGD 1500 (传说级 — 真本事奖励, 知识树全 3⭐ 才解锁)' },
    { id: 'tube',     icon: '🔬', name: '试管',       condition: 'milestone', value: 'W14', hint: '完成 W14 P3-P4 综合模拟' },
    { id: 'trophy',   icon: '🏆', name: '奖杯',       condition: 'milestone', value: 'W20', hint: '完成 W20 P5 综合' },
    { id: 'crown',    icon: '👑', name: '皇冠',       condition: 'milestone', value: 'W26', hint: 'W26 第一阶段总模考' },
    { id: 'badge_p6', icon: '🎖️', name: 'P6 通关勋章',condition: 'milestone', value: 'W42', hint: 'W42 P6 Adaptations 月模考 3' },
    { id: 'badge_2',  icon: '🏵️', name: '二阶段勋章', condition: 'milestone', value: 'W52', hint: 'W52 第二阶段总收官' },
    { id: 'badge_3',  icon: '🎗️', name: '冲刺勋章',   condition: 'milestone', value: 'W65', hint: 'W65 最后完整模考' },
    { id: 'mic',      icon: '🎤', name: '口试金话筒', condition: 'milestone', value: 'W68', hint: 'W68 PSLE 口试 (8.12-13)' },
    { id: 'ear',      icon: '🎵', name: '听力金耳麦', condition: 'milestone', value: 'W72', hint: 'W72 PSLE 听力 (9.15)' },
    { id: 'cert',     icon: '📜', name: 'PSLE 证书',  condition: 'milestone', value: 'W73', hint: 'W73 PSLE 笔试 (9.24-30)🎯🎯' },
    { id: 'shield',   icon: '🛡️', name: '盾牌',      condition: 'streak',    value: 1,    hint: '4 周无问题反馈' },
    { id: 'cape',     icon: '🦸', name: '披风',       condition: 'monthly3',  value: 3,    hint: '月小测连续 3 次达标' },
    { id: 'fire',     icon: '🔥', name: '火焰特效',   condition: 'milestone', value: 'any-key', hint: '任一大节点达标' },
    { id: 'monthking',icon: '🎯', name: '月度王',     condition: 'monthly3',  value: 6,    hint: '累积 6 次月度小测达标' },
    { id: 'streak7',  icon: '🛡️', name: '7 天勇者',  condition: 'streak-days', value: 7,   hint: '连续打卡 7 天解锁' },
    { id: 'streak30', icon: '🔥', name: '30 天战士', condition: 'streak-days', value: 30,  hint: '连续打卡 30 天解锁(火焰光环)' },
    { id: 'streak50', icon: '⚔️', name: '50 天战士', condition: 'streak-days', value: 50,  hint: '连续 50 天 (v18.58)' },
    { id: 'streak75', icon: '💪', name: '75 天勇者', condition: 'streak-days', value: 75,  hint: '连续 75 天 (v18.58)' },
    { id: 'streak100',icon: '👑', name: '百日王',    condition: 'streak-days', value: 100, hint: '连续打卡 100 天解锁(永久金光特效)' },
    { id: 'streak150',icon: '🏵️', name: '150 天英雄',condition: 'streak-days', value: 150, hint: '连续 150 天 (v18.58)' },
    { id: 'streak200',icon: '🏛️', name: '200 天传奇',condition: 'streak-days', value: 200, hint: '连续 200 天 (v18.58)' },
    { id: 'streak300',icon: '🌟', name: '300 天大神',condition: 'streak-days', value: 300, hint: '连续 300 天 (v18.58)' },
    // v18.58: 知识树 ⭐ 装备 (深学路径, 跟金龙不冲突)
    { id: 'kt30',     icon: '📗', name: '⭐ 30 学者',   condition: 'kt-stars', value: 30,  hint: '知识树累计 30 ⭐ (v18.58)' },
    { id: 'kt60',     icon: '📕', name: '⭐ 60 探究者', condition: 'kt-stars', value: 60,  hint: '知识树累计 60 ⭐ (v18.58)' },
    { id: 'kt90',     icon: '📚', name: '⭐ 90 大师',   condition: 'kt-stars', value: 90,  hint: '知识树累计 90 ⭐, 离金龙仅 15 ⭐ (v18.58)' },
    // v18.58: mini-game 局数装备 (玩得多有奖)
    { id: 'gr50',     icon: '🎮', name: '练习生',     condition: 'game-runs', value: 50,  hint: 'Mini-game 累计 50 局 (v18.58)' },
    { id: 'gr200',    icon: '🎯', name: '神射手',     condition: 'game-runs', value: 200, hint: 'Mini-game 累计 200 局 (v18.58)' },
    { id: 'gr500',    icon: '🎰', name: 'mini-game 王', condition: 'game-runs', value: 500, hint: 'Mini-game 累计 500 局 (v18.58)' },
    // v18.86: 打卡周次装备 — 光打卡也能拿到
    { id: 'wk30', icon: '🧭', name: '探险指南针', condition: 'week', value: 30, hint: '打卡到第30周自动解锁' },
    { id: 'wk36', icon: '🌱', name: '成长之芽',   condition: 'week', value: 36, hint: '打卡到第36周自动解锁' },
    { id: 'wk50', icon: '⚓', name: '半程之锚',   condition: 'week', value: 50, hint: '打卡到第50周自动解锁' },
  ],

  getLevelInfo(points) {
    let levelInfo = this.levels[0];
    for (const lv of this.levels) {
      if (points >= lv.minPoints) levelInfo = lv;
      else break;
    }
    return levelInfo;
  },

  getNextLevelInfo(points) {
    const current = this.getLevelInfo(points);
    const nextIdx = current.lv;
    if (nextIdx >= this.levels.length) return null;
    return this.levels[nextIdx];
  },

  checkEquipmentUnlocked(equipId, state) {
    const eq = this.equipment.find(e => e.id === equipId);
    if (!eq) return false;
    // v18.55: 金龙特例 — 必须 105/105 ⭐ 全拿 + ≥10000 分 (传说级深学奖励)
    if (equipId === 'dragon') {
      const ks = state.knowledgeStars || {};
      const totalStars = Object.values(ks).reduce((s, e) => s + (e.stars || 0), 0);
      return totalStars >= 105 && (state.totalPoints || 0) >= 10000;
    }
    switch (eq.condition) {
      case 'points':
        return state.totalPoints >= eq.value;
      case 'milestone':
        if (eq.value === 'any-key') {
          return state.milestones && (
            state.milestones.W14 || state.milestones.W20 || state.milestones.W26 ||
            state.milestones.W42 || state.milestones.W52 || state.milestones.W65 ||
            state.milestones.W68 || state.milestones.W72 || state.milestones.W73
          );
        }
        return !!(state.milestones && state.milestones[eq.value]);
      case 'streak':
        return state.streakBonusCount >= eq.value;
      case 'monthly3':
        return state.monthlyTestPass >= eq.value;
      case 'streak-days':
        return !!(state.dailyStreak && (state.dailyStreak.bestEver || 0) >= eq.value);
      case 'week':
        return (state.currentWeek || 1) >= eq.value;
      case 'kt-stars': {
        const ks = state.knowledgeStars || {};
        const total = Object.values(ks).reduce((s, e) => s + (e.stars || 0), 0);
        return total >= eq.value;
      }
      case 'game-runs':
        return (state.totalGameRuns || 0) >= eq.value;
      default:
        return false;
    }
  },

  // 皮肤系统 v5
  skins: [
    { id: 'default', name: '🎒 校服(默认)', desc: '黄 T 黑发,佑子原生造型',
      shirtColor: 'auto', pantsColor: '#5A4632', hairColor: '#2D3047', skinColor: '#FFE0BD',
      condition: 'always' },
    { id: 'scholar', name: '📘 学者袍', desc: '蓝学袍 + 灰长裤,好学少年',
      shirtColor: '#5B8DEF', pantsColor: '#454F66', hairColor: '#2D3047', skinColor: '#FFE0BD',
      accessory: 'scholarSash', condition: { type: 'level', value: 5 }, hint: 'Lv5 解锁(累计 360 分)' },
    { id: 'scientist', name: '🥼 科学家', desc: '白大褂 + 护目镜,实验家',
      shirtColor: '#F0F0F0', pantsColor: '#404040', hairColor: '#2D3047', skinColor: '#FFE0BD',
      accessory: 'labGoggles', condition: { type: 'milestone', value: 'W14' }, hint: 'W14 P3-P4 综合模拟达标解锁' },
    { id: 'explorer', name: '🧭 探险家', desc: '卡其 + 望远镜,Boyfriend',
      shirtColor: '#9A8B5B', pantsColor: '#6B5D3F', hairColor: '#3B2E20', skinColor: '#F5C9A0',
      accessory: 'explorerCap', condition: { type: 'points', value: 1500 }, hint: '累积 1500 分解锁' },
    { id: 'hero', name: '🦸 超级英雄', desc: '红披风+面具+蓝衣,救世主',
      shirtColor: '#3B5BA9', pantsColor: '#1F2D5C', hairColor: '#2D3047', skinColor: '#FFE0BD',
      accessory: 'heroMask', condition: { type: 'points', value: 3200 }, hint: '累积 3000 分解锁' },
    { id: 'master', name: '👑 PSLE 大师', desc: '金衣+皇冠+证书,终极满级',
      shirtColor: '#FFD700', pantsColor: '#9B7300', hairColor: '#2D3047', skinColor: '#FFE0BD',
      accessory: 'masterCrown', condition: { type: 'milestone', value: 'W73' }, hint: 'W73 PSLE 笔试完成解锁(终极)' }
  ],

  // v18.60: 双龙称号前缀 (在角色名后追加)
  getDragonTitle(state) {
    if (state.dragonsUnlocked && state.dragonsUnlocked.gold) return ' · 🐉 金龙之王';
    if (state.dragonsUnlocked && state.dragonsUnlocked.silver) return ' · 🐲 银龙骑士';
    return '';
  },

  checkSkinUnlocked(skinId, state) {
    const skin = this.skins.find(s => s.id === skinId);
    if (!skin) return false;
    if (skin.condition === 'always') return true;
    const cond = skin.condition;
    if (cond.type === 'level') return this.getLevelInfo(state.totalPoints).lv >= cond.value;
    if (cond.type === 'points') return state.totalPoints >= cond.value;
    if (cond.type === 'milestone') return !!(state.milestones && state.milestones[cond.value]);
    return false;
  },

  getActiveSkin(state) {
    const id = state.activeSkin || 'default';
    const skin = this.skins.find(s => s.id === id);
    if (!skin || !this.checkSkinUnlocked(id, state)) return this.skins[0];
    return skin;
  },

  // v18.30: 锁定单一身体形象 (回到原始, 不随等级变化, 仅装备升级)
  _getBodyTemplate(lv) {
    return { tier: 'classic', headR: 48, headRy: 46, headCY: 78,
      neckTop: 115, neckBottom: 129, shoulderY: 132, bodyTop: 128, bodyBottom: 195,
      legTop: 200, legBottom: 232, bodyHalfW: 44, hipHalfW: 40 };
  },

  _getAnchors(tpl) {
    return {
      headTop: [110, tpl.headCY - tpl.headRy + 2],
      earL: [110 - tpl.headR + 2, tpl.headCY + 4],
      earR: [110 + tpl.headR - 2, tpl.headCY + 4],
      eyeL: [110 - tpl.headR * 0.42, tpl.headCY + 2],
      eyeR: [110 + tpl.headR * 0.42, tpl.headCY + 2],
      noseTip: [110, tpl.headCY + tpl.headRy * 0.3],
      mouthC: [110, tpl.headCY + tpl.headRy * 0.55],
      shoulderL: [110 - tpl.bodyHalfW, tpl.shoulderY],
      shoulderR: [110 + tpl.bodyHalfW, tpl.shoulderY],
      chest: [110, tpl.bodyTop + (tpl.bodyBottom - tpl.bodyTop) * 0.45],
      waistL: [110 - tpl.hipHalfW, tpl.bodyBottom - 18],
      waistC: [110, tpl.bodyBottom - 18],
      waistR: [110 + tpl.hipHalfW, tpl.bodyBottom - 18],
      handL: [55, tpl.bodyBottom - 17],
      handR: [165, tpl.bodyBottom - 17],
      wristL: [60, tpl.bodyBottom - 22],
      wristR: [160, tpl.bodyBottom - 22],
      footL: [91, tpl.legBottom + 2],
      footR: [129, tpl.legBottom + 2]
    };
  },

  renderCharacter(state) {
    const points = state.totalPoints;
    const level = this.getLevelInfo(points);
    const sad = state.sadUntil && Date.now() < state.sadUntil;

    const disabled = new Set(state.equipmentDisabled || []);
    const evos = state.equipEvolutions || {};
    const has = {};
    this.equipment.forEach(eq => {
      has[eq.id] = this.checkEquipmentUnlocked(eq.id, state) && !disabled.has(eq.id);
    });

    function evoGlow(equipId, cx, cy, radius) {
      const lv = evos[equipId] || 0;
      if (!lv || !has[equipId]) return '';
      const colors = ['rgba(0,212,255,0.4)', 'rgba(168,100,255,0.5)', 'rgba(255,215,0,0.6)'];
      const sizes = [1.3, 1.6, 2.0];
      const r = radius * sizes[lv-1];
      const dur = (2.5 - lv * 0.4).toFixed(1);
      return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${colors[lv-1]}" stroke-width="${lv + 1}" opacity="0.6">
        <animate attributeName="r" values="${(r*0.85).toFixed(1)};${(r*1.15).toFixed(1)};${(r*0.85).toFixed(1)}" dur="${dur}s" repeatCount="indefinite"/>
        <animate attributeName="opacity" values="0.4;0.8;0.4" dur="${dur}s" repeatCount="indefinite"/>
      </circle>` + (lv >= 3 ? `<circle cx="${cx}" cy="${cy}" r="${(r*0.6).toFixed(1)}" fill="none" stroke="rgba(255,215,0,0.3)" stroke-width="1" opacity="0.5">
        <animate attributeName="r" values="${(r*0.5).toFixed(1)};${(r*0.8).toFixed(1)};${(r*0.5).toFixed(1)}" dur="${(parseFloat(dur)*0.7).toFixed(1)}s" repeatCount="indefinite"/>
      </circle>` : '');
    }

    const skin = this.getActiveSkin(state);
    const autoShirt = level.lv <= 3 ? '#FFE066' : level.lv <= 6 ? '#FF9F45' : level.lv <= 8 ? '#A788E0' : '#FF6B6B';
    const shirtColor = (skin.shirtColor === 'auto') ? autoShirt : skin.shirtColor;
    const skinColor = skin.skinColor;
    const hairColor = skin.hairColor;
    const pantsColor = skin.pantsColor;

    const tpl = this._getBodyTemplate(level.lv);
    // v18.32: 锚点固定到原始 body 精确坐标 (装备真贴合, 不再有 1-3px 偏移)
    const A = {
      headTop: [110, 32],
      earL: [62, 78], earR: [158, 78],
      eyeL: [90, 78], eyeR: [130, 78],
      noseTip: [110, 92], mouthC: [110, 104],
      shoulderL: [70, 132], shoulderR: [150, 132],
      chest: [110, 165],
      waistL: [82, 178], waistC: [110, 178], waistR: [138, 178],
      handL: [58, 180], handR: [162, 180],
      wristL: [60, 175], wristR: [160, 175],
      footL: [91, 232], footR: [129, 232]
    };

    // v18.30: 单一表情 (回到原始大眼笑脸)
    const eyes = sad ? `
      <ellipse cx="90" cy="78" rx="3" ry="6" fill="#2D3047"/>
      <ellipse cx="130" cy="78" rx="3" ry="6" fill="#2D3047"/>
      <path d="M 80 68 L 95 74 M 125 74 L 140 68" stroke="#8090A0" stroke-width="2.5" fill="none" stroke-linecap="round"/>
    ` : `
      <ellipse cx="90" cy="78" rx="7" ry="10" fill="#2D3047"/>
      <ellipse cx="130" cy="78" rx="7" ry="10" fill="#2D3047"/>
      <ellipse cx="92" cy="74" rx="2.5" ry="3.5" fill="white"/>
      <ellipse cx="132" cy="74" rx="2.5" ry="3.5" fill="white"/>
    `;

    const mouth = sad ? `
      <path d="M 95 108 Q 110 100 125 108" stroke="#8090A0" stroke-width="3" fill="none" stroke-linecap="round"/>
    ` : `
      <path d="M 88 98 Q 110 122 132 98 Q 132 104 110 110 Q 88 104 88 98 Z" fill="#2D3047" stroke="#8090A0" stroke-width="2.5" stroke-linejoin="round"/>
      <path d="M 92 100 L 128 100 L 124 104 L 96 104 Z" fill="white"/>
      <ellipse cx="110" cy="110" rx="9" ry="3.5" fill="#FF6B6B"/>
    `;

    // v18.30: 单一头发 (回到原始 11 簇尖刺 + 招牌冲天角)
    const hair = `
      <path d="M 65 78 Q 60 32 105 30 L 108 18 L 113 30 Q 162 32 158 80
               L 152 65 L 145 75 L 137 60 L 128 73 L 118 58 L 108 72 L 96 60 L 88 75 L 78 62 L 70 76 Z"
            fill="${hairColor}" stroke="${hairColor}" stroke-width="2"/>
      <path d="M 105 30 L 108 12 L 113 30 Z" fill="${hairColor}"/>
    `;

    // ====== 主体 body (头/身/四肢) ======
    const bodyHalfTop = tpl.bodyHalfW;
    const bodyHalfBot = tpl.hipHalfW + 6;
    const body = `
      <!-- 阴影 -->
      <ellipse cx="110" cy="${tpl.legBottom + 4}" rx="${tpl.bodyHalfW + 12}" ry="5" fill="#2D3047" opacity="0.18"/>

      <!-- 腿 -->
      <rect x="${91 - 8}" y="${tpl.legTop}" width="16" height="${tpl.legBottom - tpl.legTop - 2}" rx="4"
            fill="${pantsColor}" stroke="#8090A0" stroke-width="2.5"/>
      <rect x="${129 - 8}" y="${tpl.legTop}" width="16" height="${tpl.legBottom - tpl.legTop - 2}" rx="4"
            fill="${pantsColor}" stroke="#8090A0" stroke-width="2.5"/>
      <!-- 鞋 -->
      <ellipse cx="91" cy="${tpl.legBottom}" rx="13" ry="5" fill="#2D3047"/>
      <ellipse cx="129" cy="${tpl.legBottom}" rx="13" ry="5" fill="#2D3047"/>
      <ellipse cx="91" cy="${tpl.legBottom - 1}" rx="11" ry="2.5" fill="white"/>
      <ellipse cx="129" cy="${tpl.legBottom - 1}" rx="11" ry="2.5" fill="white"/>

      <!-- 衣服 (梯形) -->
      <path d="M ${110 - bodyHalfTop} ${tpl.bodyTop + 2}
               Q ${110 - bodyHalfTop - 4} ${tpl.bodyTop + 8} ${110 - bodyHalfBot} ${tpl.bodyBottom - 8}
               Q ${110 - bodyHalfBot - 2} ${tpl.bodyBottom} ${110 - bodyHalfBot + 4} ${tpl.bodyBottom + 2}
               L ${110 + bodyHalfBot - 4} ${tpl.bodyBottom + 2}
               Q ${110 + bodyHalfBot + 2} ${tpl.bodyBottom} ${110 + bodyHalfBot} ${tpl.bodyBottom - 8}
               Q ${110 + bodyHalfTop + 4} ${tpl.bodyTop + 8} ${110 + bodyHalfTop} ${tpl.bodyTop + 2} Z"
            fill="${shirtColor}" stroke="#8090A0" stroke-width="3"/>
      <!-- 领口 V (自然过渡到脖子) -->
      <path d="M ${110 - 12} ${tpl.bodyTop + 2} Q 110 ${tpl.bodyTop + 14} ${110 + 12} ${tpl.bodyTop + 2}"
            stroke="#8090A0" stroke-width="2.5" fill="${skinColor}"/>

      <!-- 胳膊 (从肩膀向下到手, 弧形) -->
      <path d="M ${110 - bodyHalfTop + 2} ${tpl.shoulderY + 2}
               Q ${A.handL[0] - 6} ${(tpl.shoulderY + A.handL[1]) / 2} ${A.handL[0] + 6} ${A.handL[1] - 4}
               L ${A.handL[0] + 14} ${A.handL[1] - 6}
               Q ${110 - bodyHalfTop + 12} ${tpl.shoulderY + 8} ${110 - bodyHalfTop + 4} ${tpl.shoulderY + 4} Z"
            fill="${shirtColor}" stroke="#8090A0" stroke-width="2.5"/>
      <path d="M ${110 + bodyHalfTop - 2} ${tpl.shoulderY + 2}
               Q ${A.handR[0] + 6} ${(tpl.shoulderY + A.handR[1]) / 2} ${A.handR[0] - 6} ${A.handR[1] - 4}
               L ${A.handR[0] - 14} ${A.handR[1] - 6}
               Q ${110 + bodyHalfTop - 12} ${tpl.shoulderY + 8} ${110 + bodyHalfTop - 4} ${tpl.shoulderY + 4} Z"
            fill="${shirtColor}" stroke="#8090A0" stroke-width="2.5"/>
      <!-- 手 -->
      <circle cx="${A.handL[0]}" cy="${A.handL[1]}" r="8" fill="${skinColor}" stroke="#8090A0" stroke-width="2.5"/>
      <circle cx="${A.handR[0]}" cy="${A.handR[1]}" r="8" fill="${skinColor}" stroke="#8090A0" stroke-width="2.5"/>

      <!-- 脖子 -->
      <rect x="${110 - 7}" y="${tpl.neckTop}" width="14" height="${tpl.neckBottom - tpl.neckTop}"
            fill="${skinColor}" stroke="#8090A0" stroke-width="2.5"/>

      <!-- 头 -->
      <ellipse cx="110" cy="${tpl.headCY}" rx="${tpl.headR}" ry="${tpl.headRy}"
               fill="${skinColor}" stroke="#8090A0" stroke-width="3"/>

      <!-- 头发 -->
      ${hair}

      <!-- 腮红 (原始位置) -->
      <ellipse cx="76" cy="92" rx="9" ry="5" fill="#FF6B6B" opacity="0.55"/>
      <ellipse cx="144" cy="92" rx="9" ry="5" fill="#FF6B6B" opacity="0.55"/>

      <!-- 眉毛 (原始位置) -->
      <path d="M 80 60 L 100 64" stroke="${hairColor}" stroke-width="3.5" fill="none" stroke-linecap="round"/>
      <path d="M 120 64 L 140 60" stroke="${hairColor}" stroke-width="3.5" fill="none" stroke-linecap="round"/>

      <!-- 眼睛 -->
      ${eyes}

      <!-- 鼻子 -->
      <ellipse cx="${A.noseTip[0]}" cy="${A.noseTip[1]}" rx="1.5" ry="1.2" fill="${hairColor}" opacity="0.7"/>

      <!-- 嘴 -->
      ${mouth}
    `;

    // ====== v18.13 装备 SVG (按穿戴感设计) ======

    // === 背景特效层 (z=1) ===
    const fireBackground = has.fire ? `
      <g opacity="0.7">
        <path d="M 28 ${tpl.legBottom + 6} Q 25 ${tpl.legBottom - 8} 32 ${tpl.legBottom - 16} Q 35 ${tpl.legBottom - 4} 40 ${tpl.legBottom - 12} Q 42 ${tpl.legBottom + 2} 38 ${tpl.legBottom + 6} Z" fill="#FF6B6B">
          <animate attributeName="opacity" values="0.8;0.4;0.8" dur="0.7s" repeatCount="indefinite"/>
        </path>
        <path d="M 180 ${tpl.legBottom + 4} Q 178 ${tpl.legBottom - 6} 185 ${tpl.legBottom - 14} Q 188 ${tpl.legBottom - 4} 192 ${tpl.legBottom - 10} Q 194 ${tpl.legBottom + 2} 190 ${tpl.legBottom + 4} Z" fill="#FFE66D">
          <animate attributeName="opacity" values="0.7;0.3;0.7" dur="0.6s" repeatCount="indefinite"/>
        </path>
        <path d="M 12 ${tpl.legBottom + 2} Q 10 ${tpl.legBottom - 6} 16 ${tpl.legBottom - 12} Q 19 ${tpl.legBottom - 2} 22 ${tpl.legBottom + 2} Z" fill="#FF9F45">
          <animate attributeName="opacity" values="0.6;0.3;0.6" dur="0.9s" repeatCount="indefinite"/>
        </path>
      </g>
    ` : '';

    const cometTrail = has.comet ? `
      <g>
        <path d="M -10 30 Q 50 20 90 50" stroke="url(#cometGrad)" stroke-width="3" fill="none" opacity="0.8"/>
        <circle cx="-10" cy="30" r="6" fill="#4ECDC4">
          <animate attributeName="cx" values="-10;220;-10" dur="4s" repeatCount="indefinite"/>
          <animate attributeName="cy" values="30;200;30" dur="4s" repeatCount="indefinite"/>
        </circle>
        <text x="0" y="50" font-size="12" fill="#FFE66D">
          <animate attributeName="opacity" values="1;0;1" dur="2s" repeatCount="indefinite"/>✨
        </text>
      </g>
      <defs>
        <linearGradient id="cometGrad"><stop offset="0%" stop-color="#4ECDC4" stop-opacity="0"/><stop offset="100%" stop-color="#4ECDC4"/></linearGradient>
      </defs>
    ` : '';

    // v18.60: 双龙真 SVG (替代 emoji + dasharray) — 银龙浮在头顶, 金龙环绕全身
    const hasSilverDragon = !!(state.dragonsUnlocked && state.dragonsUnlocked.silver);
    const hasGoldDragon = !!(state.dragonsUnlocked && state.dragonsUnlocked.gold);
    const silverDragonBody = hasSilverDragon ? `
      <defs>
        <linearGradient id="silverGrad${tpl.bodyBottom}" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#E8E8E8"/>
          <stop offset="50%" stop-color="#C0C0C0"/>
          <stop offset="100%" stop-color="#888"/>
        </linearGradient>
      </defs>
      <g opacity="0.92">
        <animateTransform attributeName="transform" type="translate"
                         values="0,0; 0,-4; 0,0" dur="2.5s" repeatCount="indefinite"/>
        <!-- 银龙身体 (S 形飞行) -->
        <path d="M 175 ${tpl.headCY - 50}
                 Q 195 ${tpl.headCY - 56} 200 ${tpl.headCY - 38}
                 Q 205 ${tpl.headCY - 22} 195 ${tpl.headCY - 14}
                 Q 215 ${tpl.headCY - 4} 218 ${tpl.headCY + 14}"
              fill="none" stroke="url(#silverGrad${tpl.bodyBottom})" stroke-width="6" stroke-linecap="round"/>
        <!-- 银龙头 -->
        <ellipse cx="175" cy="${tpl.headCY - 50}" rx="9" ry="7" fill="url(#silverGrad${tpl.bodyBottom})" stroke="#666" stroke-width="1"/>
        <!-- 银龙角 -->
        <path d="M 170 ${tpl.headCY - 56} L 167 ${tpl.headCY - 64} M 178 ${tpl.headCY - 56} L 181 ${tpl.headCY - 64}" stroke="#888" stroke-width="1.5" stroke-linecap="round"/>
        <!-- 银龙眼 -->
        <circle cx="172" cy="${tpl.headCY - 51}" r="1.5" fill="#FFF"/>
        <circle cx="172" cy="${tpl.headCY - 51}" r="0.8" fill="#000"/>
        <!-- 银龙翼 -->
        <path d="M 192 ${tpl.headCY - 30} Q 215 ${tpl.headCY - 45} 222 ${tpl.headCY - 22} L 200 ${tpl.headCY - 24} Z" fill="#D8D8D8" opacity="0.85" stroke="#888" stroke-width="1"/>
        <!-- 银龙尾尖 -->
        <path d="M 218 ${tpl.headCY + 14} L 226 ${tpl.headCY + 8} L 222 ${tpl.headCY + 22} Z" fill="url(#silverGrad${tpl.bodyBottom})"/>
        <!-- 银光粒子 -->
        <circle cx="200" cy="${tpl.headCY - 30}" r="1.5" fill="#FFF" opacity="0.9">
          <animate attributeName="opacity" values="0;1;0" dur="1.5s" repeatCount="indefinite"/>
          <animate attributeName="r" values="1;2.5;1" dur="1.5s" repeatCount="indefinite"/>
        </circle>
      </g>
    ` : '';
    const goldDragonBody = hasGoldDragon ? `
      <defs>
        <linearGradient id="goldGrad${tpl.bodyBottom}" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#FFF3C4"/>
          <stop offset="40%" stop-color="#FFD700"/>
          <stop offset="80%" stop-color="#FFA500"/>
          <stop offset="100%" stop-color="#FF6B00"/>
        </linearGradient>
        <radialGradient id="goldGlow${tpl.bodyBottom}">
          <stop offset="0%" stop-color="#FFD700" stop-opacity="0.5"/>
          <stop offset="100%" stop-color="#FFD700" stop-opacity="0"/>
        </radialGradient>
      </defs>
      <g>
        <!-- 金光圆环 (背景光晕) -->
        <circle cx="110" cy="${tpl.bodyTop + 30}" r="120" fill="url(#goldGlow${tpl.bodyBottom})">
          <animate attributeName="r" values="115;130;115" dur="3s" repeatCount="indefinite"/>
        </circle>
        <!-- 金龙环绕路径 (大椭圆缠绕角色) -->
        <path d="M 5 ${tpl.bodyBottom + 8}
                 Q 25 ${tpl.bodyTop - 10} 60 ${tpl.headCY - 50}
                 Q 110 ${tpl.headCY - 60} 165 ${tpl.headCY - 50}
                 Q 200 ${tpl.bodyTop - 10} 220 ${tpl.bodyBottom + 8}
                 Q 200 ${tpl.bodyBottom - 10} 175 ${tpl.bodyBottom + 4}
                 L 50 ${tpl.bodyBottom + 4}
                 Q 25 ${tpl.bodyBottom - 10} 5 ${tpl.bodyBottom + 8} Z"
              fill="none" stroke="url(#goldGrad${tpl.bodyBottom})" stroke-width="5" stroke-dasharray="8 4" stroke-linecap="round" opacity="0.95">
          <animate attributeName="stroke-dashoffset" values="0;-24" dur="1.5s" repeatCount="indefinite"/>
        </path>
        <!-- 金龙鳞片 (沿路径分布) -->
        <circle cx="60" cy="${tpl.headCY - 48}" r="3.5" fill="#FFD700" stroke="#FF8C00" stroke-width="1"/>
        <circle cx="110" cy="${tpl.headCY - 56}" r="4" fill="#FFA500" stroke="#FF6B00" stroke-width="1"/>
        <circle cx="165" cy="${tpl.headCY - 48}" r="3.5" fill="#FFD700" stroke="#FF8C00" stroke-width="1"/>
        <!-- 金龙头 (左侧) -->
        <g>
          <ellipse cx="30" cy="${tpl.bodyTop - 5}" rx="11" ry="9" fill="url(#goldGrad${tpl.bodyBottom})" stroke="#B8860B" stroke-width="1.5"/>
          <path d="M 22 ${tpl.bodyTop - 12} L 18 ${tpl.bodyTop - 22} M 35 ${tpl.bodyTop - 12} L 39 ${tpl.bodyTop - 22}" stroke="#DAA520" stroke-width="2" stroke-linecap="round"/>
          <circle cx="26" cy="${tpl.bodyTop - 5}" r="2" fill="#FFF"/>
          <circle cx="26" cy="${tpl.bodyTop - 5}" r="1.2" fill="#000"/>
          <!-- 火焰口吐 -->
          <path d="M 19 ${tpl.bodyTop - 2} Q 12 ${tpl.bodyTop - 8} 8 ${tpl.bodyTop + 2} Q 14 ${tpl.bodyTop} 19 ${tpl.bodyTop - 2} Z" fill="#FF6B00" opacity="0.9">
            <animate attributeName="opacity" values="1;0.5;1" dur="0.6s" repeatCount="indefinite"/>
          </path>
        </g>
        <!-- 金龙尾尖 (右侧) -->
        <g>
          <path d="M 220 ${tpl.bodyBottom + 8} L 230 ${tpl.bodyBottom + 2} L 226 ${tpl.bodyBottom + 18} Z" fill="url(#goldGrad${tpl.bodyBottom})" stroke="#B8860B" stroke-width="1.5"/>
        </g>
        <!-- 金光粒子 (4 个浮动) -->
        <circle cx="80" cy="${tpl.bodyTop + 20}" r="1.5" fill="#FFD700">
          <animate attributeName="opacity" values="0;1;0" dur="1.8s" repeatCount="indefinite" begin="0s"/>
          <animate attributeName="cy" values="${tpl.bodyTop + 20};${tpl.bodyTop - 10};${tpl.bodyTop + 20}" dur="1.8s" repeatCount="indefinite" begin="0s"/>
        </circle>
        <circle cx="140" cy="${tpl.bodyTop + 30}" r="1.5" fill="#FFA500">
          <animate attributeName="opacity" values="0;1;0" dur="2.2s" repeatCount="indefinite" begin="0.5s"/>
          <animate attributeName="cy" values="${tpl.bodyTop + 30};${tpl.bodyTop};${tpl.bodyTop + 30}" dur="2.2s" repeatCount="indefinite" begin="0.5s"/>
        </circle>
        <circle cx="100" cy="${tpl.bodyBottom - 10}" r="1.2" fill="#FFF3C4">
          <animate attributeName="opacity" values="0;1;0" dur="2s" repeatCount="indefinite" begin="0.8s"/>
          <animate attributeName="cy" values="${tpl.bodyBottom - 10};${tpl.bodyBottom - 40};${tpl.bodyBottom - 10}" dur="2s" repeatCount="indefinite" begin="0.8s"/>
        </circle>
        <circle cx="170" cy="${tpl.bodyBottom + 5}" r="1.5" fill="#FFD700">
          <animate attributeName="opacity" values="0;1;0" dur="1.6s" repeatCount="indefinite" begin="0.3s"/>
          <animate attributeName="cy" values="${tpl.bodyBottom + 5};${tpl.bodyBottom - 25};${tpl.bodyBottom + 5}" dur="1.6s" repeatCount="indefinite" begin="0.3s"/>
        </circle>
      </g>
    ` : '';
    // 兼容旧引用 (避免引用未定义)
    const dragonBody = goldDragonBody + silverDragonBody;

    // v18.73: 蓝紫渐变航天飞机 (鼻锥+双助推+白机身+遮阳板+蓝窗+4引擎+金焰)
    const rocket = has.rocket ? `
      <g transform="translate(200) scale(-1, 1)">
      <g class="rocket-beside" filter="url(#eqShadowBig)">
        <animateTransform attributeName="transform" type="translate"
                         values="0,0; 0,-11; 0,0" dur="2.2s" repeatCount="indefinite"/>

        <!-- 整体蓝紫光晕 -->
        <ellipse cx="185" cy="148" rx="36" ry="82" fill="none" stroke="#818CF8" stroke-width="2.5" opacity="0.18">
          <animate attributeName="opacity" values="0.08;0.28;0.08" dur="2.8s" repeatCount="indefinite"/>
        </ellipse>

        <!-- 左助推器 -->
        <rect x="161" y="84" width="13" height="100" fill="url(#bpGrad)" rx="6" stroke="#3730A3" stroke-width="1"/>
        <ellipse cx="167.5" cy="84" rx="6.5" ry="11" fill="#7C3AED"/>
        <ellipse cx="166" cy="80" rx="2.5" ry="4" fill="#A78BFA" opacity="0.55"/>
        <!-- 助推器条纹高光 -->
        <rect x="162" y="106" width="11" height="2.5" fill="#C7D2FE" opacity="0.5" rx="1"/>
        <rect x="162" y="128" width="11" height="2" fill="#A5B4FC" opacity="0.38" rx="1"/>
        <rect x="162" y="150" width="11" height="2" fill="#A5B4FC" opacity="0.28" rx="1"/>
        <!-- 左助推底环 -->
        <ellipse cx="167.5" cy="184" rx="6.5" ry="4" fill="#1D4ED8" stroke="#1E3A8A" stroke-width="1"/>
        <ellipse cx="167.5" cy="184" rx="4.5" ry="2.5" fill="#60A5FA"/>
        <ellipse cx="167.5" cy="184" rx="2.5" ry="1.3" fill="#BAE6FD"/>

        <!-- 右助推器 -->
        <rect x="196" y="84" width="13" height="100" fill="url(#bpGrad)" rx="6" stroke="#3730A3" stroke-width="1"/>
        <ellipse cx="202.5" cy="84" rx="6.5" ry="11" fill="#7C3AED"/>
        <ellipse cx="201" cy="80" rx="2.5" ry="4" fill="#A78BFA" opacity="0.55"/>
        <rect x="197" y="106" width="11" height="2.5" fill="#C7D2FE" opacity="0.5" rx="1"/>
        <rect x="197" y="128" width="11" height="2" fill="#A5B4FC" opacity="0.38" rx="1"/>
        <rect x="197" y="150" width="11" height="2" fill="#A5B4FC" opacity="0.28" rx="1"/>
        <!-- 右助推底环 -->
        <ellipse cx="202.5" cy="184" rx="6.5" ry="4" fill="#1D4ED8" stroke="#1E3A8A" stroke-width="1"/>
        <ellipse cx="202.5" cy="184" rx="4.5" ry="2.5" fill="#60A5FA"/>
        <ellipse cx="202.5" cy="184" rx="2.5" ry="1.3" fill="#BAE6FD"/>

        <!-- 三角翼 (白色, 带蓝紫边) -->
        <polygon points="175,155 152,192 175,190" fill="white" stroke="#818CF8" stroke-width="1.2"/>
        <polygon points="175,155 154,188 163,186" fill="#E0E7FF" opacity="0.75"/>
        <polygon points="195,155 218,192 195,190" fill="white" stroke="#818CF8" stroke-width="1.2"/>
        <polygon points="195,155 216,188 207,186" fill="#E0E7FF" opacity="0.75"/>

        <!-- 机身主体底部蓝紫外框 -->
        <rect x="173" y="116" width="24" height="72" fill="#4338CA" rx="3" stroke="#3730A3" stroke-width="1"/>
        <!-- 机身白色轨道飞行器主体 -->
        <rect x="174.5" y="117.5" width="21" height="69" fill="url(#fuselageGrad)" rx="2.5"/>

        <!-- 机身分界线 -->
        <rect x="174.5" y="144" width="21" height="1.5" fill="#991B1B" opacity="0.75"/>
        <rect x="174.5" y="158" width="21" height="1.5" fill="#991B1B" opacity="0.55"/>

        <!-- 蓝色窗口1 (上) -->
        <rect x="177" y="122" width="16" height="8" fill="#2563EB" rx="1.5" stroke="#1D4ED8" stroke-width="0.7"/>
        <rect x="178" y="123" width="6.5" height="6" fill="#60A5FA" rx="1" opacity="0.8"/>
        <rect x="185.5" y="123" width="6.5" height="6" fill="#3B82F6" rx="1" opacity="0.8"/>
        <!-- 窗口高光 -->
        <rect x="178.5" y="123.5" width="3" height="2" fill="white" opacity="0.45" rx="0.5"/>
        <rect x="186" y="123.5" width="3" height="2" fill="white" opacity="0.45" rx="0.5"/>

        <!-- 蓝色窗口2 (下) -->
        <rect x="177" y="134" width="16" height="6" fill="#1D4ED8" rx="1" stroke="#1E40AF" stroke-width="0.6" opacity="0.8"/>
        <rect x="178" y="135" width="14" height="4" fill="#3B82F6" rx="0.8" opacity="0.7"/>

        <!-- 机身侧细节 -->
        <line x1="185" y1="118" x2="185" y2="186" stroke="#4F46E5" stroke-width="0.7" opacity="0.35"/>

        <!-- 机身顶部接合鼻锥 -->
        <rect x="173" y="96" width="24" height="22" fill="#4338CA" rx="3" stroke="#3730A3" stroke-width="1"/>
        <rect x="174.5" y="97" width="21" height="21" fill="url(#fuselageGrad)" rx="2.5"/>
        <!-- 驾驶舱遮阳板 (深色梯形) -->
        <polygon points="178,98 192,98 190,117 180,117" fill="#1E1B4B" stroke="#312E81" stroke-width="0.8"/>
        <polygon points="179.5,100 190.5,100 189,105 181,105" fill="#3730A3" opacity="0.45"/>
        <!-- 遮阳板中间反光 -->
        <ellipse cx="185" cy="107" rx="4" ry="3" fill="#4F46E5" opacity="0.3"/>

        <!-- 鼻锥 (蓝紫渐变) -->
        <polygon points="185,60 174,96 196,96" fill="url(#noseGrad)" stroke="#3730A3" stroke-width="1.2"/>
        <!-- 鼻锥中线 -->
        <line x1="185" y1="60" x2="185" y2="96" stroke="#6366F1" stroke-width="0.8" opacity="0.55"/>
        <!-- 鼻锥高光边 -->
        <polygon points="185,60 174,96 179,96" fill="#A78BFA" opacity="0.3"/>
        <!-- 鼻尖高光 -->
        <ellipse cx="183.5" cy="68" rx="1.2" ry="3.5" fill="#C4B5FD" opacity="0.6" transform="rotate(-12 183.5 68)"/>

        <!-- 4 引擎口 (蓝色圆环, 2主+2助推) -->
        <!-- 左助推引擎 -->
        <ellipse cx="167.5" cy="190" rx="6" ry="3.5" fill="#1E40AF" stroke="#1E3A8A" stroke-width="0.8"/>
        <ellipse cx="167.5" cy="190" rx="4.2" ry="2.3" fill="#3B82F6"/>
        <ellipse cx="167.5" cy="190" rx="2.4" ry="1.2" fill="#93C5FD"/>
        <!-- 左主引擎 -->
        <ellipse cx="179" cy="192" rx="5.5" ry="3" fill="#1E40AF" stroke="#1E3A8A" stroke-width="0.8"/>
        <ellipse cx="179" cy="192" rx="3.8" ry="2" fill="#3B82F6"/>
        <ellipse cx="179" cy="192" rx="2.1" ry="1.1" fill="#93C5FD"/>
        <!-- 右主引擎 -->
        <ellipse cx="191" cy="192" rx="5.5" ry="3" fill="#1E40AF" stroke="#1E3A8A" stroke-width="0.8"/>
        <ellipse cx="191" cy="192" rx="3.8" ry="2" fill="#3B82F6"/>
        <ellipse cx="191" cy="192" rx="2.1" ry="1.1" fill="#93C5FD"/>
        <!-- 右助推引擎 -->
        <ellipse cx="202.5" cy="190" rx="6" ry="3.5" fill="#1E40AF" stroke="#1E3A8A" stroke-width="0.8"/>
        <ellipse cx="202.5" cy="190" rx="4.2" ry="2.3" fill="#3B82F6"/>
        <ellipse cx="202.5" cy="190" rx="2.4" ry="1.2" fill="#93C5FD"/>

        <!-- 4路金色火焰 -->
        <!-- 左助推 -->
        <ellipse cx="167.5" cy="207" rx="5.5" ry="16" fill="#F59E0B" opacity="0.88">
          <animate attributeName="ry" values="12;20;12" dur="0.3s" repeatCount="indefinite"/>
        </ellipse>
        <ellipse cx="167.5" cy="205" rx="3.8" ry="10" fill="#FDE68A">
          <animate attributeName="ry" values="7;14;7" dur="0.3s" repeatCount="indefinite" begin="0.06s"/>
        </ellipse>
        <ellipse cx="167.5" cy="203" rx="2" ry="6" fill="#FFFBEB">
          <animate attributeName="ry" values="4;8;4" dur="0.3s" repeatCount="indefinite" begin="0.12s"/>
        </ellipse>
        <!-- 左主 -->
        <ellipse cx="179" cy="210" rx="5" ry="18" fill="#F59E0B" opacity="0.9">
          <animate attributeName="ry" values="13;22;13" dur="0.28s" repeatCount="indefinite" begin="0.05s"/>
        </ellipse>
        <ellipse cx="179" cy="208" rx="3.5" ry="12" fill="#FDE68A">
          <animate attributeName="ry" values="8;16;8" dur="0.28s" repeatCount="indefinite" begin="0.11s"/>
        </ellipse>
        <ellipse cx="179" cy="206" rx="2" ry="7" fill="#FFFBEB">
          <animate attributeName="ry" values="5;10;5" dur="0.28s" repeatCount="indefinite" begin="0.17s"/>
        </ellipse>
        <!-- 右主 -->
        <ellipse cx="191" cy="210" rx="5" ry="18" fill="#F59E0B" opacity="0.9">
          <animate attributeName="ry" values="13;22;13" dur="0.28s" repeatCount="indefinite" begin="0.09s"/>
        </ellipse>
        <ellipse cx="191" cy="208" rx="3.5" ry="12" fill="#FDE68A">
          <animate attributeName="ry" values="8;16;8" dur="0.28s" repeatCount="indefinite" begin="0.15s"/>
        </ellipse>
        <ellipse cx="191" cy="206" rx="2" ry="7" fill="#FFFBEB">
          <animate attributeName="ry" values="5;10;5" dur="0.28s" repeatCount="indefinite" begin="0.21s"/>
        </ellipse>
        <!-- 右助推 -->
        <ellipse cx="202.5" cy="207" rx="5.5" ry="16" fill="#F59E0B" opacity="0.88">
          <animate attributeName="ry" values="12;20;12" dur="0.3s" repeatCount="indefinite" begin="0.14s"/>
        </ellipse>
        <ellipse cx="202.5" cy="205" rx="3.8" ry="10" fill="#FDE68A">
          <animate attributeName="ry" values="7;14;7" dur="0.3s" repeatCount="indefinite" begin="0.2s"/>
        </ellipse>
        <ellipse cx="202.5" cy="203" rx="2" ry="6" fill="#FFFBEB">
          <animate attributeName="ry" values="4;8;4" dur="0.3s" repeatCount="indefinite" begin="0.26s"/>
        </ellipse>

        <!-- 速度线 -->
        <line x1="176" y1="228" x2="173" y2="252" stroke="#FDE68A" stroke-width="2.5" stroke-linecap="round">
          <animate attributeName="opacity" values="0;0.85;0" dur="0.38s" repeatCount="indefinite"/>
        </line>
        <line x1="185" y1="232" x2="185" y2="256" stroke="#FEF3C7" stroke-width="2" stroke-linecap="round">
          <animate attributeName="opacity" values="0;0.85;0" dur="0.38s" repeatCount="indefinite" begin="0.13s"/>
        </line>
        <line x1="194" y1="228" x2="197" y2="252" stroke="#F59E0B" stroke-width="2" stroke-linecap="round">
          <animate attributeName="opacity" values="0;0.85;0" dur="0.38s" repeatCount="indefinite" begin="0.26s"/>
        </line>

        <!-- 烟雾 -->
        <circle cx="185" cy="248" r="10" fill="#DDE1FF" opacity="0.28">
          <animate attributeName="opacity" values="0.28;0;0.28" dur="1.3s" repeatCount="indefinite"/>
          <animate attributeName="r" values="8;22;8" dur="1.3s" repeatCount="indefinite"/>
          <animate attributeName="cy" values="248;274;248" dur="1.3s" repeatCount="indefinite"/>
        </circle>
        <circle cx="176" cy="256" r="6" fill="#C7D2FE" opacity="0.25">
          <animate attributeName="opacity" values="0.25;0;0.25" dur="1.7s" repeatCount="indefinite" begin="0.4s"/>
          <animate attributeName="cy" values="256;278;256" dur="1.7s" repeatCount="indefinite" begin="0.4s"/>
        </circle>

        <!-- 星光粒子 (蓝紫调) -->
        <circle cx="158" cy="116" r="2.5" fill="#C7D2FE">
          <animate attributeName="opacity" values="0;1;0" dur="1.8s" repeatCount="indefinite"/>
          <animate attributeName="cy" values="116;96;116" dur="1.8s" repeatCount="indefinite"/>
          <animate attributeName="r" values="1.5;3.5;1.5" dur="1.8s" repeatCount="indefinite"/>
        </circle>
        <circle cx="213" cy="132" r="2" fill="#A5B4FC">
          <animate attributeName="opacity" values="0;1;0" dur="2.2s" repeatCount="indefinite" begin="0.5s"/>
          <animate attributeName="cy" values="132;112;132" dur="2.2s" repeatCount="indefinite" begin="0.5s"/>
        </circle>
        <circle cx="216" cy="86" r="1.8" fill="#E0E7FF">
          <animate attributeName="opacity" values="0;1;0" dur="1.5s" repeatCount="indefinite" begin="1s"/>
          <animate attributeName="r" values="1;3;1" dur="1.5s" repeatCount="indefinite" begin="1s"/>
        </circle>
        <circle cx="156" cy="155" r="1.8" fill="#818CF8">
          <animate attributeName="opacity" values="0;1;0" dur="2s" repeatCount="indefinite" begin="0.8s"/>
          <animate attributeName="cy" values="155;136;155" dur="2s" repeatCount="indefinite" begin="0.8s"/>
        </circle>
        <text x="150" y="102" font-size="13" fill="#C7D2FE">
          <animate attributeName="opacity" values="0;1;0" dur="2.5s" repeatCount="indefinite" begin="0.2s"/>✨</text>
        <text x="213" y="152" font-size="9" fill="#818CF8">
          <animate attributeName="opacity" values="0;1;0" dur="2s" repeatCount="indefinite" begin="1.3s"/>✦</text>
      </g>
      </g>
    ` : '';

    // === 后披风/挂件 (z=2) ===
    const cape = (has.cape && !has.galaxy && !has.aurora) ? `
      <!-- 披风从两肩后伸出, 飘到腿后 -->
      <path d="M ${A.shoulderL[0]+4} ${A.shoulderL[1]+2}
               Q ${A.shoulderL[0]-15} ${tpl.bodyBottom-30} ${A.shoulderL[0]-25} ${tpl.legBottom+5}
               L ${A.shoulderR[0]+25} ${tpl.legBottom+5}
               Q ${A.shoulderR[0]+15} ${tpl.bodyBottom-30} ${A.shoulderR[0]-4} ${A.shoulderR[1]+2} Z"
            fill="#A788E0" stroke="#8090A0" stroke-width="2.5" opacity="0.92">
        <animateTransform attributeName="transform" type="rotate" values="-1.2 110 ${A.shoulderL[1]};1.2 110 ${A.shoulderL[1]};-1.2 110 ${A.shoulderL[1]}" dur="3.5s" repeatCount="indefinite"/>
      </path>
      <!-- 披风褶皱阴影 -->
      <path d="M 110 ${A.shoulderL[1]+10} L 110 ${tpl.legBottom}" stroke="#7A56C4" stroke-width="2" fill="none" opacity="0.6"/>
      <path d="M ${A.shoulderL[0]-10} ${tpl.bodyBottom-20} L ${A.shoulderL[0]-22} ${tpl.legBottom-2}" stroke="#7A56C4" stroke-width="1.5" fill="none" opacity="0.5"/>
      <path d="M ${A.shoulderR[0]+10} ${tpl.bodyBottom-20} L ${A.shoulderR[0]+22} ${tpl.legBottom-2}" stroke="#7A56C4" stroke-width="1.5" fill="none" opacity="0.5"/>
      <!-- 披风扣 (在锁骨位置) -->
      <circle cx="110" cy="${A.shoulderL[1]+4}" r="3" fill="#FFE66D" stroke="#8090A0" stroke-width="1.5"/>
    ` : '';

    const galaxyCape = (has.galaxy && !has.aurora) ? `
      <path d="M ${A.shoulderL[0]+4} ${A.shoulderL[1]+2}
               Q ${A.shoulderL[0]-22} ${tpl.bodyBottom-30} ${A.shoulderL[0]-32} ${tpl.legBottom+8}
               L ${A.shoulderR[0]+32} ${tpl.legBottom+8}
               Q ${A.shoulderR[0]+22} ${tpl.bodyBottom-30} ${A.shoulderR[0]-4} ${A.shoulderR[1]+2} Z"
            fill="url(#galaxyGrad)" stroke="#8090A0" stroke-width="2.5" opacity="0.95">
        <animateTransform attributeName="transform" type="rotate" values="-2 110 ${A.shoulderL[1]};2 110 ${A.shoulderL[1]};-2 110 ${A.shoulderL[1]}" dur="3.5s" repeatCount="indefinite"/>
      </path>
      <text x="${A.shoulderL[0]-15}" y="${tpl.bodyBottom-15}" font-size="9" fill="#FFE66D">✦</text>
      <text x="${A.shoulderR[0]+10}" y="${tpl.bodyBottom-25}" font-size="11" fill="white">★</text>
      <text x="100" y="${tpl.legTop+5}" font-size="9" fill="#FFE66D">✧</text>
      <circle cx="110" cy="${A.shoulderL[1]+4}" r="3" fill="#FFE66D" stroke="#8090A0" stroke-width="1.5"/>
      <defs>
        <linearGradient id="galaxyGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#A788E0"/><stop offset="50%" stop-color="#4338a0"/><stop offset="100%" stop-color="#1a0d40"/>
        </linearGradient>
      </defs>
    ` : '';

    const auroraCape = has.aurora ? `
      <!-- 极光斗篷: 明亮双翼+强发光效果 -->
      <!-- 外层辉光 (大范围柔光) -->
      <ellipse cx="110" cy="${tpl.bodyBottom}" rx="75" ry="50" fill="none" stroke="rgba(0,212,255,0.2)" stroke-width="4" opacity="0.6">
        <animate attributeName="opacity" values="0.3;0.7;0.3" dur="3s" repeatCount="indefinite"/>
      </ellipse>
      <!-- 左翼 (明亮青色) -->
      <path d="M ${A.shoulderL[0]+8} ${A.shoulderL[1]+5}
               Q ${A.shoulderL[0]-20} ${tpl.bodyBottom-30} ${A.shoulderL[0]-40} ${tpl.legBottom+8}
               Q ${A.shoulderL[0]-20} ${tpl.legBottom+15} ${A.shoulderL[0]} ${tpl.legBottom+5}
               Q ${A.shoulderL[0]+5} ${tpl.bodyBottom} ${A.shoulderL[0]+8} ${A.shoulderL[1]+5} Z"
            fill="url(#auroraGradL)" stroke="rgba(0,212,255,0.9)" stroke-width="2" opacity="0.95"
            filter="url(#auroraGlow)">
        <animateTransform attributeName="transform" type="rotate" values="-3 ${A.shoulderL[0]} ${A.shoulderL[1]};2 ${A.shoulderL[0]} ${A.shoulderL[1]};-3 ${A.shoulderL[0]} ${A.shoulderL[1]}" dur="3s" repeatCount="indefinite"/>
      </path>
      <!-- 右翼 (明亮紫色) -->
      <path d="M ${A.shoulderR[0]-8} ${A.shoulderR[1]+5}
               Q ${A.shoulderR[0]+20} ${tpl.bodyBottom-30} ${A.shoulderR[0]+40} ${tpl.legBottom+8}
               Q ${A.shoulderR[0]+20} ${tpl.legBottom+15} ${A.shoulderR[0]} ${tpl.legBottom+5}
               Q ${A.shoulderR[0]-5} ${tpl.bodyBottom} ${A.shoulderR[0]-8} ${A.shoulderR[1]+5} Z"
            fill="url(#auroraGradR)" stroke="rgba(168,100,255,0.9)" stroke-width="2" opacity="0.95"
            filter="url(#auroraGlow)">
        <animateTransform attributeName="transform" type="rotate" values="3 ${A.shoulderR[0]} ${A.shoulderR[1]};-2 ${A.shoulderR[0]} ${A.shoulderR[1]};3 ${A.shoulderR[0]} ${A.shoulderR[1]}" dur="3s" repeatCount="indefinite"/>
      </path>
      <!-- 中央连接光带 -->
      <path d="M ${A.shoulderL[0]} ${tpl.legBottom+5} Q 110 ${tpl.legBottom+18} ${A.shoulderR[0]} ${tpl.legBottom+5}"
            fill="rgba(0,212,255,0.2)" stroke="rgba(0,212,255,0.6)" stroke-width="2" stroke-linecap="round"/>
      <!-- 流光条 -->
      <path d="M ${A.shoulderL[0]-30} ${tpl.bodyBottom-5} Q 110 ${tpl.bodyBottom+10} ${A.shoulderR[0]+30} ${tpl.bodyBottom-5}"
            stroke="#00D4FF" stroke-width="2.5" fill="none" stroke-linecap="round" opacity="0.8">
        <animate attributeName="opacity" values="0.4;1;0.4" dur="1.8s" repeatCount="indefinite"/>
      </path>
      <path d="M ${A.shoulderL[0]-35} ${tpl.legTop+8} Q 110 ${tpl.legTop+18} ${A.shoulderR[0]+35} ${tpl.legTop+8}"
            stroke="#A78BFA" stroke-width="2" fill="none" stroke-linecap="round" opacity="0.7">
        <animate attributeName="opacity" values="0.3;0.9;0.3" dur="2.2s" repeatCount="indefinite" begin="0.5s"/>
      </path>
      <!-- 极光粒子 (8颗, 明亮) -->
      <circle cx="${A.shoulderL[0]-25}" cy="${tpl.bodyBottom-5}" r="3" fill="#00D4FF">
        <animate attributeName="opacity" values="0.2;1;0.2" dur="1.5s" repeatCount="indefinite"/>
        <animate attributeName="cy" values="${tpl.bodyBottom-5};${tpl.bodyBottom-18};${tpl.bodyBottom-5}" dur="1.5s" repeatCount="indefinite"/>
      </circle>
      <circle cx="${A.shoulderR[0]+22}" cy="${tpl.bodyBottom-10}" r="2.5" fill="#A78BFA">
        <animate attributeName="opacity" values="0.2;1;0.2" dur="1.8s" repeatCount="indefinite" begin="0.3s"/>
        <animate attributeName="cy" values="${tpl.bodyBottom-10};${tpl.bodyBottom-25};${tpl.bodyBottom-10}" dur="1.8s" repeatCount="indefinite" begin="0.3s"/>
      </circle>
      <circle cx="${A.shoulderL[0]-35}" cy="${tpl.legTop+5}" r="2.5" fill="#00FF88">
        <animate attributeName="opacity" values="0;1;0" dur="2s" repeatCount="indefinite" begin="0.7s"/>
      </circle>
      <circle cx="${A.shoulderR[0]+32}" cy="${tpl.legTop+12}" r="2" fill="#FFE66D">
        <animate attributeName="opacity" values="0;1;0" dur="1.6s" repeatCount="indefinite" begin="1s"/>
      </circle>
      <circle cx="${A.shoulderL[0]-15}" cy="${tpl.legBottom-5}" r="2.5" fill="#00D4FF">
        <animate attributeName="opacity" values="0;1;0" dur="2.2s" repeatCount="indefinite" begin="0.2s"/>
      </circle>
      <circle cx="${A.shoulderR[0]+10}" cy="${tpl.legBottom}" r="2" fill="#C4B5FD">
        <animate attributeName="opacity" values="0;1;0" dur="1.8s" repeatCount="indefinite" begin="1.3s"/>
      </circle>
      <circle cx="110" cy="${tpl.legBottom+12}" r="2" fill="#00D4FF">
        <animate attributeName="opacity" values="0;0.8;0" dur="2s" repeatCount="indefinite" begin="0.5s"/>
      </circle>
      <circle cx="${A.shoulderL[0]-30}" cy="${tpl.bodyBottom+15}" r="1.8" fill="#8B5CF6">
        <animate attributeName="opacity" values="0;0.9;0" dur="1.5s" repeatCount="indefinite" begin="0.8s"/>
      </circle>
      <!-- 肩扣 (发光宝石) -->
      <circle cx="110" cy="${A.shoulderL[1]+6}" r="5" fill="#00D4FF" stroke="white" stroke-width="2" filter="url(#auroraGlow)"/>
      <circle cx="110" cy="${A.shoulderL[1]+6}" r="2" fill="white"/>
      <defs>
        <filter id="auroraGlow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blur"/>
          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
        <linearGradient id="auroraGradL" x1="1" y1="0" x2="0" y2="0.8">
          <stop offset="0%" stop-color="#00D4FF"/>
          <stop offset="50%" stop-color="#0EA5E9"/>
          <stop offset="100%" stop-color="#7C3AED"/>
        </linearGradient>
        <linearGradient id="auroraGradR" x1="0" y1="0" x2="1" y2="0.8">
          <stop offset="0%" stop-color="#8B5CF6"/>
          <stop offset="50%" stop-color="#A78BFA"/>
          <stop offset="100%" stop-color="#00D4FF"/>
        </linearGradient>
      </defs>
    ` : '';

    const nebulaDust = has.nebula ? `
      <!-- 星云粉尘: 紫色粒子环绕身体 -->
      <g opacity="0.8">
        <circle cx="${A.shoulderL[0]-18}" cy="${tpl.bodyTop+20}" r="3" fill="#A788E0" opacity="0.6">
          <animate attributeName="cy" values="${tpl.bodyTop+20};${tpl.bodyTop+10};${tpl.bodyTop+20}" dur="3s" repeatCount="indefinite"/>
          <animate attributeName="opacity" values="0.3;0.8;0.3" dur="3s" repeatCount="indefinite"/>
        </circle>
        <circle cx="${A.shoulderR[0]+15}" cy="${tpl.bodyBottom-30}" r="2.5" fill="#7C3AED" opacity="0.5">
          <animate attributeName="cy" values="${tpl.bodyBottom-30};${tpl.bodyBottom-40};${tpl.bodyBottom-30}" dur="2.5s" repeatCount="indefinite" begin="0.5s"/>
          <animate attributeName="opacity" values="0.2;0.7;0.2" dur="2.5s" repeatCount="indefinite" begin="0.5s"/>
        </circle>
        <circle cx="${A.shoulderL[0]-8}" cy="${tpl.legTop}" r="2" fill="#C4B5FD" opacity="0.5">
          <animate attributeName="cy" values="${tpl.legTop};${tpl.legTop-8};${tpl.legTop}" dur="2.8s" repeatCount="indefinite" begin="1s"/>
          <animate attributeName="opacity" values="0.2;0.6;0.2" dur="2.8s" repeatCount="indefinite" begin="1s"/>
        </circle>
        <circle cx="110" cy="${tpl.headCY-55}" r="2" fill="#E9D5FF" opacity="0.4">
          <animate attributeName="opacity" values="0;0.7;0" dur="2s" repeatCount="indefinite" begin="0.3s"/>
        </circle>
        <circle cx="${A.shoulderR[0]+22}" cy="${tpl.bodyTop+40}" r="1.8" fill="#A78BFA" opacity="0.5">
          <animate attributeName="opacity" values="0.2;0.8;0.2" dur="2.2s" repeatCount="indefinite" begin="0.8s"/>
          <animate attributeName="cy" values="${tpl.bodyTop+40};${tpl.bodyTop+32};${tpl.bodyTop+40}" dur="2.2s" repeatCount="indefinite" begin="0.8s"/>
        </circle>
        <!-- 星云薄纱 (半透明弧) -->
        <path d="M ${A.shoulderL[0]-20} ${tpl.bodyBottom-20} Q 110 ${tpl.bodyTop} ${A.shoulderR[0]+20} ${tpl.bodyBottom-20}"
              stroke="rgba(167,136,224,0.2)" stroke-width="8" fill="none" stroke-linecap="round"/>
      </g>
    ` : '';

    const orbitRing = has.orbit ? `
      <!-- 轨道飞船: 头顶环形轨道+小卫星 -->
      <g>
        <ellipse cx="110" cy="${tpl.headCY-10}" rx="55" ry="12" fill="none" stroke="rgba(0,212,255,0.3)" stroke-width="1.5" stroke-dasharray="4 3" transform="rotate(-15 110 ${tpl.headCY-10})"/>
        <!-- 卫星 (沿轨道运动) -->
        <circle cx="0" cy="0" r="4" fill="#4ECDC4" stroke="#FFF" stroke-width="1">
          <animateMotion dur="4s" repeatCount="indefinite" rotate="auto">
            <mpath href="#orbitPath${tpl.bodyBottom}"/>
          </animateMotion>
        </circle>
        <circle cx="0" cy="0" r="2" fill="#FFE66D">
          <animateMotion dur="4s" repeatCount="indefinite" rotate="auto" begin="-2s">
            <mpath href="#orbitPath${tpl.bodyBottom}"/>
          </animateMotion>
        </circle>
        <defs>
          <path id="orbitPath${tpl.bodyBottom}" d="M 55 ${tpl.headCY-10} A 55 12 -15 1 1 55 ${tpl.headCY-10 + 0.01}" fill="none" transform="rotate(-15 110 ${tpl.headCY-10})"/>
        </defs>
      </g>
    ` : '';

    const bag = has.bag ? `
      <!-- 书包放脚边 (左脚旁, 渲染在身体之前) -->
      <g>
        <!-- 袋体阴影 -->
        <ellipse cx="72" cy="${tpl.legBottom+4}" rx="18" ry="4" fill="#2D3047" opacity="0.18"/>
        <!-- 主袋体 -->
        <rect x="54" y="${tpl.legBottom-30}" width="34" height="34" fill="#FF9F45" stroke="#8090A0" stroke-width="2" rx="6"/>
        <!-- 前袋口 -->
        <rect x="59" y="${tpl.legBottom-22}" width="24" height="20" fill="#FF8C2D" stroke="#8090A0" stroke-width="1.5" rx="4"/>
        <!-- 拉链 -->
        <line x1="60" y1="${tpl.legBottom-17}" x2="82" y2="${tpl.legBottom-17}" stroke="#8090A0" stroke-width="1.2" stroke-dasharray="2.5,2"/>
        <circle cx="60" cy="${tpl.legBottom-17}" r="2.2" fill="#2D3047"/>
        <!-- 顶提手 -->
        <path d="M 63,${tpl.legBottom-30} Q 71,${tpl.legBottom-37} 79,${tpl.legBottom-30}" fill="none" stroke="#8090A0" stroke-width="2.5" stroke-linecap="round"/>
        <!-- 侧面肩带 -->
        <path d="M 54,${tpl.legBottom-20} Q 45,${tpl.legBottom-8} 50,${tpl.legBottom+2}" fill="none" stroke="#8B4513" stroke-width="3" stroke-linecap="round"/>
      </g>
    ` : '';

    // === 身体 (z=4) — 已包含在 body 变量 ===

    // === 胸前装饰 (z=5) ===
    const monthking = has.monthking ? `
      <!-- 月度王徽章: 挂带 + 圆牌 -->
      <path d="M ${A.shoulderL[0]+8} ${A.shoulderL[1]+5} L ${A.chest[0]} ${A.chest[1]+2}
               L ${A.shoulderR[0]-8} ${A.shoulderR[1]+5}" stroke="#C13030" stroke-width="3" fill="none"/>
      <circle cx="${A.chest[0]}" cy="${A.chest[1]+10}" r="11" fill="#FFE66D" stroke="#8090A0" stroke-width="2.5"/>
      <circle cx="${A.chest[0]}" cy="${A.chest[1]+10}" r="6.5" fill="#FF6B6B" stroke="#8090A0" stroke-width="1.5"/>
      <text x="${A.chest[0]-3.5}" y="${A.chest[1]+13.5}" font-size="9" font-weight="bold" fill="white">王</text>
    ` : '';

    const medalGold = has.medal ? `
      <!-- 金牌挂脖子, 黄红丝带 V 型 -->
      <path d="M ${110-8} ${tpl.neckBottom-2} L ${A.chest[0]-2} ${A.chest[1]-2}
               L ${A.chest[0]+2} ${A.chest[1]-2} L ${110+8} ${tpl.neckBottom-2}"
            stroke="#FFE66D" stroke-width="4" fill="none"/>
      <circle cx="${A.chest[0]}" cy="${A.chest[1]+8}" r="13" fill="#FFD700" stroke="#8090A0" stroke-width="2.5"/>
      <circle cx="${A.chest[0]}" cy="${A.chest[1]+8}" r="9" fill="#FFA500" stroke="#FFE66D" stroke-width="1"/>
      <text x="${A.chest[0]-5}" y="${A.chest[1]+12}" font-size="11" font-weight="900" fill="#8B6F00">1</text>
    ` : '';

    const lightning = has.lightning ? `
      <!-- 右臂袖标: 黄底闪电符号 -->
      <rect x="${A.shoulderR[0]-3}" y="${A.shoulderR[1]+10}" width="20" height="14"
            fill="#FFE66D" stroke="#8090A0" stroke-width="2" rx="3"
            transform="rotate(15 ${A.shoulderR[0]+7} ${A.shoulderR[1]+17})"/>
      <text x="${A.shoulderR[0]+1}" y="${A.shoulderR[1]+22}" font-size="12" fill="#2D3047" font-weight="900"
            transform="rotate(15 ${A.shoulderR[0]+7} ${A.shoulderR[1]+17})">⚡</text>
    ` : '';

    const star = has.star ? `
      <g transform="translate(${A.chest[0] + 18} ${A.chest[1] - 5})">
        <polygon points="0,-9 2.6,-3 9,-3 4,1.5 6,8 0,4.5 -6,8 -4,1.5 -9,-3 -2.6,-3"
                 fill="#FFE66D" stroke="#8090A0" stroke-width="1.5"/>
        <polygon points="0,-5 1.4,-1.5 5,-1.5 2.2,1 3.3,4.5 0,2.5 -3.3,4.5 -2.2,1 -5,-1.5 -1.4,-1.5"
                 fill="#FFA500"/>
      </g>
    ` : '';

    const badge_p6 = has.badge_p6 ? `
      <g transform="translate(${A.chest[0] - 22} ${A.chest[1] + 4})">
        <polygon points="-6,-4 6,-4 4,4 -4,4" fill="#C13030" stroke="#8090A0" stroke-width="1.5"/>
        <polygon points="-4,4 -6,12 0,8 6,12 4,4" fill="#0D7C3E" stroke="#8090A0" stroke-width="1.5"/>
        <circle cx="0" cy="0" r="5" fill="#FFE66D" stroke="#8090A0" stroke-width="1.5"/>
        <text x="-3" y="2.5" font-size="6" font-weight="900" fill="#2D3047">P6</text>
      </g>
    ` : '';

    const badge_2 = has.badge_2 ? `
      <g transform="translate(${A.chest[0] + 22} ${A.chest[1] + 4})">
        <circle cx="0" cy="0" r="6" fill="#FF6B9D" stroke="#8090A0" stroke-width="1.5"/>
        <circle cx="-3" cy="-3" r="2.5" fill="#FFB6D9"/>
        <circle cx="3" cy="-3" r="2.5" fill="#FFB6D9"/>
        <circle cx="-3" cy="3" r="2.5" fill="#FFB6D9"/>
        <circle cx="3" cy="3" r="2.5" fill="#FFB6D9"/>
        <circle cx="0" cy="0" r="2" fill="#FFE066"/>
      </g>
    ` : '';

    const badge_3 = has.badge_3 ? `
      <g transform="translate(${A.chest[0]} ${A.chest[1] + 22})">
        <path d="M -5 -8 L 5 -8 L 8 0 L 0 8 L -8 0 Z" fill="#7B2CBF" stroke="#8090A0" stroke-width="1.5"/>
        <polygon points="-5,8 -8,15 -3,12" fill="#7B2CBF" stroke="#8090A0" stroke-width="1"/>
        <polygon points="5,8 8,15 3,12" fill="#7B2CBF" stroke="#8090A0" stroke-width="1"/>
        <text x="-3" y="3" font-size="7" font-weight="900" fill="white">★</text>
      </g>
    ` : '';

    const scholarSash = (skin.accessory === 'scholarSash') ? `
      <!-- 学者绶带从右肩斜挎到左腰 -->
      <path d="M ${A.shoulderR[0]-4} ${A.shoulderR[1]+4}
               L ${A.waistL[0]+6} ${A.waistL[1]-2}
               L ${A.waistL[0]+12} ${A.waistL[1]+4}
               L ${A.shoulderR[0]+2} ${A.shoulderR[1]+10} Z"
            fill="#FFD700" stroke="#8090A0" stroke-width="2" opacity="0.92"/>
      <text x="${(A.shoulderR[0]+A.waistL[0])/2-4}" y="${(A.shoulderR[1]+A.waistL[1])/2+4}" font-size="10"
            fill="#2D3047" font-weight="900">学</text>
    ` : '';

    // === 手中物品 (z=6) ===
    // 工具类用 _withGrip — 在握柄前画 2 根弯曲手指
    const gripL = `<path d="M ${A.handL[0]-6} ${A.handL[1]-4} Q ${A.handL[0]} ${A.handL[1]-7} ${A.handL[0]+6} ${A.handL[1]-4}
                              Q ${A.handL[0]+8} ${A.handL[1]+1} ${A.handL[0]+6} ${A.handL[1]+5}
                              Q ${A.handL[0]} ${A.handL[1]+8} ${A.handL[0]-6} ${A.handL[1]+5} Z"
                      fill="${skinColor}" stroke="#8090A0" stroke-width="1.5"/>`;
    const gripR = `<path d="M ${A.handR[0]-6} ${A.handR[1]-4} Q ${A.handR[0]} ${A.handR[1]-7} ${A.handR[0]+6} ${A.handR[1]-4}
                              Q ${A.handR[0]+8} ${A.handR[1]+1} ${A.handR[0]+6} ${A.handR[1]+5}
                              Q ${A.handR[0]} ${A.handR[1]+8} ${A.handR[0]-6} ${A.handR[1]+5} Z"
                      fill="${skinColor}" stroke="#8090A0" stroke-width="1.5"/>`;

    // v18.62: 剑 3D 立体感 (银色金属渐变 + 高光 + 红宝石护手)
    const sword = has.sword ? `
      <g filter="url(#eqShadow)">
        <g transform="translate(${A.handR[0]}, ${A.handR[1]}) rotate(20)">
          <!-- 剑身 (银色金属渐变, 加宽) -->
          <rect x="-4" y="-58" width="8" height="56" rx="1" fill="url(#metalSilver)" stroke="#8090A0" stroke-width="2"/>
          <!-- 剑身高光中线 -->
          <line x1="0" y1="-58" x2="0" y2="-3" stroke="#FFF" stroke-width="1.2" opacity="0.85"/>
          <!-- 剑刃边缘加深 (3D 厚度) -->
          <line x1="-4" y1="-58" x2="-4" y2="-3" stroke="#888" stroke-width="0.8"/>
          <line x1="4" y1="-58" x2="4" y2="-3" stroke="#888" stroke-width="0.8"/>
          <!-- 剑尖 (双层金属) -->
          <polygon points="-5,-58 5,-58 0,-72" fill="url(#metalSilver)" stroke="#8090A0" stroke-width="2"/>
          <polygon points="-2,-60 2,-60 0,-68" fill="#FFF" opacity="0.9"/>
          <!-- 护手 (金色, 加宽) -->
          <rect x="-9" y="-3" width="18" height="5" rx="1" fill="url(#metalGold)" stroke="#8090A0" stroke-width="1.8"/>
          <!-- 护手装饰星 -->
          <circle cx="-7" cy="-1" r="1.5" fill="#FFA500"/>
          <circle cx="7" cy="-1" r="1.5" fill="#FFA500"/>
          <!-- 剑柄 (红色皮革缠绕) -->
          <rect x="-3" y="2" width="6" height="10" fill="url(#metalRed)" stroke="#8090A0" stroke-width="1.5"/>
          <line x1="-3" y1="5" x2="3" y2="6" stroke="#A03030" stroke-width="1"/>
          <line x1="-3" y1="8" x2="3" y2="9" stroke="#A03030" stroke-width="1"/>
          <!-- 红宝石 (球形) -->
          <circle cx="0" cy="14" r="3.5" fill="url(#appleSphere)" stroke="#8090A0" stroke-width="1.5"/>
          <ellipse cx="-1" cy="13" rx="1" ry="0.8" fill="#FFF" opacity="0.9"/>
        </g>
        ${gripR}
      </g>
    ` : '';

    // v18.62: 魔法棒 3D (黑檀木 + 金色星头 + 旋转光环 + 火花)
    const magic = (has.magic && !has.sword) ? `
      <g filter="url(#eqShadow)">
        <g transform="translate(${A.handR[0]}, ${A.handR[1]}) rotate(-15)">
          <!-- 棒身 (黑檀木质感, 加宽 + 高光) -->
          <rect x="-3" y="-50" width="6" height="52" rx="1.5" fill="#1A1A2E" stroke="#000" stroke-width="1.5"/>
          <line x1="-1" y1="-50" x2="-1" y2="2" stroke="#666" stroke-width="0.8" opacity="0.6"/>
          <line x1="1" y1="-50" x2="1" y2="2" stroke="#FFF" stroke-width="0.5" opacity="0.4"/>
          <!-- 缠绕金线 -->
          <line x1="-3" y1="-30" x2="3" y2="-28" stroke="#FFD700" stroke-width="1"/>
          <line x1="-3" y1="-15" x2="3" y2="-13" stroke="#FFD700" stroke-width="1"/>
          <!-- 大星头 (金色 3D 球感) -->
          <circle cx="0" cy="-56" r="9" fill="url(#metalGold)" stroke="#B8860B" stroke-width="2"/>
          <!-- 五角星雕刻 -->
          <polygon points="0,-65 2.5,-58 9,-58 4,-54 6,-47 0,-51 -6,-47 -4,-54 -9,-58 -2.5,-58" fill="#FFF" opacity="0.95" stroke="#B8860B" stroke-width="0.8"/>
          <!-- 中心高光 -->
          <circle cx="0" cy="-56" r="2" fill="#FFF8C4"/>
          <!-- 旋转光环 -->
          <circle cx="0" cy="-56" r="13" fill="none" stroke="#FFD700" stroke-width="1.5" stroke-dasharray="3 4" opacity="0.7">
            <animateTransform attributeName="transform" type="rotate" values="0 0 -56;360 0 -56" dur="3s" repeatCount="indefinite"/>
          </circle>
          <!-- 飞溅火花 (3 颗) -->
          <circle cx="-12" cy="-50" r="1.5" fill="#FFE66D">
            <animate attributeName="opacity" values="0;1;0" dur="1.2s" repeatCount="indefinite"/>
            <animate attributeName="r" values="1;2.5;1" dur="1.2s" repeatCount="indefinite"/>
          </circle>
          <circle cx="12" cy="-62" r="1.5" fill="#FFA500">
            <animate attributeName="opacity" values="0;1;0" dur="1.5s" repeatCount="indefinite" begin="0.4s"/>
          </circle>
          <circle cx="-8" cy="-66" r="1" fill="#FFF">
            <animate attributeName="opacity" values="0;1;0" dur="1.8s" repeatCount="indefinite" begin="0.8s"/>
          </circle>
        </g>
        ${gripR}
      </g>
    ` : '';

    const mic = (has.mic && !has.sword && !has.magic) ? `
      <g>
        <g transform="translate(${A.handR[0]}, ${A.handR[1]}) rotate(-10)">
          <rect x="-3" y="-30" width="6" height="30" rx="2" fill="#2D3047"/>
          <ellipse cx="0" cy="-35" rx="9" ry="11" fill="#FFD700" stroke="#8090A0" stroke-width="2"/>
          <line x1="-7" y1="-39" x2="7" y2="-39" stroke="#8090A0" stroke-width="0.7"/>
          <line x1="-7" y1="-35" x2="7" y2="-35" stroke="#8090A0" stroke-width="0.7"/>
          <line x1="-7" y1="-31" x2="7" y2="-31" stroke="#8090A0" stroke-width="0.7"/>
          <line x1="-5" y1="-44" x2="-5" y2="-26" stroke="#8090A0" stroke-width="0.7"/>
          <line x1="0" y1="-46" x2="0" y2="-24" stroke="#8090A0" stroke-width="0.7"/>
          <line x1="5" y1="-44" x2="5" y2="-26" stroke="#8090A0" stroke-width="0.7"/>
        </g>
        ${gripR}
      </g>
    ` : '';

    const tube = (has.tube && !has.shield && !has.note && !has.cert) ? `
      <g>
        <g transform="translate(${A.handL[0]}, ${A.handL[1]}) rotate(-12)">
          <rect x="-5" y="-28" width="10" height="28" rx="2" fill="#4ECDC4" stroke="#8090A0" stroke-width="2" opacity="0.85"/>
          <rect x="-6" y="-30" width="12" height="4" fill="#2D3047" rx="1"/>
          <ellipse cx="0" cy="-12" rx="2.5" ry="2" fill="white" opacity="0.9">
            <animate attributeName="cy" values="-5;-25;-5" dur="2s" repeatCount="indefinite"/>
          </ellipse>
          <ellipse cx="-2" cy="-18" rx="1.5" ry="1.2" fill="white" opacity="0.7">
            <animate attributeName="cy" values="-8;-26;-8" dur="1.6s" repeatCount="indefinite"/>
          </ellipse>
        </g>
        ${gripL}
      </g>
    ` : '';

    const shield = has.shield ? `
      <g>
        <g transform="translate(${A.handL[0]-3}, ${A.handL[1]-3})">
          <path d="M 0 -16 Q -18 -16 -18 -3 Q -18 17 0 24 Q 18 17 18 -3 Q 18 -16 0 -16 Z"
                fill="#4ECDC4" stroke="#8090A0" stroke-width="2.5"/>
          <path d="M 0 -8 L -8 -1 L 0 11 L 8 -1 Z" fill="#FFE66D" stroke="#8090A0" stroke-width="1"/>
          <circle cx="0" cy="-1" r="2" fill="#FF6B6B"/>
        </g>
        ${gripL}
      </g>
    ` : '';

    const note = (has.note && !has.shield && !has.tube && !has.cert) ? `
      <g>
        <g transform="translate(${A.handL[0]+2}, ${A.handL[1]+2}) rotate(-8)">
          <rect x="-10" y="-13" width="20" height="16" fill="#FFF8E7" stroke="#8090A0" stroke-width="2" rx="1.5"/>
          <line x1="-8" y1="-9" x2="8" y2="-9" stroke="#FF6B6B" stroke-width="1"/>
          <line x1="-8" y1="-5" x2="6" y2="-5" stroke="#999" stroke-width="0.7"/>
          <line x1="-8" y1="-1" x2="7" y2="-1" stroke="#999" stroke-width="0.7"/>
        </g>
        ${gripL}
      </g>
    ` : '';

    const cert = has.cert ? `
      <g>
        <g transform="translate(${A.handL[0]+5}, ${A.handL[1]-2}) rotate(8)">
          <rect x="-10" y="-12" width="22" height="16" fill="#FFFAEC" stroke="#8B6F47" stroke-width="2" rx="1"/>
          <line x1="-7" y1="-7" x2="9" y2="-7" stroke="#8B6F47" stroke-width="0.7"/>
          <line x1="-7" y1="-3" x2="9" y2="-3" stroke="#8B6F47" stroke-width="0.7"/>
          <line x1="-7" y1="1" x2="6" y2="1" stroke="#8B6F47" stroke-width="0.7"/>
          <circle cx="6" cy="2" r="3.5" fill="#FF6B6B" stroke="#8090A0" stroke-width="0.8"/>
          <text x="4" y="4" font-size="5" fill="white">★</text>
        </g>
        ${gripL}
      </g>
    ` : '';

    // v18.62: 水晶球 3D (球体玻璃感 + 多重高光 + 内部光晕)
    const crystal = (has.crystal && !has.cert && !has.shield) ? `
      <g filter="url(#eqShadow)">
        <g transform="translate(${A.handL[0]+5}, ${A.handL[1]-5})">
          <!-- 底座 (金色 3D 椭圆) -->
          <ellipse cx="0" cy="9" rx="13" ry="4" fill="url(#metalGold)" stroke="#B8860B" stroke-width="1.5"/>
          <ellipse cx="0" cy="8" rx="11" ry="2" fill="#B8860B"/>
          <!-- 水晶球 (3D 球面渐变, 加大) -->
          <circle cx="0" cy="-2" r="13" fill="url(#crystalSphere)" stroke="#8090A0" stroke-width="2"/>
          <!-- 大反光斑 (左上) -->
          <ellipse cx="-4" cy="-7" rx="5" ry="3.5" fill="white" opacity="0.75"/>
          <!-- 小反光点 -->
          <circle cx="-2" cy="-5" r="1.2" fill="white" opacity="0.95"/>
          <!-- 内部光晕 (脉冲) -->
          <circle cx="3" cy="0" r="3" fill="#FFE66D" opacity="0.8">
            <animate attributeName="r" values="1.5;4;1.5" dur="2s" repeatCount="indefinite"/>
            <animate attributeName="opacity" values="0.9;0.3;0.9" dur="2s" repeatCount="indefinite"/>
          </circle>
          <!-- 紫色魔光环绕 (旋转) -->
          <circle cx="0" cy="-2" r="15" fill="none" stroke="#A788E0" stroke-width="0.8" stroke-dasharray="2 3" opacity="0.5">
            <animateTransform attributeName="transform" type="rotate" values="0 0 -2;360 0 -2" dur="6s" repeatCount="indefinite"/>
          </circle>
        </g>
        ${gripL}
      </g>
    ` : '';

    const phone = (has.phone && !has.sword && !has.magic && !has.mic) ? `
      <g>
        <g transform="translate(${A.handR[0]+2}, ${A.handR[1]-2}) rotate(8)">
          <rect x="-6" y="-13" width="12" height="22" rx="2.5" fill="#2D3047"/>
          <rect x="-5" y="-11" width="10" height="16" rx="1" fill="#4ECDC4"/>
          <text x="-3" y="0" font-size="7" fill="white">📚</text>
          <circle cx="0" cy="7" r="0.8" fill="#888"/>
        </g>
        ${gripR}
      </g>
    ` : '';

    // === 头部贴脸装饰 (z=7) ===
    const glasses = has.glasses ? `
      <g>
        <ellipse cx="${A.eyeL[0]}" cy="${A.eyeL[1]}" rx="11" ry="9" fill="white" fill-opacity="0.15" stroke="#8090A0" stroke-width="2"/>
        <ellipse cx="${A.eyeR[0]}" cy="${A.eyeR[1]}" rx="11" ry="9" fill="white" fill-opacity="0.15" stroke="#8090A0" stroke-width="2"/>
        <line x1="${A.eyeL[0]+11}" y1="${A.eyeL[1]}" x2="${A.eyeR[0]-11}" y2="${A.eyeR[1]}" stroke="#8090A0" stroke-width="2"/>
        <!-- 镜腿到耳后 -->
        <path d="M ${A.eyeL[0]-11} ${A.eyeL[1]-1} Q ${A.earL[0]-2} ${A.earL[1]-4} ${A.earL[0]-1} ${A.earL[1]+2}"
              stroke="#8090A0" stroke-width="2" fill="none"/>
        <path d="M ${A.eyeR[0]+11} ${A.eyeR[1]-1} Q ${A.earR[0]+2} ${A.earR[1]-4} ${A.earR[0]+1} ${A.earR[1]+2}"
              stroke="#8090A0" stroke-width="2" fill="none"/>
        <!-- 镜片高光 -->
        <ellipse cx="${A.eyeL[0]-3}" cy="${A.eyeL[1]-3}" rx="3" ry="2" fill="white" opacity="0.6"/>
        <ellipse cx="${A.eyeR[0]-3}" cy="${A.eyeR[1]-3}" rx="3" ry="2" fill="white" opacity="0.6"/>
      </g>
    ` : '';

    const heroMask = (skin.accessory === 'heroMask') ? `
      <path d="M ${A.eyeL[0]-14} ${A.eyeL[1]-7}
               Q 110 ${A.eyeL[1]-12} ${A.eyeR[0]+14} ${A.eyeR[1]-7}
               Q ${A.eyeR[0]+18} ${A.eyeR[1]+8} 110 ${A.eyeR[1]+12}
               Q ${A.eyeL[0]-18} ${A.eyeL[1]+8} ${A.eyeL[0]-14} ${A.eyeL[1]-7} Z"
            fill="#FF6B6B" stroke="#8090A0" stroke-width="2.5" opacity="0.92"/>
      <ellipse cx="${A.eyeL[0]}" cy="${A.eyeL[1]}" rx="8" ry="8" fill="white"/>
      <ellipse cx="${A.eyeR[0]}" cy="${A.eyeR[1]}" rx="8" ry="8" fill="white"/>
      <ellipse cx="${A.eyeL[0]}" cy="${A.eyeL[1]}" rx="5" ry="6" fill="#2D3047"/>
      <ellipse cx="${A.eyeR[0]}" cy="${A.eyeR[1]}" rx="5" ry="6" fill="#2D3047"/>
    ` : '';

    const headphone = has.headphone ? `
      <g>
        <!-- 头带弧形 -->
        <path d="M ${A.earL[0]-2} ${A.earL[1]-12} Q 110 ${A.headTop[1]-8} ${A.earR[0]+2} ${A.earR[1]-12}"
              stroke="#8090A0" stroke-width="6" fill="none"/>
        <path d="M ${A.earL[0]-2} ${A.earL[1]-12} Q 110 ${A.headTop[1]-6} ${A.earR[0]+2} ${A.earR[1]-12}"
              stroke="#FF6B6B" stroke-width="3" fill="none"/>
        <!-- 左耳罩贴耳 -->
        <ellipse cx="${A.earL[0]-3}" cy="${A.earL[1]+2}" rx="9" ry="13" fill="#FF6B6B" stroke="#8090A0" stroke-width="2.5"/>
        <ellipse cx="${A.earL[0]-3}" cy="${A.earL[1]+2}" rx="5" ry="9" fill="#2D3047" opacity="0.6"/>
        <!-- 右耳罩贴耳 -->
        <ellipse cx="${A.earR[0]+3}" cy="${A.earR[1]+2}" rx="9" ry="13" fill="#FF6B6B" stroke="#8090A0" stroke-width="2.5"/>
        <ellipse cx="${A.earR[0]+3}" cy="${A.earR[1]+2}" rx="5" ry="9" fill="#2D3047" opacity="0.6"/>
      </g>
    ` : '';

    const ear = (has.ear && !has.headphone) ? `
      <g>
        <path d="M ${A.earL[0]-3} ${A.earL[1]-14} Q 110 ${A.headTop[1]-10} ${A.earR[0]+3} ${A.earR[1]-14}"
              stroke="#FFD700" stroke-width="7" fill="none"/>
        <path d="M ${A.earL[0]-3} ${A.earL[1]-14} Q 110 ${A.headTop[1]-8} ${A.earR[0]+3} ${A.earR[1]-14}"
              stroke="#FFA500" stroke-width="3" fill="none"/>
        <ellipse cx="${A.earL[0]-4}" cy="${A.earL[1]+3}" rx="10" ry="14" fill="#FFD700" stroke="#8090A0" stroke-width="2.5"/>
        <ellipse cx="${A.earL[0]-4}" cy="${A.earL[1]+3}" rx="6" ry="10" fill="#8B6F00" opacity="0.6"/>
        <text x="${A.earL[0]-7}" y="${A.earL[1]+7}" font-size="9" fill="#FFE66D">♪</text>
        <ellipse cx="${A.earR[0]+4}" cy="${A.earR[1]+3}" rx="10" ry="14" fill="#FFD700" stroke="#8090A0" stroke-width="2.5"/>
        <ellipse cx="${A.earR[0]+4}" cy="${A.earR[1]+3}" rx="6" ry="10" fill="#8B6F00" opacity="0.6"/>
        <text x="${A.earR[0]+1}" y="${A.earR[1]+7}" font-size="9" fill="#FFE66D">♫</text>
      </g>
    ` : '';

    // === 头顶 (z=8) — 一次只显示一个头顶装备 ===
    const hat = (has.hat && !has.crown && !has.sun && !has.streak100 && !has.phoenix
                  && skin.accessory !== 'masterCrown' && skin.accessory !== 'explorerCap' && skin.accessory !== 'labGoggles') ? `
      <g>
        <!-- 帽顶板: 宽平黑色方板, 两侧超出头部 -->
        <rect x="${110-tpl.headR-16}" y="${A.headTop[1]-17}"
              width="${(tpl.headR+16)*2}" height="6"
              fill="#1A1A2E" rx="1"/>
        <!-- 板顶高光 -->
        <rect x="${110-tpl.headR-16}" y="${A.headTop[1]-17}"
              width="${(tpl.headR+16)*2}" height="2"
              fill="#3D3D5C" opacity="0.7" rx="1"/>
        <!-- 帽身: 梯形暗色筒身, 连接顶板与头顶 -->
        <polygon points="${110-tpl.headR-4},${A.headTop[1]-11}
                         ${110+tpl.headR+4},${A.headTop[1]-11}
                         ${110+tpl.headR},${A.headTop[1]-2}
                         ${110-tpl.headR},${A.headTop[1]-2}"
                 fill="#2D3047"/>
        <!-- 帽底椭圆 (贴合头顶弧度) -->
        <ellipse cx="110" cy="${A.headTop[1]-2}" rx="${tpl.headR+1}" ry="3.5" fill="#1A1A2E"/>
        <!-- 流苏绳: 从顶板右角垂下 -->
        <line x1="${110+tpl.headR+10}" y1="${A.headTop[1]-14}"
              x2="${110+tpl.headR+13}" y2="${A.headTop[1]+10}"
              stroke="#B8860B" stroke-width="1.8"/>
        <!-- 流苏球 -->
        <circle cx="${110+tpl.headR+13}" cy="${A.headTop[1]+10}" r="4"
                fill="#FFD700" stroke="#8090A0" stroke-width="1">
          <animate attributeName="cy"
                   values="${A.headTop[1]+10};${A.headTop[1]+14};${A.headTop[1]+10}"
                   dur="1.8s" repeatCount="indefinite"/>
        </circle>
        <!-- 流苏穗 (3根) -->
        <g stroke="#D4A017" stroke-width="1.3" stroke-linecap="round">
          <line x1="${110+tpl.headR+10}" y1="${A.headTop[1]+14}"
                x2="${110+tpl.headR+7}"  y2="${A.headTop[1]+23}">
            <animate attributeName="y2"
                     values="${A.headTop[1]+23};${A.headTop[1]+27};${A.headTop[1]+23}"
                     dur="1.8s" repeatCount="indefinite"/>
          </line>
          <line x1="${110+tpl.headR+13}" y1="${A.headTop[1]+14}"
                x2="${110+tpl.headR+13}" y2="${A.headTop[1]+24}">
            <animate attributeName="y2"
                     values="${A.headTop[1]+24};${A.headTop[1]+28};${A.headTop[1]+24}"
                     dur="1.8s" repeatCount="indefinite" begin="0.1s"/>
          </line>
          <line x1="${110+tpl.headR+16}" y1="${A.headTop[1]+14}"
                x2="${110+tpl.headR+19}" y2="${A.headTop[1]+23}">
            <animate attributeName="y2"
                     values="${A.headTop[1]+23};${A.headTop[1]+27};${A.headTop[1]+23}"
                     dur="1.8s" repeatCount="indefinite" begin="0.2s"/>
          </line>
        </g>
      </g>
    ` : '';

    const crown = (has.crown && !has.sun && !has.streak100 && skin.accessory !== 'masterCrown') ? `
      <g>
        <!-- 王冠齿 (压头顶) -->
        <path d="M ${110-tpl.headR-2} ${A.headTop[1]+6}
                 L ${110-tpl.headR+4} ${A.headTop[1]-12}
                 L ${110-tpl.headR*0.55} ${A.headTop[1]-2}
                 L 110 ${A.headTop[1]-18}
                 L ${110+tpl.headR*0.55} ${A.headTop[1]-2}
                 L ${110+tpl.headR-4} ${A.headTop[1]-12}
                 L ${110+tpl.headR+2} ${A.headTop[1]+6} Z"
              fill="#FFE66D" stroke="#8090A0" stroke-width="2.5"/>
        <!-- 底环 -->
        <rect x="${110-tpl.headR-2}" y="${A.headTop[1]+5}" width="${(tpl.headR+2)*2}" height="6"
              fill="#FFA500" stroke="#8090A0" stroke-width="2"/>
        <!-- 宝石 -->
        <circle cx="${110-tpl.headR+4}" cy="${A.headTop[1]-7}" r="3" fill="#FF6B6B" stroke="#8090A0" stroke-width="1"/>
        <circle cx="110" cy="${A.headTop[1]-12}" r="4" fill="#FF6B6B" stroke="#8090A0" stroke-width="1"/>
        <circle cx="${110+tpl.headR-4}" cy="${A.headTop[1]-7}" r="3" fill="#FF6B6B" stroke="#8090A0" stroke-width="1"/>
        <text x="105" y="${A.headTop[1]-14}" font-size="10" fill="#FFE66D" opacity="0.9">
          <animate attributeName="opacity" values="0.9;0.3;0.9" dur="1.5s" repeatCount="indefinite"/>✨
        </text>
      </g>
    ` : '';

    const sun = (has.sun && !has.streak100 && skin.accessory !== 'masterCrown') ? `
      <g>
        <circle cx="110" cy="${A.headTop[1]-4}" r="9" fill="#FFD700" stroke="#FFA500" stroke-width="2"/>
        <g>
          <line x1="110" y1="${A.headTop[1]-18}" x2="110" y2="${A.headTop[1]-12}" stroke="#FFA500" stroke-width="3"/>
          <line x1="${110-12}" y1="${A.headTop[1]-15}" x2="${110-7}" y2="${A.headTop[1]-9}" stroke="#FFA500" stroke-width="3"/>
          <line x1="${110+12}" y1="${A.headTop[1]-15}" x2="${110+7}" y2="${A.headTop[1]-9}" stroke="#FFA500" stroke-width="3"/>
          <line x1="${110-18}" y1="${A.headTop[1]-4}" x2="${110-12}" y2="${A.headTop[1]-4}" stroke="#FFA500" stroke-width="3"/>
          <line x1="${110+18}" y1="${A.headTop[1]-4}" x2="${110+12}" y2="${A.headTop[1]-4}" stroke="#FFA500" stroke-width="3"/>
          <animateTransform attributeName="transform" type="rotate" values="0 110 ${A.headTop[1]-4};360 110 ${A.headTop[1]-4}" dur="6s" repeatCount="indefinite"/>
        </g>
        <!-- 底环 (套头上) -->
        <rect x="${110-tpl.headR-2}" y="${A.headTop[1]+5}" width="${(tpl.headR+2)*2}" height="5"
              fill="#FFA500" stroke="#8090A0" stroke-width="2"/>
      </g>
    ` : '';

    const phoenix = has.phoenix ? `
      <g>
        <!-- 凤凰羽 (头顶后插) -->
        <path d="M 105 ${A.headTop[1]-2} Q 95 ${A.headTop[1]-15} 90 ${A.headTop[1]-25}
                 Q 92 ${A.headTop[1]-15} 100 ${A.headTop[1]-8} Z" fill="#FF6B6B" stroke="#8090A0" stroke-width="1.5"/>
        <path d="M 110 ${A.headTop[1]-2} Q 105 ${A.headTop[1]-20} 105 ${A.headTop[1]-32}
                 Q 110 ${A.headTop[1]-20} 113 ${A.headTop[1]-5} Z" fill="#FFA500" stroke="#8090A0" stroke-width="1.5"/>
        <path d="M 115 ${A.headTop[1]-2} Q 125 ${A.headTop[1]-15} 130 ${A.headTop[1]-25}
                 Q 128 ${A.headTop[1]-15} 120 ${A.headTop[1]-8} Z" fill="#FFE066" stroke="#8090A0" stroke-width="1.5"/>
        <!-- 火焰小颗 -->
        <circle cx="105" cy="${A.headTop[1]-32}" r="2" fill="#FF6B6B" opacity="0.8">
          <animate attributeName="cy" values="${A.headTop[1]-32};${A.headTop[1]-38};${A.headTop[1]-32}" dur="1s" repeatCount="indefinite"/>
        </circle>
      </g>
    ` : '';

    const masterCrown = (skin.accessory === 'masterCrown') ? `
      <g>
        <path d="M ${110-tpl.headR-4} ${A.headTop[1]+8}
                 L ${110-tpl.headR+4} ${A.headTop[1]-16}
                 L ${110-tpl.headR*0.4} ${A.headTop[1]-4}
                 L 110 ${A.headTop[1]-26}
                 L ${110+tpl.headR*0.4} ${A.headTop[1]-4}
                 L ${110+tpl.headR-4} ${A.headTop[1]-16}
                 L ${110+tpl.headR+4} ${A.headTop[1]+8} Z"
              fill="#FFD700" stroke="#8090A0" stroke-width="2.5"/>
        <rect x="${110-tpl.headR-4}" y="${A.headTop[1]+7}" width="${(tpl.headR+4)*2}" height="7"
              fill="#FFA500" stroke="#8090A0" stroke-width="2"/>
        <circle cx="${110-tpl.headR+4}" cy="${A.headTop[1]-10}" r="3" fill="#FF6B6B" stroke="#8090A0" stroke-width="1"/>
        <circle cx="110" cy="${A.headTop[1]-19}" r="4.5" fill="#4ECDC4" stroke="#8090A0" stroke-width="1.5"/>
        <circle cx="${110+tpl.headR-4}" cy="${A.headTop[1]-10}" r="3" fill="#FF6B6B" stroke="#8090A0" stroke-width="1"/>
        <text x="100" y="${A.headTop[1]-22}" font-size="11" fill="#FFE66D">
          <animate attributeName="opacity" values="1;0.4;1" dur="1.2s" repeatCount="indefinite"/>✨</text>
        <text x="120" y="${A.headTop[1]-20}" font-size="10" fill="#FFE66D">
          <animate attributeName="opacity" values="0.4;1;0.4" dur="1.5s" repeatCount="indefinite"/>✨</text>
      </g>
    ` : '';

    const explorerCap = (skin.accessory === 'explorerCap') ? `
      <g>
        <ellipse cx="110" cy="${A.headTop[1]+6}" rx="${tpl.headR+8}" ry="5" fill="#8B7355" stroke="#8090A0" stroke-width="2.5"/>
        <path d="M ${110-tpl.headR+2} ${A.headTop[1]+6} Q 110 ${A.headTop[1]-15} ${110+tpl.headR-2} ${A.headTop[1]+6} Z"
              fill="#8B7355" stroke="#8090A0" stroke-width="2.5"/>
        <rect x="${110-tpl.headR+2}" y="${A.headTop[1]+1}" width="${(tpl.headR-2)*2}" height="5" fill="#5A4632"/>
      </g>
    ` : '';

    const labGoggles = (skin.accessory === 'labGoggles') ? `
      <g opacity="0.92">
        <ellipse cx="${A.eyeL[0]}" cy="${A.headTop[1]+8}" rx="13" ry="8" fill="#4ECDC4" stroke="#8090A0" stroke-width="2.5" opacity="0.7"/>
        <ellipse cx="${A.eyeR[0]}" cy="${A.headTop[1]+8}" rx="13" ry="8" fill="#4ECDC4" stroke="#8090A0" stroke-width="2.5" opacity="0.7"/>
        <line x1="${A.eyeL[0]+13}" y1="${A.headTop[1]+8}" x2="${A.eyeR[0]-13}" y2="${A.headTop[1]+8}" stroke="#8090A0" stroke-width="3"/>
        <path d="M ${A.eyeL[0]-13} ${A.headTop[1]+8} L ${A.earL[0]-2} ${A.earL[1]-2}" stroke="#8090A0" stroke-width="2.5"/>
        <path d="M ${A.eyeR[0]+13} ${A.headTop[1]+8} L ${A.earR[0]+2} ${A.earR[1]-2}" stroke="#8090A0" stroke-width="2.5"/>
      </g>
    ` : '';

    const streak100 = (has.streak100 && !has.crown && !has.sun && skin.accessory !== 'masterCrown') ? `
      <g>
        <path d="M ${110-tpl.headR-3} ${A.headTop[1]+6}
                 L ${110-tpl.headR+5} ${A.headTop[1]-14}
                 L ${110-tpl.headR*0.5} ${A.headTop[1]-3}
                 L 110 ${A.headTop[1]-22}
                 L ${110+tpl.headR*0.5} ${A.headTop[1]-3}
                 L ${110+tpl.headR-5} ${A.headTop[1]-14}
                 L ${110+tpl.headR+3} ${A.headTop[1]+6} Z"
              fill="url(#streak100Grad)" stroke="#8B6F00" stroke-width="2.5">
          <animate attributeName="opacity" values="1;0.85;1" dur="1.5s" repeatCount="indefinite"/>
        </path>
        <rect x="${110-tpl.headR-3}" y="${A.headTop[1]+5}" width="${(tpl.headR+3)*2}" height="6" fill="#FFA500" stroke="#8B6F00" stroke-width="2"/>
        <text x="100" y="${A.headTop[1]-18}" font-size="10" fill="#FFD700">
          <animate attributeName="opacity" values="1;0.3;1" dur="1s" repeatCount="indefinite"/>✨</text>
        <text x="118" y="${A.headTop[1]-16}" font-size="10" fill="#FFD700">
          <animate attributeName="opacity" values="0.3;1;0.3" dur="1.2s" repeatCount="indefinite"/>✨</text>
      </g>
      <defs>
        <linearGradient id="streak100Grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#FFE66D"/><stop offset="50%" stop-color="#FFD700"/><stop offset="100%" stop-color="#FFA500"/>
        </linearGradient>
      </defs>
    ` : '';

    const streak7 = has.streak7 ? `
      <g transform="translate(${A.shoulderL[0]+3}, ${A.shoulderL[1]+8})">
        <path d="M 0 -8 Q -8 -8 -8 -2 Q -8 6 0 10 Q 8 6 8 -2 Q 8 -8 0 -8 Z"
              fill="#4ECDC4" stroke="#8090A0" stroke-width="2"/>
        <text x="-3" y="3" font-size="8" font-weight="900" fill="white">7</text>
      </g>
    ` : '';

    // === 珍珠项链 (颈部锁骨弧) ===
    const pearl = has.pearl ? (() => {
      const pearls = [0,1,2,3,4,5,6].map(i => {
        const t = i / 6;
        const px = (75 + t * 70).toFixed(1);
        const py = (130 + 12 * Math.sin(Math.PI * t)).toFixed(1);
        const r = i === 3 ? 5.5 : 4.5;
        const hx = (75 + t * 70 - r * 0.3).toFixed(1);
        const hy = (130 + 12 * Math.sin(Math.PI * t) - r * 0.35).toFixed(1);
        const hr = (r * 0.28).toFixed(1);
        return `<circle cx="${px}" cy="${py}" r="${r}" fill="url(#pearlGrad)" stroke="#C0A888" stroke-width="0.7"/>
                <circle cx="${hx}" cy="${hy}" r="${hr}" fill="white" opacity="0.75"/>`;
      }).join('');
      return `
      <defs>
        <radialGradient id="pearlGrad" cx="35%" cy="30%">
          <stop offset="0%" stop-color="#FDFAF5"/>
          <stop offset="45%" stop-color="#EDE5D0"/>
          <stop offset="100%" stop-color="#C8B89A"/>
        </radialGradient>
      </defs>
      <g filter="url(#eqShadow)">
        <path d="M 75 130 Q 110 142 145 130" fill="none" stroke="#D8C8A0" stroke-width="1.5"/>
        ${pearls}
      </g>`;
    })() : '';

    // === v18.81 心形晶钻背景装饰 (渲染在角色身体之前) ===
    const diamond = has.diamond ? `
      <defs>
        <radialGradient id="dHrtFill" cx="38%" cy="36%" r="58%">
          <stop offset="0%"   stop-color="white"   stop-opacity="0.95"/>
          <stop offset="22%"  stop-color="#EDE9FE" stop-opacity="0.9"/>
          <stop offset="48%"  stop-color="#C4B5FD" stop-opacity="0.85"/>
          <stop offset="76%"  stop-color="#8B5CF6" stop-opacity="0.9"/>
          <stop offset="100%" stop-color="#4C1D95" stop-opacity="0.95"/>
        </radialGradient>
        <radialGradient id="dHrtGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%"   stop-color="white"   stop-opacity="0.85"/>
          <stop offset="55%"  stop-color="#DDD6FE" stop-opacity="0.25"/>
          <stop offset="100%" stop-color="#7C3AED" stop-opacity="0"/>
        </radialGradient>
      </defs>
      <!-- 心形晶钻主体: 角色右侧 -->
      <g transform="translate(188,118)" opacity="0.82">
        <animateTransform attributeName="transform" type="translate"
                         values="0,0; 0,-6; 0,0" dur="4.0s" repeatCount="indefinite" additive="sum"/>
        <path d="M 0,52 C -9,42 -60,15 -60,-21 C -60,-54 -30,-63 0,-42 C 30,-63 60,-54 60,-21 C 60,15 9,42 0,52 Z"
              fill="url(#dHrtFill)" stroke="#7C3AED" stroke-width="1.2"/>
        <!-- 右侧粉色刻面 -->
        <path d="M 0,52 C 9,42 60,15 60,-21 L 0,-42 Z" fill="#F9A8D4" opacity="0.22"/>
        <!-- 左侧蓝紫刻面 -->
        <path d="M 0,52 C -9,42 -60,15 -60,-21 L 0,-42 Z" fill="#A5B4FC" opacity="0.22"/>
        <!-- 刻面切割线 -->
        <line x1="0"   y1="52"  x2="-60" y2="-21" stroke="white" stroke-width="0.7" opacity="0.4"/>
        <line x1="0"   y1="52"  x2="60"  y2="-21" stroke="white" stroke-width="0.7" opacity="0.4"/>
        <line x1="0"   y1="52"  x2="0"   y2="-42" stroke="white" stroke-width="0.5" opacity="0.3"/>
        <line x1="-60" y1="-21" x2="60"  y2="-21" stroke="white" stroke-width="0.7" opacity="0.4"/>
        <line x1="-60" y1="-21" x2="0"   y2="-42" stroke="white" stroke-width="0.6" opacity="0.35"/>
        <line x1="60"  y1="-21" x2="0"   y2="-42" stroke="white" stroke-width="0.6" opacity="0.35"/>
        <line x1="-30" y1="15"  x2="0"   y2="-42" stroke="white" stroke-width="0.5" opacity="0.25"/>
        <line x1="30"  y1="15"  x2="0"   y2="-42" stroke="white" stroke-width="0.5" opacity="0.25"/>
        <!-- 内部发光核心 -->
        <circle cx="-8" cy="-22" fill="url(#dHrtGlow)" opacity="0.7">
          <animate attributeName="r"       values="14;22;14" dur="2.2s" repeatCount="indefinite"/>
          <animate attributeName="opacity" values="0.7;0.35;0.7" dur="2.2s" repeatCount="indefinite"/>
        </circle>
        <!-- 高光反射点 -->
        <circle cx="-20" cy="-38" r="4" fill="white" opacity="0.6">
          <animate attributeName="opacity" values="0.6;0.15;0.6" dur="1.6s" repeatCount="indefinite"/>
        </circle>
        <!-- 光芒射线 -->
        <g stroke="white" stroke-width="1.2">
          <line x1="-8" y1="-46" x2="-8"  y2="-60"><animate attributeName="opacity" values="0.65;0.1;0.65" dur="1.8s" repeatCount="indefinite"/></line>
          <line x1="14" y1="-44" x2="24"  y2="-58"><animate attributeName="opacity" values="0.6;0.1;0.6"  dur="2.1s" repeatCount="indefinite"/></line>
          <line x1="-30" y1="-40" x2="-42" y2="-52"><animate attributeName="opacity" values="0.6;0.1;0.6" dur="1.5s" repeatCount="indefinite"/></line>
          <line x1="62"  y1="-21" x2="76"  y2="-21"><animate attributeName="opacity" values="0.5;0.1;0.5" dur="2.4s" repeatCount="indefinite"/></line>
          <line x1="-62" y1="-21" x2="-76" y2="-21"><animate attributeName="opacity" values="0.5;0.1;0.5" dur="2.0s" repeatCount="indefinite"/></line>
        </g>
      </g>
      <!-- 小浮动心形: 主心右上方 -->
      <g transform="translate(228,58)">
        <animateTransform attributeName="transform" type="translate"
                         values="0,0; 0,-6; 0,0" dur="3.2s" repeatCount="indefinite" additive="sum"/>
        <path d="M 0,8 C -2,6 -10,2 -10,-3 C -10,-8 -4,-9 0,-6 C 4,-9 10,-8 10,-3 C 10,2 2,6 0,8 Z"
              fill="#A855F7" opacity="0.8"/>
      </g>
      <!-- 小浮动心形: 主心左下方 -->
      <g transform="translate(162,188)">
        <animateTransform attributeName="transform" type="translate"
                         values="0,0; 0,6; 0,0" dur="2.8s" repeatCount="indefinite" additive="sum"/>
        <path d="M 0,8 C -2,6 -10,2 -10,-3 C -10,-8 -4,-9 0,-6 C 4,-9 10,-8 10,-3 C 10,2 2,6 0,8 Z"
              fill="#F472B6" opacity="0.75"/>
      </g>
      <!-- 星形闪烁: 主心左上 -->
      <g transform="translate(148,62)">
        <animateTransform attributeName="transform" type="translate"
                         values="0,0; 0,-4; 0,0" dur="2.5s" repeatCount="indefinite" additive="sum"/>
        <text font-size="14" fill="#E9D5FF" text-anchor="middle" dominant-baseline="central">
          <animate attributeName="opacity" values="0.8;0.15;0.8" dur="1.4s" repeatCount="indefinite"/>✦</text>
      </g>
      <!-- 星形闪烁: 主心右侧 -->
      <g transform="translate(242,118)">
        <animateTransform attributeName="transform" type="translate"
                         values="0,0; 0,-4; 0,0" dur="3.0s" repeatCount="indefinite" additive="sum"/>
        <text font-size="11" fill="#DDD6FE" text-anchor="middle" dominant-baseline="central">
          <animate attributeName="opacity" values="0.7;0.1;0.7" dur="1.7s" repeatCount="indefinite"/>✦</text>
      </g>
    ` : '';

    // === v18.86 周次里程碑装备 (打卡到对应周自动解锁) ===
    // wk30: 指南针徽章 (右臂)
    const wk30 = has.wk30 ? `
      <g transform="translate(148,146)">
        <circle r="9" fill="#F59E0B" stroke="#8090A0" stroke-width="1.5"/>
        <circle r="6.5" fill="#FEF3C7"/>
        <line x1="0" y1="-5" x2="0" y2="5" stroke="#6B7280" stroke-width="0.8"/>
        <line x1="-5" y1="0" x2="5" y2="0" stroke="#6B7280" stroke-width="0.8"/>
        <polygon points="0,-5 -1.5,0 1.5,0" fill="#DC2626"/>
        <polygon points="0,5 -1.5,0 1.5,0" fill="#374151"/>
        <circle r="1.5" fill="#2D3047"/>
      </g>
    ` : '';

    // wk36: 成长之芽 (左肩上方)
    const wk36 = has.wk36 ? `
      <g transform="translate(70,115)">
        <line x1="0" y1="0" x2="0" y2="-14" stroke="#16A34A" stroke-width="2.2" stroke-linecap="round"/>
        <path d="M 0,-7 Q -8,-11 -5,-16 Q -1,-9 0,-7 Z" fill="#22C55E"/>
        <path d="M 0,-9 Q 8,-13 5,-18 Q 1,-11 0,-9 Z" fill="#4ADE80"/>
        <ellipse cx="0" cy="-16" rx="2.5" ry="3.5" fill="#86EFAC" transform="rotate(-8 0 -16)">
          <animate attributeName="ry" values="3.5;4.5;3.5" dur="2.0s" repeatCount="indefinite"/>
        </ellipse>
      </g>
    ` : '';

    // wk50: 半程之锚 (左腰)
    const wk50 = has.wk50 ? `
      <g transform="translate(72,172)" stroke="#1D4ED8" stroke-linecap="round">
        <circle cx="0" cy="-8" r="4" fill="none" stroke-width="1.8"/>
        <line x1="-8" y1="-5" x2="8" y2="-5" stroke-width="2"/>
        <line x1="0" y1="-5" x2="0" y2="8" stroke-width="2.2"/>
        <path d="M -7,5 Q 0,11 7,5" fill="none" stroke-width="2"/>
        <line x1="-7" y1="5" x2="-4" y2="2" stroke-width="1.8"/>
        <line x1="7"  y1="5" x2="4"  y2="2" stroke-width="1.8"/>
      </g>
    ` : '';

    // === 全身光环 (z=10) ===
    const rainbow = has.rainbow ? `
      <g opacity="0.55">
        <ellipse cx="110" cy="${(tpl.headCY + tpl.legBottom)/2}" rx="100" ry="115" fill="none" stroke="#FF6B6B" stroke-width="3"/>
        <ellipse cx="110" cy="${(tpl.headCY + tpl.legBottom)/2}" rx="95" ry="110" fill="none" stroke="#FFA500" stroke-width="3"/>
        <ellipse cx="110" cy="${(tpl.headCY + tpl.legBottom)/2}" rx="90" ry="105" fill="none" stroke="#FFE66D" stroke-width="3"/>
        <ellipse cx="110" cy="${(tpl.headCY + tpl.legBottom)/2}" rx="85" ry="100" fill="none" stroke="#4ECDC4" stroke-width="3"/>
        <ellipse cx="110" cy="${(tpl.headCY + tpl.legBottom)/2}" rx="80" ry="95" fill="none" stroke="#A788E0" stroke-width="3"/>
        <animateTransform attributeName="transform" type="rotate" values="0 110 ${(tpl.headCY + tpl.legBottom)/2};360 110 ${(tpl.headCY + tpl.legBottom)/2}" dur="20s" repeatCount="indefinite"/>
      </g>
    ` : '';

    const planet = has.planet ? `
      <g opacity="0.6">
        <ellipse cx="110" cy="${A.chest[1]}" rx="95" ry="20" fill="none" stroke="#FFA500" stroke-width="3"
                 transform="rotate(15 110 ${A.chest[1]})">
          <animateTransform attributeName="transform" type="rotate" values="15 110 ${A.chest[1]};375 110 ${A.chest[1]}" dur="8s" repeatCount="indefinite"/>
        </ellipse>
        <ellipse cx="110" cy="${A.chest[1]}" rx="95" ry="14" fill="none" stroke="#FFD700" stroke-width="2"
                 transform="rotate(15 110 ${A.chest[1]})">
          <animateTransform attributeName="transform" type="rotate" values="15 110 ${A.chest[1]};375 110 ${A.chest[1]}" dur="8s" repeatCount="indefinite"/>
        </ellipse>
      </g>
    ` : '';

    const streak30 = has.streak30 ? `
      <g opacity="0.7">
        <path d="M 30 ${tpl.legBottom-5} Q 25 ${tpl.bodyTop+30} 50 ${tpl.headCY} Q 70 ${A.headTop[1]-5} 110 ${A.headTop[1]-15}
                 Q 150 ${A.headTop[1]-5} 170 ${tpl.headCY} Q 195 ${tpl.bodyTop+30} 190 ${tpl.legBottom-5}"
              fill="none" stroke="#FF6B6B" stroke-width="3" stroke-dasharray="6 4">
          <animate attributeName="stroke-dashoffset" values="0;-30" dur="1.5s" repeatCount="indefinite"/>
        </path>
        <text x="20" y="${tpl.bodyTop}" font-size="14">🔥</text>
        <text x="190" y="${tpl.bodyTop}" font-size="14">🔥</text>
      </g>
    ` : '';

    // === 腰带物品 (z=5) ===
    // v18.62: 苹果 3D 立体球感 (radial gradient + 阴影 + 反光斑)
    const apple = (has.apple && !has.sword && !has.magic && !has.mic) ? `
      <g filter="url(#eqShadow)">
        <g transform="translate(${A.handR[0]+6}, ${A.handR[1]-16})">
          <animateTransform attributeName="transform" type="translate"
                           values="${A.handR[0]+6},${A.handR[1]-16}; ${A.handR[0]+6},${A.handR[1]-19}; ${A.handR[0]+6},${A.handR[1]-16}" dur="3s" repeatCount="indefinite"/>
          <!-- 苹果本体 (3D 球面渐变, 大尺寸) -->
          <circle cx="0" cy="0" r="11" fill="url(#appleSphere)" stroke="#8090A0" stroke-width="2"/>
          <!-- 咬过的缺口 (右上, 内露白色果肉) -->
          <path d="M 5 -8 Q 11 -5 8 1 Q 6 -2 4 -3 Q 4 -6 5 -8 Z" fill="#FFFAEC" stroke="#8090A0" stroke-width="1"/>
          <ellipse cx="6.5" cy="-4" rx="0.5" ry="0.3" fill="#5D3A1A"/>
          <!-- 叶子 (双层带描边) -->
          <path d="M 0 -11 L -2 -16 L 4 -17 L 1 -13 Z" fill="#5DAA66" stroke="#8090A0" stroke-width="1"/>
          <path d="M 0 -11 L -1 -14 L 2.5 -15 Z" fill="#7DDD80" opacity="0.7"/>
          <!-- 茎 -->
          <line x1="0" y1="-11" x2="0" y2="-8" stroke="#5D3A1A" stroke-width="1.5"/>
          <!-- 大反光斑 (3D 球面感) -->
          <ellipse cx="-4" cy="-3" rx="3" ry="2" fill="white" opacity="0.7"/>
          <!-- 小反光点 -->
          <circle cx="-2" cy="-1" r="0.8" fill="white" opacity="0.9"/>
        </g>
        ${gripR}
      </g>
    ` : has.apple ? `
      <!-- 已被武器占用右手, 退化为腰带挂饰 -->
      <g transform="translate(${A.waistL[0]+4}, ${A.waistL[1]+4})">
        <circle cx="0" cy="2" r="5" fill="#FF6B6B" stroke="#8090A0" stroke-width="1.5"/>
        <path d="M 0 -3 L -1 -6 L 1.5 -6.5 Z" fill="#6BCB77"/>
      </g>
    ` : '';

    // v18.62: 水杯 3D 立体感 (青色金属釉面 + 把手 + 热气)
    const cupHeld = (has.cup && !has.sword && !has.magic && !has.mic && !has.apple) ? `
      <g filter="url(#eqShadow)">
        <g transform="translate(${A.handR[0]+4}, ${A.handR[1]-12})">
          <!-- 杯底椭圆阴影 -->
          <ellipse cx="0" cy="7" rx="8" ry="2" fill="#2D3047" opacity="0.3"/>
          <!-- 杯体 (青色釉面渐变) -->
          <rect x="-7" y="-10" width="14" height="16" fill="url(#cupSphere)" stroke="#8090A0" stroke-width="2.5" rx="2"/>
          <!-- 釉面反光带 -->
          <rect x="-5" y="-9" width="3" height="13" fill="#FFF" opacity="0.5" rx="1"/>
          <!-- 杯口 (椭圆 3D) -->
          <ellipse cx="0" cy="-10" rx="7" ry="2.5" fill="#FFF" stroke="#8090A0" stroke-width="2"/>
          <ellipse cx="0" cy="-10" rx="6" ry="1.8" fill="#2A8077"/>
          <!-- 把手 (双线带阴影感) -->
          <path d="M 7 -6 Q 13 -2 7 3" fill="none" stroke="#8090A0" stroke-width="3" stroke-linecap="round"/>
          <path d="M 7 -5 Q 11 -2 7 2" fill="none" stroke="#4ECDC4" stroke-width="1.5" stroke-linecap="round"/>
          <!-- 热气 (3 道飘动) -->
          <path d="M -3 -12 Q -1 -18 -4 -22" fill="none" stroke="#BBB" stroke-width="2" opacity="0.7" stroke-linecap="round">
            <animate attributeName="opacity" values="0.3;0.9;0.3" dur="1.5s" repeatCount="indefinite"/>
          </path>
          <path d="M 0 -12 Q 2 -18 -1 -23" fill="none" stroke="#BBB" stroke-width="2" opacity="0.7" stroke-linecap="round">
            <animate attributeName="opacity" values="0.3;0.9;0.3" dur="1.5s" repeatCount="indefinite" begin="0.5s"/>
          </path>
          <path d="M 3 -12 Q 5 -18 2 -22" fill="none" stroke="#BBB" stroke-width="2" opacity="0.6" stroke-linecap="round">
            <animate attributeName="opacity" values="0.3;0.8;0.3" dur="1.7s" repeatCount="indefinite" begin="0.8s"/>
          </path>
        </g>
        ${gripR}
      </g>
    ` : '';
    const cup = has.cup ? (cupHeld || `
      <!-- 退化为腰带挂饰 -->
      <g transform="translate(${A.waistR[0]-2}, ${A.waistR[1]+2})">
        <rect x="-4" y="-6" width="8" height="11" fill="#4ECDC4" stroke="#8090A0" stroke-width="1.5" rx="1.5"/>
        <ellipse cx="0" cy="-6" rx="4" ry="1.2" fill="#fff" stroke="#8090A0" stroke-width="1"/>
      </g>
    `) : '';

    // v18.61: 饼干 嘴边咬一口 (脸侧)
    const cookie = has.cookie ? `
      <g transform="translate(${A.handL[0]+10}, ${A.handL[1]-30})">
        <animateTransform attributeName="transform" type="translate"
                         values="${A.handL[0]+10},${A.handL[1]-30}; ${A.handL[0]+12},${A.handL[1]-32}; ${A.handL[0]+10},${A.handL[1]-30}" dur="2.5s" repeatCount="indefinite"/>
        <circle cx="0" cy="0" r="6" fill="#D4A574" stroke="#8090A0" stroke-width="2"/>
        <!-- 咬痕 -->
        <path d="M -2 -5 Q 0 -3 -1 -1 Q -3 -3 -4 -5 Z" fill="#FFFAEC" stroke="#8090A0" stroke-width="1"/>
        <!-- 巧克力豆 -->
        <circle cx="2" cy="-1" r="1" fill="#5D3A1A"/>
        <circle cx="-2" cy="2" r="1" fill="#5D3A1A"/>
        <circle cx="3" cy="3" r="0.8" fill="#5D3A1A"/>
      </g>
    ` : '';

    // v18.85: 蛋糕放右脚边 (去掉双手托盘)
    const cake = has.cake ? `
      <g filter="url(#eqShadowBig)">
        <!-- 地面阴影 -->
        <ellipse cx="162" cy="${tpl.legBottom+2}" rx="22" ry="4" fill="#2D3047" opacity="0.15"/>
        <g transform="translate(162, ${tpl.legBottom-14})">
          <animateTransform attributeName="transform" type="translate"
                           values="0,0; 0,-4; 0,0" dur="2s" repeatCount="indefinite" additive="sum"/>
          <!-- 盘子 (银色 3D 椭圆) -->
          <ellipse cx="0" cy="16" rx="24" ry="5" fill="url(#metalSilver)" stroke="#8090A0" stroke-width="2"/>
          <ellipse cx="0" cy="14" rx="22" ry="3" fill="#FFF" opacity="0.8"/>
          <!-- 蛋糕底层 (黄色海绵, 立体感) -->
          <rect x="-18" y="3" width="36" height="13" fill="#FFE066" stroke="#8090A0" stroke-width="2" rx="2"/>
          <rect x="-17" y="3" width="34" height="3" fill="#FFFAEC" opacity="0.6" rx="1"/>
          <!-- 奶油波纹层 (3 朵奶油花) -->
          <ellipse cx="-12" cy="3" rx="5" ry="3" fill="#FFFAEC" stroke="#8090A0" stroke-width="1.5"/>
          <ellipse cx="0" cy="3" rx="5" ry="3" fill="#FFFAEC" stroke="#8090A0" stroke-width="1.5"/>
          <ellipse cx="12" cy="3" rx="5" ry="3" fill="#FFFAEC" stroke="#8090A0" stroke-width="1.5"/>
          <!-- 蛋糕中层 (粉色) -->
          <rect x="-13" y="-6" width="26" height="10" fill="#FFB6D9" stroke="#8090A0" stroke-width="2" rx="2"/>
          <rect x="-12" y="-6" width="24" height="3" fill="#FFD4E5" opacity="0.7" rx="1"/>
          <!-- 中层奶油花 (2 朵) -->
          <ellipse cx="-7" cy="-6" rx="4" ry="2.5" fill="#FFFAEC" stroke="#8090A0" stroke-width="1.5"/>
          <ellipse cx="7" cy="-6" rx="4" ry="2.5" fill="#FFFAEC" stroke="#8090A0" stroke-width="1.5"/>
          <!-- 蛋糕上层 (青色, 小) -->
          <rect x="-8" y="-13" width="16" height="7" fill="#A0F0E5" stroke="#8090A0" stroke-width="2" rx="2"/>
          <rect x="-7" y="-13" width="14" height="2" fill="#FFF" opacity="0.6" rx="1"/>
          <!-- 大樱桃 (3D 球) -->
          <circle cx="0" cy="-15" r="3.5" fill="url(#appleSphere)" stroke="#8090A0" stroke-width="1.5"/>
          <ellipse cx="-1" cy="-16" rx="1" ry="0.7" fill="#FFF" opacity="0.9"/>
          <line x1="0" y1="-18" x2="-1" y2="-22" stroke="#5D3A1A" stroke-width="1.2"/>
          <!-- 蜡烛 (蓝白条纹) -->
          <rect x="-1.5" y="-26" width="3" height="8" fill="#FFF" stroke="#8090A0" stroke-width="1"/>
          <line x1="-1.5" y1="-22" x2="1.5" y2="-22" stroke="#FF6B6B" stroke-width="0.8"/>
          <line x1="-1.5" y1="-25" x2="1.5" y2="-25" stroke="#FF6B6B" stroke-width="0.8"/>
          <!-- 蜡烛火苗 (3 层 + 跳动) -->
          <ellipse cx="0" cy="-30" rx="2.5" ry="4.5" fill="#FFA500">
            <animate attributeName="ry" values="3.5;5.5;3.5" dur="0.5s" repeatCount="indefinite"/>
            <animate attributeName="opacity" values="0.9;1;0.9" dur="0.5s" repeatCount="indefinite"/>
          </ellipse>
          <ellipse cx="0" cy="-30" rx="1.5" ry="3" fill="#FFE66D">
            <animate attributeName="ry" values="2;4;2" dur="0.5s" repeatCount="indefinite" begin="0.1s"/>
          </ellipse>
          <ellipse cx="0" cy="-30" rx="0.8" ry="1.8" fill="#FFF"/>
          <!-- 装饰糖珠 (六颗 3D 球) -->
          <circle cx="-15" cy="9" r="1.5" fill="#4ECDC4" stroke="#8090A0" stroke-width="0.5"/>
          <circle cx="15" cy="9" r="1.5" fill="#A788E0" stroke="#8090A0" stroke-width="0.5"/>
          <circle cx="-9" cy="-2" r="1.3" fill="#FF6B6B" stroke="#8090A0" stroke-width="0.5"/>
          <circle cx="9" cy="-2" r="1.3" fill="#6BCB77" stroke="#8090A0" stroke-width="0.5"/>
          <circle cx="-4" cy="-9" r="1.2" fill="#FFA500"/>
          <circle cx="4" cy="-9" r="1.2" fill="#A788E0"/>
        </g>
      </g>
    ` : '';

    // === 腿/腕 (z=6) ===
    const sock = has.sock ? `
      <g>
        <rect x="${91-9}" y="${tpl.legBottom-13}" width="18" height="10" rx="2" fill="#FFB6D9" stroke="#8090A0" stroke-width="2"/>
        <rect x="${129-9}" y="${tpl.legBottom-13}" width="18" height="10" rx="2" fill="#FFB6D9" stroke="#8090A0" stroke-width="2"/>
        <line x1="${91-7}" y1="${tpl.legBottom-9}" x2="${91+7}" y2="${tpl.legBottom-9}" stroke="#FF6B6B" stroke-width="1.5"/>
        <line x1="${129-7}" y1="${tpl.legBottom-9}" x2="${129+7}" y2="${tpl.legBottom-9}" stroke="#FF6B6B" stroke-width="1.5"/>
      </g>
    ` : '';

    const volcano = has.volcano ? `
      <g>
        <path d="M ${91-15} ${tpl.legBottom+4} Q ${91-15} ${tpl.legBottom-8} ${91} ${tpl.legBottom-8}
                 Q ${91+15} ${tpl.legBottom-8} ${91+15} ${tpl.legBottom+4} Z"
              fill="#C13030" stroke="#8090A0" stroke-width="2.5"/>
        <path d="M ${91-13} ${tpl.legBottom-2} Q ${91-10} ${tpl.legBottom-12} ${91-7} ${tpl.legBottom-4}
                 Q ${91-3} ${tpl.legBottom-14} ${91} ${tpl.legBottom-6}
                 Q ${91+3} ${tpl.legBottom-12} ${91+7} ${tpl.legBottom-3}
                 Q ${91+10} ${tpl.legBottom-11} ${91+13} ${tpl.legBottom-2}"
              fill="#FFE066" opacity="0.85"/>
        <path d="M ${129-15} ${tpl.legBottom+4} Q ${129-15} ${tpl.legBottom-8} ${129} ${tpl.legBottom-8}
                 Q ${129+15} ${tpl.legBottom-8} ${129+15} ${tpl.legBottom+4} Z"
              fill="#C13030" stroke="#8090A0" stroke-width="2.5"/>
        <path d="M ${129-13} ${tpl.legBottom-2} Q ${129-10} ${tpl.legBottom-12} ${129-7} ${tpl.legBottom-4}
                 Q ${129-3} ${tpl.legBottom-14} ${129} ${tpl.legBottom-6}
                 Q ${129+3} ${tpl.legBottom-12} ${129+7} ${tpl.legBottom-3}
                 Q ${129+10} ${tpl.legBottom-11} ${129+13} ${tpl.legBottom-2}"
              fill="#FFE066" opacity="0.85"/>
      </g>
    ` : '';

    // v18.62: 手表 3D (银色金属边框 + 圆形表盘 + 玻璃反光)
    const watch = has.watch ? `
      <g filter="url(#eqShadow)">
        <!-- 表带 (左) -->
        <rect x="${A.handR[0]-12}" y="${A.handR[1]-13}" width="5" height="13" rx="1.5" fill="#2D3047"/>
        <line x1="${A.handR[0]-12}" y1="${A.handR[1]-9}" x2="${A.handR[0]-7}" y2="${A.handR[1]-9}" stroke="#666" stroke-width="0.5"/>
        <line x1="${A.handR[0]-12}" y1="${A.handR[1]-5}" x2="${A.handR[0]-7}" y2="${A.handR[1]-5}" stroke="#666" stroke-width="0.5"/>
        <!-- 表带 (右) -->
        <rect x="${A.handR[0]+7}" y="${A.handR[1]-13}" width="5" height="13" rx="1.5" fill="#2D3047"/>
        <line x1="${A.handR[0]+7}" y1="${A.handR[1]-9}" x2="${A.handR[0]+12}" y2="${A.handR[1]-9}" stroke="#666" stroke-width="0.5"/>
        <line x1="${A.handR[0]+7}" y1="${A.handR[1]-5}" x2="${A.handR[0]+12}" y2="${A.handR[1]-5}" stroke="#666" stroke-width="0.5"/>
        <!-- 表壳外框 (银色金属) -->
        <circle cx="${A.handR[0]}" cy="${A.handR[1]-7}" r="9" fill="url(#metalSilver)" stroke="#8090A0" stroke-width="2"/>
        <!-- 表盘 -->
        <circle cx="${A.handR[0]}" cy="${A.handR[1]-7}" r="7" fill="#1A1A2E" stroke="#666" stroke-width="0.8"/>
        <!-- 12 / 3 / 6 / 9 刻度 -->
        <text x="${A.handR[0]}" y="${A.handR[1]-12}" text-anchor="middle" font-size="4" fill="#FFE66D" font-weight="900">12</text>
        <text x="${A.handR[0]+5}" y="${A.handR[1]-6}" text-anchor="middle" font-size="3.5" fill="#FFE66D">3</text>
        <text x="${A.handR[0]}" y="${A.handR[1]-2}" text-anchor="middle" font-size="3.5" fill="#FFE66D">6</text>
        <text x="${A.handR[0]-5}" y="${A.handR[1]-6}" text-anchor="middle" font-size="3.5" fill="#FFE66D">9</text>
        <!-- 时针 (短) -->
        <line x1="${A.handR[0]}" y1="${A.handR[1]-7}" x2="${A.handR[0]+2}" y2="${A.handR[1]-10}" stroke="#FFF" stroke-width="1.5" stroke-linecap="round"/>
        <!-- 分针 (长, 旋转动画) -->
        <line x1="${A.handR[0]}" y1="${A.handR[1]-7}" x2="${A.handR[0]}" y2="${A.handR[1]-12}" stroke="#FFA500" stroke-width="1.2" stroke-linecap="round">
          <animateTransform attributeName="transform" type="rotate" values="0 ${A.handR[0]} ${A.handR[1]-7};360 ${A.handR[0]} ${A.handR[1]-7}" dur="60s" repeatCount="indefinite"/>
        </line>
        <!-- 中心点 -->
        <circle cx="${A.handR[0]}" cy="${A.handR[1]-7}" r="0.8" fill="#FFF"/>
        <!-- 表镜反光 (3D 玻璃感, 弧形高光) -->
        <path d="M ${A.handR[0]-5} ${A.handR[1]-12} Q ${A.handR[0]-3} ${A.handR[1]-9} ${A.handR[0]+1} ${A.handR[1]-12}" stroke="#FFF" stroke-width="1.5" fill="none" opacity="0.5"/>
      </g>
    ` : '';

    // === 旁边伴侣 (z=11) ===
    const trophy = has.trophy ? `
      <g transform="translate(192, ${tpl.legBottom-10})">
        <ellipse cx="0" cy="14" rx="14" ry="3" fill="#2D3047" opacity="0.3"/>
        <rect x="-9" y="8" width="18" height="6" fill="#FFA500" stroke="#8090A0" stroke-width="2"/>
        <rect x="-2.5" y="-12" width="5" height="20" fill="#FFA500" stroke="#8090A0" stroke-width="2"/>
        <path d="M -12 -18 Q -12 -3 0 -3 Q 12 -3 12 -18 Z" fill="#FFE66D" stroke="#8090A0" stroke-width="2"/>
        <path d="M -12 -16 Q -16 -16 -16 -10 Q -16 -3 -12 -3" fill="none" stroke="#8090A0" stroke-width="1.5"/>
        <path d="M 12 -16 Q 16 -16 16 -10 Q 16 -3 12 -3" fill="none" stroke="#8090A0" stroke-width="1.5"/>
        <text x="-3" y="-9" font-size="11" font-weight="bold" fill="#2D3047">★</text>
      </g>
    ` : '';

    // v18.61: 独角兽 真骑乘 (在角色脚下大尺寸 + 角色坐在背上)
    const unicorn = has.unicorn ? `
      <g class="unicorn-ride">
        <!-- 整体上下颠簸 (奔跑感) -->
        <animateTransform attributeName="transform" type="translate"
                         values="0,0; 0,-3; 0,0" dur="0.6s" repeatCount="indefinite"/>
        <!-- 独角兽身体 (大型, 横跨角色脚下) -->
        <g transform="translate(110, ${tpl.legBottom + 5})">
          <!-- 影子 -->
          <ellipse cx="0" cy="36" rx="60" ry="6" fill="#2D3047" opacity="0.2"/>
          <!-- 后腿 (奔跑姿势) -->
          <rect x="32" y="14" width="6" height="22" fill="white" stroke="#8090A0" stroke-width="2" rx="2">
            <animateTransform attributeName="transform" type="rotate" values="-10 35 14;10 35 14;-10 35 14" dur="0.6s" repeatCount="indefinite"/>
          </rect>
          <rect x="20" y="16" width="6" height="20" fill="white" stroke="#8090A0" stroke-width="2" rx="2">
            <animateTransform attributeName="transform" type="rotate" values="10 23 16;-10 23 16;10 23 16" dur="0.6s" repeatCount="indefinite"/>
          </rect>
          <!-- 前腿 (奔跑姿势) -->
          <rect x="-26" y="14" width="6" height="22" fill="white" stroke="#8090A0" stroke-width="2" rx="2">
            <animateTransform attributeName="transform" type="rotate" values="10 -23 14;-10 -23 14;10 -23 14" dur="0.6s" repeatCount="indefinite"/>
          </rect>
          <rect x="-38" y="16" width="6" height="20" fill="white" stroke="#8090A0" stroke-width="2" rx="2">
            <animateTransform attributeName="transform" type="rotate" values="-10 -35 16;10 -35 16;-10 -35 16" dur="0.6s" repeatCount="indefinite"/>
          </rect>
          <!-- 身体主干 -->
          <ellipse cx="0" cy="14" rx="48" ry="18" fill="white" stroke="#8090A0" stroke-width="2.5"/>
          <!-- 鬃毛 (彩虹色, 动画飘动) -->
          <path d="M -30 0 Q -32 -8 -28 -14 Q -22 -10 -20 -2" fill="#FFB6D9" stroke="#8090A0" stroke-width="1.5">
            <animateTransform attributeName="transform" type="rotate" values="-3 -25 -2;3 -25 -2;-3 -25 -2" dur="1.2s" repeatCount="indefinite"/>
          </path>
          <path d="M -38 -2 Q -42 -10 -36 -16 Q -30 -12 -28 -4" fill="#A788E0" stroke="#8090A0" stroke-width="1.5"/>
          <!-- 头部 (左侧) -->
          <ellipse cx="-46" cy="0" rx="11" ry="13" fill="white" stroke="#8090A0" stroke-width="2"/>
          <!-- 独角 (彩虹螺纹) -->
          <polygon points="-50,-12 -42,-12 -46,-30" fill="#FFE66D" stroke="#8090A0" stroke-width="2"/>
          <line x1="-49" y1="-16" x2="-43" y2="-16" stroke="#FF6B6B" stroke-width="1.2"/>
          <line x1="-48" y1="-21" x2="-44" y2="-21" stroke="#A788E0" stroke-width="1.2"/>
          <!-- 耳朵 -->
          <ellipse cx="-49" cy="-8" rx="2.5" ry="4" fill="white" stroke="#8090A0" stroke-width="1.5"/>
          <ellipse cx="-43" cy="-8" rx="2.5" ry="4" fill="white" stroke="#8090A0" stroke-width="1.5"/>
          <!-- 眼睛 -->
          <ellipse cx="-46" cy="-1" rx="1.5" ry="2" fill="#2D3047"/>
          <circle cx="-46" cy="-2" r="0.8" fill="white"/>
          <!-- 嘴 -->
          <path d="M -50 4 Q -46 7 -42 4" stroke="#FF6B6B" stroke-width="1.5" fill="none" stroke-linecap="round"/>
          <!-- 尾巴 (彩虹色, 飘动) -->
          <path d="M 48 6 Q 60 0 62 -10" stroke="#FFB6D9" stroke-width="4" fill="none" stroke-linecap="round">
            <animateTransform attributeName="transform" type="rotate" values="-5 50 6;5 50 6;-5 50 6" dur="0.8s" repeatCount="indefinite"/>
          </path>
          <path d="M 50 8 Q 64 4 66 -8" stroke="#A788E0" stroke-width="3" fill="none" stroke-linecap="round"/>
          <!-- 鞍 (角色坐在上面) -->
          <ellipse cx="0" cy="-2" rx="22" ry="6" fill="#A788E0" stroke="#8090A0" stroke-width="2"/>
          <!-- 缰绳 -->
          <path d="M -35 -4 Q -25 -8 -10 -6" stroke="#FF6B6B" stroke-width="1.5" fill="none"/>
        </g>
        <!-- 速度线 (后方残影) -->
        <line x1="180" y1="${tpl.legBottom + 10}" x2="210" y2="${tpl.legBottom + 8}" stroke="#FFE66D" stroke-width="2" opacity="0.6" stroke-linecap="round">
          <animate attributeName="opacity" values="0.2;0.8;0.2" dur="0.5s" repeatCount="indefinite"/>
        </line>
        <line x1="180" y1="${tpl.legBottom + 18}" x2="215" y2="${tpl.legBottom + 16}" stroke="#FFB6D9" stroke-width="2" opacity="0.6" stroke-linecap="round">
          <animate attributeName="opacity" values="0.2;0.8;0.2" dur="0.5s" repeatCount="indefinite" begin="0.2s"/>
        </line>
        <!-- 闪粉星星 -->
        <text x="60" y="${tpl.legBottom - 5}" font-size="10" fill="#FFD700">✨
          <animate attributeName="opacity" values="0;1;0" dur="1.5s" repeatCount="indefinite"/>
        </text>
        <text x="170" y="${tpl.legBottom + 20}" font-size="8" fill="#FFB6D9">✨
          <animate attributeName="opacity" values="0;1;0" dur="1.8s" repeatCount="indefinite" begin="0.5s"/>
        </text>
      </g>
    ` : '';

    // ====== 返回 SVG (按 z 层级顺序) ======
    // v18.62: 加全局 defs (drop-shadow + 通用渐变) + 修 z-order + 扩 viewBox 容纳 3D 装备
    return `
      <svg viewBox="-20 -10 270 270" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <!-- 通用 3D 阴影 filter (装备立体感) -->
          <filter id="eqShadow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur in="SourceAlpha" stdDeviation="2.5"/>
            <feOffset dx="2" dy="3" result="offsetblur"/>
            <feComponentTransfer><feFuncA type="linear" slope="0.55"/></feComponentTransfer>
            <feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
          <!-- 强阴影 (大装备/骑乘类) -->
          <filter id="eqShadowBig" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur in="SourceAlpha" stdDeviation="4"/>
            <feOffset dx="3" dy="5" result="offsetblur"/>
            <feComponentTransfer><feFuncA type="linear" slope="0.65"/></feComponentTransfer>
            <feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
          <!-- 金属高光 -->
          <linearGradient id="metalRed" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="#FFAAAA"/>
            <stop offset="40%" stop-color="#FF6B6B"/>
            <stop offset="100%" stop-color="#A03030"/>
          </linearGradient>
          <linearGradient id="metalSilver" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="#FFF"/>
            <stop offset="50%" stop-color="#C0C0C0"/>
            <stop offset="100%" stop-color="#666"/>
          </linearGradient>
          <linearGradient id="metalGold" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="#FFF8C4"/>
            <stop offset="50%" stop-color="#FFD700"/>
            <stop offset="100%" stop-color="#B8860B"/>
          </linearGradient>
          <radialGradient id="appleSphere" cx="35%" cy="30%">
            <stop offset="0%" stop-color="#FFCCCC"/>
            <stop offset="60%" stop-color="#FF6B6B"/>
            <stop offset="100%" stop-color="#A03030"/>
          </radialGradient>
          <radialGradient id="cupSphere" cx="30%" cy="30%">
            <stop offset="0%" stop-color="#A0F0E5"/>
            <stop offset="60%" stop-color="#4ECDC4"/>
            <stop offset="100%" stop-color="#2A8077"/>
          </radialGradient>
          <radialGradient id="crystalSphere" cx="35%" cy="30%">
            <stop offset="0%" stop-color="#F0D0FF"/>
            <stop offset="50%" stop-color="#A788E0"/>
            <stop offset="100%" stop-color="#5C3A9E"/>
          </radialGradient>
          <linearGradient id="rocketRed" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#FF8888"/>
            <stop offset="50%" stop-color="#FF4444"/>
            <stop offset="100%" stop-color="#A02020"/>
          </linearGradient>
          <linearGradient id="rocketBody" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stop-color="#FFF"/>
            <stop offset="50%" stop-color="#E8E8E8"/>
            <stop offset="100%" stop-color="#888"/>
          </linearGradient>
          <!-- v18.73 shuttle gradients -->
          <linearGradient id="bpGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stop-color="#6D28D9"/>
            <stop offset="35%" stop-color="#4F46E5"/>
            <stop offset="65%" stop-color="#3B82F6"/>
            <stop offset="100%" stop-color="#2563EB"/>
          </linearGradient>
          <linearGradient id="noseGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stop-color="#7C3AED"/>
            <stop offset="40%" stop-color="#4F46E5"/>
            <stop offset="70%" stop-color="#3B82F6"/>
            <stop offset="100%" stop-color="#1D4ED8"/>
          </linearGradient>
          <linearGradient id="fuselageGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stop-color="#C7D2FE"/>
            <stop offset="30%" stop-color="#F8FAFF"/>
            <stop offset="70%" stop-color="#EEF2FF"/>
            <stop offset="100%" stop-color="#A5B4FC"/>
          </linearGradient>
          <linearGradient id="flameGold" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="#FFFBEB"/>
            <stop offset="30%" stop-color="#FDE68A"/>
            <stop offset="70%" stop-color="#F59E0B"/>
            <stop offset="100%" stop-color="#D97706"/>
          </linearGradient>
        </defs>
        ${fireBackground}
        ${cometTrail}
        ${nebulaDust}
        ${diamond}
        ${dragonBody}
        ${cape}
        ${galaxyCape}
        ${body}
        ${bag}
        ${monthking}
        ${medalGold}
        ${badge_p6}
        ${badge_2}
        ${badge_3}
        ${star}
        ${lightning}
        ${wk30}
        ${wk36}
        ${wk50}
        ${scholarSash}
        ${apple}
        ${cup}
        ${cookie}
        ${cake}
        ${sock}
        ${volcano}
        ${watch}
        ${sword}
        ${magic}
        ${mic}
        ${tube}
        ${shield}
        ${note}
        ${cert}
        ${crystal}
        ${phone}
        ${glasses}
        ${pearl}
        ${auroraCape}
        ${heroMask}
        ${headphone}
        ${ear}
        ${labGoggles}
        ${explorerCap}
        ${hat}
        ${crown}
        ${sun}
        ${phoenix}
        ${masterCrown}
        ${streak100}
        ${streak7}
        ${planet}
        ${streak30}
        ${rainbow}
        ${trophy}
        ${rocket}
        ${unicorn}
        ${orbitRing}
        ${evoGlow('sword', A.handR[0], A.handR[1] - 30, 20)}
        ${evoGlow('magic', A.handR[0], A.handR[1] - 30, 18)}
        ${evoGlow('galaxy', 110, A.shoulderL[1] + 30, 40)}
        ${evoGlow('aurora', 110, A.shoulderL[1] + 30, 45)}
        ${evoGlow('diamond', A.chest[0], A.chest[1], 16)}
        ${evoGlow('crystal', A.handL[0], A.handL[1], 14)}
        ${evoGlow('rocket', 185, 130, 30)}
        ${evoGlow('pearl', A.chest[0], tpl.neckBottom, 14)}
        ${evoGlow('unicorn', 170, tpl.legBottom - 20, 25)}
      </svg>
    `;
  }
};

window.CHAMUI = CHAMUI;
