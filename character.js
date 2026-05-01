/**
 * 佑子角色 SVG 生成器
 * 8 级形态 + 装备系统
 * 完全原创 Q 萌设计:圆头圆身,粉嫩配色,大眼睛
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

  // 装备系统(v6 — 42 件,前 100 分密集 4 件,顶配 dragon 6000 = SGD 1500 终极大奖)
  equipment: [
    // ===== 极速集邮 (0-100):W1 第一周就能拿 4 件 =====
    { id: 'note',     icon: '📒', name: '笔记本',     condition: 'points',    value: 5,    hint: '累积 5 分(第一天打 1 个 slot 就拿)' },
    { id: 'apple',    icon: '🍎', name: '健康苹果',   condition: 'points',    value: 15,   hint: '累积 15 分(第一天 2-3 slot)' },
    { id: 'hat',      icon: '🎓', name: '学士帽',     condition: 'points',    value: 30,   hint: '累积 30 分(W1 周三)' },
    { id: 'cup',      icon: '🥤', name: '能量水杯',   condition: 'points',    value: 50,   hint: '累积 50 分(W1 周末)' },
    // ===== 早期 (75-220):W2-W4 =====
    { id: 'sword',    icon: '✏️', name: '铅笔剑',     condition: 'points',    value: 75,   hint: '累积 75 分' },
    { id: 'cookie',   icon: '🍪', name: '幸运饼干',   condition: 'points',    value: 110,  hint: '累积 110 分' },
    { id: 'bag',      icon: '🎒', name: '书包',       condition: 'points',    value: 160,  hint: '累积 160 分' },
    { id: 'sock',     icon: '🧦', name: '幸运袜',     condition: 'points',    value: 220,  hint: '累积 220 分' },
    // ===== 中早期 (290-560):W5-W8 =====
    { id: 'glasses',  icon: '👓', name: '聪明眼镜',   condition: 'points',    value: 290,  hint: '累积 290 分' },
    { id: 'watch',    icon: '⌚', name: '时间手表',   condition: 'points',    value: 370,  hint: '累积 370 分' },
    { id: 'headphone',icon: '🎧', name: '听力耳机',   condition: 'points',    value: 460,  hint: '累积 460 分' },
    { id: 'phone',    icon: '📱', name: '智能手机',   condition: 'points',    value: 560,  hint: '累积 560 分' },
    // ===== 中期 (680-1180):W9-W15 =====
    { id: 'cake',     icon: '🎂', name: '生日蛋糕',   condition: 'points',    value: 680,  hint: '累积 680 分' },
    { id: 'rocket',   icon: '🚀', name: '冲刺火箭',   condition: 'points',    value: 820,  hint: '累积 820 分' },
    { id: 'crystal',  icon: '🔮', name: '水晶球',     condition: 'points',    value: 980,  hint: '累积 980 分' },
    { id: 'diamond',  icon: '💎', name: '智慧钻石',   condition: 'points',    value: 1180, hint: '累积 1180 分(传说级)' },
    // ===== 中后期 (1400-2200):W17-W24 =====
    { id: 'galaxy',   icon: '🌌', name: '银河披风',   condition: 'points',    value: 1400, hint: '累积 1400 分(神级)' },
    { id: 'magic',    icon: '🪄', name: '魔法棒',     condition: 'points',    value: 1650, hint: '累积 1650 分' },
    { id: 'lightning',icon: '⚡', name: '闪电袖标',   condition: 'points',    value: 1900, hint: '累积 1900 分' },
    { id: 'star',     icon: '⭐', name: '星辰勋章',   condition: 'points',    value: 2200, hint: '累积 2200 分(P6 学者)' },
    // ===== 二阶段 (2500-3550):W27-W38 =====
    { id: 'planet',   icon: '🪐', name: '土星之环',   condition: 'points',    value: 2500, hint: '累积 2500 分' },
    { id: 'sun',      icon: '☀️', name: '太阳皇冠',   condition: 'points',    value: 2850, hint: '累积 2850 分' },
    { id: 'phoenix',  icon: '🦅', name: '凤凰羽',     condition: 'points',    value: 3200, hint: '累积 3200 分(浴火重生)' },
    { id: 'rainbow',  icon: '🌈', name: '彩虹光环',   condition: 'points',    value: 3550, hint: '累积 3550 分' },
    // ===== 三阶段冲刺 (3950-4750):W43-W53 =====
    { id: 'volcano',  icon: '🌋', name: '火山战靴',   condition: 'points',    value: 3950, hint: '累积 3950 分(刷题狂魔)' },
    { id: 'comet',    icon: '☄️', name: '彗星轨迹',   condition: 'points',    value: 4350, hint: '累积 4350 分' },
    { id: 'unicorn',  icon: '🦄', name: '独角兽伙伴', condition: 'points',    value: 4750, hint: '累积 4750 分(神兽级)' },
    // ===== PSLE 终极 (5300-6000):W60-W73 =====
    { id: 'medal',    icon: '🥇', name: '金牌得主',   condition: 'points',    value: 5300, hint: '累积 5300 分(冲刺王)' },
    { id: 'dragon',   icon: '🐉', name: '神龙伙伴',   condition: 'points',    value: 6000, hint: '累积 6000 分 = SGD 1500 终极大奖等价🐲' },
    // ===== W14/20/26 第一阶段里程碑 =====
    { id: 'tube',     icon: '🔬', name: '试管',       condition: 'milestone', value: 'W14', hint: '完成 W14 P3-P4 综合模拟' },
    { id: 'trophy',   icon: '🏆', name: '奖杯',       condition: 'milestone', value: 'W20', hint: '完成 W20 P5 综合' },
    { id: 'crown',    icon: '👑', name: '皇冠',       condition: 'milestone', value: 'W26', hint: 'W26 第一阶段总模考' },
    // ===== W42/52/65 二三阶段里程碑(v5 新)=====
    { id: 'badge_p6', icon: '🎖️', name: 'P6 通关勋章',condition: 'milestone', value: 'W42', hint: 'W42 P6 Adaptations 月模考 3' },
    { id: 'badge_2',  icon: '🏵️', name: '二阶段勋章', condition: 'milestone', value: 'W52', hint: 'W52 第二阶段总收官' },
    { id: 'badge_3',  icon: '🎗️', name: '冲刺勋章',   condition: 'milestone', value: 'W65', hint: 'W65 最后完整模考' },
    // ===== PSLE 三大考(v5 新)=====
    { id: 'mic',      icon: '🎤', name: '口试金话筒', condition: 'milestone', value: 'W68', hint: 'W68 PSLE 口试 (8.12-13)' },
    { id: 'ear',      icon: '🎵', name: '听力金耳麦', condition: 'milestone', value: 'W72', hint: 'W72 PSLE 听力 (9.15)' },
    { id: 'cert',     icon: '📜', name: 'PSLE 证书',  condition: 'milestone', value: 'W73', hint: 'W73 PSLE 笔试 (9.24-30)🎯🎯' },
    // ===== 行为成就 =====
    { id: 'shield',   icon: '🛡️', name: '盾牌',      condition: 'streak',    value: 1,    hint: '4 周无问题反馈' },
    { id: 'cape',     icon: '🦸', name: '披风',       condition: 'monthly3',  value: 3,    hint: '月小测连续 3 次达标' },
    { id: 'fire',     icon: '🔥', name: '火焰特效',   condition: 'milestone', value: 'any-key', hint: '任一大节点达标' },
    { id: 'monthking',icon: '🎯', name: '月度王',     condition: 'monthly3',  value: 6,    hint: '累积 6 次月度小测达标' }
  ],

  // 根据等级获取角色信息
  getLevelInfo(points) {
    let levelInfo = this.levels[0];
    for (const lv of this.levels) {
      if (points >= lv.minPoints) {
        levelInfo = lv;
      } else {
        break;
      }
    }
    return levelInfo;
  },

  getNextLevelInfo(points) {
    const current = this.getLevelInfo(points);
    const nextIdx = current.lv;  // levels 数组是 0 索引,但 lv 是 1 起,所以 lv 就是下一个的索引
    if (nextIdx >= this.levels.length) return null;
    return this.levels[nextIdx];
  },

  // 检查装备解锁状态
  checkEquipmentUnlocked(equipId, state) {
    const eq = this.equipment.find(e => e.id === equipId);
    if (!eq) return false;

    switch (eq.condition) {
      case 'points':
        return state.totalPoints >= eq.value;
      case 'milestone':
        if (eq.value === 'any-key') {
          // 任一里程碑达标(v5: 扩展到所有 6 个 PSLE 节点)
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
      default:
        return false;
    }
  },

  // ========== SVG 角色绘制(核心) ==========
  // 这个函数根据等级和装备生成 SVG
  // 皮肤系统 v5 — 6 套全身造型(颜色调色板 + 可选配件层)
  skins: [
    {
      id: 'default', name: '🎒 校服(默认)', desc: '黄 T 黑发,佑子原生造型',
      shirtColor: 'auto',  // 'auto' = 用 level 颜色递进
      pantsColor: '#5A4632',
      hairColor: '#2D3047',
      skinColor: '#FFE0BD',
      condition: 'always'
    },
    {
      id: 'scholar', name: '📘 学者袍', desc: '蓝学袍 + 灰长裤,好学少年',
      shirtColor: '#5B8DEF',  // 蓝
      pantsColor: '#454F66',  // 深灰
      hairColor: '#2D3047',
      skinColor: '#FFE0BD',
      accessory: 'scholarSash',  // 额外加学士绶带
      condition: { type: 'level', value: 5 },
      hint: 'Lv5 解锁(累计 360 分)'
    },
    {
      id: 'scientist', name: '🥼 科学家', desc: '白大褂 + 护目镜,实验家',
      shirtColor: '#F0F0F0',  // 白
      pantsColor: '#404040',
      hairColor: '#2D3047',
      skinColor: '#FFE0BD',
      accessory: 'labGoggles',
      condition: { type: 'milestone', value: 'W14' },
      hint: 'W14 P3-P4 综合模拟达标解锁'
    },
    {
      id: 'explorer', name: '🧭 探险家', desc: '卡其 + 望远镜,Boyfriend',
      shirtColor: '#9A8B5B',  // 卡其
      pantsColor: '#6B5D3F',
      hairColor: '#3B2E20',
      skinColor: '#F5C9A0',
      accessory: 'explorerCap',
      condition: { type: 'points', value: 1500 },
      hint: '累积 1500 分解锁'
    },
    {
      id: 'hero', name: '🦸 超级英雄', desc: '红披风+面具+蓝衣,救世主',
      shirtColor: '#3B5BA9',  // 蓝
      pantsColor: '#1F2D5C',
      hairColor: '#2D3047',
      skinColor: '#FFE0BD',
      accessory: 'heroMask',
      condition: { type: 'points', value: 3200 },
      hint: '累积 3000 分解锁'
    },
    {
      id: 'master', name: '👑 PSLE 大师', desc: '金衣+皇冠+证书,终极满级',
      shirtColor: '#FFD700',  // 金
      pantsColor: '#9B7300',
      hairColor: '#2D3047',
      skinColor: '#FFE0BD',
      accessory: 'masterCrown',
      condition: { type: 'milestone', value: 'W73' },
      hint: 'W73 PSLE 笔试完成解锁(终极)'
    }
  ],

  // 检查皮肤是否解锁
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

  // 取当前激活皮肤,如果没选/选的没解锁,默认 default
  getActiveSkin(state) {
    const id = state.activeSkin || 'default';
    const skin = this.skins.find(s => s.id === id);
    if (!skin || !this.checkSkinUnlocked(id, state)) {
      return this.skins[0];  // default
    }
    return skin;
  },

  renderCharacter(state) {
    const points = state.totalPoints;
    const level = this.getLevelInfo(points);
    const sad = state.sadUntil && Date.now() < state.sadUntil;

    // 判定装备显示
    const has = {};
    this.equipment.forEach(eq => {
      has[eq.id] = this.checkEquipmentUnlocked(eq.id, state);
    });

    // v5: 皮肤系统主导颜色;default 皮肤的 shirtColor='auto' 走老逻辑(等级递进)
    const skin = this.getActiveSkin(state);
    const autoShirt = level.lv <= 2 ? '#FFE066' : level.lv <= 4 ? '#FF9F45' : level.lv <= 6 ? '#A788E0' : '#FF6B6B';
    const shirtColor = (skin.shirtColor === 'auto') ? autoShirt : skin.shirtColor;
    const skinColor = skin.skinColor;
    const hairColor = skin.hairColor;
    const pantsColor = skin.pantsColor;

    // 表情:开心(大黑眼+张嘴笑)或沮丧
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
      <!-- 大笑张嘴 -->
      <path d="M 88 98 Q 110 122 132 98 Q 132 104 110 110 Q 88 104 88 98 Z" fill="#2D3047" stroke="#2D3047" stroke-width="2.5" stroke-linejoin="round"/>
      <!-- 上排白牙 -->
      <path d="M 92 100 L 128 100 L 124 104 L 96 104 Z" fill="white"/>
      <!-- 红舌头 -->
      <ellipse cx="110" cy="110" rx="9" ry="3.5" fill="#FF6B6B"/>
    `;

    // 火焰特效背景
    const fireBackground = has.fire ? `
      <g opacity="0.7">
        <circle cx="35" cy="225" r="15" fill="#FF6B6B">
          <animate attributeName="cy" values="225;205;225" dur="0.8s" repeatCount="indefinite"/>
          <animate attributeName="opacity" values="0.7;0.3;0.7" dur="0.8s" repeatCount="indefinite"/>
        </circle>
        <circle cx="185" cy="220" r="12" fill="#FFE66D">
          <animate attributeName="cy" values="220;200;220" dur="0.6s" repeatCount="indefinite"/>
          <animate attributeName="opacity" values="0.6;0.2;0.6" dur="0.6s" repeatCount="indefinite"/>
        </circle>
        <circle cx="15" cy="220" r="10" fill="#FF9F45">
          <animate attributeName="cy" values="220;200;220" dur="1s" repeatCount="indefinite"/>
        </circle>
      </g>
    ` : '';

    // 披风(从肩膀飘到地面)
    const cape = has.cape ? `
      <path d="M 70 132 Q 40 180 25 230 L 80 230 Q 90 180 88 138 Z"
            fill="#A788E0" stroke="#2D3047" stroke-width="3" opacity="0.92">
        <animateTransform attributeName="transform" type="rotate" values="-1.5 80 130;1.5 80 130;-1.5 80 130" dur="3s" repeatCount="indefinite"/>
      </path>
      <path d="M 150 132 Q 180 180 195 230 L 140 230 Q 130 180 132 138 Z"
            fill="#A788E0" stroke="#2D3047" stroke-width="3" opacity="0.92">
        <animateTransform attributeName="transform" type="rotate" values="1.5 140 130;-1.5 140 130;1.5 140 130" dur="3s" repeatCount="indefinite"/>
      </path>
    ` : '';

    // 书包(背在背后,从肩膀露出来)
    const bag = has.bag ? `
      <ellipse cx="110" cy="170" rx="55" ry="40" fill="#FF9F45" stroke="#2D3047" stroke-width="3" opacity="0.85"/>
      <!-- 书包带子 -->
      <path d="M 78 130 L 75 175" stroke="#2D3047" stroke-width="3" fill="none"/>
      <path d="M 142 130 L 145 175" stroke="#2D3047" stroke-width="3" fill="none"/>
    ` : '';

    // 主体(头+身+四肢)— 开心锤锤风
    const body = `
      <!-- 阴影 -->
      <ellipse cx="110" cy="234" rx="55" ry="5" fill="#2D3047" opacity="0.18"/>

      <!-- 腿(短裤下露出) -->
      <rect x="82" y="200" width="18" height="28" rx="3" fill="${skinColor}" stroke="#2D3047" stroke-width="3"/>
      <rect x="120" y="200" width="18" height="28" rx="3" fill="${skinColor}" stroke="#2D3047" stroke-width="3"/>
      <!-- 鞋子 -->
      <ellipse cx="91" cy="232" rx="13" ry="6" fill="#2D3047"/>
      <ellipse cx="129" cy="232" rx="13" ry="6" fill="#2D3047"/>
      <ellipse cx="91" cy="230" rx="11" ry="3" fill="white"/>
      <ellipse cx="129" cy="230" rx="11" ry="3" fill="white"/>

      <!-- 短裤 -->
      <path d="M 70 175 L 65 205 L 105 205 L 110 175 Z" fill="${pantsColor}" stroke="#2D3047" stroke-width="3"/>
      <path d="M 110 175 L 115 205 L 155 205 L 150 175 Z" fill="${pantsColor}" stroke="#2D3047" stroke-width="3"/>

      <!-- 衣服(梯形 T 恤) -->
      <path d="M 78 128 Q 70 130 70 138 L 62 180 Q 62 188 70 188 L 150 188 Q 158 188 158 180 L 150 138 Q 150 130 142 128 Z"
            fill="${shirtColor}" stroke="#2D3047" stroke-width="3.5"/>
      <!-- 领口 V -->
      <path d="M 96 128 Q 110 142 124 128" stroke="#2D3047" stroke-width="3" fill="${skinColor}"/>

      <!-- 胳膊(肩膀到手) -->
      <path d="M 70 138 Q 55 155 55 178" stroke="#2D3047" stroke-width="3.5" fill="none"/>
      <path d="M 150 138 Q 165 155 165 178" stroke="#2D3047" stroke-width="3.5" fill="none"/>
      <!-- 胳膊 fill -->
      <path d="M 70 138 Q 55 155 55 178 L 65 178 Q 65 158 80 142 Z" fill="${shirtColor}" stroke="#2D3047" stroke-width="2"/>
      <path d="M 150 138 Q 165 155 165 178 L 155 178 Q 155 158 140 142 Z" fill="${shirtColor}" stroke="#2D3047" stroke-width="2"/>
      <!-- 手 -->
      <circle cx="58" cy="180" r="9" fill="${skinColor}" stroke="#2D3047" stroke-width="3"/>
      <circle cx="162" cy="180" r="9" fill="${skinColor}" stroke="#2D3047" stroke-width="3"/>

      <!-- 脖子 -->
      <rect x="103" y="115" width="14" height="14" fill="${skinColor}" stroke="#2D3047" stroke-width="2.5"/>

      <!-- 头(肤色椭圆) -->
      <ellipse cx="110" cy="78" rx="48" ry="46" fill="${skinColor}" stroke="#2D3047" stroke-width="3.5"/>

      <!-- 头发(黑色,锯齿状刘海 + 顶上小尖刺) -->
      <path d="M 65 78 Q 60 32 105 30 L 108 18 L 113 30 Q 162 32 158 80
               L 152 65 L 145 75 L 137 60 L 128 73 L 118 58 L 108 72 L 96 60 L 88 75 L 78 62 L 70 76 Z"
            fill="${hairColor}" stroke="${hairColor}" stroke-width="2"/>
      <!-- 招牌小尖刺 -->
      <path d="M 105 30 L 108 12 L 113 30 Z" fill="${hairColor}"/>

      <!-- 腮红 -->
      <ellipse cx="76" cy="92" rx="9" ry="5" fill="#FF6B6B" opacity="0.55"/>
      <ellipse cx="144" cy="92" rx="9" ry="5" fill="#FF6B6B" opacity="0.55"/>

      <!-- 眉毛(粗短,显示性格) -->
      <path d="M 80 60 L 100 64" stroke="${hairColor}" stroke-width="3.5" fill="none" stroke-linecap="round"/>
      <path d="M 120 64 L 140 60" stroke="${hairColor}" stroke-width="3.5" fill="none" stroke-linecap="round"/>

      <!-- 眼睛 -->
      ${eyes}

      <!-- 鼻子(小点) -->
      <ellipse cx="110" cy="92" rx="2" ry="1.5" fill="${hairColor}"/>

      <!-- 嘴 -->
      ${mouth}
    `;

    // 学士帽(盖在头发顶)
    const hat = has.hat ? `
      <g>
        <rect x="68" y="40" width="84" height="6" fill="#2D3047"/>
        <polygon points="55,55 165,55 110,38" fill="#2D3047"/>
        <!-- 流苏 -->
        <line x1="140" y1="44" x2="160" y2="34" stroke="#FFE66D" stroke-width="3"/>
        <circle cx="160" cy="34" r="5" fill="#FFE66D">
          <animate attributeName="cy" values="34;38;34" dur="2s" repeatCount="indefinite"/>
        </circle>
      </g>
    ` : '';

    // 皇冠(覆盖学士帽位置)
    const crown = has.crown ? `
      <g>
        <polygon points="62,55 72,32 88,48 110,22 132,48 148,32 158,55"
                 fill="#FFE66D" stroke="#2D3047" stroke-width="3"/>
        <circle cx="72" cy="38" r="4" fill="#FF6B6B" stroke="#2D3047" stroke-width="2"/>
        <circle cx="110" cy="28" r="5" fill="#FF6B6B" stroke="#2D3047" stroke-width="2"/>
        <circle cx="148" cy="38" r="4" fill="#FF6B6B" stroke="#2D3047" stroke-width="2"/>
        <rect x="62" y="55" width="96" height="7" fill="#FFA500" stroke="#2D3047" stroke-width="2"/>
        <text x="103" y="32" font-size="14" fill="#FFE66D" opacity="0.85">
          <animate attributeName="opacity" values="0.85;0.3;0.85" dur="1.5s" repeatCount="indefinite"/>
          ✨
        </text>
      </g>
    ` : '';

    // 眼镜(架在脸上,正好遮眼)
    const glasses = has.glasses ? `
      <g opacity="0.9">
        <circle cx="90" cy="78" r="14" fill="none" stroke="#2D3047" stroke-width="2.5"/>
        <circle cx="130" cy="78" r="14" fill="none" stroke="#2D3047" stroke-width="2.5"/>
        <line x1="104" y1="78" x2="116" y2="78" stroke="#2D3047" stroke-width="2.5"/>
        <line x1="76" y1="78" x2="68" y2="76" stroke="#2D3047" stroke-width="2"/>
        <line x1="144" y1="78" x2="152" y2="76" stroke="#2D3047" stroke-width="2"/>
        <circle cx="84" cy="73" r="3" fill="white" opacity="0.7"/>
        <circle cx="124" cy="73" r="3" fill="white" opacity="0.7"/>
      </g>
    ` : '';

    // 铅笔剑(右手握着,向上)
    const sword = has.sword ? `
      <g transform="translate(162, 180) rotate(15)">
        <!-- 笔杆 -->
        <rect x="-3" y="-55" width="7" height="55" fill="#FFE66D" stroke="#2D3047" stroke-width="2"/>
        <!-- 笔尖 -->
        <polygon points="-4,-55 5,-55 1,-70" fill="#2D3047"/>
        <polygon points="-2,-55 3,-55 1,-65" fill="#FFB6D9"/>
        <!-- 橡皮擦 -->
        <rect x="-3" y="0" width="7" height="6" fill="#FF6B6B" stroke="#2D3047" stroke-width="2"/>
      </g>
    ` : '';

    // 试管(左手握着)
    const tube = has.tube ? `
      <g transform="translate(58, 188) rotate(-12)">
        <rect x="-6" y="-30" width="12" height="30" rx="2" fill="#4ECDC4" stroke="#2D3047" stroke-width="2" opacity="0.9"/>
        <rect x="-7" y="-32" width="14" height="5" fill="#2D3047"/>
        <circle cx="0" cy="-10" r="2" fill="white">
          <animate attributeName="cy" values="-5;-25;-5" dur="2s" repeatCount="indefinite"/>
        </circle>
        <circle cx="-2" cy="-15" r="1.5" fill="white">
          <animate attributeName="cy" values="-8;-28;-8" dur="1.6s" repeatCount="indefinite"/>
        </circle>
      </g>
    ` : '';

    // 盾牌(左手前侧;有盾就不显示试管)
    const shield = has.shield ? `
      <g transform="translate(50, 180)">
        <path d="M 0 -15 Q -16 -15 -16 -3 Q -16 15 0 22 Q 16 15 16 -3 Q 16 -15 0 -15 Z"
              fill="#4ECDC4" stroke="#2D3047" stroke-width="3"/>
        <path d="M 0 -7 L -7 -1 L 0 9 L 7 -1 Z" fill="#FFE66D"/>
      </g>
    ` : '';

    // 奖杯(放右下角)
    const trophy = has.trophy ? `
      <g transform="translate(180, 218)">
        <ellipse cx="0" cy="14" rx="12" ry="3" fill="#2D3047" opacity="0.3"/>
        <rect x="-8" y="8" width="16" height="6" fill="#FFA500" stroke="#2D3047" stroke-width="2"/>
        <rect x="-2" y="-10" width="4" height="18" fill="#FFA500" stroke="#2D3047" stroke-width="2"/>
        <path d="M -10 -16 Q -10 -2 0 -2 Q 10 -2 10 -16 Z" fill="#FFE66D" stroke="#2D3047" stroke-width="2"/>
        <text x="-3" y="-7" font-size="10" font-weight="bold" fill="#2D3047">★</text>
      </g>
    ` : '';

    // 试管已经是左手的装备,如果同时有盾牌和试管,只显示盾牌
    const showTube = has.tube && !has.shield;

    // ===== 新增 12 件装备的 SVG =====

    // 🎧 耳机(头戴式,带状跨过头顶)
    const headphone = has.headphone ? `
      <g>
        <!-- 头带 -->
        <path d="M 60 55 Q 110 22 160 55" stroke="#2D3047" stroke-width="6" fill="none"/>
        <path d="M 60 55 Q 110 25 160 55" stroke="#FF6B6B" stroke-width="3" fill="none"/>
        <!-- 左耳罩 -->
        <ellipse cx="58" cy="80" rx="9" ry="13" fill="#FF6B6B" stroke="#2D3047" stroke-width="2.5"/>
        <ellipse cx="58" cy="80" rx="5" ry="9" fill="#2D3047" opacity="0.6"/>
        <!-- 右耳罩 -->
        <ellipse cx="162" cy="80" rx="9" ry="13" fill="#FF6B6B" stroke="#2D3047" stroke-width="2.5"/>
        <ellipse cx="162" cy="80" rx="5" ry="9" fill="#2D3047" opacity="0.6"/>
      </g>
    ` : '';

    // ⌚ 手表(右手腕上)
    const watch = has.watch ? `
      <g>
        <rect x="156" y="171" width="14" height="10" rx="2" fill="#4ECDC4" stroke="#2D3047" stroke-width="2"/>
        <rect x="158" y="173" width="10" height="6" rx="1" fill="#2D3047"/>
        <text x="159" y="178" font-size="6" fill="#FFE66D" font-weight="bold">12</text>
        <!-- 表带左 -->
        <line x1="156" y1="172" x2="153" y2="170" stroke="#2D3047" stroke-width="2"/>
        <line x1="156" y1="180" x2="153" y2="182" stroke="#2D3047" stroke-width="2"/>
        <!-- 表带右 -->
        <line x1="170" y1="172" x2="173" y2="170" stroke="#2D3047" stroke-width="2"/>
        <line x1="170" y1="180" x2="173" y2="182" stroke="#2D3047" stroke-width="2"/>
      </g>
    ` : '';

    // 🧦 袜子(腿和鞋之间)
    const socks = has.sock ? `
      <g>
        <rect x="80" y="218" width="22" height="12" rx="2" fill="#FFB6D9" stroke="#2D3047" stroke-width="2"/>
        <rect x="118" y="218" width="22" height="12" rx="2" fill="#FFB6D9" stroke="#2D3047" stroke-width="2"/>
        <!-- 条纹 -->
        <line x1="82" y1="222" x2="100" y2="222" stroke="#FF6B6B" stroke-width="2"/>
        <line x1="120" y1="222" x2="138" y2="222" stroke="#FF6B6B" stroke-width="2"/>
        <line x1="82" y1="226" x2="100" y2="226" stroke="#FFE66D" stroke-width="2"/>
        <line x1="120" y1="226" x2="138" y2="226" stroke="#FFE66D" stroke-width="2"/>
      </g>
    ` : '';

    // 🌌 银河披风(替代普通披风)
    const galaxyCape = has.galaxy ? `
      <g>
        <path d="M 70 132 Q 30 180 15 232 L 80 232 Q 90 180 88 138 Z"
              fill="url(#galaxyGrad)" stroke="#2D3047" stroke-width="3" opacity="0.95">
          <animateTransform attributeName="transform" type="rotate" values="-2 80 130;2 80 130;-2 80 130" dur="3s" repeatCount="indefinite"/>
        </path>
        <path d="M 150 132 Q 190 180 205 232 L 140 232 Q 130 180 132 138 Z"
              fill="url(#galaxyGrad)" stroke="#2D3047" stroke-width="3" opacity="0.95">
          <animateTransform attributeName="transform" type="rotate" values="2 140 130;-2 140 130;2 140 130" dur="3s" repeatCount="indefinite"/>
        </path>
        <!-- 星星散布 -->
        <text x="40" y="170" font-size="10" fill="#FFE66D">✦</text>
        <text x="60" y="200" font-size="8" fill="white">★</text>
        <text x="170" y="180" font-size="10" fill="#FFE66D">✦</text>
        <text x="180" y="210" font-size="8" fill="white">★</text>
      </g>
      <defs>
        <linearGradient id="galaxyGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#A788E0"/>
          <stop offset="50%" stop-color="#4338a0"/>
          <stop offset="100%" stop-color="#1a0d40"/>
        </linearGradient>
      </defs>
    ` : '';

    // 📱 手机(右手另一面,如果没有铅笔剑,或者作为额外装饰)
    const phone = has.phone ? `
      <g transform="translate(165, 175) rotate(10)">
        <rect x="-6" y="-12" width="12" height="22" rx="2.5" fill="#2D3047" stroke="#2D3047" stroke-width="1.5"/>
        <rect x="-5" y="-10" width="10" height="16" rx="1" fill="#4ECDC4"/>
        <text x="-3" y="2" font-size="8" fill="white">📚</text>
        <circle cx="0" cy="8" r="1" fill="#666"/>
      </g>
    ` : '';

    // 🚀 火箭(在角色左上方飞,带轨迹)
    const rocket = has.rocket ? `
      <g>
        <g transform="translate(25, 30)">
          <animateTransform attributeName="transform" type="translate" values="25,30;30,25;25,30" dur="2s" repeatCount="indefinite"/>
          <!-- 主体 -->
          <ellipse cx="0" cy="0" rx="6" ry="14" fill="#FF6B6B" stroke="#2D3047" stroke-width="2"/>
          <!-- 火箭头(顶) -->
          <polygon points="-6,-8 6,-8 0,-18" fill="#FFE66D" stroke="#2D3047" stroke-width="2"/>
          <!-- 窗口 -->
          <circle cx="0" cy="-2" r="3" fill="#4ECDC4" stroke="#2D3047" stroke-width="1.5"/>
          <!-- 鳍 -->
          <polygon points="-6,8 -10,16 -3,12" fill="#FF6B6B" stroke="#2D3047" stroke-width="1.5"/>
          <polygon points="6,8 10,16 3,12" fill="#FF6B6B" stroke="#2D3047" stroke-width="1.5"/>
          <!-- 火焰 -->
          <ellipse cx="0" cy="18" rx="4" ry="8" fill="#FFE66D">
            <animate attributeName="ry" values="8;5;8" dur="0.4s" repeatCount="indefinite"/>
          </ellipse>
          <ellipse cx="0" cy="20" rx="2" ry="5" fill="#FF6B6B">
            <animate attributeName="ry" values="5;3;5" dur="0.4s" repeatCount="indefinite"/>
          </ellipse>
        </g>
      </g>
    ` : '';

    // 💎 钻石(头顶上方飘,带闪光)
    const diamond = has.diamond ? `
      <g transform="translate(110, 8)">
        <animateTransform attributeName="transform" type="translate" values="110,8;110,4;110,8" dur="1.6s" repeatCount="indefinite"/>
        <!-- 钻石本体 -->
        <polygon points="0,-8 -10,-2 -6,8 6,8 10,-2" fill="#4ECDC4" stroke="#2D3047" stroke-width="1.5"/>
        <polygon points="0,-8 -6,-2 0,2 6,-2" fill="#A0E8F0"/>
        <line x1="-10" y1="-2" x2="10" y2="-2" stroke="#2D3047" stroke-width="1"/>
        <!-- 闪光 -->
        <text x="-15" y="-10" font-size="8" fill="#FFE66D">
          <animate attributeName="opacity" values="1;0.3;1" dur="1s" repeatCount="indefinite"/>
          ✨
        </text>
        <text x="10" y="-10" font-size="8" fill="#FFE66D">
          <animate attributeName="opacity" values="0.3;1;0.3" dur="1s" repeatCount="indefinite"/>
          ✨
        </text>
      </g>
    ` : '';

    // 🎯 月度王徽章(胸前)
    const medal = has.monthking ? `
      <g transform="translate(110, 165)">
        <circle cx="0" cy="0" r="10" fill="#FFE66D" stroke="#2D3047" stroke-width="2"/>
        <circle cx="0" cy="0" r="6" fill="#FF6B6B" stroke="#2D3047" stroke-width="1.5"/>
        <text x="-3" y="3" font-size="9" font-weight="bold" fill="white">王</text>
        <!-- 飘带 -->
        <polygon points="-7,7 -10,18 -4,14" fill="#FF6B6B" stroke="#2D3047" stroke-width="1"/>
        <polygon points="7,7 10,18 4,14" fill="#FF6B6B" stroke="#2D3047" stroke-width="1"/>
      </g>
    ` : '';

    // 围绕角色的小道具浮动(用 emoji text,简单)
    // 位置:左上 笔记本 / 右上 饼干 / 中左 苹果 / 中右 水杯
    // v5: 皮肤配件层
    const skinAccessory = (() => {
      switch (skin.accessory) {
        case 'scholarSash': return `
          <!-- 学者绶带(从肩膀斜挎到腰) -->
          <path d="M 75 130 L 145 175 L 152 188 L 82 143 Z" fill="#FFD700" stroke="#2D3047" stroke-width="2" opacity="0.85"/>
          <text x="105" y="160" font-size="10" fill="#2D3047">学</text>`;
        case 'labGoggles': return `
          <!-- 护目镜(在头顶,正常眼睛后面) -->
          <g opacity="0.9">
            <ellipse cx="90" cy="50" rx="14" ry="10" fill="#4ECDC4" stroke="#2D3047" stroke-width="2.5" opacity="0.7"/>
            <ellipse cx="130" cy="50" rx="14" ry="10" fill="#4ECDC4" stroke="#2D3047" stroke-width="2.5" opacity="0.7"/>
            <line x1="104" y1="50" x2="116" y2="50" stroke="#2D3047" stroke-width="3"/>
          </g>`;
        case 'explorerCap': return `
          <!-- 探险帽 -->
          <g>
            <ellipse cx="110" cy="38" rx="58" ry="6" fill="#8B7355" stroke="#2D3047" stroke-width="3"/>
            <path d="M 75 38 Q 75 18 110 16 Q 145 18 145 38 Z" fill="#8B7355" stroke="#2D3047" stroke-width="3"/>
            <rect x="75" y="32" width="70" height="6" fill="#5A4632"/>
          </g>`;
        case 'heroMask': return `
          <!-- 英雄面具(蒙眼) -->
          <path d="M 65 70 Q 110 60 155 70 Q 155 88 110 90 Q 65 88 65 70 Z"
                fill="#FF6B6B" stroke="#2D3047" stroke-width="3" opacity="0.92"/>
          <ellipse cx="90" cy="78" rx="9" ry="9" fill="white"/>
          <ellipse cx="130" cy="78" rx="9" ry="9" fill="white"/>
          <ellipse cx="90" cy="78" rx="6" ry="8" fill="#2D3047"/>
          <ellipse cx="130" cy="78" rx="6" ry="8" fill="#2D3047"/>`;
        case 'masterCrown': return `
          <!-- PSLE 大师皇冠(更华丽) -->
          <g>
            <polygon points="60,55 72,28 90,46 110,18 130,46 148,28 160,55"
                     fill="#FFD700" stroke="#2D3047" stroke-width="3"/>
            <circle cx="72" cy="34" r="5" fill="#FF6B6B" stroke="#2D3047" stroke-width="2"/>
            <circle cx="110" cy="24" r="6" fill="#4ECDC4" stroke="#2D3047" stroke-width="2"/>
            <circle cx="148" cy="34" r="5" fill="#FF6B6B" stroke="#2D3047" stroke-width="2"/>
            <rect x="60" y="55" width="100" height="9" fill="#FFA500" stroke="#2D3047" stroke-width="2"/>
            <text x="100" y="20" font-size="14" fill="#FFE66D">
              <animate attributeName="opacity" values="1;0.4;1" dur="1.2s" repeatCount="indefinite"/>
              ✨
            </text>
            <text x="120" y="22" font-size="12" fill="#FFE66D">
              <animate attributeName="opacity" values="0.4;1;0.4" dur="1.5s" repeatCount="indefinite"/>
              ✨
            </text>
          </g>
          <!-- 证书 在手 -->
          <g transform="translate(58, 195)">
            <rect x="-10" y="-15" width="20" height="14" fill="#FFFAF0" stroke="#2D3047" stroke-width="2"/>
            <text x="-7" y="-5" font-size="8" fill="#2D3047">📜</text>
          </g>`;
        default: return '';
      }
    })();

    const floatingItems = `
      ${has.note ? `<text x="3" y="78" font-size="20"><animate attributeName="y" values="78;74;78" dur="2.5s" repeatCount="indefinite"/>📒</text>` : ''}
      ${has.cookie ? `<text x="195" y="78" font-size="18"><animate attributeName="y" values="78;74;78" dur="2.2s" repeatCount="indefinite"/>🍪</text>` : ''}
      ${has.apple ? `<text x="3" y="135" font-size="18"><animate attributeName="y" values="135;131;135" dur="2.8s" repeatCount="indefinite"/>🍎</text>` : ''}
      ${has.cup ? `<text x="195" y="135" font-size="18"><animate attributeName="y" values="135;131;135" dur="2.4s" repeatCount="indefinite"/>🥤</text>` : ''}
    `;

    return `
      <svg viewBox="0 0 220 240" xmlns="http://www.w3.org/2000/svg">
        ${fireBackground}
        ${rocket}
        ${has.galaxy ? galaxyCape : cape}
        ${bag}
        ${body}
        ${hat}
        ${crown}
        ${headphone}
        ${glasses}
        ${diamond}
        ${sword}
        ${phone}
        ${showTube ? tube : ''}
        ${shield}
        ${watch}
        ${socks}
        ${medal}
        ${trophy}
        ${skinAccessory}
        ${floatingItems}
      </svg>
    `;
  }
};

window.CHAMUI = CHAMUI;
