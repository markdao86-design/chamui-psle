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
    { id: 'galaxy',   icon: '🌌', name: '银河披风',   condition: 'points',    value: 1400, hint: '累积 1400 分(神级)' },
    { id: 'magic',    icon: '🪄', name: '魔法棒',     condition: 'points',    value: 1650, hint: '累积 1650 分' },
    { id: 'lightning',icon: '⚡', name: '闪电袖标',   condition: 'points',    value: 1900, hint: '累积 1900 分' },
    { id: 'star',     icon: '⭐', name: '星辰勋章',   condition: 'points',    value: 2200, hint: '累积 2200 分(P6 学者)' },
    { id: 'planet',   icon: '🪐', name: '土星之环',   condition: 'points',    value: 2500, hint: '累积 2500 分' },
    { id: 'sun',      icon: '☀️', name: '太阳皇冠',   condition: 'points',    value: 2850, hint: '累积 2850 分' },
    { id: 'phoenix',  icon: '🦅', name: '凤凰羽',     condition: 'points',    value: 3200, hint: '累积 3200 分(浴火重生)' },
    { id: 'rainbow',  icon: '🌈', name: '彩虹光环',   condition: 'points',    value: 3550, hint: '累积 3550 分' },
    { id: 'volcano',  icon: '🌋', name: '火山战靴',   condition: 'points',    value: 3950, hint: '累积 3950 分(刷题狂魔)' },
    { id: 'comet',    icon: '☄️', name: '彗星轨迹',   condition: 'points',    value: 4350, hint: '累积 4350 分' },
    { id: 'unicorn',  icon: '🦄', name: '独角兽伙伴', condition: 'points',    value: 4750, hint: '累积 4750 分(神兽级)' },
    { id: 'medal',    icon: '🥇', name: '金牌得主',   condition: 'points',    value: 5300, hint: '累积 5300 分(冲刺王)' },
    { id: 'dragon',   icon: '🐉', name: '神龙伙伴',   condition: 'points',    value: 6000, hint: '累积 6000 分 = SGD 1500 终极大奖等价🐲' },
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
    { id: 'streak100',icon: '👑', name: '百日王',    condition: 'streak-days', value: 100, hint: '连续打卡 100 天解锁(永久金光特效)' }
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
    const has = {};
    this.equipment.forEach(eq => {
      has[eq.id] = this.checkEquipmentUnlocked(eq.id, state) && !disabled.has(eq.id);
    });

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
      <path d="M 80 68 L 95 74 M 125 74 L 140 68" stroke="#2D3047" stroke-width="2.5" fill="none" stroke-linecap="round"/>
    ` : `
      <ellipse cx="90" cy="78" rx="7" ry="10" fill="#2D3047"/>
      <ellipse cx="130" cy="78" rx="7" ry="10" fill="#2D3047"/>
      <ellipse cx="92" cy="74" rx="2.5" ry="3.5" fill="white"/>
      <ellipse cx="132" cy="74" rx="2.5" ry="3.5" fill="white"/>
    `;

    const mouth = sad ? `
      <path d="M 95 108 Q 110 100 125 108" stroke="#2D3047" stroke-width="3" fill="none" stroke-linecap="round"/>
    ` : `
      <path d="M 88 98 Q 110 122 132 98 Q 132 104 110 110 Q 88 104 88 98 Z" fill="#2D3047" stroke="#2D3047" stroke-width="2.5" stroke-linejoin="round"/>
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
            fill="${pantsColor}" stroke="#2D3047" stroke-width="2.5"/>
      <rect x="${129 - 8}" y="${tpl.legTop}" width="16" height="${tpl.legBottom - tpl.legTop - 2}" rx="4"
            fill="${pantsColor}" stroke="#2D3047" stroke-width="2.5"/>
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
            fill="${shirtColor}" stroke="#2D3047" stroke-width="3"/>
      <!-- 领口 V (自然过渡到脖子) -->
      <path d="M ${110 - 12} ${tpl.bodyTop + 2} Q 110 ${tpl.bodyTop + 14} ${110 + 12} ${tpl.bodyTop + 2}"
            stroke="#2D3047" stroke-width="2.5" fill="${skinColor}"/>

      <!-- 胳膊 (从肩膀向下到手, 弧形) -->
      <path d="M ${110 - bodyHalfTop + 2} ${tpl.shoulderY + 2}
               Q ${A.handL[0] - 6} ${(tpl.shoulderY + A.handL[1]) / 2} ${A.handL[0] + 6} ${A.handL[1] - 4}
               L ${A.handL[0] + 14} ${A.handL[1] - 6}
               Q ${110 - bodyHalfTop + 12} ${tpl.shoulderY + 8} ${110 - bodyHalfTop + 4} ${tpl.shoulderY + 4} Z"
            fill="${shirtColor}" stroke="#2D3047" stroke-width="2.5"/>
      <path d="M ${110 + bodyHalfTop - 2} ${tpl.shoulderY + 2}
               Q ${A.handR[0] + 6} ${(tpl.shoulderY + A.handR[1]) / 2} ${A.handR[0] - 6} ${A.handR[1] - 4}
               L ${A.handR[0] - 14} ${A.handR[1] - 6}
               Q ${110 + bodyHalfTop - 12} ${tpl.shoulderY + 8} ${110 + bodyHalfTop - 4} ${tpl.shoulderY + 4} Z"
            fill="${shirtColor}" stroke="#2D3047" stroke-width="2.5"/>
      <!-- 手 -->
      <circle cx="${A.handL[0]}" cy="${A.handL[1]}" r="8" fill="${skinColor}" stroke="#2D3047" stroke-width="2.5"/>
      <circle cx="${A.handR[0]}" cy="${A.handR[1]}" r="8" fill="${skinColor}" stroke="#2D3047" stroke-width="2.5"/>

      <!-- 脖子 -->
      <rect x="${110 - 7}" y="${tpl.neckTop}" width="14" height="${tpl.neckBottom - tpl.neckTop}"
            fill="${skinColor}" stroke="#2D3047" stroke-width="2.5"/>

      <!-- 头 -->
      <ellipse cx="110" cy="${tpl.headCY}" rx="${tpl.headR}" ry="${tpl.headRy}"
               fill="${skinColor}" stroke="#2D3047" stroke-width="3"/>

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

    const dragonBody = has.dragon ? `
      <g opacity="0.85">
        <path d="M 5 ${tpl.bodyBottom + 5} Q 30 ${tpl.bodyTop + 20} 5 ${tpl.bodyTop - 10}
                 Q 50 ${tpl.headCY - 10} 90 ${tpl.headCY - 30}
                 Q 130 ${tpl.headCY - 30} 165 ${tpl.headCY - 10}
                 Q 215 ${tpl.bodyTop - 10} 215 ${tpl.bodyBottom + 5}
                 Q 195 ${tpl.bodyBottom - 5} 165 ${tpl.bodyBottom + 5}
                 L 55 ${tpl.bodyBottom + 5}
                 Q 25 ${tpl.bodyBottom - 5} 5 ${tpl.bodyBottom + 5} Z"
              fill="none" stroke="#FFD700" stroke-width="3" stroke-dasharray="4 3">
          <animate attributeName="stroke-dashoffset" values="0;-20" dur="2s" repeatCount="indefinite"/>
        </path>
        <text x="180" y="${tpl.headCY - 20}" font-size="22">🐉</text>
        <text x="20" y="${tpl.bodyBottom - 5}" font-size="22" transform="scale(-1,1) translate(-40,0)">🐉</text>
      </g>
    ` : '';

    const rocket = has.rocket ? `
      <g>
        <g transform="translate(28, ${tpl.headCY - 30})">
          <animateTransform attributeName="transform" type="translate"
                           values="28,${tpl.headCY - 30};34,${tpl.headCY - 36};28,${tpl.headCY - 30}" dur="2s" repeatCount="indefinite"/>
          <ellipse cx="0" cy="0" rx="5" ry="13" fill="#FF6B6B" stroke="#2D3047" stroke-width="2"/>
          <polygon points="-5,-7 5,-7 0,-17" fill="#FFE66D" stroke="#2D3047" stroke-width="2"/>
          <circle cx="0" cy="-2" r="2.8" fill="#4ECDC4" stroke="#2D3047" stroke-width="1.4"/>
          <polygon points="-5,7 -8,15 -2,11" fill="#FF6B6B" stroke="#2D3047" stroke-width="1.5"/>
          <polygon points="5,7 8,15 2,11" fill="#FF6B6B" stroke="#2D3047" stroke-width="1.5"/>
          <ellipse cx="0" cy="17" rx="3.5" ry="7" fill="#FFE66D">
            <animate attributeName="ry" values="7;4;7" dur="0.4s" repeatCount="indefinite"/>
          </ellipse>
        </g>
      </g>
    ` : '';

    // === 后披风/挂件 (z=2) ===
    const cape = (has.cape && !has.galaxy) ? `
      <!-- 披风从两肩后伸出, 飘到腿后 -->
      <path d="M ${A.shoulderL[0]+4} ${A.shoulderL[1]+2}
               Q ${A.shoulderL[0]-15} ${tpl.bodyBottom-30} ${A.shoulderL[0]-25} ${tpl.legBottom+5}
               L ${A.shoulderR[0]+25} ${tpl.legBottom+5}
               Q ${A.shoulderR[0]+15} ${tpl.bodyBottom-30} ${A.shoulderR[0]-4} ${A.shoulderR[1]+2} Z"
            fill="#A788E0" stroke="#2D3047" stroke-width="2.5" opacity="0.92">
        <animateTransform attributeName="transform" type="rotate" values="-1.2 110 ${A.shoulderL[1]};1.2 110 ${A.shoulderL[1]};-1.2 110 ${A.shoulderL[1]}" dur="3.5s" repeatCount="indefinite"/>
      </path>
      <!-- 披风褶皱阴影 -->
      <path d="M 110 ${A.shoulderL[1]+10} L 110 ${tpl.legBottom}" stroke="#7A56C4" stroke-width="2" fill="none" opacity="0.6"/>
      <path d="M ${A.shoulderL[0]-10} ${tpl.bodyBottom-20} L ${A.shoulderL[0]-22} ${tpl.legBottom-2}" stroke="#7A56C4" stroke-width="1.5" fill="none" opacity="0.5"/>
      <path d="M ${A.shoulderR[0]+10} ${tpl.bodyBottom-20} L ${A.shoulderR[0]+22} ${tpl.legBottom-2}" stroke="#7A56C4" stroke-width="1.5" fill="none" opacity="0.5"/>
      <!-- 披风扣 (在锁骨位置) -->
      <circle cx="110" cy="${A.shoulderL[1]+4}" r="3" fill="#FFE66D" stroke="#2D3047" stroke-width="1.5"/>
    ` : '';

    const galaxyCape = has.galaxy ? `
      <path d="M ${A.shoulderL[0]+4} ${A.shoulderL[1]+2}
               Q ${A.shoulderL[0]-22} ${tpl.bodyBottom-30} ${A.shoulderL[0]-32} ${tpl.legBottom+8}
               L ${A.shoulderR[0]+32} ${tpl.legBottom+8}
               Q ${A.shoulderR[0]+22} ${tpl.bodyBottom-30} ${A.shoulderR[0]-4} ${A.shoulderR[1]+2} Z"
            fill="url(#galaxyGrad)" stroke="#2D3047" stroke-width="2.5" opacity="0.95">
        <animateTransform attributeName="transform" type="rotate" values="-2 110 ${A.shoulderL[1]};2 110 ${A.shoulderL[1]};-2 110 ${A.shoulderL[1]}" dur="3.5s" repeatCount="indefinite"/>
      </path>
      <text x="${A.shoulderL[0]-15}" y="${tpl.bodyBottom-15}" font-size="9" fill="#FFE66D">✦</text>
      <text x="${A.shoulderR[0]+10}" y="${tpl.bodyBottom-25}" font-size="11" fill="white">★</text>
      <text x="100" y="${tpl.legTop+5}" font-size="9" fill="#FFE66D">✧</text>
      <circle cx="110" cy="${A.shoulderL[1]+4}" r="3" fill="#FFE66D" stroke="#2D3047" stroke-width="1.5"/>
      <defs>
        <linearGradient id="galaxyGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#A788E0"/><stop offset="50%" stop-color="#4338a0"/><stop offset="100%" stop-color="#1a0d40"/>
        </linearGradient>
      </defs>
    ` : '';

    const bag = has.bag ? `
      <!-- 书包带子从两肩到腰 (在身体后侧) -->
      <path d="M ${A.shoulderL[0]+6} ${A.shoulderL[1]+1} L ${A.waistL[0]-4} ${A.waistL[1]-4}"
            stroke="#8B4513" stroke-width="5" fill="none" stroke-linecap="round"/>
      <path d="M ${A.shoulderR[0]-6} ${A.shoulderR[1]+1} L ${A.waistR[0]+4} ${A.waistR[1]-4}"
            stroke="#8B4513" stroke-width="5" fill="none" stroke-linecap="round"/>
      <!-- 书包本体 (从背后两侧露出) -->
      <ellipse cx="65" cy="${tpl.bodyTop+45}" rx="8" ry="22" fill="#FF9F45" stroke="#2D3047" stroke-width="2.5"/>
      <ellipse cx="155" cy="${tpl.bodyTop+45}" rx="8" ry="22" fill="#FF9F45" stroke="#2D3047" stroke-width="2.5"/>
    ` : '';

    // === 身体 (z=4) — 已包含在 body 变量 ===

    // === 胸前装饰 (z=5) ===
    const monthking = has.monthking ? `
      <!-- 月度王徽章: 挂带 + 圆牌 -->
      <path d="M ${A.shoulderL[0]+8} ${A.shoulderL[1]+5} L ${A.chest[0]} ${A.chest[1]+2}
               L ${A.shoulderR[0]-8} ${A.shoulderR[1]+5}" stroke="#C13030" stroke-width="3" fill="none"/>
      <circle cx="${A.chest[0]}" cy="${A.chest[1]+10}" r="11" fill="#FFE66D" stroke="#2D3047" stroke-width="2.5"/>
      <circle cx="${A.chest[0]}" cy="${A.chest[1]+10}" r="6.5" fill="#FF6B6B" stroke="#2D3047" stroke-width="1.5"/>
      <text x="${A.chest[0]-3.5}" y="${A.chest[1]+13.5}" font-size="9" font-weight="bold" fill="white">王</text>
    ` : '';

    const medalGold = has.medal ? `
      <!-- 金牌挂脖子, 黄红丝带 V 型 -->
      <path d="M ${110-8} ${tpl.neckBottom-2} L ${A.chest[0]-2} ${A.chest[1]-2}
               L ${A.chest[0]+2} ${A.chest[1]-2} L ${110+8} ${tpl.neckBottom-2}"
            stroke="#FFE66D" stroke-width="4" fill="none"/>
      <circle cx="${A.chest[0]}" cy="${A.chest[1]+8}" r="13" fill="#FFD700" stroke="#2D3047" stroke-width="2.5"/>
      <circle cx="${A.chest[0]}" cy="${A.chest[1]+8}" r="9" fill="#FFA500" stroke="#FFE66D" stroke-width="1"/>
      <text x="${A.chest[0]-5}" y="${A.chest[1]+12}" font-size="11" font-weight="900" fill="#8B6F00">1</text>
    ` : '';

    const lightning = has.lightning ? `
      <!-- 右臂袖标: 黄底闪电符号 -->
      <rect x="${A.shoulderR[0]-3}" y="${A.shoulderR[1]+10}" width="20" height="14"
            fill="#FFE66D" stroke="#2D3047" stroke-width="2" rx="3"
            transform="rotate(15 ${A.shoulderR[0]+7} ${A.shoulderR[1]+17})"/>
      <text x="${A.shoulderR[0]+1}" y="${A.shoulderR[1]+22}" font-size="12" fill="#2D3047" font-weight="900"
            transform="rotate(15 ${A.shoulderR[0]+7} ${A.shoulderR[1]+17})">⚡</text>
    ` : '';

    const star = has.star ? `
      <g transform="translate(${A.chest[0] + 18} ${A.chest[1] - 5})">
        <polygon points="0,-9 2.6,-3 9,-3 4,1.5 6,8 0,4.5 -6,8 -4,1.5 -9,-3 -2.6,-3"
                 fill="#FFE66D" stroke="#2D3047" stroke-width="1.5"/>
        <polygon points="0,-5 1.4,-1.5 5,-1.5 2.2,1 3.3,4.5 0,2.5 -3.3,4.5 -2.2,1 -5,-1.5 -1.4,-1.5"
                 fill="#FFA500"/>
      </g>
    ` : '';

    const badge_p6 = has.badge_p6 ? `
      <g transform="translate(${A.chest[0] - 22} ${A.chest[1] + 4})">
        <polygon points="-6,-4 6,-4 4,4 -4,4" fill="#C13030" stroke="#2D3047" stroke-width="1.5"/>
        <polygon points="-4,4 -6,12 0,8 6,12 4,4" fill="#0D7C3E" stroke="#2D3047" stroke-width="1.5"/>
        <circle cx="0" cy="0" r="5" fill="#FFE66D" stroke="#2D3047" stroke-width="1.5"/>
        <text x="-3" y="2.5" font-size="6" font-weight="900" fill="#2D3047">P6</text>
      </g>
    ` : '';

    const badge_2 = has.badge_2 ? `
      <g transform="translate(${A.chest[0] + 22} ${A.chest[1] + 4})">
        <circle cx="0" cy="0" r="6" fill="#FF6B9D" stroke="#2D3047" stroke-width="1.5"/>
        <circle cx="-3" cy="-3" r="2.5" fill="#FFB6D9"/>
        <circle cx="3" cy="-3" r="2.5" fill="#FFB6D9"/>
        <circle cx="-3" cy="3" r="2.5" fill="#FFB6D9"/>
        <circle cx="3" cy="3" r="2.5" fill="#FFB6D9"/>
        <circle cx="0" cy="0" r="2" fill="#FFE066"/>
      </g>
    ` : '';

    const badge_3 = has.badge_3 ? `
      <g transform="translate(${A.chest[0]} ${A.chest[1] + 22})">
        <path d="M -5 -8 L 5 -8 L 8 0 L 0 8 L -8 0 Z" fill="#7B2CBF" stroke="#2D3047" stroke-width="1.5"/>
        <polygon points="-5,8 -8,15 -3,12" fill="#7B2CBF" stroke="#2D3047" stroke-width="1"/>
        <polygon points="5,8 8,15 3,12" fill="#7B2CBF" stroke="#2D3047" stroke-width="1"/>
        <text x="-3" y="3" font-size="7" font-weight="900" fill="white">★</text>
      </g>
    ` : '';

    const scholarSash = (skin.accessory === 'scholarSash') ? `
      <!-- 学者绶带从右肩斜挎到左腰 -->
      <path d="M ${A.shoulderR[0]-4} ${A.shoulderR[1]+4}
               L ${A.waistL[0]+6} ${A.waistL[1]-2}
               L ${A.waistL[0]+12} ${A.waistL[1]+4}
               L ${A.shoulderR[0]+2} ${A.shoulderR[1]+10} Z"
            fill="#FFD700" stroke="#2D3047" stroke-width="2" opacity="0.92"/>
      <text x="${(A.shoulderR[0]+A.waistL[0])/2-4}" y="${(A.shoulderR[1]+A.waistL[1])/2+4}" font-size="10"
            fill="#2D3047" font-weight="900">学</text>
    ` : '';

    // === 手中物品 (z=6) ===
    // 工具类用 _withGrip — 在握柄前画 2 根弯曲手指
    const gripL = `<path d="M ${A.handL[0]-6} ${A.handL[1]-4} Q ${A.handL[0]} ${A.handL[1]-7} ${A.handL[0]+6} ${A.handL[1]-4}
                              Q ${A.handL[0]+8} ${A.handL[1]+1} ${A.handL[0]+6} ${A.handL[1]+5}
                              Q ${A.handL[0]} ${A.handL[1]+8} ${A.handL[0]-6} ${A.handL[1]+5} Z"
                      fill="${skinColor}" stroke="#2D3047" stroke-width="1.5"/>`;
    const gripR = `<path d="M ${A.handR[0]-6} ${A.handR[1]-4} Q ${A.handR[0]} ${A.handR[1]-7} ${A.handR[0]+6} ${A.handR[1]-4}
                              Q ${A.handR[0]+8} ${A.handR[1]+1} ${A.handR[0]+6} ${A.handR[1]+5}
                              Q ${A.handR[0]} ${A.handR[1]+8} ${A.handR[0]-6} ${A.handR[1]+5} Z"
                      fill="${skinColor}" stroke="#2D3047" stroke-width="1.5"/>`;

    const sword = has.sword ? `
      <g>
        <g transform="translate(${A.handR[0]}, ${A.handR[1]}) rotate(20)">
          <rect x="-3" y="-50" width="6" height="50" rx="1" fill="#FFE66D" stroke="#2D3047" stroke-width="2"/>
          <polygon points="-4,-50 4,-50 0,-62" fill="#2D3047"/>
          <polygon points="-2,-50 2,-50 0,-58" fill="#FFB6D9"/>
          <rect x="-3" y="-2" width="6" height="6" fill="#FF6B6B" stroke="#2D3047" stroke-width="1.5"/>
        </g>
        ${gripR}
      </g>
    ` : '';

    const magic = (has.magic && !has.sword) ? `
      <g>
        <g transform="translate(${A.handR[0]}, ${A.handR[1]}) rotate(-15)">
          <rect x="-2.5" y="-45" width="5" height="48" rx="1" fill="#2D3047"/>
          <ellipse cx="0" cy="-50" rx="6" ry="6" fill="#FFE66D" stroke="#FFA500" stroke-width="1.5"/>
          <polygon points="0,-58 2,-50 0,-42 -2,-50" fill="white" opacity="0.85"/>
          <polygon points="-7,-50 -1,-49 0,-43 1,-49 7,-50 1,-51 0,-57 -1,-51" fill="#FFD700" opacity="0.6">
            <animateTransform attributeName="transform" type="rotate" values="0 0 -50;360 0 -50" dur="3s" repeatCount="indefinite"/>
          </polygon>
        </g>
        ${gripR}
      </g>
    ` : '';

    const mic = (has.mic && !has.sword && !has.magic) ? `
      <g>
        <g transform="translate(${A.handR[0]}, ${A.handR[1]}) rotate(-10)">
          <rect x="-3" y="-30" width="6" height="30" rx="2" fill="#2D3047"/>
          <ellipse cx="0" cy="-35" rx="9" ry="11" fill="#FFD700" stroke="#2D3047" stroke-width="2"/>
          <line x1="-7" y1="-39" x2="7" y2="-39" stroke="#2D3047" stroke-width="0.7"/>
          <line x1="-7" y1="-35" x2="7" y2="-35" stroke="#2D3047" stroke-width="0.7"/>
          <line x1="-7" y1="-31" x2="7" y2="-31" stroke="#2D3047" stroke-width="0.7"/>
          <line x1="-5" y1="-44" x2="-5" y2="-26" stroke="#2D3047" stroke-width="0.7"/>
          <line x1="0" y1="-46" x2="0" y2="-24" stroke="#2D3047" stroke-width="0.7"/>
          <line x1="5" y1="-44" x2="5" y2="-26" stroke="#2D3047" stroke-width="0.7"/>
        </g>
        ${gripR}
      </g>
    ` : '';

    const tube = (has.tube && !has.shield && !has.note && !has.cert) ? `
      <g>
        <g transform="translate(${A.handL[0]}, ${A.handL[1]}) rotate(-12)">
          <rect x="-5" y="-28" width="10" height="28" rx="2" fill="#4ECDC4" stroke="#2D3047" stroke-width="2" opacity="0.85"/>
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
                fill="#4ECDC4" stroke="#2D3047" stroke-width="2.5"/>
          <path d="M 0 -8 L -8 -1 L 0 11 L 8 -1 Z" fill="#FFE66D" stroke="#2D3047" stroke-width="1"/>
          <circle cx="0" cy="-1" r="2" fill="#FF6B6B"/>
        </g>
        ${gripL}
      </g>
    ` : '';

    const note = (has.note && !has.shield && !has.tube && !has.cert) ? `
      <g>
        <g transform="translate(${A.handL[0]+2}, ${A.handL[1]+2}) rotate(-8)">
          <rect x="-10" y="-13" width="20" height="16" fill="#FFF8E7" stroke="#2D3047" stroke-width="2" rx="1.5"/>
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
          <circle cx="6" cy="2" r="3.5" fill="#FF6B6B" stroke="#2D3047" stroke-width="0.8"/>
          <text x="4" y="4" font-size="5" fill="white">★</text>
        </g>
        ${gripL}
      </g>
    ` : '';

    const crystal = (has.crystal && !has.cert && !has.shield) ? `
      <g>
        <g transform="translate(${A.handL[0]+5}, ${A.handL[1]-3})">
          <ellipse cx="0" cy="2" rx="11" ry="3" fill="#7B2CBF" opacity="0.5"/>
          <circle cx="0" cy="-3" r="11" fill="url(#crystalGrad)" stroke="#2D3047" stroke-width="2"/>
          <ellipse cx="-3" cy="-7" rx="4" ry="3" fill="white" opacity="0.6"/>
          <circle cx="2" cy="0" r="2" fill="#FFE66D" opacity="0.7">
            <animate attributeName="r" values="1;3;1" dur="2s" repeatCount="indefinite"/>
          </circle>
        </g>
        ${gripL}
      </g>
      <defs>
        <radialGradient id="crystalGrad"><stop offset="0%" stop-color="#E1BEE7"/><stop offset="100%" stop-color="#7B2CBF"/></radialGradient>
      </defs>
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
        <ellipse cx="${A.eyeL[0]}" cy="${A.eyeL[1]}" rx="11" ry="9" fill="white" fill-opacity="0.15" stroke="#2D3047" stroke-width="2"/>
        <ellipse cx="${A.eyeR[0]}" cy="${A.eyeR[1]}" rx="11" ry="9" fill="white" fill-opacity="0.15" stroke="#2D3047" stroke-width="2"/>
        <line x1="${A.eyeL[0]+11}" y1="${A.eyeL[1]}" x2="${A.eyeR[0]-11}" y2="${A.eyeR[1]}" stroke="#2D3047" stroke-width="2"/>
        <!-- 镜腿到耳后 -->
        <path d="M ${A.eyeL[0]-11} ${A.eyeL[1]-1} Q ${A.earL[0]-2} ${A.earL[1]-4} ${A.earL[0]-1} ${A.earL[1]+2}"
              stroke="#2D3047" stroke-width="2" fill="none"/>
        <path d="M ${A.eyeR[0]+11} ${A.eyeR[1]-1} Q ${A.earR[0]+2} ${A.earR[1]-4} ${A.earR[0]+1} ${A.earR[1]+2}"
              stroke="#2D3047" stroke-width="2" fill="none"/>
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
            fill="#FF6B6B" stroke="#2D3047" stroke-width="2.5" opacity="0.92"/>
      <ellipse cx="${A.eyeL[0]}" cy="${A.eyeL[1]}" rx="8" ry="8" fill="white"/>
      <ellipse cx="${A.eyeR[0]}" cy="${A.eyeR[1]}" rx="8" ry="8" fill="white"/>
      <ellipse cx="${A.eyeL[0]}" cy="${A.eyeL[1]}" rx="5" ry="6" fill="#2D3047"/>
      <ellipse cx="${A.eyeR[0]}" cy="${A.eyeR[1]}" rx="5" ry="6" fill="#2D3047"/>
    ` : '';

    const headphone = has.headphone ? `
      <g>
        <!-- 头带弧形 -->
        <path d="M ${A.earL[0]-2} ${A.earL[1]-12} Q 110 ${A.headTop[1]-8} ${A.earR[0]+2} ${A.earR[1]-12}"
              stroke="#2D3047" stroke-width="6" fill="none"/>
        <path d="M ${A.earL[0]-2} ${A.earL[1]-12} Q 110 ${A.headTop[1]-6} ${A.earR[0]+2} ${A.earR[1]-12}"
              stroke="#FF6B6B" stroke-width="3" fill="none"/>
        <!-- 左耳罩贴耳 -->
        <ellipse cx="${A.earL[0]-3}" cy="${A.earL[1]+2}" rx="9" ry="13" fill="#FF6B6B" stroke="#2D3047" stroke-width="2.5"/>
        <ellipse cx="${A.earL[0]-3}" cy="${A.earL[1]+2}" rx="5" ry="9" fill="#2D3047" opacity="0.6"/>
        <!-- 右耳罩贴耳 -->
        <ellipse cx="${A.earR[0]+3}" cy="${A.earR[1]+2}" rx="9" ry="13" fill="#FF6B6B" stroke="#2D3047" stroke-width="2.5"/>
        <ellipse cx="${A.earR[0]+3}" cy="${A.earR[1]+2}" rx="5" ry="9" fill="#2D3047" opacity="0.6"/>
      </g>
    ` : '';

    const ear = (has.ear && !has.headphone) ? `
      <g>
        <path d="M ${A.earL[0]-3} ${A.earL[1]-14} Q 110 ${A.headTop[1]-10} ${A.earR[0]+3} ${A.earR[1]-14}"
              stroke="#FFD700" stroke-width="7" fill="none"/>
        <path d="M ${A.earL[0]-3} ${A.earL[1]-14} Q 110 ${A.headTop[1]-8} ${A.earR[0]+3} ${A.earR[1]-14}"
              stroke="#FFA500" stroke-width="3" fill="none"/>
        <ellipse cx="${A.earL[0]-4}" cy="${A.earL[1]+3}" rx="10" ry="14" fill="#FFD700" stroke="#2D3047" stroke-width="2.5"/>
        <ellipse cx="${A.earL[0]-4}" cy="${A.earL[1]+3}" rx="6" ry="10" fill="#8B6F00" opacity="0.6"/>
        <text x="${A.earL[0]-7}" y="${A.earL[1]+7}" font-size="9" fill="#FFE66D">♪</text>
        <ellipse cx="${A.earR[0]+4}" cy="${A.earR[1]+3}" rx="10" ry="14" fill="#FFD700" stroke="#2D3047" stroke-width="2.5"/>
        <ellipse cx="${A.earR[0]+4}" cy="${A.earR[1]+3}" rx="6" ry="10" fill="#8B6F00" opacity="0.6"/>
        <text x="${A.earR[0]+1}" y="${A.earR[1]+7}" font-size="9" fill="#FFE66D">♫</text>
      </g>
    ` : '';

    // === 头顶 (z=8) — 一次只显示一个头顶装备 ===
    const hat = (has.hat && !has.crown && !has.sun && !has.streak100 && !has.phoenix
                  && skin.accessory !== 'masterCrown' && skin.accessory !== 'explorerCap' && skin.accessory !== 'labGoggles') ? `
      <g>
        <!-- 帽底 (压头发上, 跟随头顶弧度) -->
        <ellipse cx="110" cy="${A.headTop[1]+5}" rx="${tpl.headR+4}" ry="3" fill="#2D3047"/>
        <!-- 顶板 (方正) -->
        <polygon points="${110-tpl.headR-4},${A.headTop[1]+1} ${110+tpl.headR+4},${A.headTop[1]+1} ${110+tpl.headR-2},${A.headTop[1]-6} ${110-tpl.headR+2},${A.headTop[1]-6}" fill="#2D3047"/>
        <rect x="${110-tpl.headR-4}" y="${A.headTop[1]+1}" width="${(tpl.headR+4)*2}" height="3" fill="#1A1A2E"/>
        <!-- 流苏 -->
        <line x1="${110+tpl.headR-2}" y1="${A.headTop[1]-3}" x2="${110+tpl.headR+8}" y2="${A.headTop[1]+8}" stroke="#FFE66D" stroke-width="2"/>
        <circle cx="${110+tpl.headR+8}" cy="${A.headTop[1]+8}" r="4" fill="#FFE66D" stroke="#2D3047" stroke-width="1">
          <animate attributeName="cy" values="${A.headTop[1]+8};${A.headTop[1]+11};${A.headTop[1]+8}" dur="1.8s" repeatCount="indefinite"/>
        </circle>
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
              fill="#FFE66D" stroke="#2D3047" stroke-width="2.5"/>
        <!-- 底环 -->
        <rect x="${110-tpl.headR-2}" y="${A.headTop[1]+5}" width="${(tpl.headR+2)*2}" height="6"
              fill="#FFA500" stroke="#2D3047" stroke-width="2"/>
        <!-- 宝石 -->
        <circle cx="${110-tpl.headR+4}" cy="${A.headTop[1]-7}" r="3" fill="#FF6B6B" stroke="#2D3047" stroke-width="1"/>
        <circle cx="110" cy="${A.headTop[1]-12}" r="4" fill="#FF6B6B" stroke="#2D3047" stroke-width="1"/>
        <circle cx="${110+tpl.headR-4}" cy="${A.headTop[1]-7}" r="3" fill="#FF6B6B" stroke="#2D3047" stroke-width="1"/>
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
              fill="#FFA500" stroke="#2D3047" stroke-width="2"/>
      </g>
    ` : '';

    const phoenix = has.phoenix ? `
      <g>
        <!-- 凤凰羽 (头顶后插) -->
        <path d="M 105 ${A.headTop[1]-2} Q 95 ${A.headTop[1]-15} 90 ${A.headTop[1]-25}
                 Q 92 ${A.headTop[1]-15} 100 ${A.headTop[1]-8} Z" fill="#FF6B6B" stroke="#2D3047" stroke-width="1.5"/>
        <path d="M 110 ${A.headTop[1]-2} Q 105 ${A.headTop[1]-20} 105 ${A.headTop[1]-32}
                 Q 110 ${A.headTop[1]-20} 113 ${A.headTop[1]-5} Z" fill="#FFA500" stroke="#2D3047" stroke-width="1.5"/>
        <path d="M 115 ${A.headTop[1]-2} Q 125 ${A.headTop[1]-15} 130 ${A.headTop[1]-25}
                 Q 128 ${A.headTop[1]-15} 120 ${A.headTop[1]-8} Z" fill="#FFE066" stroke="#2D3047" stroke-width="1.5"/>
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
              fill="#FFD700" stroke="#2D3047" stroke-width="2.5"/>
        <rect x="${110-tpl.headR-4}" y="${A.headTop[1]+7}" width="${(tpl.headR+4)*2}" height="7"
              fill="#FFA500" stroke="#2D3047" stroke-width="2"/>
        <circle cx="${110-tpl.headR+4}" cy="${A.headTop[1]-10}" r="3" fill="#FF6B6B" stroke="#2D3047" stroke-width="1"/>
        <circle cx="110" cy="${A.headTop[1]-19}" r="4.5" fill="#4ECDC4" stroke="#2D3047" stroke-width="1.5"/>
        <circle cx="${110+tpl.headR-4}" cy="${A.headTop[1]-10}" r="3" fill="#FF6B6B" stroke="#2D3047" stroke-width="1"/>
        <text x="100" y="${A.headTop[1]-22}" font-size="11" fill="#FFE66D">
          <animate attributeName="opacity" values="1;0.4;1" dur="1.2s" repeatCount="indefinite"/>✨</text>
        <text x="120" y="${A.headTop[1]-20}" font-size="10" fill="#FFE66D">
          <animate attributeName="opacity" values="0.4;1;0.4" dur="1.5s" repeatCount="indefinite"/>✨</text>
      </g>
    ` : '';

    const explorerCap = (skin.accessory === 'explorerCap') ? `
      <g>
        <ellipse cx="110" cy="${A.headTop[1]+6}" rx="${tpl.headR+8}" ry="5" fill="#8B7355" stroke="#2D3047" stroke-width="2.5"/>
        <path d="M ${110-tpl.headR+2} ${A.headTop[1]+6} Q 110 ${A.headTop[1]-15} ${110+tpl.headR-2} ${A.headTop[1]+6} Z"
              fill="#8B7355" stroke="#2D3047" stroke-width="2.5"/>
        <rect x="${110-tpl.headR+2}" y="${A.headTop[1]+1}" width="${(tpl.headR-2)*2}" height="5" fill="#5A4632"/>
      </g>
    ` : '';

    const labGoggles = (skin.accessory === 'labGoggles') ? `
      <g opacity="0.92">
        <ellipse cx="${A.eyeL[0]}" cy="${A.headTop[1]+8}" rx="13" ry="8" fill="#4ECDC4" stroke="#2D3047" stroke-width="2.5" opacity="0.7"/>
        <ellipse cx="${A.eyeR[0]}" cy="${A.headTop[1]+8}" rx="13" ry="8" fill="#4ECDC4" stroke="#2D3047" stroke-width="2.5" opacity="0.7"/>
        <line x1="${A.eyeL[0]+13}" y1="${A.headTop[1]+8}" x2="${A.eyeR[0]-13}" y2="${A.headTop[1]+8}" stroke="#2D3047" stroke-width="3"/>
        <path d="M ${A.eyeL[0]-13} ${A.headTop[1]+8} L ${A.earL[0]-2} ${A.earL[1]-2}" stroke="#2D3047" stroke-width="2.5"/>
        <path d="M ${A.eyeR[0]+13} ${A.headTop[1]+8} L ${A.earR[0]+2} ${A.earR[1]-2}" stroke="#2D3047" stroke-width="2.5"/>
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
              fill="#4ECDC4" stroke="#2D3047" stroke-width="2"/>
        <text x="-3" y="3" font-size="8" font-weight="900" fill="white">7</text>
      </g>
    ` : '';

    // === 头顶悬浮 (z=9) ===
    const diamond = has.diamond ? `
      <g transform="translate(110, ${A.headTop[1] - 18})">
        <animateTransform attributeName="transform" type="translate"
                         values="110,${A.headTop[1] - 18};110,${A.headTop[1] - 24};110,${A.headTop[1] - 18}" dur="1.6s" repeatCount="indefinite"/>
        <polygon points="0,-9 -10,-2 -6,8 6,8 10,-2" fill="#4ECDC4" stroke="#2D3047" stroke-width="1.5"/>
        <polygon points="0,-9 -6,-2 0,3 6,-2" fill="#A0E8F0"/>
        <line x1="-10" y1="-2" x2="10" y2="-2" stroke="#2D3047" stroke-width="1"/>
        <text x="-15" y="-9" font-size="8" fill="#FFE66D">
          <animate attributeName="opacity" values="1;0.3;1" dur="1s" repeatCount="indefinite"/>✨</text>
        <text x="11" y="-8" font-size="8" fill="#FFE66D">
          <animate attributeName="opacity" values="0.3;1;0.3" dur="1s" repeatCount="indefinite"/>✨</text>
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
    const apple = has.apple ? `
      <g transform="translate(${A.waistL[0]+4}, ${A.waistL[1]+4})">
        <circle cx="0" cy="2" r="6" fill="#FF6B6B" stroke="#2D3047" stroke-width="2"/>
        <path d="M 0 -4 L -1.5 -7 L 1.5 -8 Z" fill="#6BCB77" stroke="#2D3047" stroke-width="1"/>
        <line x1="0" y1="-4" x2="0" y2="-2" stroke="#2D3047" stroke-width="1"/>
        <ellipse cx="-2" cy="0" rx="1.5" ry="1" fill="white" opacity="0.5"/>
      </g>
    ` : '';

    const cup = has.cup ? `
      <g transform="translate(${A.waistR[0]-2}, ${A.waistR[1]+2})">
        <rect x="-5" y="-7" width="10" height="13" fill="#4ECDC4" stroke="#2D3047" stroke-width="2" rx="2"/>
        <ellipse cx="0" cy="-7" rx="5" ry="1.5" fill="#fff" stroke="#2D3047" stroke-width="1.5"/>
        <line x1="-5" y1="-3" x2="-7" y2="-3" stroke="#2D3047" stroke-width="1.5"/>
        <path d="M -7 -3 Q -8 0 -7 3" fill="none" stroke="#2D3047" stroke-width="1.5"/>
      </g>
    ` : '';

    const cookie = has.cookie ? `
      <g transform="translate(${A.waistC[0]}, ${A.waistC[1]+8})">
        <circle cx="0" cy="0" r="5" fill="#D4A574" stroke="#2D3047" stroke-width="2"/>
        <circle cx="-2" cy="-1" r="0.8" fill="#5D3A1A"/>
        <circle cx="2" cy="0" r="0.8" fill="#5D3A1A"/>
        <circle cx="0" cy="2" r="0.8" fill="#5D3A1A"/>
      </g>
    ` : '';

    const cake = has.cake ? `
      <g transform="translate(${A.waistL[0]-4}, ${A.waistL[1]+4})">
        <path d="M -7 4 L 7 4 L 5 -2 L -5 -2 Z" fill="#FFE066" stroke="#2D3047" stroke-width="1.5"/>
        <rect x="-5" y="-7" width="10" height="5" fill="#FFB6D9" stroke="#2D3047" stroke-width="1.5"/>
        <circle cx="0" cy="-9" r="2" fill="#FF6B6B" stroke="#2D3047" stroke-width="1"/>
        <line x1="0" y1="-11" x2="0" y2="-13" stroke="#FFE66D" stroke-width="1"/>
      </g>
    ` : '';

    // === 腿/腕 (z=6) ===
    const sock = has.sock ? `
      <g>
        <rect x="${91-9}" y="${tpl.legBottom-13}" width="18" height="10" rx="2" fill="#FFB6D9" stroke="#2D3047" stroke-width="2"/>
        <rect x="${129-9}" y="${tpl.legBottom-13}" width="18" height="10" rx="2" fill="#FFB6D9" stroke="#2D3047" stroke-width="2"/>
        <line x1="${91-7}" y1="${tpl.legBottom-9}" x2="${91+7}" y2="${tpl.legBottom-9}" stroke="#FF6B6B" stroke-width="1.5"/>
        <line x1="${129-7}" y1="${tpl.legBottom-9}" x2="${129+7}" y2="${tpl.legBottom-9}" stroke="#FF6B6B" stroke-width="1.5"/>
      </g>
    ` : '';

    const volcano = has.volcano ? `
      <g>
        <path d="M ${91-15} ${tpl.legBottom+4} Q ${91-15} ${tpl.legBottom-8} ${91} ${tpl.legBottom-8}
                 Q ${91+15} ${tpl.legBottom-8} ${91+15} ${tpl.legBottom+4} Z"
              fill="#C13030" stroke="#2D3047" stroke-width="2.5"/>
        <path d="M ${91-13} ${tpl.legBottom-2} Q ${91-10} ${tpl.legBottom-12} ${91-7} ${tpl.legBottom-4}
                 Q ${91-3} ${tpl.legBottom-14} ${91} ${tpl.legBottom-6}
                 Q ${91+3} ${tpl.legBottom-12} ${91+7} ${tpl.legBottom-3}
                 Q ${91+10} ${tpl.legBottom-11} ${91+13} ${tpl.legBottom-2}"
              fill="#FFE066" opacity="0.85"/>
        <path d="M ${129-15} ${tpl.legBottom+4} Q ${129-15} ${tpl.legBottom-8} ${129} ${tpl.legBottom-8}
                 Q ${129+15} ${tpl.legBottom-8} ${129+15} ${tpl.legBottom+4} Z"
              fill="#C13030" stroke="#2D3047" stroke-width="2.5"/>
        <path d="M ${129-13} ${tpl.legBottom-2} Q ${129-10} ${tpl.legBottom-12} ${129-7} ${tpl.legBottom-4}
                 Q ${129-3} ${tpl.legBottom-14} ${129} ${tpl.legBottom-6}
                 Q ${129+3} ${tpl.legBottom-12} ${129+7} ${tpl.legBottom-3}
                 Q ${129+10} ${tpl.legBottom-11} ${129+13} ${tpl.legBottom-2}"
              fill="#FFE066" opacity="0.85"/>
      </g>
    ` : '';

    const watch = has.watch ? `
      <g>
        <rect x="${A.handR[0]-7}" y="${A.handR[1]-13}" width="14" height="10" rx="2" fill="#4ECDC4" stroke="#2D3047" stroke-width="2"/>
        <rect x="${A.handR[0]-5}" y="${A.handR[1]-11}" width="10" height="6" rx="1" fill="#2D3047"/>
        <text x="${A.handR[0]-4}" y="${A.handR[1]-6}" font-size="6" fill="#FFE66D" font-weight="bold">12</text>
        <line x1="${A.handR[0]-7}" y1="${A.handR[1]-12}" x2="${A.handR[0]-10}" y2="${A.handR[1]-14}" stroke="#2D3047" stroke-width="2"/>
        <line x1="${A.handR[0]-7}" y1="${A.handR[1]-4}" x2="${A.handR[0]-10}" y2="${A.handR[1]-2}" stroke="#2D3047" stroke-width="2"/>
        <line x1="${A.handR[0]+7}" y1="${A.handR[1]-12}" x2="${A.handR[0]+10}" y2="${A.handR[1]-14}" stroke="#2D3047" stroke-width="2"/>
        <line x1="${A.handR[0]+7}" y1="${A.handR[1]-4}" x2="${A.handR[0]+10}" y2="${A.handR[1]-2}" stroke="#2D3047" stroke-width="2"/>
      </g>
    ` : '';

    // === 旁边伴侣 (z=11) ===
    const trophy = has.trophy ? `
      <g transform="translate(192, ${tpl.legBottom-10})">
        <ellipse cx="0" cy="14" rx="14" ry="3" fill="#2D3047" opacity="0.3"/>
        <rect x="-9" y="8" width="18" height="6" fill="#FFA500" stroke="#2D3047" stroke-width="2"/>
        <rect x="-2.5" y="-12" width="5" height="20" fill="#FFA500" stroke="#2D3047" stroke-width="2"/>
        <path d="M -12 -18 Q -12 -3 0 -3 Q 12 -3 12 -18 Z" fill="#FFE66D" stroke="#2D3047" stroke-width="2"/>
        <path d="M -12 -16 Q -16 -16 -16 -10 Q -16 -3 -12 -3" fill="none" stroke="#2D3047" stroke-width="1.5"/>
        <path d="M 12 -16 Q 16 -16 16 -10 Q 16 -3 12 -3" fill="none" stroke="#2D3047" stroke-width="1.5"/>
        <text x="-3" y="-9" font-size="11" font-weight="bold" fill="#2D3047">★</text>
      </g>
    ` : '';

    const unicorn = has.unicorn ? `
      <g transform="translate(20, ${tpl.legBottom-22})">
        <ellipse cx="0" cy="20" rx="18" ry="3" fill="#2D3047" opacity="0.2"/>
        <ellipse cx="0" cy="6" rx="14" ry="10" fill="white" stroke="#2D3047" stroke-width="2"/>
        <ellipse cx="-12" cy="-2" rx="8" ry="9" fill="white" stroke="#2D3047" stroke-width="2"/>
        <polygon points="-15,-12 -10,-12 -12,-22" fill="#FFE66D" stroke="#2D3047" stroke-width="1.5"/>
        <ellipse cx="-15" cy="-7" rx="2" ry="3" fill="white" stroke="#2D3047" stroke-width="1"/>
        <ellipse cx="-9" cy="-7" rx="2" ry="3" fill="white" stroke="#2D3047" stroke-width="1"/>
        <ellipse cx="-12" cy="-3" rx="1.2" ry="1.5" fill="#2D3047"/>
        <path d="M -15 1 Q -12 4 -9 1" stroke="#FF6B6B" stroke-width="1.5" fill="none"/>
        <rect x="-2" y="14" width="3" height="8" fill="white" stroke="#2D3047" stroke-width="1"/>
        <rect x="6" y="14" width="3" height="8" fill="white" stroke="#2D3047" stroke-width="1"/>
        <path d="M 14 4 Q 22 0 24 -8" stroke="#FFB6D9" stroke-width="3" fill="none"/>
        <path d="M -18 -10 Q -22 -16 -16 -20" stroke="#FFB6D9" stroke-width="3" fill="none"/>
      </g>
    ` : '';

    // ====== 返回 SVG (按 z 层级顺序) ======
    return `
      <svg viewBox="0 0 220 240" xmlns="http://www.w3.org/2000/svg">
        ${fireBackground}
        ${rocket}
        ${cometTrail}
        ${dragonBody}
        ${cape}
        ${galaxyCape}
        ${bag}
        ${body}
        ${monthking}
        ${medalGold}
        ${badge_p6}
        ${badge_2}
        ${badge_3}
        ${star}
        ${lightning}
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
        ${diamond}
        ${planet}
        ${streak30}
        ${rainbow}
        ${trophy}
        ${unicorn}
      </svg>
    `;
  }
};

window.CHAMUI = CHAMUI;
