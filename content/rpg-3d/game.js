(function () {
  "use strict";

  // --- 言語設定 (?lang=en / ?lang=ja または localStorage) ---
  const LANG_KEY = "ligfil_mystery_dungeon_lang";
  const urlLangParam = new URLSearchParams(window.location.search).get("lang");
  let lang = urlLangParam === "en" ? "en" : urlLangParam === "ja" ? "ja" : (localStorage.getItem(LANG_KEY) === "en" ? "en" : "ja");
  if (urlLangParam === "en" || urlLangParam === "ja") {
    try { localStorage.setItem(LANG_KEY, urlLangParam); } catch (_e) {}
  }
  const isEn = () => lang === "en";
  const L = (ja, en) => (lang === "en" ? en : ja);

  // --- 基本定数 ---
  const MAP_W = 34;
  const MAP_H = 24;
  const TILE_PX = 64;
  const SAVE_KEY = "ligfil_mystery_dungeon_v1";

  const T = {
    WALL: 0,
    FLOOR: 1,
    WATER: 2,
    PILLAR: 3,
    STAIRS: 4,
    RUNE: 5,
  };

  const BIOMES = [
    {
      name: "天空の石窟",
      nameEn: "Sky Cavern",
      sky: 0x38bdf8,
      fog: 0x60a5fa,
      floorA: "#dfb372",
      floorB: "#d09e5c",
      mossA: "#7ec44b",
      mossB: "#68ac38",
      wallTop: "#a68567",
      wallSide: "#76573d",
      water: 0x0ea5e9,
      torch: 0xffa726,
      ambient: 0xe0f2fe,
      sun: 0xfff7ed,
    },
    {
      name: "紅蓮の溶岩窟",
      nameEn: "Crimson Lava Cavern",
      sky: 0x7c2d12,
      fog: 0x451a03,
      floorA: "#c97e54",
      floorB: "#b36740",
      mossA: "#d97706",
      mossB: "#b45309",
      wallTop: "#853827",
      wallSide: "#542016",
      water: 0xea580c,
      torch: 0xff7043,
      ambient: 0xfed7aa,
      sun: 0xffedd5,
    },
    {
      name: "蒼氷の星晶宮",
      nameEn: "Azure Star Palace",
      sky: 0x1e3a8a,
      fog: 0x1e40af,
      floorA: "#cbd5e1",
      floorB: "#b6c7dc",
      mossA: "#5eead4",
      mossB: "#2dd4bf",
      wallTop: "#6482a3",
      wallSide: "#3f5b7a",
      water: 0x0284c7,
      torch: 0x38bdf8,
      ambient: 0xe0f2fe,
      sun: 0xf0f9ff,
    },
    {
      name: "星辰の聖域",
      nameEn: "Astral Sanctum",
      sky: 0x312e81,
      fog: 0x1e1b4b,
      floorA: "#d2b184",
      floorB: "#be9a6b",
      mossA: "#86efac",
      mossB: "#4ade80",
      wallTop: "#6e4e85",
      wallSide: "#49305e",
      water: 0x7c3aed,
      torch: 0xfacc15,
      ambient: 0xf3e8ff,
      sun: 0xfef9c3,
    },
  ];

  function getBiome(floor) {
    if (floor <= 3) return BIOMES[0];
    if (floor <= 6) return BIOMES[1];
    if (floor <= 9) return BIOMES[2];
    return BIOMES[3];
  }

  // --- 装備・アイテム・敵データ ---
  const WEAPONS = [
    { id: "iron", name: "鉄の剣", nameEn: "Iron Sword", baseAtk: 6, color: "#e2e8f0", price: 0 },
    { id: "flame", name: "紅蓮の大剣", nameEn: "Crimson Greatsword", baseAtk: 13, color: "#fb923c", price: 320 },
    { id: "star", name: "星辰の聖剣", nameEn: "Astral Holy Blade", baseAtk: 22, color: "#38bdf8", price: 780 },
  ];

  const SHIELDS = [
    { id: "wood", name: "木の盾", nameEn: "Wooden Shield", baseDef: 4, color: "#b45309", price: 0 },
    { id: "knight", name: "騎士の盾", nameEn: "Knight's Shield", baseDef: 10, color: "#94a3b8", price: 280 },
    { id: "star", name: "星辰の大盾", nameEn: "Astral Greatshield", baseDef: 18, color: "#facc15", price: 700 },
  ];

  const ITEM_DEFS = {
    onigiri: { id: "onigiri", name: "おにぎり", nameEn: "Rice Ball", icon: "🍙", desc: "満腹度を 50% 回復", descEn: "Restores 50% fullness", price: 30, kind: "food", val: 50 },
    big_onigiri: { id: "big_onigiri", name: "大きなおにぎり", nameEn: "Large Rice Ball", icon: "🍙", desc: "満腹度を 100% 回復（満タンなら最大値+5）", descEn: "Restores 100% fullness (Max +5 if full)", price: 70, kind: "food", val: 100 },
    herb: { id: "herb", name: "やくそう", nameEn: "Medicinal Herb", icon: "🌿", desc: "HPを 35 回復（満タンなら最大HP+2）", descEn: "Restores 35 HP (Max HP +2 if full)", price: 35, kind: "heal", val: 35 },
    otogiri: { id: "otogiri", name: "弟切草", nameEn: "Otokiri Herb", icon: "🍀", desc: "HPを 90 回復（満タンなら最大HP+4）", descEn: "Restores 90 HP (Max HP +4 if full)", price: 95, kind: "heal", val: 90 },
    mana: { id: "mana", name: "星露の小瓶", nameEn: "Starlight Vial", icon: "🧪", desc: "MPを 15 回復", descEn: "Restores 15 MP", price: 55, kind: "mp", val: 15 },
    scroll_fire: { id: "scroll_fire", name: "火炎の巻物", nameEn: "Scroll of Flame", icon: "📜", desc: "周囲・部屋内の敵すべてに炎ダメージ", descEn: "Deals fire damage to all enemies in sight", price: 110, kind: "scroll_fire" },
    scroll_vacuum: { id: "scroll_vacuum", name: "真空斬りの巻物", nameEn: "Scroll of Vacuum", icon: "📜", desc: "視界内の敵すべてに大ダメージ", descEn: "Deals heavy damage to all enemies in sight", price: 160, kind: "scroll_vacuum" },
    staff_bind: { id: "staff_bind", name: "かなしばりの杖", nameEn: "Bind Staff", icon: "🪄", desc: "前方の敵を 6ターン 行動不能にする", descEn: "Paralyzes the target ahead for 6 turns", price: 100, kind: "staff_bind" },
    staff_blow: { id: "staff_blow", name: "吹き飛ばしの杖", nameEn: "Knockback Staff", icon: "🪄", desc: "前方の敵を吹き飛ばし壁衝突ダメージ", descEn: "Blasts the enemy back with wall impact damage", price: 90, kind: "staff_blow" },
    staff_swap: { id: "staff_swap", name: "場所替えの杖", nameEn: "Swap Staff", icon: "🪄", desc: "前方直線上の敵と位置を入れ替える", descEn: "Swaps positions with an enemy ahead", price: 95, kind: "staff_swap" },
    scroll_return: { id: "scroll_return", name: "帰還の巻物", nameEn: "Return Scroll", icon: "🌀", desc: "装備と所持金を持って拠点へ戻る", descEn: "Returns to Sky Sanctum with your gear and gold", price: 80, kind: "return" },
    smith_stone: { id: "smith_stone", name: "強化の秘石", nameEn: "Forge Gem", icon: "💎", desc: "拠点の鍛冶屋で装備強化に使える", descEn: "Used at the Smithy to upgrade weapons or shields", price: 180, kind: "material" },
  };

  const MONSTER_DEFS = {
    slime: { id: "slime", name: "ブルースライム", nameEn: "Blue Slime", hp: 22, atk: 8, def: 1, exp: 12, gold: 14, color: "#38bdf8", minF: 1, maxF: 4 },
    shadow_rogue: { id: "shadow_rogue", name: "影のローグ", nameEn: "Shadow Rogue", hp: 32, atk: 12, def: 3, exp: 22, gold: 26, color: "#334155", minF: 1, maxF: 6 },
    goblin: { id: "goblin", name: "森ゴブリン", nameEn: "Forest Goblin", hp: 34, atk: 11, def: 3, exp: 20, gold: 22, color: "#4ade80", minF: 1, maxF: 5 },
    gargoyle: { id: "gargoyle", name: "石のガーゴイル", nameEn: "Stone Gargoyle", hp: 46, atk: 15, def: 5, exp: 34, gold: 36, color: "#94a3b8", minF: 2, maxF: 7 },
    ice_mage: { id: "ice_mage", name: "蒼帽のウィザード", nameEn: "Azure Wizard", hp: 56, atk: 19, def: 5, exp: 52, gold: 54, color: "#3b82f6", ranged: "ice", minF: 3, maxF: 12 },
    fire_lizard: { id: "fire_lizard", name: "火炎トカゲ", nameEn: "Flame Lizard", hp: 66, atk: 21, def: 6, exp: 58, gold: 56, color: "#f97316", ranged: "fire", minF: 4, maxF: 9 },
    shadow_knight: { id: "shadow_knight", name: "黒曜の騎士", nameEn: "Obsidian Knight", hp: 108, atk: 32, def: 11, exp: 105, gold: 96, color: "#c084fc", minF: 7, maxF: 99 },
    boss_ifrit: { id: "boss_ifrit", name: "炎獄のガーディアン", nameEn: "Infernal Guardian", hp: 165, atk: 27, def: 8, exp: 180, gold: 240, color: "#ef4444", ranged: "fire", isBoss: true },
    boss_zargaus: { id: "boss_zargaus", name: "星喰らいの魔王ザルガウス", nameEn: "Zargaus, Star-Eater Demon Lord", hp: 320, atk: 39, def: 13, exp: 500, gold: 650, color: "#a855f7", ranged: "dark", isBoss: true },
  };

  const TRAP_TYPES = [
    { id: "mine", name: "地雷のワナ", nameEn: "Landmine Trap", icon: "💥" },
    { id: "poison", name: "毒矢のワナ", nameEn: "Poison Arrow Trap", icon: "🏹" },
    { id: "warp", name: "ワープのワナ", nameEn: "Warp Trap", icon: "🌀" },
    { id: "sleep", name: "眠りガスのワナ", nameEn: "Sleep Gas Trap", icon: "💤" },
  ];

  const biomeName = (b) => (isEn() ? b.nameEn : b.name);
  const weaponName = (w) => (isEn() ? w.nameEn : w.name);
  const shieldName = (s) => (isEn() ? s.nameEn : s.name);
  const itemName = (d) => (isEn() ? d.nameEn : d.name);
  const itemDesc = (d) => (isEn() ? d.descEn : d.desc);
  const monName = (m) => (isEn() ? m.nameEn : m.name);

  // --- Web Audio モダンシンセ効果音＆オーケストラ風エンディング楽曲 ---
  class AudioFX {
    constructor() {
      this.ctx = null;
      this.on = true;
      this.bgmNodes = [];
      this.bgmTimers = [];
    }
    unlock() {
      if (!this.ctx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (AC) this.ctx = new AC();
      }
      if (this.ctx && this.ctx.state === "suspended") this.ctx.resume().catch(() => {});
    }
    play(freq, dur, type = "triangle", vol = 0.06, delay = 0) {
      if (!this.on || !this.ctx || this.ctx.state !== "running") return;
      const t = this.ctx.currentTime + delay;
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, t);
      g.gain.setValueAtTime(vol, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      osc.connect(g);
      g.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + dur + 0.02);
    }
    playVoice(freq, dur, type = "triangle", vol = 0.05, delay = 0, filterFreq = 2600) {
      if (!this.on || !this.ctx || this.ctx.state !== "running") return null;
      const t = this.ctx.currentTime + Math.max(0, delay);
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, t);
      const atk = Math.min(0.025, dur * 0.25);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(vol, t + atk);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      if (filterFreq > 0) {
        const flt = this.ctx.createBiquadFilter();
        flt.type = "lowpass";
        flt.frequency.setValueAtTime(filterFreq, t);
        osc.connect(flt);
        flt.connect(g);
      } else {
        osc.connect(g);
      }
      g.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + dur + 0.03);
      this.bgmNodes.push(osc);
      osc.onended = () => {
        const idx = this.bgmNodes.indexOf(osc);
        if (idx >= 0) this.bgmNodes.splice(idx, 1);
      };
      return osc;
    }
    stopEndingBgm() {
      this.bgmTimers.forEach((id) => {
        clearTimeout(id);
        clearInterval(id);
      });
      this.bgmTimers = [];
      this.bgmNodes.slice().forEach((osc) => {
        try {
          osc.stop();
          osc.disconnect();
        } catch (_e) {}
      });
      this.bgmNodes = [];
    }
    startEndingBgm() {
      this.stopEndingBgm();
      if (!this.on || !this.ctx || this.ctx.state !== "running") return false;

      // 第1幕 (0.0s - 5.4s): 魔王討伐の震え＆聖なる星の輝きバースト
      this.playVoice(65.41, 2.2, "sawtooth", 0.045, 0.0, 320);
      this.playVoice(49.00, 2.8, "sawtooth", 0.045, 1.4, 280);
      [261.63, 329.63, 392.00, 523.25, 659.25, 783.99, 1046.50].forEach((f, idx) => {
        this.playVoice(f, 0.9, "sine", 0.042, 0.4 + idx * 0.42, 3400);
      });
      // 3.8s 浄化の輝きチャイムバースト
      [523.25, 659.25, 783.99, 1046.50, 1318.51].forEach((f, idx) => {
        this.playVoice(f, 2.1, "triangle", 0.055, 3.8 + idx * 0.07, 4200);
      });

      // 第2幕 (5.6s - 10.8s): 荘厳なJRPG勝利ファンファーレ
      const fanfare = [
        [392.00, 0.16, 5.60],
        [523.25, 0.16, 5.78],
        [659.25, 0.16, 5.96],
        [783.99, 0.72, 6.14],
        [698.46, 0.24, 6.95],
        [880.00, 0.56, 7.22],
        [783.99, 0.22, 7.86],
        [987.77, 0.24, 8.12],
        [1046.50, 2.10, 8.40],
      ];
      fanfare.forEach(([f, dur, d]) => {
        this.playVoice(f, dur, "triangle", 0.072, d, 3200);
        this.playVoice(f * 0.5, dur, "sawtooth", 0.025, d, 900);
      });
      [130.81, 174.61, 196.00, 130.81].forEach((f, idx) => {
        this.playVoice(f, 0.85, "triangle", 0.05, 5.6 + idx * 0.9, 700);
      });
      [523.25, 659.25, 783.99, 1046.50, 1318.51].forEach((f, idx) => {
        this.playVoice(f, 1.4, "sine", 0.04, 8.4 + idx * 0.10, 4000);
      });

      // 第3〜5幕 (11.2s〜, 19.2sループ): 夜明けと星空のエンディング・バラード
      const scheduleBallad = (baseDelay) => {
        if (!this.on || !this.ctx || this.ctx.state !== "running") return;
        const chords = [
          { bass: 130.81, pad: [261.63, 329.63, 392.00], mel: [[523.25, 0.9], [659.25, 0.5], [783.99, 0.9]] }, // C
          { bass: 123.47, pad: [246.94, 293.66, 392.00], mel: [[783.99, 0.7], [659.25, 0.6], [587.33, 1.0]] }, // G/B
          { bass: 110.00, pad: [220.00, 261.63, 329.63], mel: [[523.25, 0.8], [587.33, 0.5], [659.25, 1.0]] }, // Am
          { bass: 82.41,  pad: [196.00, 246.94, 329.63], mel: [[493.88, 0.8], [392.00, 0.6], [329.63, 0.9]] }, // Em
          { bass: 87.31,  pad: [174.61, 220.00, 261.63], mel: [[440.00, 0.8], [523.25, 0.6], [698.46, 0.9]] }, // F
          { bass: 130.81, pad: [261.63, 329.63, 392.00], mel: [[659.25, 0.7], [587.33, 0.5], [523.25, 1.1]] }, // C/E
          { bass: 73.42,  pad: [174.61, 220.00, 293.66], mel: [[440.00, 0.7], [587.33, 0.6], [523.25, 1.0]] }, // Dm7
          { bass: 98.00,  pad: [196.00, 246.94, 349.23], mel: [[392.00, 0.8], [493.88, 0.6], [587.33, 0.9]] }, // G7
        ];
        const bar = 2.4;
        chords.forEach((ch, bi) => {
          const bt = baseDelay + bi * bar;
          // ベース
          this.playVoice(ch.bass, bar * 0.92, "triangle", 0.048, bt, 620);
          // 温かなストリングス和音
          ch.pad.forEach((pf) => {
            this.playVoice(pf, bar * 0.95, "sawtooth", 0.017, bt + 0.03, 980);
          });
          // ハープ分散和音（8分音符）
          const harpNotes = [ch.pad[0], ch.pad[1], ch.pad[2], ch.pad[0] * 2, ch.pad[2], ch.pad[1]];
          harpNotes.forEach((hf, hi) => {
            this.playVoice(hf, 0.65, "sine", 0.025, bt + hi * 0.38, 3200);
          });
          // ベル風の主旋律
          let mt = bt;
          ch.mel.forEach(([mf, md]) => {
            this.playVoice(mf, md + 0.18, "triangle", 0.048, mt, 2800);
            this.playVoice(mf, md + 0.24, "sine", 0.024, mt, 3600);
            mt += md;
          });
        });
      };

      scheduleBallad(11.2);
      const startTimer = setTimeout(() => {
        scheduleBallad(0.05);
        const loopInt = setInterval(() => {
          scheduleBallad(0.05);
        }, 19200);
        this.bgmTimers.push(loopInt);
      }, 11200 + 19150);
      this.bgmTimers.push(startTimer);
      return true;
    }
    step() { this.play(170, 0.035, "sine", 0.02); }
    hit() { this.play(420, 0.06, "sawtooth", 0.07); this.play(190, 0.09, "square", 0.05, 0.03); }
    hurt() { this.play(140, 0.11, "sawtooth", 0.08); }
    magic() { this.play(520, 0.08, "sine", 0.07); this.play(780, 0.14, "triangle", 0.07, 0.06); }
    pickup() { this.play(660, 0.06, "sine", 0.06); this.play(880, 0.1, "sine", 0.06, 0.05); }
    stairs() { [392, 494, 587, 784].forEach((f, i) => this.play(f, 0.12, "triangle", 0.06, i * 0.06)); }
    lvUp() { [523, 659, 784, 1046].forEach((f, i) => this.play(f, 0.15, "triangle", 0.08, i * 0.09)); }
    trap() { this.play(260, 0.09, "sawtooth", 0.08); this.play(110, 0.18, "sawtooth", 0.08, 0.08); }
    defeat() {
      [392, 349, 311, 261, 196].forEach((f, i) => this.play(f, 0.22, "sawtooth", 0.075, i * 0.13));
    }
  }
  const sfx = new AudioFX();

  // --- プレイヤー＆永続RPGデータ ---
  function defaultSave() {
    return {
      lv: 1,
      exp: 0,
      nextExp: 30,
      sp: 1,
      hp: 45,
      maxHp: 45,
      mp: 20,
      maxMp: 20,
      food: 100,
      maxFood: 100,
      baseAtk: 7,
      baseDef: 3,
      gold: 120,
      weaponIdx: 0,
      weaponPlus: 0,
      shieldIdx: 0,
      shieldPlus: 0,
      maxReachedFloor: 1,
      clearedB10: false,
      skills: { spin: 1, fire: 1, heal: 1, crit: 0, tough: 0 },
      bag: ["onigiri", "herb", "herb", "scroll_fire", "staff_bind", "scroll_return"],
    };
  }

  let save = defaultSave();

  function loadSave() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed.lv === "number") {
        save = Object.assign(defaultSave(), parsed);
        save.skills = Object.assign(defaultSave().skills, parsed.skills || {});
        if (!Array.isArray(save.bag)) save.bag = defaultSave().bag;
      }
    } catch (_e) {}
  }

  function persistSave() {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(save));
    } catch (_e) {}
  }

  function encodeSave() {
    const bytes = new TextEncoder().encode(JSON.stringify(save));
    let b = "";
    for (let i = 0; i < bytes.length; i++) b += String.fromCharCode(bytes[i]);
    return btoa(b);
  }

  function decodeSave(str) {
    const bin = atob(str.trim());
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    const parsed = JSON.parse(new TextDecoder().decode(bytes));
    if (!parsed || typeof parsed.lv !== "number") throw new Error("invalid");
    const merged = Object.assign(defaultSave(), parsed);
    merged.skills = Object.assign(defaultSave().skills, parsed.skills || {});
    return merged;
  }

  loadSave();

  function getTotalAtk() {
    return save.baseAtk + WEAPONS[save.weaponIdx].baseAtk + save.weaponPlus * 2;
  }
  function getTotalDef() {
    return save.baseDef + SHIELDS[save.shieldIdx].baseDef + save.shieldPlus * 2;
  }
  function getMaxHp() {
    return save.maxHp + (save.skills.tough || 0) * 15;
  }
  function getCritChance() {
    return 0.1 + (save.skills.crit || 0) * 0.08;
  }

  // --- ダンジョン実行状態 ---
  let inTown = false;
  let isDefeated = false;
  let isEndingPlaying = false;
  let pendingEndingMovie = false;
  let endingTimerId = null;
  let endingReplayFromTown = false;
  let floorNum = 1;
  let turnCount = 0;
  let runKills = 0;
  let lastDamageCause = "";
  let pendingDefeatGoldLoss = 0;
  let damageFlashTimer = null;
  let defeatModalTimer = null;
  let foodStepAcc = 0;
  let grid = [];
  let roomIds = [];
  let rooms = [];
  let visible = [];
  let explored = [];
  let torches = [];
  let floorItems = [];
  let traps = [];
  let enemies = [];
  let stairsPos = { x: 1, y: 1 };
  let stairsFoundNotified = false;
  let turnDirOnly = false;
  let waitingStairsPrompt = false;

  const player = {
    x: 2,
    y: 2,
    rx: 2,
    ry: 2,
    dx: 0,
    dy: 1,
    lungeX: 0,
    lungeY: 0,
    walkPhase: 0,
    swingTimer: 0,
    hitFlash: 0,
    sleepTurns: 0,
    atkDebuff: 0,
  };

  // --- 演出エフェクト・カメラ・パーティクル・背景雲 ---
  const fxList = [];
  const floatNums = [];
  const ambientDust = [];
  for (let i = 0; i < 34; i++) {
    ambientDust.push({
      x: Math.random() * MAP_W * TILE_PX,
      y: Math.random() * MAP_H * TILE_PX,
      r: 1.4 + Math.random() * 2.2,
      vx: (Math.random() - 0.5) * 8,
      vy: -4 - Math.random() * 8,
    });
  }
  const ambientClouds = [
    { x: 0.12, y: 0.14, s: 1.15, spd: 0.008 },
    { x: 0.48, y: 0.09, s: 0.85, spd: 0.006 },
    { x: 0.84, y: 0.18, s: 1.3, spd: 0.007 },
    { x: 0.08, y: 0.72, s: 1.25, spd: 0.009 },
    { x: 0.62, y: 0.84, s: 1.0, spd: 0.005 },
    { x: 0.92, y: 0.68, s: 1.2, spd: 0.008 },
  ];
  let shakeTime = 0;
  let camX = 0;
  let camY = 0;

  // --- DOM参照 ---
  const canvas = document.getElementById("dungeon-canvas");
  const fxCanvas = document.getElementById("fx-canvas");
  const fxCtx = fxCanvas.getContext("2d");
  const mmCanvas = document.getElementById("minimap-canvas");
  const mmCtx = mmCanvas.getContext("2d");

  const ui = {
    app: document.getElementById("md-app"),
    floor: document.getElementById("hud-floor"),
    lv: document.getElementById("hud-lv"),
    barHp: document.getElementById("bar-hp"),
    txtHp: document.getElementById("txt-hp"),
    barMp: document.getElementById("bar-mp"),
    txtMp: document.getElementById("txt-mp"),
    barFood: document.getElementById("bar-food"),
    txtFood: document.getElementById("txt-food"),
    gold: document.getElementById("hud-gold"),
    biome: document.getElementById("biome-label"),
    chipWeapon: document.getElementById("chip-weapon"),
    chipShield: document.getElementById("chip-shield"),
    logFeed: document.getElementById("log-feed"),
    damageFlash: document.getElementById("damage-flash"),
    lowHpVignette: document.getElementById("low-hp-vignette"),
    defeatOverlay: document.getElementById("defeat-overlay"),
    defeatCause: document.getElementById("defeat-cause"),
    defeatStats: document.getElementById("defeat-stats"),
    stairsPrompt: document.getElementById("stairs-prompt"),
    stairsDesc: document.getElementById("stairs-desc"),
    townOverlay: document.getElementById("town-overlay"),
    townGold: document.getElementById("town-gold-val"),
    townSp: document.getElementById("town-sp-val"),
    townBody: document.getElementById("town-body"),
    invModal: document.getElementById("inv-modal"),
    saveModal: document.getElementById("save-modal"),
    endingOverlay: document.getElementById("ending-overlay"),
    endingFlash: document.getElementById("ending-flash"),
    endingTitleBanner: document.getElementById("ending-title-banner"),
    endingCredits: document.getElementById("ending-credits"),
    endingCreditsInner: document.getElementById("ending-credits-inner"),
    endingSubtitle: document.getElementById("ending-subtitle"),
    endingResultCard: document.getElementById("ending-result-card"),
    endingStats: document.getElementById("ending-stats"),
    btnEndingAudio: document.getElementById("btn-ending-audio"),
    btnEndingSkip: document.getElementById("btn-ending-skip"),
    btnLang: document.getElementById("btn-lang"),
  };

  function setElText(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
  }

  function setElHtml(id, html) {
    const el = document.getElementById(id);
    if (el) el.innerHTML = html;
  }

  function renderDefeatStats() {
    if (!ui.defeatStats) return;
    ui.defeatStats.innerHTML = `
      <div class="defeat-stat-box"><span>${L("到達階層", "Floor Reached")}</span><strong>B${floorNum}F</strong></div>
      <div class="defeat-stat-box"><span>${L("今回倒した敵", "Enemies Slain")}</span><strong>${L(`${runKills} 体`, `${runKills}`)}</strong></div>
      <div class="defeat-stat-box"><span>${L("落としたG", "Gold Dropped")}</span><strong>-${pendingDefeatGoldLoss} G</strong></div>
    `;
  }

  function buildEndingOverlayTexts() {
    if (ui.endingCreditsInner) {
      ui.endingCreditsInner.innerHTML = `
        <div class="ec-head">TITLE</div>
        <div class="ec-line">${L("星辰の迷宮 〜空中遺跡の不思議のダンジョンRPG〜", "Astral Labyrinth — 3D Mystery Dungeon RPG")}</div>
        <div class="ec-head">STARRING HERO</div>
        <div class="ec-line">${L(`星辰の騎士（あなた） · Lv.${save.lv}`, `Astral Knight (You) · Lv.${save.lv}`)}</div>
        <div class="ec-line">${L("愛用の剣：", "Weapon: ")}${weaponName(WEAPONS[save.weaponIdx])}+${save.weaponPlus}</div>
        <div class="ec-line">${L("愛用の盾：", "Shield: ")}${shieldName(SHIELDS[save.shieldIdx])}+${save.shieldPlus}</div>
        <div class="ec-head">CAST OF SKY SANCTUM</div>
        <div class="ec-line">${monName(MONSTER_DEFS.boss_zargaus)}</div>
        <div class="ec-line">${monName(MONSTER_DEFS.boss_ifrit)}</div>
        <div class="ec-line">${monName(MONSTER_DEFS.slime)} · ${monName(MONSTER_DEFS.shadow_rogue)}</div>
        <div class="ec-line">${monName(MONSTER_DEFS.gargoyle)} · ${monName(MONSTER_DEFS.ice_mage)}</div>
        <div class="ec-head">RECORD OF ADVENTURE</div>
        <div class="ec-line">${L(`最高到達階層：B${save.maxReachedFloor}F`, `Deepest Floor Reached: B${save.maxReachedFloor}F`)}</div>
        <div class="ec-line">${L(`今回倒した魔物：${runKills} 体`, `Monsters Slain This Run: ${runKills}`)}</div>
        <div class="ec-head">SPECIAL THANKS</div>
        <div class="ec-line">${L("星見の宿場の人々", "The People of Sky Sanctum")}</div>
        <div class="ec-line">${L("そして ここまで遊び抜いた すべての冒険者へ", "And to Every Adventurer Who Played to the End")}</div>
        <div class="ec-fin">— FIN —</div>
      `;
    }
    if (ui.endingStats) {
      ui.endingStats.innerHTML = `
        <div class="defeat-stat-box"><span>${L("最終レベル", "Final Level")}</span><strong>Lv.${save.lv}</strong></div>
        <div class="defeat-stat-box"><span>${L("装備", "Gear")}</span><strong>${weaponName(WEAPONS[save.weaponIdx])}+${save.weaponPlus} / ${shieldName(SHIELDS[save.shieldIdx])}+${save.shieldPlus}</strong></div>
        <div class="defeat-stat-box"><span>${L("討伐数", "Slain")}</span><strong>${L(`${runKills} 体`, `${runKills}`)}</strong></div>
        <div class="defeat-stat-box"><span>${L("所持ゴールド", "Gold")}</span><strong>${save.gold} G</strong></div>
      `;
    }
    setElText("btn-ending-continue", endingReplayFromTown ? L("🏘️ 拠点へ戻る", "🏘️ Back to Town") : L("⚔️ B11F以降の深淵へ進む", "⚔️ Enter B11F+ Astral Abyss"));
  }

  function applyLanguage(nextLang) {
    lang = nextLang === "en" ? "en" : "ja";
    try { localStorage.setItem(LANG_KEY, lang); } catch (_e) {}

    document.documentElement.lang = isEn() ? "en" : "ja";
    document.title = L("星辰の迷宮 〜空中遺跡の不思議のダンジョンRPG〜", "Astral Labyrinth — 3D Mystery Dungeon RPG");
    const metaDesc = document.getElementById("meta-desc");
    if (metaDesc) {
      metaDesc.setAttribute("content", L(
        "Three.jsで動く立体トゥーン調の不思議のダンジョン×RPG『星辰の迷宮』。PC・スマホのブラウザから登録不要・無料ですぐ遊べます。",
        "Play Astral Labyrinth, a free browser 3D Mystery Dungeon x RPG built with Three.js featuring procedural ruins, smithing, skills, and a 5-act ending movie."
      ));
    }

    setElText("lbl-food", L("満腹", "FOOD"));
    setElText("btn-inv", L("🎒 道具", "🎒 Bag"));
    const bInv = document.getElementById("btn-inv");
    if (bInv) bInv.title = L("持ち物・装備 (I)", "Bag & Stats (I)");
    setElText("btn-skill", L("✨ 特技", "✨ Skills"));
    const bSkill = document.getElementById("btn-skill");
    if (bSkill) bSkill.title = L("特技・スキル (K)", "Skills (K)");
    setElText("btn-town", L("🏘️ 拠点", "🏘️ Town"));
    const bTown = document.getElementById("btn-town");
    if (bTown) bTown.title = L("拠点メニュー", "Sky Sanctum Town");
    const bSave = document.getElementById("btn-save");
    if (bSave) bSave.title = L("記録", "Adventure Save");
    if (ui.btnLang) ui.btnLang.textContent = isEn() ? "🌐 日本語" : "🌐 EN";
    const bSound = document.getElementById("btn-sound");
    if (bSound) bSound.title = L("サウンド", "Sound");

    setElHtml("sk-spin", L("🌪️ 回転斬り<small>MP5</small>", "🌪️ Spin<small>MP5</small>"));
    const skSpin = document.getElementById("sk-spin");
    if (skSpin) skSpin.title = L("周囲8マス攻撃 (1)", "Attack all 8 adjacent tiles (1)");
    setElHtml("sk-fire", L("🔥 炎弾<small>MP4</small>", "🔥 Fire<small>MP4</small>"));
    const skFire = document.getElementById("sk-fire");
    if (skFire) skFire.title = L("前方直線ファイア (2)", "Straight firebolt ahead (2)");
    setElHtml("sk-heal", L("💚 ヒール<small>MP6</small>", "💚 Heal<small>MP6</small>"));
    const skHeal = document.getElementById("sk-heal");
    if (skHeal) skHeal.title = L("HP回復 (3)", "Restore HP (3)");
    setElText("sk-rest", L("⏳ 足踏み", "⏳ Wait"));
    const skRest = document.getElementById("sk-rest");
    if (skRest) skRest.title = L("1ターン足踏み (R)", "Pass 1 turn (R)");

    setElText("stairs-title", L("🪜 次の階層への階段", "🪜 Stairs to Next Floor"));
    if (waitingStairsPrompt && ui.stairsDesc) {
      ui.stairsDesc.textContent = L(`B${floorNum + 1}F（${biomeName(getBiome(floorNum + 1))}）へ降りますか？`, `Descend to B${floorNum + 1}F (${biomeName(getBiome(floorNum + 1))})?`);
    }
    setElText("btn-stairs-yes", L("次の階へ進む (Enter)", "Descend (Enter)"));
    setElText("btn-stairs-no", L("もう少し探索する", "Keep Exploring"));

    setElText("defeat-badge", L("GAME OVER · 冒険失敗", "GAME OVER · EXPEDITION FAILED"));
    setElText("defeat-heading", L("💀 力尽きてしまった……", "💀 You Have Fallen..."));
    setElText("defeat-note", L("※ レベル・SP・鍛えた武器と盾はそのまま保持されます。", "Note: Your Level, SP, and upgraded Weapon & Shield remain intact."));
    setElText("btn-defeat-return", L("🏘️ 星見の宿場へ戻る (Enter)", "🏘️ Return to Sky Sanctum (Enter)"));
    if (isDefeated && !ui.defeatOverlay.classList.contains("hidden")) renderDefeatStats();

    setElText("town-eyebrow", L("SKY SANCTUM · 星見の宿場", "SKY SANCTUM · SANCTUARY TOWN"));
    setElText("town-heading", L("星辰の迷宮 — 冒険の準備", "Astral Labyrinth — Expedition Prep"));
    setElText("town-gold-lbl", L("所持金:", "Gold:"));
    setElText("tab-dive", L("⚔️ 出発", "⚔️ Embark"));
    setElText("tab-smith", L("🔨 鍛冶屋", "🔨 Smithy"));
    setElText("tab-shop", L("🪙 道具屋", "🪙 Shop"));
    setElText("tab-skills", L("✨ スキル強化", "✨ Skills"));

    setElText("ctrl-help", L("移動: WASD / 矢印 / クリック | 攻撃: Space / Z | 斜め: Q E Z C | 足踏み: R | 道具: I", "Move: WASD / Arrows / Click | Attack: Space / Z | Diag: Q E Z C | Wait: R | Bag: I"));
    setElHtml("btn-turn-dir", L("🧭<small>向き</small>", "🧭<small>Turn</small>"));
    const bTurn = document.getElementById("btn-turn-dir");
    if (bTurn) bTurn.title = L("向きだけ変える (T)", "Change facing direction (T)");
    setElHtml("btn-attack", L("⚔️<small>攻撃</small>", "⚔️<small>Attack</small>"));
    const bAtk = document.getElementById("btn-attack");
    if (bAtk) bAtk.title = L("攻撃・調べる (Space)", "Attack / Act (Space)");

    setElText("btn-ending-audio", L("🔊 音楽を再生", "🔊 Play Music"));
    setElText("btn-ending-skip", L("⏭️ スキップ (Esc)", "⏭️ Skip (Esc)"));
    setElText("ending-banner-main", L("星辰の迷宮 — 魔王討伐達成", "Astral Labyrinth — Demon Lord Vanquished"));
    setElText("ending-badge-txt", L("👑 GRAND CLEAR · 星辰の英雄", "👑 GRAND CLEAR · HERO OF THE STARS"));
    setElText("ending-heading", L("魔王ザルガウス討伐 達成！", "Zargaus Defeated!"));
    setElText("ending-lead-txt", L("星辰の迷宮に再び朝の光が戻った。あなたの名は語り継がれるだろう。", "Morning light returns to Astral Labyrinth. Your legend will echo across the sky."));
    setElText("ending-note-txt", L("※ B11F以降の「星辰の深淵」が解放されました。拠点からいつでもエンディングを再視聴できます。", "The Astral Abyss (B11F+) is now unlocked. Replay this ending anytime from Town."));
    setElText("btn-ending-town", L("🏘️ 星見の宿場へ凱旋する", "🏘️ Return Triumphantly to Town"));
    if (isEndingPlaying && endingData) {
      endingData.lastSub = null;
      buildEndingOverlayTexts();
    }

    setElText("inv-title", L("🎒 持ち物・ステータス", "🎒 Bag & Status"));
    setElText("save-title", L("💾 冒険の記録（自動セーブ対応）", "💾 Adventure Save (Auto-Saved)"));
    setElText("btn-save-now", L("今すぐセーブ", "Save Now"));
    setElText("btn-reset-game", L("データを初期化", "Reset Data"));
    setElText("save-code-lbl", L("引き継ぎコード", "Transfer Code"));
    setElText("btn-copy-save", L("コピー", "Copy"));
    setElText("btn-load-save", L("コードから復元", "Load Code"));

    // 全画面プレイ時の下部フッター案内
    setElText("sf-title", L("星辰の迷宮（Astral Labyrinth）— 全画面プレイガイド", "Astral Labyrinth — Fullscreen Play Guide"));
    setElText("sf-top-btn", L("▲ ゲーム画面へ戻る", "▲ Back to Game"));
    setElText("sf-desc", L(
      "Three.jsで描かれる空中遺跡の不思議のダンジョンRPGです。ターン制のローグライク探索と、拠点「星見の宿場」での鍛冶強化・スキル育成を組み合わせて、B10Fに待ち受ける魔王ザルガウスの討伐を目指します。",
      "A 3D Mystery Dungeon x RPG set in floating sky ruins, powered by Three.js. Explore procedural floors turn-by-turn, upgrade weapons and skills at Sky Sanctum, and defeat Demon Lord Zargaus on B10F."
    ));
    setElHtml("sf-controls", L(
      "<strong>基本操作：</strong>移動（WASD / 矢印キー / 画面タップ・8方向パッド）｜ 斜め移動（Q / E / C）｜ 通常攻撃（Space / Z）｜ 向き変更（T）｜ 足踏み（R）｜ 道具（I）｜ 特技（K：回転斬り 1 / 炎弾 2 / ヒール 3）",
      "<strong>Controls:</strong> Move (WASD / Arrow keys / Tap / 8-way D-pad) | Diagonal (Q / E / C) | Attack (Space / Z) | Turn (T) | Wait (R) | Bag (I) | Skills (K: Spin 1 / Fire 2 / Heal 3)"
    ));

    const lHome = document.getElementById("sf-link-home");
    if (lHome) { lHome.href = isEn() ? "/en/" : "/"; lHome.textContent = L("🏠 みっちーのブログ Home", "🏠 Ligfil's Blog Home"); }
    const lArt = document.getElementById("sf-link-article");
    if (lArt) { lArt.href = isEn() ? "/en/hoshitsuchi-no-meikyu-3d-rpg.html" : "/hoshitsuchi-no-meikyu-3d-rpg.html"; lArt.textContent = L("📖 ゲーム紹介記事を読む", "📖 Read Release Article"); }
    const lPage = document.getElementById("sf-link-page");
    if (lPage) { lPage.href = isEn() ? "/en/rpg-3d.html" : "/pages/rpg-3d.html"; lPage.textContent = L("🕹️ ブログ埋め込み版ページ", "🕹️ Blog Embedded Page"); }
    const lPriv = document.getElementById("sf-link-privacy");
    if (lPriv) { lPriv.href = "/privacy-policy.html"; lPriv.textContent = L("🔒 プライバシーポリシー", "🔒 Privacy Policy"); }
    const lCont = document.getElementById("sf-link-contact");
    if (lCont) { lCont.href = isEn() ? "/en/contact.html" : "/contact.html"; lCont.textContent = L("✉️ お問い合わせ", "✉️ Contact"); }
    const lMap = document.getElementById("sf-link-sitemap");
    if (lMap) { lMap.href = "/sitemap.html"; lMap.textContent = L("🗺️ サイトマップ", "🗺️ Sitemap"); }

    updateHud();
    if (inTown) renderTownTab();
    if (ui.invModal && !ui.invModal.classList.contains("hidden")) openInventory();
  }

  function triggerDamageFlash() {
    shakeTime = Math.max(shakeTime, 0.22);
    if (!ui.damageFlash) return;
    ui.damageFlash.classList.remove("active");
    void ui.damageFlash.offsetWidth;
    ui.damageFlash.classList.add("active");
    if (damageFlashTimer) clearTimeout(damageFlashTimer);
    damageFlashTimer = setTimeout(() => {
      ui.damageFlash.classList.remove("active");
    }, 180);
  }

  function triggerDefeat() {
    if (isDefeated) return;
    isDefeated = true;
    save.hp = 0;
    waitingStairsPrompt = false;
    ui.stairsPrompt.classList.add("hidden");
    ui.invModal.classList.add("hidden");
    sfx.defeat();
    triggerDamageFlash();
    shakeTime = 0.45;
    addRingFx(player.x, player.y, "#ef4444", 115);
    addFloatText(player.x, player.y, L("💀 力尽きた！", "💀 Defeated!"), "#fecaca");
    pushLog(L("💀 力尽きてしまった……！", "💀 You collapsed...!"), "danger");
    updateHud();

    pendingDefeatGoldLoss = Math.floor(save.gold * 0.3);
    if (defeatModalTimer) clearTimeout(defeatModalTimer);
    defeatModalTimer = setTimeout(() => {
      ui.defeatCause.textContent = lastDamageCause || L(`B${floorNum}Fで力尽きてしまった……`, `Fell on B${floorNum}F...`);
      renderDefeatStats();
      ui.defeatOverlay.classList.remove("hidden");
    }, 550);
  }

  function confirmDefeatReturn() {
    if (!isDefeated) return;
    if (defeatModalTimer) {
      clearTimeout(defeatModalTimer);
      defeatModalTimer = null;
    }
    save.gold = Math.max(0, save.gold - pendingDefeatGoldLoss);
    pendingDefeatGoldLoss = 0;
    isDefeated = false;
    lastDamageCause = "";
    ui.defeatOverlay.classList.add("hidden");
    sfx.unlock();
    sfx.stairs();
    pushLog(L("🏘️ 星見の宿場へ運び込まれた……装備・レベル・SPは無事だ！", "🏘️ Carried back to Sky Sanctum... Your gear, Lv, and SP are safe!"), "warn");
    openTown("dive");
  }

  const logLines = [];
  function pushLog(text, kind = "normal") {
    logLines.push({ text, kind });
    if (logLines.length > 4) logLines.shift();
    ui.logFeed.innerHTML = logLines
      .map((l) => `<div class="log-line ${l.kind}">${l.text}</div>`)
      .join("");
  }

  function addFloatText(tx, ty, text, color = "#fde047") {
    floatNums.push({
      tx,
      ty,
      yOff: 1.55,
      text,
      color,
      life: 0.9,
    });
  }

  function addSlashFx(tx, ty, color = "#38bdf8") {
    fxList.push({ kind: "slash", tx, ty, color, life: 0.24, max: 0.24, mesh: null });
  }

  function addRingFx(tx, ty, color = "#f97316", maxR = 90) {
    fxList.push({ kind: "ring", tx, ty, color, maxR: Math.max(1.2, maxR / 44), life: 0.42, max: 0.42, mesh: null });
  }

  function addBeamFx(x1, y1, x2, y2, color = "#fb923c") {
    fxList.push({
      kind: "beam",
      x1,
      y1,
      x2,
      y2,
      color,
      life: 0.28,
      max: 0.28,
      mesh: null,
    });
  }

  // --- 本格・不思議のダンジョン自動生成（部屋＋通路＋水路＋柱＋松明＋ワナ＋モンハウ） ---
  function randInt(a, b) {
    return a + Math.floor(Math.random() * (b - a + 1));
  }

  function generateFloor(fl) {
    floorNum = fl;
    stairsFoundNotified = false;
    if (fl > save.maxReachedFloor) save.maxReachedFloor = fl;
    waitingStairsPrompt = false;
    ui.stairsPrompt.classList.add("hidden");

    grid = Array.from({ length: MAP_H }, () => new Uint8Array(MAP_W));
    roomIds = Array.from({ length: MAP_H }, () => new Int8Array(MAP_W).fill(-1));
    visible = Array.from({ length: MAP_H }, () => new Uint8Array(MAP_W));
    explored = Array.from({ length: MAP_H }, () => new Uint8Array(MAP_W));
    rooms = [];
    torches = [];
    floorItems = [];
    traps = [];
    enemies = [];

    const isBossFloor = fl === 5 || fl === 10;

    if (isBossFloor) {
      // ボス決戦用の荘厳な神殿大広間
      const mainR = { x: 8, y: 4, w: 18, h: 15, id: 0 };
      rooms.push(mainR);
      for (let y = mainR.y; y < mainR.y + mainR.h; y++) {
        for (let x = mainR.x; x < mainR.x + mainR.w; x++) {
          grid[y][x] = T.FLOOR;
          roomIds[y][x] = 0;
        }
      }
      // 装飾の柱と魔法陣
      [[11, 7], [22, 7], [11, 15], [22, 15]].forEach(([px, py]) => {
        grid[py][px] = T.PILLAR;
      });
      for (let x = 15; x <= 18; x++) {
        grid[10][x] = T.RUNE;
        grid[11][x] = T.RUNE;
      }
      // 周囲の水路/溶岩演出
      for (let x = 10; x <= 23; x++) {
        if (x < 15 || x > 18) {
          grid[5][x] = T.WATER;
          grid[17][x] = T.WATER;
        }
      }
      torches.push({ x: 10, y: 4 }, { x: 23, y: 4 }, { x: 14, y: 4 }, { x: 19, y: 4 });

      player.x = 16;
      player.y = 16;
      player.rx = player.x;
      player.ry = player.y;
      stairsPos = { x: 16, y: 5 };
      grid[stairsPos.y][stairsPos.x] = T.STAIRS;

      const bossTpl = fl === 5 ? MONSTER_DEFS.boss_ifrit : MONSTER_DEFS.boss_zargaus;
      spawnEnemy(bossTpl, 16, 9);
      // 取り巻き2体
      const addTpl = fl === 5 ? MONSTER_DEFS.fire_lizard : MONSTER_DEFS.shadow_knight;
      spawnEnemy(addTpl, 13, 9);
      spawnEnemy(addTpl, 19, 9);

      // 補給アイテム配置
      floorItems.push({ x: 12, y: 16, id: "otogiri" });
      floorItems.push({ x: 20, y: 16, id: "scroll_fire" });

      pushLog(L(`⚠️ B${fl}F：強大な魔力を感じる……【${monName(bossTpl)}】が待ち受けている！`, `⚠️ B${fl}F: Overwhelming dark aura... [${monName(bossTpl)}] awaits!`), "danger");
    } else {
      // 通常の不思議のダンジョン（5〜7部屋＋L字通路＋水路＋柱＋松明）
      const targetRooms = randInt(5, 7);
      for (let attempt = 0; attempt < 90 && rooms.length < targetRooms; attempt++) {
        const w = randInt(5, 9);
        const h = randInt(4, 7);
        const x = randInt(2, MAP_W - w - 3);
        const y = randInt(2, MAP_H - h - 3);
        const overlap = rooms.some(
          (r) => x <= r.x + r.w + 1 && x + w + 1 >= r.x && y <= r.y + r.h + 1 && y + h + 1 >= r.y
        );
        if (overlap) continue;
        const id = rooms.length;
        rooms.push({ x, y, w, h, id });
        for (let ry = y; ry < y + h; ry++) {
          for (let rx = x; rx < x + w; rx++) {
            grid[ry][rx] = T.FLOOR;
            roomIds[ry][rx] = id;
          }
        }
        // 壁上部に松明を配置
        torches.push({ x: x + Math.floor(w / 2), y: y - 1 });
        // 広い部屋には装飾の柱や水たまり・魔法陣を追加してマップの個性を出す
        if (w >= 7 && h >= 6 && Math.random() < 0.6) {
          grid[y + 1][x + 1] = T.PILLAR;
          grid[y + 1][x + w - 2] = T.PILLAR;
          grid[y + h - 2][x + 1] = T.PILLAR;
          grid[y + h - 2][x + w - 2] = T.PILLAR;
        } else if (w >= 6 && h >= 5 && Math.random() < 0.45) {
          const cx = x + Math.floor(w / 2);
          const cy = y + Math.floor(h / 2);
          grid[cy][cx] = T.WATER;
          if (Math.random() < 0.5) grid[cy][cx + 1] = T.WATER;
        } else if (Math.random() < 0.35) {
          grid[y + Math.floor(h / 2)][x + Math.floor(w / 2)] = T.RUNE;
        }
      }

      // 部屋同士を通路で接続（確実に全連結）
      for (let i = 1; i < rooms.length; i++) {
        const a = rooms[i - 1];
        const b = rooms[i];
        let cx = a.x + Math.floor(a.w / 2);
        let cy = a.y + Math.floor(a.h / 2);
        const tx = b.x + Math.floor(b.w / 2);
        const ty = b.y + Math.floor(b.h / 2);
        while (cx !== tx) {
          if (grid[cy][cx] === T.WALL || grid[cy][cx] === T.PILLAR) grid[cy][cx] = T.FLOOR;
          cx += cx < tx ? 1 : -1;
        }
        while (cy !== ty) {
          if (grid[cy][cx] === T.WALL || grid[cy][cx] === T.PILLAR) grid[cy][cx] = T.FLOOR;
          cy += cy < ty ? 1 : -1;
        }
      }
      // ループ通路を1本追加して探索を楽しくする
      if (rooms.length >= 3) {
        const a = rooms[0];
        const b = rooms[rooms.length - 1];
        let cx = a.x + Math.floor(a.w / 2);
        let cy = a.y + Math.floor(a.h / 2);
        const tx = b.x + Math.floor(b.w / 2);
        const ty = b.y + Math.floor(b.h / 2);
        while (cy !== ty) {
          if (grid[cy][cx] === T.WALL) grid[cy][cx] = T.FLOOR;
          cy += cy < ty ? 1 : -1;
        }
        while (cx !== tx) {
          if (grid[cy][cx] === T.WALL) grid[cy][cx] = T.FLOOR;
          cx += cx < tx ? 1 : -1;
        }
      }

      // プレイヤー初期位置（部屋0）
      const startTile = pickFreeTileInRoom(rooms[0]);
      player.x = startTile.x;
      player.y = startTile.y;
      player.rx = player.x;
      player.ry = player.y;

      // 階段（最も遠い部屋）
      const endRoom = rooms[rooms.length - 1];
      stairsPos = pickFreeTileInRoom(endRoom);
      grid[stairsPos.y][stairsPos.x] = T.STAIRS;

      // モンスターハウス判定（B3F以降で18%発生）
      const monsterHouseRoom = fl >= 3 && rooms.length >= 4 && Math.random() < 0.18 ? rooms[randInt(1, rooms.length - 2)] : null;

      // アイテム配置
      const itemPool = ["onigiri", "onigiri", "herb", "herb", "otogiri", "mana", "scroll_fire", "scroll_vacuum", "staff_bind", "staff_blow", "staff_swap", "smith_stone", "scroll_return"];
      const itemCount = randInt(5, 8);
      for (let i = 0; i < itemCount; i++) {
        const rm = rooms[randInt(0, rooms.length - 1)];
        const pt = pickFreeTileInRoom(rm);
        if (pt && !(pt.x === stairsPos.x && pt.y === stairsPos.y)) {
          floorItems.push({ x: pt.x, y: pt.y, id: itemPool[randInt(0, itemPool.length - 1)] });
        }
      }

      // ワナ配置
      const trapCount = randInt(2, 4 + Math.min(4, Math.floor(fl / 2)));
      for (let i = 0; i < trapCount; i++) {
        const rm = rooms[randInt(1, rooms.length - 1)];
        const pt = pickFreeTileInRoom(rm);
        if (pt && !(pt.x === stairsPos.x && pt.y === stairsPos.y)) {
          const tr = TRAP_TYPES[randInt(0, TRAP_TYPES.length - 1)];
          traps.push({ x: pt.x, y: pt.y, type: tr, revealed: false });
        }
      }

      // モンスター配置
      const pool = Object.values(MONSTER_DEFS).filter((m) => !m.isBoss && fl >= m.minF && fl <= m.maxF);
      const safePool = pool.length ? pool : [MONSTER_DEFS.shadow_knight];
      const enemyCount = randInt(5, 7 + Math.min(5, Math.floor(fl / 2)));
      for (let i = 0; i < enemyCount; i++) {
        const rm = rooms[randInt(1, rooms.length - 1)];
        const pt = pickFreeTileInRoom(rm);
        if (pt) spawnEnemy(safePool[randInt(0, safePool.length - 1)], pt.x, pt.y);
      }

      // モンスターハウスの追加敵＆豪華アイテム
      if (monsterHouseRoom) {
        monsterHouseRoom.isMonsterHouse = true;
        for (let i = 0; i < 4; i++) {
          const pt = pickFreeTileInRoom(monsterHouseRoom);
          if (pt) spawnEnemy(safePool[randInt(0, safePool.length - 1)], pt.x, pt.y);
        }
        for (let i = 0; i < 3; i++) {
          const pt = pickFreeTileInRoom(monsterHouseRoom);
          if (pt) floorItems.push({ x: pt.x, y: pt.y, id: ["otogiri", "scroll_vacuum", "smith_stone"][i] });
        }
      }

      pushLog(L(`B${fl}F「${biomeName(getBiome(fl))}」へ降り立った！`, `Arrived at B${fl}F: ${biomeName(getBiome(fl))}!`), "good");
    }

    recomputeFov();
    camX = player.x;
    camY = player.y;
    if (typeof rebuildFloor3D === "function") rebuildFloor3D();
    updateHud();
    persistSave();
  }

  function pickFreeTileInRoom(rm) {
    for (let i = 0; i < 40; i++) {
      const x = randInt(rm.x, rm.x + rm.w - 1);
      const y = randInt(rm.y, rm.y + rm.h - 1);
      if (grid[y][x] === T.FLOOR && !getEnemyAt(x, y) && !(player.x === x && player.y === y)) {
        return { x, y };
      }
    }
    return { x: rm.x + 1, y: rm.y + 1 };
  }

  function spawnEnemy(tpl, x, y) {
    const scale = floorNum > 10 ? 1 + (floorNum - 10) * 0.16 : 1;
    const hp = Math.round(tpl.hp * scale);
    enemies.push({
      tpl,
      x,
      y,
      rx: x,
      ry: y,
      dx: 0,
      dy: 1,
      lungeX: 0,
      lungeY: 0,
      walkPhase: 0,
      hitFlash: 0,
      hp,
      maxHp: hp,
      atk: Math.round(tpl.atk * scale),
      def: Math.round(tpl.def * scale),
      bindTurns: 0,
      awake: false,
      phase: Math.random() * 6,
    });
  }

  function getEnemyAt(x, y) {
    return enemies.find((e) => e.hp > 0 && e.x === x && e.y === y) || null;
  }

  function isWalkableTile(x, y) {
    if (x < 0 || y < 0 || x >= MAP_W || y >= MAP_H) return false;
    const t = grid[y][x];
    return t === T.FLOOR || t === T.STAIRS || t === T.RUNE;
  }

  // --- 視界計算（部屋全体＋通路の松明視界） ---
  function recomputeFov() {
    for (let y = 0; y < MAP_H; y++) visible[y].fill(0);
    const curRoom = roomIds[player.y][player.x];
    if (curRoom >= 0) {
      const r = rooms[curRoom];
      for (let y = Math.max(0, r.y - 1); y <= Math.min(MAP_H - 1, r.y + r.h); y++) {
        for (let x = Math.max(0, r.x - 1); x <= Math.min(MAP_W - 1, r.x + r.w); x++) {
          visible[y][x] = 1;
          explored[y][x] = 1;
        }
      }
      if (r.isMonsterHouse && !r.triggered) {
        r.triggered = true;
        shakeTime = 0.3;
        sfx.trap();
        pushLog(L("🚨 モンスターハウスだ！！ 魔物たちが目を覚ました！", "🚨 IT'S A MONSTER HOUSE!! Enemies awaken!"), "danger");
      }
    }
    // 通路・周囲の松明視界（半径3マス）
    for (let dy = -3; dy <= 3; dy++) {
      for (let dx = -3; dx <= 3; dx++) {
        if (dx * dx + dy * dy > 10) continue;
        const nx = player.x + dx;
        const ny = player.y + dy;
        if (nx >= 0 && ny >= 0 && nx < MAP_W && ny < MAP_H) {
          visible[ny][nx] = 1;
          explored[ny][nx] = 1;
        }
      }
    }
    // 視界に入った敵を目覚めさせる
    enemies.forEach((e) => {
      if (e.hp > 0 && visible[e.y][e.x]) e.awake = true;
    });
    // 階段の初発見を通知
    if (!stairsFoundNotified && visible[stairsPos.y]?.[stairsPos.x]) {
      stairsFoundNotified = true;
      addRingFx(stairsPos.x, stairsPos.y, "#fde047", 70);
      pushLog(L("🪜 次の階への階段を見つけた！", "🪜 Found the stairs to the next floor!"), "good");
    }
    if (typeof updateVisibility3D === "function") updateVisibility3D();
  }

  // --- ターン進行と行動ロジック ---
  function canStepDiag(x, y, dx, dy) {
    if (dx !== 0 && dy !== 0) {
      if (!isWalkableTile(x + dx, y) || !isWalkableTile(x, y + dy)) return false;
    }
    return isWalkableTile(x + dx, y + dy);
  }

  function tryMoveOrAttack(dx, dy) {
    if (inTown || isDefeated || isEndingPlaying || pendingEndingMovie || waitingStairsPrompt || !ui.invModal.classList.contains("hidden") || !ui.saveModal.classList.contains("hidden")) {
      return;
    }
    sfx.unlock();
    player.dx = dx;
    player.dy = dy;

    if (turnDirOnly) {
      turnDirOnly = false;
      pushLog(L("向きを変えた。", "Changed facing direction."));
      return;
    }

    if (player.sleepTurns > 0) {
      player.sleepTurns--;
      pushLog(L("眠っていて動けない……！", "Asleep and unable to move...!"), "warn");
      endPlayerTurn();
      return;
    }

    const nx = player.x + dx;
    const ny = player.y + dy;
    const foe = getEnemyAt(nx, ny);
    if (foe) {
      meleeAttack(foe);
      endPlayerTurn();
      return;
    }

    if (!canStepDiag(player.x, player.y, dx, dy)) {
      return;
    }

    player.x = nx;
    player.y = ny;
    sfx.step();
    recomputeFov();

    // 足元のアイテムを自動拾得
    const itemIdx = floorItems.findIndex((it) => it.x === player.x && it.y === player.y);
    if (itemIdx >= 0) {
      const picked = floorItems[itemIdx];
      if (save.bag.length < 18) {
        floorItems.splice(itemIdx, 1);
        save.bag.push(picked.id);
        sfx.pickup();
        pushLog(`${ITEM_DEFS[picked.id].icon} ${L(`${itemName(ITEM_DEFS[picked.id])} を拾った！`, `Picked up ${itemName(ITEM_DEFS[picked.id])}!`)}`, "good");
      } else {
        pushLog(L("持ち物がいっぱいで拾えない！", "Your bag is full!"), "warn");
      }
    }

    // ワナ判定
    const trap = traps.find((tr) => tr.x === player.x && tr.y === player.y);
    if (trap) {
      triggerTrap(trap);
    }

    // 階段チェック
    if (grid[player.y][player.x] === T.STAIRS) {
      const bossAlive = enemies.some((e) => e.hp > 0 && e.tpl.isBoss);
      if (bossAlive) {
        pushLog(L("ボスを倒すまで次の階へは進めない！", "Defeat the boss to unlock the stairs!"), "warn");
      } else {
        waitingStairsPrompt = true;
        ui.stairsDesc.textContent = L(`B${floorNum + 1}F（${biomeName(getBiome(floorNum + 1))}）へ降りますか？`, `Descend to B${floorNum + 1}F (${biomeName(getBiome(floorNum + 1))})?`);
        ui.stairsPrompt.classList.remove("hidden");
        updateHud();
        return;
      }
    }

    endPlayerTurn();
  }

  function triggerTrap(trap) {
    trap.revealed = true;
    sfx.trap();
    shakeTime = 0.25;
    if (trap.type.id === "mine") {
      const dmg = Math.max(6, Math.floor(save.hp * 0.35));
      save.hp = Math.max(1, save.hp - dmg);
      triggerDamageFlash();
      addRingFx(player.x, player.y, "#ef4444", 110);
      addFloatText(player.x, player.y, `-${dmg}`, "#f87171");
      pushLog(L(`💥 地雷を踏んだ！ ${dmg} のダメージ！`, `💥 Stepped on a Landmine! Took ${dmg} damage!`), "danger");
    } else if (trap.type.id === "poison") {
      const dmg = 7 + floorNum;
      save.hp = Math.max(1, save.hp - dmg);
      player.atkDebuff = 5;
      triggerDamageFlash();
      addFloatText(player.x, player.y, L(`毒 -${dmg}`, `Poison -${dmg}`), "#a855f7");
      pushLog(L(`🏹 毒矢のワナ！ ${dmg} ダメージ＆しばらく攻撃力低下！`, `🏹 Poison Arrow Trap! ${dmg} damage & ATK lowered!`), "danger");
    } else if (trap.type.id === "warp") {
      const rm = rooms[randInt(0, rooms.length - 1)];
      const pt = pickFreeTileInRoom(rm);
      player.x = pt.x;
      player.y = pt.y;
      player.rx = pt.x;
      player.ry = pt.y;
      recomputeFov();
      addRingFx(player.x, player.y, "#38bdf8", 75);
      pushLog(L("🌀 ワープのワナ！ 別の部屋へ飛ばされた！", "🌀 Warp Trap! Teleported to another room!"), "warn");
    } else if (trap.type.id === "sleep") {
      player.sleepTurns = 2;
      addFloatText(player.x, player.y, L("💤 睡眠", "💤 Asleep"), "#93c5fd");
      pushLog(L("💤 眠りガスを浴びてしまった！", "💤 Hit by Sleep Gas Trap!"), "warn");
    }
  }

  function meleeAttack(foe, mult = 1.0, label = "") {
    player.lungeX = (foe.x - player.x) * 0.42;
    player.lungeY = (foe.y - player.y) * 0.42;
    player.swingTimer = 0.24;
    const crit = Math.random() < getCritChance();
    const atkEff = getTotalAtk() * (player.atkDebuff > 0 ? 0.78 : 1.0);
    const raw = (atkEff * mult - foe.def * 0.45 + Math.random() * 4) * (crit ? 1.65 : 1);
    const dmg = Math.max(2, Math.round(raw));
    foe.hp -= dmg;
    foe.hitFlash = 0.16;
    foe.bindTurns = 0; // 殴るとかなしばり解除（シレン仕様！）
    sfx.hit();
    addSlashFx(foe.x, foe.y, crit ? "#fb923c" : "#38bdf8");
    addFloatText(foe.x, foe.y, crit ? L(`会心! -${dmg}`, `CRIT! -${dmg}`) : `-${dmg}`, crit ? "#fb923c" : "#fde047");
    if (crit) shakeTime = 0.14;
    pushLog(`${label || L("攻撃！", "Attack!")} ${monName(foe.tpl)}${L(` に ${dmg} のダメージ！${crit ? "（会心！）" : ""}`, ` took ${dmg} damage!${crit ? " (CRIT!)" : ""}`)}`);
    checkEnemyDefeated(foe);
  }

  function checkEnemyDefeated(foe) {
    if (foe.hp > 0) return;
    runKills++;
    addRingFx(foe.x, foe.y, "#facc15", 64);
    save.exp += foe.tpl.exp;
    save.gold += foe.tpl.gold;
    pushLog(`${monName(foe.tpl)} ${L("を倒した！", "defeated!")} (+${foe.tpl.exp} EXP / +${foe.tpl.gold} G)`, "good");

    // 確率で強化石やアイテムをドロップ
    if (Math.random() < (foe.tpl.isBoss ? 1.0 : 0.16)) {
      const drop = foe.tpl.isBoss ? "smith_stone" : ["herb", "onigiri", "smith_stone"][randInt(0, 2)];
      floorItems.push({ x: foe.x, y: foe.y, id: drop });
    }

    // レベルアップ処理（SPも獲得！）
    while (save.exp >= save.nextExp) {
      save.exp -= save.nextExp;
      save.lv += 1;
      save.sp += 1;
      save.nextExp = Math.round(save.nextExp * 1.42 + 18);
      save.maxHp += 8;
      save.maxMp += 3;
      save.baseAtk += 2;
      save.baseDef += 1;
      save.hp = getMaxHp();
      save.mp = save.maxMp;
      sfx.lvUp();
      addRingFx(player.x, player.y, "#4ade80", 90);
      addFloatText(player.x, player.y, `LEVEL UP! Lv.${save.lv}`, "#4ade80");
      pushLog(L(`✨ レベルアップ！ Lv.${save.lv} になり、SP +1 を獲得！`, `✨ LEVEL UP! Reached Lv.${save.lv} and gained SP +1!`), "good");
    }

    if (foe.tpl.id === "boss_zargaus") {
      save.clearedB10 = true;
      // 残存している取り巻きも魔王崩壊と同時に消滅させる（演出前の事故死防止）
      enemies.forEach((other) => {
        if (other !== foe && other.hp > 0) {
          other.hp = 0;
          addRingFx(other.x, other.y, "#fde047", 65);
        }
      });
      persistSave();
      pushLog(L("👑 祝・星喰らいの魔王ザルガウスを撃破！！ B11F以降の深淵も解放された！", "👑 Zargaus defeated!! B11F+ Astral Abyss is now unlocked!"), "good");
      if (!pendingEndingMovie && !isEndingPlaying) {
        pendingEndingMovie = true;
        endingTimerId = setTimeout(() => {
          pendingEndingMovie = false;
          startEndingMovie({ replayFromTown: false });
        }, 950);
      }
    }
    enemies = enemies.filter((e) => e.hp > 0);
  }

  // --- 特技（RPGスキル） ---
  function useSkillSpin() {
    if (inTown || isDefeated || isEndingPlaying || pendingEndingMovie || waitingStairsPrompt) return;
    sfx.unlock();
    const cost = 5;
    if (save.mp < cost) { pushLog(L("MPが足りない！", "Not enough MP!"), "warn"); return; }
    save.mp -= cost;
    sfx.magic();
    addRingFx(player.x, player.y, "#38bdf8", 85);
    const mult = 1.05 + (save.skills.spin - 1) * 0.25;
    let hits = 0;
    enemies.slice().forEach((e) => {
      if (Math.abs(e.x - player.x) <= 1 && Math.abs(e.y - player.y) <= 1) {
        meleeAttack(e, mult, L("🌪️ 回転斬り！", "🌪️ Whirlwind!"));
        hits++;
      }
    });
    if (hits === 0) pushLog(L("🌪️ 回転斬りを放ったが、周囲に敵がいなかった！", "🌪️ Unleashed Whirlwind, hitting empty air!"));
    endPlayerTurn();
  }

  function useSkillFire() {
    if (inTown || isDefeated || isEndingPlaying || pendingEndingMovie || waitingStairsPrompt) return;
    sfx.unlock();
    const cost = 4;
    if (save.mp < cost) { pushLog(L("MPが足りない！", "Not enough MP!"), "warn"); return; }
    save.mp -= cost;
    sfx.magic();
    let cx = player.x;
    let cy = player.y;
    let hitEnemy = null;
    for (let step = 0; step < 8; step++) {
      const nx = cx + player.dx;
      const ny = cy + player.dy;
      if (!isWalkableTile(nx, ny) && grid[ny]?.[nx] !== T.WATER) break;
      cx = nx;
      cy = ny;
      const foe = getEnemyAt(cx, cy);
      if (foe) { hitEnemy = foe; break; }
    }
    addBeamFx(player.x, player.y, cx, cy, "#fb923c");
    if (hitEnemy) {
      const dmg = Math.round((getTotalAtk() * 1.15 + save.lv * 2.5) * (1 + (save.skills.fire - 1) * 0.25));
      hitEnemy.hp -= dmg;
      hitEnemy.bindTurns = 0;
      addRingFx(hitEnemy.x, hitEnemy.y, "#fb923c", 60);
      addFloatText(hitEnemy.x, hitEnemy.y, `-${dmg}`, "#fb923c");
      pushLog(L(`🔥 炎弾が ${monName(hitEnemy.tpl)} に命中！ ${dmg} のダメージ！`, `🔥 Fireball hit ${monName(hitEnemy.tpl)} for ${dmg} damage!`));
      checkEnemyDefeated(hitEnemy);
    } else {
      pushLog(L("🔥 炎弾は壁に当たって消えた。", "🔥 Fireball fizzled against the wall."));
    }
    endPlayerTurn();
  }

  function useSkillHeal() {
    if (inTown || isDefeated || isEndingPlaying || pendingEndingMovie || waitingStairsPrompt) return;
    sfx.unlock();
    const cost = 6;
    if (save.mp < cost) { pushLog(L("MPが足りない！", "Not enough MP!"), "warn"); return; }
    save.mp -= cost;
    const heal = 32 + save.lv * 4 + (save.skills.heal - 1) * 14;
    save.hp = Math.min(getMaxHp(), save.hp + heal);
    sfx.pickup();
    addRingFx(player.x, player.y, "#4ade80", 70);
    addFloatText(player.x, player.y, `+${heal}`, "#4ade80");
    pushLog(L(`💚 ヒールを唱えた！ HPが ${heal} 回復！`, `💚 Cast Heal! Restored ${heal} HP!`), "good");
    endPlayerTurn();
  }

  function restOneTurn() {
    if (inTown || isDefeated || isEndingPlaying || pendingEndingMovie || waitingStairsPrompt) return;
    sfx.unlock();
    endPlayerTurn();
  }

  // --- ターン終了・自然回復・満腹度・敵AI ---
  function endPlayerTurn() {
    if (pendingEndingMovie || isEndingPlaying) {
      updateHud();
      return;
    }
    turnCount++;
    if (player.atkDebuff > 0) player.atkDebuff--;

    // 満腹度消費（6ターンごとに1%減少）
    foodStepAcc++;
    if (foodStepAcc >= 6) {
      foodStepAcc = 0;
      if (save.food > 0) {
        save.food = Math.max(0, save.food - 1);
        if (save.food === 20) pushLog(L("⚠️ お腹が空いてきた……おにぎりを食べよう！", "⚠️ Getting hungry... Eat a Rice Ball!"), "warn");
      } else {
        save.hp = Math.max(0, save.hp - 2);
        lastDamageCause = L(`B${floorNum}Fで空腹により力尽きてしまった……`, `Starved to collapse on B${floorNum}F...`);
        triggerDamageFlash();
        addFloatText(player.x, player.y, "-2", "#f87171");
        pushLog(L("🍙 空腹で体力が減っている！", "🍙 Starving! Losing HP!"), "danger");
      }
    }

    if (save.hp <= 0) {
      triggerDefeat();
      return;
    }

    // 自然HP/MP回復（満腹度が1以上のとき）
    if (save.food > 0 && save.hp > 0) {
      if (turnCount % 3 === 0 && save.hp < getMaxHp()) save.hp = Math.min(getMaxHp(), save.hp + 1);
      if (turnCount % 6 === 0 && save.mp < save.maxMp) save.mp = Math.min(save.maxMp, save.mp + 1);
    }

    // 敵のターン
    for (let i = 0; i < enemies.length; i++) {
      const e = enemies[i];
      if (e.hp <= 0) continue;
      if (e.bindTurns > 0) {
        e.bindTurns--;
        continue;
      }
      if (!e.awake) continue;

      const ddx = player.x - e.x;
      const ddy = player.y - e.y;
      const cheb = Math.max(Math.abs(ddx), Math.abs(ddy));

      // 隣接攻撃
      if (cheb === 1 && canStepDiag(e.x, e.y, Math.sign(ddx), Math.sign(ddy))) {
        const dmg = Math.max(1, Math.round(e.atk - getTotalDef() * 0.55 + Math.random() * 3));
        save.hp = Math.max(0, save.hp - dmg);
        e.dx = Math.sign(ddx);
        e.dy = Math.sign(ddy);
        e.lungeX = e.dx * 0.42;
        e.lungeY = e.dy * 0.42;
        player.hitFlash = 0.18;
        lastDamageCause = L(`B${floorNum}Fで【${monName(e.tpl)}】の攻撃を受けて倒れてしまった！`, `Slain by [${monName(e.tpl)}] on B${floorNum}F!`);
        sfx.hurt();
        triggerDamageFlash();
        addFloatText(player.x, player.y, `-${dmg}`, "#f87171");
        pushLog(L(`${monName(e.tpl)} の攻撃！ ${dmg} のダメージ！`, `${monName(e.tpl)} struck! Took ${dmg} damage!`), "danger");
        if (save.hp <= 0) break;
        continue;
      }

      // 遠距離攻撃持ち（直線上で射程4以内・確率38%）
      if (e.tpl.ranged && (ddx === 0 || ddy === 0 || Math.abs(ddx) === Math.abs(ddy)) && cheb <= 4 && visible[e.y][e.x] && Math.random() < 0.38) {
        const dmg = Math.max(2, Math.round(e.atk * 0.85 - getTotalDef() * 0.35));
        save.hp = Math.max(0, save.hp - dmg);
        e.dx = Math.sign(ddx);
        e.dy = Math.sign(ddy);
        player.hitFlash = 0.18;
        lastDamageCause = L(`B${floorNum}Fで【${monName(e.tpl)}】の魔弾を受けて倒れてしまった！`, `Fell to [${monName(e.tpl)}]'s ranged bolt on B${floorNum}F!`);
        sfx.hurt();
        triggerDamageFlash();
        addBeamFx(e.x, e.y, player.x, player.y, e.tpl.ranged === "ice" ? "#38bdf8" : e.tpl.ranged === "dark" ? "#c084fc" : "#fb923c");
        addFloatText(player.x, player.y, `-${dmg}`, "#f87171");
        pushLog(L(`${monName(e.tpl)} の遠距離魔弾！ ${dmg} のダメージ！`, `${monName(e.tpl)} fired a bolt! Took ${dmg} damage!`), "danger");
        if (save.hp <= 0) break;
        continue;
      }

      // プレイヤーへ接近（8方向＋障害物回避）
      const sx = Math.sign(ddx);
      const sy = Math.sign(ddy);
      const tries = [
        [sx, sy],
        [sx, 0],
        [0, sy],
        [sx, -sy],
        [-sx, sy],
      ];
      for (let t = 0; t < tries.length; t++) {
        const [mx, my] = tries[t];
        if (mx === 0 && my === 0) continue;
        const tx = e.x + mx;
        const ty = e.y + my;
        if (tx === player.x && ty === player.y) continue;
        if (canStepDiag(e.x, e.y, mx, my) && !getEnemyAt(tx, ty)) {
          e.dx = mx;
          e.dy = my;
          e.x = tx;
          e.y = ty;
          break;
        }
      }
    }

    // 倒れた場合 → 専用の敗北演出＆リザルトモーダルを表示
    if (save.hp <= 0) {
      triggerDefeat();
      return;
    }

    updateHud();
    persistSave();
  }

  // --- 道具の使用（不思議のダンジョン名物：巻物・杖・草・おにぎり） ---
  function useBagItem(bagIndex) {
    const id = save.bag[bagIndex];
    const def = ITEM_DEFS[id];
    if (!def) return;
    if (def.kind === "material") {
      pushLog(L("💎 強化の秘石は拠点の鍛冶屋で装備強化に使えます！", "💎 Use Forge Gems at the Sky Sanctum Smithy to upgrade gear!"));
      return;
    }

    save.bag.splice(bagIndex, 1);
    ui.invModal.classList.add("hidden");
    sfx.unlock();

    if (def.kind === "food") {
      if (save.food >= save.maxFood && id === "big_onigiri") {
        save.maxFood += 5;
        save.food = save.maxFood;
        pushLog(L("🍙 大きなおにぎりを食べた！ 最大満腹度が 5 増えた！", "🍙 Ate Large Rice Ball! Max fullness increased by 5!"), "good");
      } else {
        save.food = Math.min(save.maxFood, save.food + def.val);
        pushLog(L(`🍙 ${itemName(def)} を食べた！ お腹が満たされた！`, `🍙 Ate ${itemName(def)}! Fullness restored!`), "good");
      }
      sfx.pickup();
    } else if (def.kind === "heal") {
      const mhp = getMaxHp();
      if (save.hp >= mhp) {
        const up = id === "otogiri" ? 4 : 2;
        save.maxHp += up;
        save.hp = getMaxHp();
        pushLog(L(`${def.icon} ${itemName(def)} を飲んだ！ 最大HPが ${up} 増えた！`, `${def.icon} Used ${itemName(def)}! Max HP increased by ${up}!`), "good");
      } else {
        save.hp = Math.min(mhp, save.hp + def.val);
        addFloatText(player.x, player.y, `+${def.val}`, "#4ade80");
        pushLog(L(`${def.icon} ${itemName(def)} でHPが ${def.val} 回復！`, `${def.icon} ${itemName(def)} restored ${def.val} HP!`), "good");
      }
      sfx.pickup();
    } else if (def.kind === "mp") {
      save.mp = Math.min(save.maxMp, save.mp + def.val);
      sfx.pickup();
      pushLog(L(`🧪 MPが ${def.val} 回復した！`, `🧪 Restored ${def.val} MP!`), "good");
    } else if (def.kind === "scroll_fire" || def.kind === "scroll_vacuum") {
      sfx.magic();
      shakeTime = 0.28;
      const isVac = def.kind === "scroll_vacuum";
      addRingFx(player.x, player.y, isVac ? "#38bdf8" : "#f97316", 240);
      const dmg = isVac ? 58 + save.lv * 5 : 36 + save.lv * 3;
      let count = 0;
      enemies.slice().forEach((e) => {
        if (visible[e.y][e.x]) {
          e.hp -= dmg;
          addFloatText(e.x, e.y, `-${dmg}`, isVac ? "#38bdf8" : "#fb923c");
          checkEnemyDefeated(e);
          count++;
        }
      });
      pushLog(L(`📜 ${itemName(def)} を読んだ！ 視界の敵 ${count} 体に ${dmg} のダメージ！`, `📜 Read ${itemName(def)}! Dealt ${dmg} damage to ${count} enemies in sight!`), "good");
    } else if (def.kind.startsWith("staff_")) {
      sfx.magic();
      let cx = player.x;
      let cy = player.y;
      let hit = null;
      for (let s = 0; s < 10; s++) {
        const nx = cx + player.dx;
        const ny = cy + player.dy;
        if (!isWalkableTile(nx, ny) && grid[ny]?.[nx] !== T.WATER) break;
        cx = nx;
        cy = ny;
        const foe = getEnemyAt(cx, cy);
        if (foe) { hit = foe; break; }
      }
      addBeamFx(player.x, player.y, cx, cy, "#a855f7");
      if (!hit) {
        pushLog(L(`🪄 ${itemName(def)} を振ったが当たらなかった！`, `🪄 Waved ${itemName(def)}, but it missed!`), "warn");
      } else if (def.kind === "staff_bind") {
        hit.bindTurns = 6;
        addFloatText(hit.x, hit.y, L("❄️ 硬直", "❄️ Bound"), "#7dd3fc");
        pushLog(L(`🪄 ${monName(hit.tpl)} をかなしばりにした！`, `🪄 Paralyzed ${monName(hit.tpl)}!`), "good");
      } else if (def.kind === "staff_blow") {
        let bx = hit.x;
        let by = hit.y;
        let wallHit = false;
        for (let s = 0; s < 6; s++) {
          const nx = bx + player.dx;
          const ny = by + player.dy;
          if (!isWalkableTile(nx, ny) || getEnemyAt(nx, ny)) { wallHit = true; break; }
          bx = nx;
          by = ny;
        }
        hit.x = bx;
        hit.y = by;
        const dmg = wallHit ? 22 + save.lv * 2 : 10;
        hit.hp -= dmg;
        addFloatText(hit.x, hit.y, `-${dmg}`, "#fde047");
        pushLog(L(`🪄 ${monName(hit.tpl)} を吹き飛ばした！（${dmg}ダメージ）`, `🪄 Blasted ${monName(hit.tpl)} back (${dmg} damage)!`), "good");
        checkEnemyDefeated(hit);
      } else if (def.kind === "staff_swap") {
        const ox = player.x;
        const oy = player.y;
        player.x = hit.x;
        player.y = hit.y;
        hit.x = ox;
        hit.y = oy;
        recomputeFov();
        pushLog(L(`🪄 ${monName(hit.tpl)} と場所を入れ替えた！`, `🪄 Swapped places with ${monName(hit.tpl)}!`), "good");
      }
    } else if (def.kind === "return") {
      sfx.stairs();
      pushLog(L("🌀 帰還の巻物で拠点「星見の宿場」へ戻った！", "🌀 Read Return Scroll and warped back to Sky Sanctum!"), "good");
      openTown("dive");
      return;
    }

    if (!inTown) endPlayerTurn();
    else updateHud();
  }

  // --- HUD・モーダル・拠点「星見の宿場」UI ---
  function updateHud() {
    const mhp = getMaxHp();
    ui.floor.textContent = inTown ? L("拠点", "Town") : `B${floorNum}F`;
    ui.lv.textContent = save.lv;
    ui.barHp.style.width = `${Math.max(0, Math.min(100, (save.hp / mhp) * 100))}%`;
    ui.txtHp.textContent = `${save.hp}/${mhp}`;
    ui.barMp.style.width = `${Math.max(0, Math.min(100, (save.mp / save.maxMp) * 100))}%`;
    ui.txtMp.textContent = `${save.mp}/${save.maxMp}`;
    ui.barFood.style.width = `${Math.max(0, Math.min(100, (save.food / save.maxFood) * 100))}%`;
    ui.txtFood.textContent = `${save.food}%`;
    ui.gold.textContent = save.gold;
    ui.biome.textContent = inTown ? biomeName(getBiome(floorNum)) : `${biomeName(getBiome(floorNum))}${stairsFoundNotified ? L(" · 🪜発見", " · 🪜 Stairs") : ""}`;
    ui.chipWeapon.textContent = `⚔️ ${weaponName(WEAPONS[save.weaponIdx])}+${save.weaponPlus}`;
    ui.chipShield.textContent = `🛡️ ${shieldName(SHIELDS[save.shieldIdx])}+${save.shieldPlus}`;
    if (ui.lowHpVignette) {
      const lowHp = !inTown && !isDefeated && save.hp > 0 && save.hp / mhp <= 0.28;
      ui.lowHpVignette.classList.toggle("hidden", !lowHp);
    }
  }

  function openInventory() {
    ui.invModal.classList.remove("hidden");
    const mhp = getMaxHp();
    document.getElementById("inv-stats").innerHTML = `
      <div class="stat-c"><span>${L("レベル / 次Lv", "Level / Next")}</span><strong>Lv.${save.lv} (${save.exp}/${save.nextExp})</strong></div>
      <div class="stat-c"><span>${L("攻撃 / 防御", "ATK / DEF")}</span><strong>${L(`攻 ${getTotalAtk()} / 守 ${getTotalDef()}`, `ATK ${getTotalAtk()} / DEF ${getTotalDef()}`)}</strong></div>
      <div class="stat-c"><span>${L("会心率 / SP", "Crit / SP")}</span><strong>${Math.round(getCritChance() * 100)}% / SP ${save.sp}</strong></div>
    `;
    const list = document.getElementById("inv-list");
    list.innerHTML = "";
    if (save.bag.length === 0) {
      list.innerHTML = `<div class="row-item"><div>${L("持ち物がありません", "Your bag is empty")}</div></div>`;
      return;
    }
    save.bag.forEach((id, idx) => {
      const d = ITEM_DEFS[id];
      const row = document.createElement("div");
      row.className = "row-item";
      row.innerHTML = `<div><strong>${d.icon} ${itemName(d)}</strong><small>${itemDesc(d)}</small></div>`;
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "ui-btn primary";
      btn.textContent = d.kind === "food" ? L("食べる", "Eat") : d.kind.startsWith("scroll") ? L("読む", "Read") : d.kind.startsWith("staff") ? L("振る", "Wave") : L("使う", "Use");
      btn.disabled = d.kind === "material";
      btn.addEventListener("click", () => useBagItem(idx));
      row.appendChild(btn);
      list.appendChild(row);
    });
  }

  let activeTownTab = "dive";
  function openTown(tab = "dive") {
    inTown = true;
    activeTownTab = tab;
    save.hp = getMaxHp();
    save.mp = save.maxMp;
    save.food = save.maxFood;
    ui.stairsPrompt.classList.add("hidden");
    ui.invModal.classList.add("hidden");
    ui.townOverlay.classList.remove("hidden");
    renderTownTab();
    updateHud();
    persistSave();
  }

  function renderTownTab() {
    ui.townGold.textContent = `${save.gold} G`;
    ui.townSp.textContent = save.sp;
    document.querySelectorAll(".town-tabs .tab-btn").forEach((b) => {
      b.classList.toggle("active", b.dataset.tab === activeTownTab);
    });

    const body = ui.townBody;
    body.innerHTML = "";

    if (activeTownTab === "dive") {
      body.innerHTML = `
        <div class="row-item">
          <div>
            <strong>${L("🌟 拠点で全回復しました！", "🌟 Fully restored at Sky Sanctum!")}</strong>
            <small>${L(`到達最高階層: B${save.maxReachedFloor}F ${save.clearedB10 ? "（👑 B10F魔王討伐済）" : "（目標：B5F中ボス・B10F魔王ザルガウス）"}`, `Deepest floor: B${save.maxReachedFloor}F ${save.clearedB10 ? "(👑 Demon Lord Defeated)" : "(Goals: B5F Guardian · B10F Demon Lord Zargaus)"}`)}</small>
          </div>
        </div>
      `;
      const starts = [
        { f: 1, label: L("B1F 古代の石窟から出発", "B1F Sky Cavern Entrance"), req: 1 },
        { f: 4, label: L("B4F 紅蓮の溶岩窟へワープ", "B4F Crimson Lava Cavern"), req: 4 },
        { f: 7, label: L("B7F 蒼氷の星晶宮へワープ", "B7F Azure Star Palace"), req: 7 },
        { f: 10, label: L("B10F 魔王ザルガウスの間へ挑む", "B10F Demon Lord's Chamber"), req: 10 },
      ];
      starts.forEach((st) => {
        const row = document.createElement("div");
        row.className = "row-item";
        row.innerHTML = `<div><strong>${st.label}</strong><small>${save.maxReachedFloor >= st.req ? L("すぐに潜れます", "Ready to enter") : L(`B${st.req}F 到達で解放`, `Unlocks upon reaching B${st.req}F`)}</small></div>`;
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "ui-btn primary";
        btn.textContent = L("出発する", "Enter");
        btn.disabled = save.maxReachedFloor < st.req;
        btn.addEventListener("click", () => {
          inTown = false;
          isDefeated = false;
          runKills = 0;
          lastDamageCause = "";
          ui.townOverlay.classList.add("hidden");
          sfx.unlock();
          sfx.stairs();
          generateFloor(st.f);
        });
        row.appendChild(btn);
        body.appendChild(row);
      });
      if (save.clearedB10) {
        const replayRow = document.createElement("div");
        replayRow.className = "row-item";
        replayRow.innerHTML = `<div><strong>${L("🎬 魔王討伐エンディングムービー", "🎬 Grand Ending Movie")}</strong><small>${L("星辰の英雄の物語をもう一度鑑賞する", "Rewatch the 5-act victory ending cutscene")}</small></div>`;
        const rBtn = document.createElement("button");
        rBtn.type = "button";
        rBtn.className = "ui-btn primary";
        rBtn.textContent = L("鑑賞する", "Watch");
        rBtn.addEventListener("click", () => {
          sfx.unlock();
          startEndingMovie({ replayFromTown: true });
        });
        replayRow.appendChild(rBtn);
        body.appendChild(replayRow);
      }
    } else if (activeTownTab === "smith") {
      const stoneCount = save.bag.filter((id) => id === "smith_stone").length;
      const wCost = 60 + save.weaponPlus * 45;
      const sCost = 55 + save.shieldPlus * 40;

      const makeUpgradeRow = (title, sub, cost, onUpgrade) => {
        const row = document.createElement("div");
        row.className = "row-item";
        row.innerHTML = `<div><strong>${title}</strong><small>${sub}</small></div>`;
        const bRow = document.createElement("div");
        bRow.className = "btn-row";

        const btnG = document.createElement("button");
        btnG.type = "button";
        btnG.className = "ui-btn primary";
        btnG.textContent = `${cost} G`;
        btnG.disabled = save.gold < cost;
        btnG.addEventListener("click", () => {
          save.gold -= cost;
          onUpgrade();
        });
        bRow.appendChild(btnG);

        if (stoneCount > 0) {
          const btnS = document.createElement("button");
          btnS.type = "button";
          btnS.className = "ui-btn";
          btnS.textContent = L("💎秘石×1", "💎 Gem×1");
          btnS.addEventListener("click", () => {
            const idx = save.bag.indexOf("smith_stone");
            if (idx >= 0) save.bag.splice(idx, 1);
            onUpgrade();
          });
          bRow.appendChild(btnS);
        }
        row.appendChild(bRow);
        body.appendChild(row);
      };

      makeUpgradeRow(
        L(`⚔️ ${weaponName(WEAPONS[save.weaponIdx])}+${save.weaponPlus} を鍛える`, `⚔️ Upgrade ${weaponName(WEAPONS[save.weaponIdx])}+${save.weaponPlus}`),
        L(`攻撃力 +2（現在総攻撃力: ${getTotalAtk()} / 所持秘石: ${stoneCount}）`, `ATK +2 (Total ATK: ${getTotalAtk()} / Gems: ${stoneCount})`),
        wCost,
        () => { save.weaponPlus++; sfx.lvUp(); updateHud(); persistSave(); renderTownTab(); }
      );
      makeUpgradeRow(
        L(`🛡️ ${shieldName(SHIELDS[save.shieldIdx])}+${save.shieldPlus} を鍛える`, `🛡️ Upgrade ${shieldName(SHIELDS[save.shieldIdx])}+${save.shieldPlus}`),
        L(`防御力 +2（現在総防御力: ${getTotalDef()} / 所持秘石: ${stoneCount}）`, `DEF +2 (Total DEF: ${getTotalDef()} / Gems: ${stoneCount})`),
        sCost,
        () => { save.shieldPlus++; sfx.lvUp(); updateHud(); persistSave(); renderTownTab(); }
      );

      // 上位ベース装備の鍛造
      WEAPONS.forEach((w, idx) => {
        if (idx <= save.weaponIdx) return;
        const row = document.createElement("div");
        row.className = "row-item";
        row.innerHTML = `<div><strong>${L(`✨ 鍛造：${weaponName(w)}`, `✨ Forge: ${weaponName(w)}`)}</strong><small>${L(`基本攻撃力 ${w.baseAtk}（強化値+${save.weaponPlus}は引き継ぎ！）`, `Base ATK ${w.baseAtk} (+${save.weaponPlus} bonus carries over!)`)}</small></div>`;
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "ui-btn primary";
        btn.textContent = `${w.price} G`;
        btn.disabled = save.gold < w.price;
        btn.addEventListener("click", () => {
          save.gold -= w.price;
          save.weaponIdx = idx;
          sfx.lvUp();
          updateHud();
          persistSave();
          renderTownTab();
        });
        row.appendChild(btn);
        body.appendChild(row);
      });

      SHIELDS.forEach((sh, idx) => {
        if (idx <= save.shieldIdx) return;
        const row = document.createElement("div");
        row.className = "row-item";
        row.innerHTML = `<div><strong>${L(`✨ 鍛造：${shieldName(sh)}`, `✨ Forge: ${shieldName(sh)}`)}</strong><small>${L(`基本防御力 ${sh.baseDef}（強化値+${save.shieldPlus}は引き継ぎ！）`, `Base DEF ${sh.baseDef} (+${save.shieldPlus} bonus carries over!)`)}</small></div>`;
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "ui-btn primary";
        btn.textContent = `${sh.price} G`;
        btn.disabled = save.gold < sh.price;
        btn.addEventListener("click", () => {
          save.gold -= sh.price;
          save.shieldIdx = idx;
          sfx.lvUp();
          updateHud();
          persistSave();
          renderTownTab();
        });
        row.appendChild(btn);
        body.appendChild(row);
      });
    } else if (activeTownTab === "shop") {
      const shopIds = ["onigiri", "big_onigiri", "herb", "otogiri", "mana", "scroll_fire", "staff_bind", "staff_blow", "scroll_return"];
      shopIds.forEach((id) => {
        const d = ITEM_DEFS[id];
        const row = document.createElement("div");
        row.className = "row-item";
        row.innerHTML = `<div><strong>${d.icon} ${itemName(d)}</strong><small>${itemDesc(d)}</small></div>`;
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "ui-btn primary";
        btn.textContent = `${d.price} G`;
        btn.disabled = save.gold < d.price || save.bag.length >= 18;
        btn.addEventListener("click", () => {
          save.gold -= d.price;
          save.bag.push(id);
          sfx.pickup();
          updateHud();
          persistSave();
          renderTownTab();
        });
        row.appendChild(btn);
        body.appendChild(row);
      });
    } else if (activeTownTab === "skills") {
      const defs = [
        { k: "spin", name: L("🌪️ 回転斬り", "🌪️ Whirlwind"), desc: L("周囲8マス同時攻撃の威力を強化", "Boosts 8-tile spin attack power") },
        { k: "fire", name: L("🔥 炎弾", "🔥 Fireball"), desc: L("直線遠距離魔法の威力を強化", "Boosts straight ranged fire magic power") },
        { k: "heal", name: L("💚 ヒール", "💚 Heal"), desc: L("回復魔法の回復量をアップ", "Increases HP restored by Heal") },
        { k: "crit", name: L("⚡ 心眼（パッシブ）", "⚡ Mind's Eye (Passive)"), desc: L("1Lvごとに会心率 +8%", "+8% Critical rate per level") },
        { k: "tough", name: L("🛡️ 鉄壁（パッシブ）", "🛡️ Iron Body (Passive)"), desc: L("1Lvごとに最大HP +15", "+15 Max HP per level") },
      ];
      defs.forEach((sk) => {
        const lv = save.skills[sk.k] || 0;
        const row = document.createElement("div");
        row.className = "row-item";
        row.innerHTML = `<div><strong>${sk.name} (Lv.${lv}/5)</strong><small>${sk.desc}</small></div>`;
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "ui-btn primary";
        btn.textContent = lv >= 5 ? "MAX" : L("SP 1 で強化", "Upgrade (1 SP)");
        btn.disabled = save.sp < 1 || lv >= 5;
        btn.addEventListener("click", () => {
          save.sp -= 1;
          save.skills[sk.k] = lv + 1;
          save.hp = getMaxHp();
          sfx.lvUp();
          updateHud();
          persistSave();
          renderTownTab();
        });
        row.appendChild(btn);
        body.appendChild(row);
      });
    }
  }

  // =========================================================================
  // --- Three.js 3D トゥーン・ミニチュアフィギュア＆ジオラマダンジョン描画エンジン ---
  // =========================================================================
  let threeRenderer = null;
  let threeScene = null;
  let threeCamera = null;
  let sunLight = null;
  let hemiLight = null;
  let floorGroup = null;
  let entityGroup = null;
  let fx3dGroup = null;
  let heroRig = null;
  let heroTileFrame = null;
  let heroDirArrow = null;
  let heroAngle = 0;
  let floorTiles3D = []; // [y][x] -> mesh/group
  let torchFlames3D = [];
  let stairsRig3D = null;
  let cloudMeshes3D = [];
  const enemyRigs = new Map();
  const itemMeshes = new Map();
  const trapMeshes = new Map();
  const raycaster = new THREE.Raycaster();
  const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

  // 3段階トゥーン階調マップ（スイッチ版ゼルダ・シレン6・添付画像風の立体アニメ調シェーディング）
  const toonGradData = new Uint8Array([118, 118, 118, 255, 198, 198, 198, 255, 255, 255, 255, 255]);
  const toonGradTex = new THREE.DataTexture(toonGradData, 3, 1, THREE.RGBAFormat);
  toonGradTex.minFilter = THREE.NearestFilter;
  toonGradTex.magFilter = THREE.NearestFilter;
  toonGradTex.needsUpdate = true;

  const outlineMat = new THREE.MeshBasicMaterial({ color: 0x2c1810, side: THREE.BackSide });

  function makeToonMat(color, opts = {}) {
    return new THREE.MeshToonMaterial(
      Object.assign(
        {
          color,
          gradientMap: toonGradTex,
        },
        opts
      )
    );
  }

  function addOutline(mesh, scale = 1.07) {
    const out = new THREE.Mesh(mesh.geometry, outlineMat);
    out.scale.setScalar(scale);
    mesh.add(out);
    return mesh;
  }

  function makePart(geo, mat, cast = true, outlineScale = 1.07) {
    const m = new THREE.Mesh(geo, mat);
    m.castShadow = cast;
    m.receiveShadow = true;
    if (outlineScale > 0) addOutline(m, outlineScale);
    return m;
  }

  // 手描き風タイル・石壁テクスチャ生成（オフスクリーンCanvas）
  const texCache3D = new Map();
  function getPaintedTileTex(hexA, hexB, isMoss) {
    const key = `${hexA}_${hexB}_${isMoss}`;
    if (texCache3D.has(key)) return texCache3D.get(key);
    const c = document.createElement("canvas");
    c.width = 128;
    c.height = 128;
    const g = c.getContext("2d");
    g.fillStyle = hexA;
    g.fillRect(0, 0, 128, 128);
    // 手描き風の柔らかいムラ＆小石
    for (let i = 0; i < 28; i++) {
      g.fillStyle = i % 2 === 0 ? hexB : "rgba(255,255,255,0.12)";
      g.beginPath();
      g.ellipse((i * 37 + 11) % 128, (i * 53 + 17) % 128, 8 + (i % 10), 6 + (i % 8), i, 0, Math.PI * 2);
      g.fill();
    }
    // ベベル風の明るい上左縁＆暗い下右縁
    g.strokeStyle = isMoss ? "rgba(236,252,203,0.45)" : "rgba(255,250,235,0.42)";
    g.lineWidth = 6;
    g.strokeRect(5, 5, 118, 118);
    g.strokeStyle = "rgba(44,24,16,0.55)";
    g.lineWidth = 5;
    g.strokeRect(2, 2, 124, 124);
    const tex = new THREE.CanvasTexture(c);
    texCache3D.set(key, tex);
    return tex;
  }

  // 主人公・ウィザード用の立体顔テクスチャ（通常顔 vs 敗北時の × × 顔）
  function createFaceTexture(defeated = false, eyeColor = "#3b1c0a") {
    const c = document.createElement("canvas");
    c.width = 256;
    c.height = 128;
    const g = c.getContext("2d");
    g.fillStyle = "#ffdfb8";
    g.fillRect(0, 0, 256, 128);

    // 球体の正面中央（u=0.5 -> x=128）に表情を描く
    const cx = 128;
    const cy = 66;
    // ほっぺ
    g.fillStyle = "rgba(244, 63, 94, 0.28)";
    g.beginPath();
    g.ellipse(cx - 32, cy + 12, 11, 7, 0, 0, Math.PI * 2);
    g.ellipse(cx + 32, cy + 12, 11, 7, 0, 0, Math.PI * 2);
    g.fill();

    if (defeated) {
      g.strokeStyle = "#2c1810";
      g.lineWidth = 7;
      g.lineCap = "round";
      [cx - 20, cx + 20].forEach((ex) => {
        g.beginPath();
        g.moveTo(ex - 9, cy - 9);
        g.lineTo(ex + 9, cy + 9);
        g.moveTo(ex + 9, cy - 9);
        g.lineTo(ex - 9, cy + 9);
        g.stroke();
      });
      // しょんぼり口
      g.lineWidth = 5;
      g.beginPath();
      g.arc(cx, cy + 25, 8, Math.PI * 1.15, Math.PI * 1.85);
      g.stroke();
    } else {
      // 凛々しい眉
      g.strokeStyle = "#4a2511";
      g.lineWidth = 6;
      g.lineCap = "round";
      g.beginPath();
      g.moveTo(cx - 31, cy - 20);
      g.lineTo(cx - 10, cy - 16);
      g.moveTo(cx + 31, cy - 20);
      g.lineTo(cx + 10, cy - 16);
      g.stroke();

      // 大きなクリクリ瞳＋キャッチライト
      [cx - 20, cx + 20].forEach((ex) => {
        g.fillStyle = eyeColor;
        g.beginPath();
        g.ellipse(ex, cy - 1, 8.5, 11.5, 0, 0, Math.PI * 2);
        g.fill();
        g.fillStyle = "#ffffff";
        g.beginPath();
        g.arc(ex - 2.8, cy - 5.5, 3.6, 0, Math.PI * 2);
        g.fill();
      });

      // にっこり口
      g.strokeStyle = "#6b3818";
      g.lineWidth = 4.5;
      g.beginPath();
      g.arc(cx, cy + 15, 7, 0.2, Math.PI - 0.2);
      g.stroke();
    }
    const tex = new THREE.CanvasTexture(c);
    return tex;
  }

  const heroFaceNormalTex = createFaceTexture(false, "#3b1c0a");
  const heroFaceDefeatedTex = createFaceTexture(true, "#3b1c0a");
  const wizardFaceTex = createFaceTexture(false, "#1e3a8a");

  // 光る角丸タイル台座枠（添付画像のシアン＆赤マゼンタの台座枠！）
  function createGlowingFrame3D(colorHex) {
    const group = new THREE.Group();
    const mat = new THREE.MeshBasicMaterial({ color: colorHex, transparent: true, opacity: 0.92 });
    const barLen = 0.92;
    const thick = 0.065;
    const h = 0.035;
    const gX = new THREE.BoxGeometry(barLen, h, thick);
    const gZ = new THREE.BoxGeometry(thick, h, barLen);
    const b1 = new THREE.Mesh(gX, mat); b1.position.set(0, 0.03, -barLen / 2 + thick / 2);
    const b2 = new THREE.Mesh(gX, mat); b2.position.set(0, 0.03, barLen / 2 - thick / 2);
    const b3 = new THREE.Mesh(gZ, mat); b3.position.set(-barLen / 2 + thick / 2, 0.03, 0);
    const b4 = new THREE.Mesh(gZ, mat); b4.position.set(barLen / 2 - thick / 2, 0.03, 0);
    group.add(b1, b2, b3, b4);
    return group;
  }

  // --- 主人公：添付画像そっくりの3Dチビ騎士フィギュア（全身関節可動！） ---
  function createHero3D() {
    const root = new THREE.Group();
    const bodyGroup = new THREE.Group();
    root.add(bodyGroup);

    const matSkin = makeToonMat(0xffdfb8);
    const matFaceNormal = makeToonMat(0xffffff, { map: heroFaceNormalTex });
    const matFaceDefeated = makeToonMat(0xffffff, { map: heroFaceDefeatedTex });
    const matHair = makeToonMat(0x7c3f1c);
    const matTunic = makeToonMat(0xc81e1e);
    const matGold = makeToonMat(0xfacc15);
    const matLeather = makeToonMat(0x5c2d0e);
    const matBoot = makeToonMat(0x6b3818);
    const matSleeve = makeToonMat(0x475569);
    const matBlade = makeToonMat(0xe2e8f0);

    // 1. 両脚（股関節ピボットで前後に3Dスイング！）
    const legGeo = new THREE.CylinderGeometry(0.085, 0.095, 0.24, 10);
    const bootGeo = new THREE.BoxGeometry(0.16, 0.14, 0.23);
    const legL = new THREE.Group();
    legL.position.set(-0.11, 0.26, 0);
    const llMesh = makePart(legGeo, matLeather, true, 1.1);
    llMesh.position.y = -0.10;
    const bootL = makePart(bootGeo, matBoot, true, 1.09);
    bootL.position.set(0, -0.20, 0.03);
    legL.add(llMesh, bootL);

    const legR = new THREE.Group();
    legR.position.set(0.11, 0.26, 0);
    const lrMesh = makePart(legGeo, matLeather, true, 1.1);
    lrMesh.position.y = -0.10;
    const bootR = makePart(bootGeo, matBoot, true, 1.09);
    bootR.position.set(0, -0.20, 0.03);
    legR.add(lrMesh, bootR);
    bodyGroup.add(legL, legR);

    // 2. 胴体（真紅の騎士チュニック＋金ベルト＋斜め掛け革ベルト）
    const torso = makePart(new THREE.CylinderGeometry(0.19, 0.26, 0.42, 12), matTunic, true, 1.07);
    torso.position.y = 0.46;
    bodyGroup.add(torso);

    const belt = makePart(new THREE.CylinderGeometry(0.235, 0.245, 0.085, 12), matLeather, true, 1.06);
    belt.position.y = 0.37;
    bodyGroup.add(belt);

    const buckle = makePart(new THREE.BoxGeometry(0.11, 0.10, 0.06), matGold, true, 1.1);
    buckle.position.set(0, 0.37, 0.23);
    bodyGroup.add(buckle);

    const hemTrim = makePart(new THREE.CylinderGeometry(0.258, 0.268, 0.045, 12), matGold, false, 0);
    hemTrim.position.y = 0.27;
    bodyGroup.add(hemTrim);

    // 肩当て（丸い金のポールドロン）
    const pauldronGeo = new THREE.SphereGeometry(0.125, 12, 10);
    const paulL = makePart(pauldronGeo, matGold, true, 1.09);
    paulL.scale.set(1.1, 0.85, 1.0);
    paulL.position.set(-0.24, 0.61, 0);
    const paulR = makePart(pauldronGeo, matGold, true, 1.09);
    paulR.scale.set(1.1, 0.85, 1.0);
    paulR.position.set(0.24, 0.61, 0);
    bodyGroup.add(paulL, paulR);

    // 3. 右腕＋3Dブレード剣（肩ピボットで3D斬撃！）
    const armR = new THREE.Group();
    armR.position.set(0.26, 0.58, 0);
    const arMesh = makePart(new THREE.CylinderGeometry(0.068, 0.072, 0.24, 10), matSleeve, true, 1.12);
    arMesh.position.set(0.03, -0.10, 0.03);
    arMesh.rotation.z = 0.32;
    const handR = makePart(new THREE.SphereGeometry(0.075, 10, 8), matLeather, true, 1.12);
    handR.position.set(0.08, -0.21, 0.08);
    armR.add(arMesh, handR);

    const swordGroup = new THREE.Group();
    swordGroup.position.set(0.09, -0.20, 0.10);
    swordGroup.rotation.x = 0.42;
    swordGroup.rotation.z = -0.25;
    const bladeMesh = makePart(new THREE.BoxGeometry(0.09, 0.52, 0.035), matBlade, true, 1.12);
    bladeMesh.position.y = 0.30;
    const tipMesh = makePart(new THREE.ConeGeometry(0.064, 0.14, 4), matBlade, true, 1.12);
    tipMesh.rotation.y = Math.PI / 4;
    tipMesh.position.y = 0.63;
    const guardMesh = makePart(new THREE.BoxGeometry(0.24, 0.06, 0.07), matGold, true, 1.1);
    guardMesh.position.y = 0.04;
    const gripMesh = makePart(new THREE.CylinderGeometry(0.032, 0.032, 0.14, 8), matLeather, false, 1.12);
    gripMesh.position.y = -0.05;
    swordGroup.add(bladeMesh, tipMesh, guardMesh, gripMesh);
    armR.add(swordGroup);
    bodyGroup.add(armR);

    // 4. 左腕＋3Dカイトシールド
    const armL = new THREE.Group();
    armL.position.set(-0.26, 0.58, 0);
    const alMesh = makePart(new THREE.CylinderGeometry(0.068, 0.072, 0.24, 10), matSleeve, true, 1.12);
    alMesh.position.set(-0.03, -0.10, 0.03);
    alMesh.rotation.z = -0.32;
    const handL = makePart(new THREE.SphereGeometry(0.075, 10, 8), matLeather, true, 1.12);
    handL.position.set(-0.08, -0.20, 0.08);
    armL.add(alMesh, handL);

    const shieldGroup = new THREE.Group();
    shieldGroup.position.set(-0.12, -0.16, 0.16);
    shieldGroup.rotation.y = -0.45;
    const shieldRim = makePart(new THREE.BoxGeometry(0.32, 0.38, 0.06), matGold, true, 1.09);
    const shieldFace = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.31, 0.075), matTunic);
    const shieldBoss = new THREE.Mesh(new THREE.SphereGeometry(0.055, 10, 8), matGold);
    shieldBoss.position.z = 0.04;
    shieldGroup.add(shieldRim, shieldFace, shieldBoss);
    armL.add(shieldGroup);
    bodyGroup.add(armL);

    // 5. 大きな3Dチビ頭部（顔テクスチャ＋多層ツンツン3D栗毛ヘア！）
    const headGroup = new THREE.Group();
    headGroup.position.y = 0.90;
    const headGeo = new THREE.SphereGeometry(0.285, 20, 16);
    const headMesh = new THREE.Mesh(headGeo, matFaceNormal);
    headMesh.castShadow = true;
    headMesh.receiveShadow = true;
    headMesh.rotation.y = -Math.PI / 2; // テクスチャ中央(u=0.5)を+Z正面に向ける
    addOutline(headMesh, 1.06);
    headGroup.add(headMesh);

    // 立体ヘアベース（後頭部＆頭頂部）
    const hairBack = makePart(new THREE.SphereGeometry(0.295, 16, 14), matHair, true, 1.06);
    hairBack.position.set(0, 0.05, -0.05);
    hairBack.scale.set(1.04, 1.0, 1.02);
    headGroup.add(hairBack);

    // 立体的な房毛＆ツンツン前髪（7パーツでふっくら造形！）
    const lockGeo = new THREE.ConeGeometry(0.115, 0.30, 8);
    const locks = [
      { p: [-0.14, 0.22, 0.14], r: [0.65, 0.2, 0.55], s: [1.0, 1.0, 0.85] },
      { p: [0.02, 0.25, 0.16], r: [0.75, 0, -0.15], s: [1.1, 1.05, 0.85] },
      { p: [0.16, 0.20, 0.13], r: [0.60, -0.2, -0.58], s: [0.95, 0.95, 0.8] },
      { p: [-0.24, 0.06, 0.06], r: [0.2, 0, 1.05], s: [0.85, 0.9, 0.8] },
      { p: [0.24, 0.06, 0.06], r: [0.2, 0, -1.05], s: [0.85, 0.9, 0.8] },
      { p: [-0.08, 0.32, -0.04], r: [-0.35, 0, 0.38], s: [1.05, 1.0, 0.95] },
      { p: [0.10, 0.31, -0.04], r: [-0.35, 0, -0.42], s: [1.0, 0.95, 0.95] },
    ];
    locks.forEach((lk) => {
      const m = makePart(lockGeo, matHair, true, 1.08);
      m.position.set(lk.p[0], lk.p[1], lk.p[2]);
      m.rotation.set(lk.r[0], lk.r[1], lk.r[2]);
      m.scale.set(lk.s[0], lk.s[1], lk.s[2]);
      headGroup.add(m);
    });
    bodyGroup.add(headGroup);

    return {
      root,
      bodyGroup,
      headGroup,
      headMesh,
      matFaceNormal,
      matFaceDefeated,
      armL,
      armR,
      legL,
      legR,
      bladeMesh,
      tipMesh,
      shieldFace,
    };
  }

  // --- モンスター別3Dモデリングフィギュア（すべて関節・翼・杖が立体可動！） ---
  function createEnemy3D(tpl) {
    const root = new THREE.Group();
    const bodyGroup = new THREE.Group();
    root.add(bodyGroup);
    const scale = tpl.isBoss ? 1.48 : 1.05;
    bodyGroup.scale.setScalar(scale);

    const parts = { root, bodyGroup, wings: [], arms: [], legs: [], orb: null, frame: null };

    // 足元の光る赤マゼンタ台座枠
    const frame = createGlowingFrame3D(0xf43f5e);
    root.add(frame);
    parts.frame = frame;

    if (tpl.id === "slime") {
      // ぷるぷる3D雫スライム
      const matBody = makeToonMat(0x38bdf8);
      const dome = makePart(new THREE.SphereGeometry(0.32, 18, 14), matBody, true, 1.07);
      dome.scale.set(1.05, 0.88, 1.05);
      dome.position.y = 0.28;
      const tip = makePart(new THREE.ConeGeometry(0.16, 0.24, 12), matBody, true, 1.07);
      tip.position.y = 0.56;
      bodyGroup.add(dome, tip);

      const matWhite = new THREE.MeshBasicMaterial({ color: 0xffffff });
      const matPupil = new THREE.MeshBasicMaterial({ color: 0x0f172a });
      [-0.11, 0.11].forEach((ex) => {
        const ew = new THREE.Mesh(new THREE.SphereGeometry(0.068, 10, 8), matWhite);
        ew.position.set(ex, 0.30, 0.28);
        const ep = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 8), matPupil);
        ep.position.set(ex, 0.30, 0.335);
        bodyGroup.add(ew, ep);
      });
    } else if (tpl.id === "shadow_rogue") {
      // 添付画像右下の3D影のローグ（深いフード＋光る赤目＋双剣！）
      const matCloak = makeToonMat(0x1f2937);
      const matHood = makeToonMat(0x334155);
      const matDark = new THREE.MeshBasicMaterial({ color: 0x05070e });
      const matRedEye = new THREE.MeshBasicMaterial({ color: 0xff3b5c });
      const matDagger = makeToonMat(0xe2e8f0);

      const cloak = makePart(new THREE.CylinderGeometry(0.16, 0.28, 0.48, 12), matCloak, true, 1.07);
      cloak.position.y = 0.30;
      const hood = makePart(new THREE.SphereGeometry(0.25, 16, 14), matHood, true, 1.07);
      hood.position.y = 0.68;
      const hoodTip = makePart(new THREE.ConeGeometry(0.16, 0.26, 10), matHood, true, 1.08);
      hoodTip.position.set(0, 0.88, -0.09);
      hoodTip.rotation.x = -0.55;
      const faceVoid = new THREE.Mesh(new THREE.SphereGeometry(0.17, 12, 10), matDark);
      faceVoid.position.set(0, 0.66, 0.11);
      bodyGroup.add(cloak, hood, hoodTip, faceVoid);

      [-0.075, 0.075].forEach((ex) => {
        const eye = new THREE.Mesh(new THREE.SphereGeometry(0.038, 8, 8), matRedEye);
        eye.scale.set(1.3, 0.75, 0.8);
        eye.position.set(ex, 0.67, 0.26);
        bodyGroup.add(eye);
      });

      // 両腕＋双剣
      [-1, 1].forEach((side) => {
        const arm = new THREE.Group();
        arm.position.set(side * 0.24, 0.44, 0.04);
        const dag = makePart(new THREE.ConeGeometry(0.055, 0.34, 4), matDagger, true, 1.12);
        dag.position.set(side * 0.08, -0.02, 0.16);
        dag.rotation.x = Math.PI * 0.42;
        dag.rotation.z = -side * 0.35;
        arm.add(dag);
        bodyGroup.add(arm);
        parts.arms.push(arm);
      });
    } else if (tpl.id === "gargoyle") {
      // 添付画像上部の3D石のガーゴイル（羽ばたく石翼＋角＋光る琥珀目！）
      const matStone = makeToonMat(0x94a3b8);
      const matStoneDark = makeToonMat(0x64748b);
      const matEye = new THREE.MeshBasicMaterial({ color: 0xfacc15 });

      const torso = makePart(new THREE.CylinderGeometry(0.19, 0.23, 0.44, 10), matStone, true, 1.07);
      torso.position.y = 0.34;
      const head = makePart(new THREE.SphereGeometry(0.21, 14, 12), matStone, true, 1.07);
      head.position.y = 0.68;
      bodyGroup.add(torso, head);

      [-1, 1].forEach((side) => {
        const horn = makePart(new THREE.ConeGeometry(0.06, 0.22, 8), matStoneDark, true, 1.1);
        horn.position.set(side * 0.15, 0.86, 0);
        horn.rotation.z = -side * 0.45;
        bodyGroup.add(horn);

        const eye = new THREE.Mesh(new THREE.BoxGeometry(0.065, 0.045, 0.05), matEye);
        eye.position.set(side * 0.075, 0.69, 0.19);
        bodyGroup.add(eye);

        // 羽ばたく3D翼
        const wing = new THREE.Group();
        wing.position.set(side * 0.16, 0.48, -0.10);
        const wMesh = makePart(new THREE.BoxGeometry(0.36, 0.26, 0.05), matStoneDark, true, 1.08);
        wMesh.position.set(side * 0.18, 0.08, -0.04);
        wMesh.rotation.z = side * 0.32;
        wing.add(wMesh);
        bodyGroup.add(wing);
        parts.wings.push({ g: wing, side });
      });
    } else if (tpl.id === "ice_mage") {
      // 添付画像右上の3D蒼帽ウィザード（大きな青い三角帽＋顔＋回る魔力オーブ！）
      const matRobe = makeToonMat(0x2563eb);
      const matHat = makeToonMat(0x3b82f6);
      const matGold = makeToonMat(0xfacc15);
      const matFace = makeToonMat(0xffffff, { map: wizardFaceTex });

      const robe = makePart(new THREE.CylinderGeometry(0.17, 0.27, 0.46, 12), matRobe, true, 1.07);
      robe.position.y = 0.26;
      const trim = makePart(new THREE.CylinderGeometry(0.22, 0.23, 0.05, 12), matGold, false, 0);
      trim.position.y = 0.26;
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.22, 16, 14), matFace);
      head.position.y = 0.64;
      head.rotation.y = -Math.PI / 2;
      head.castShadow = true;
      addOutline(head, 1.07);
      const brim = makePart(new THREE.CylinderGeometry(0.38, 0.39, 0.045, 16), matHat, true, 1.06);
      brim.position.y = 0.80;
      const cone = makePart(new THREE.ConeGeometry(0.24, 0.46, 12), matHat, true, 1.07);
      cone.position.set(0, 1.02, -0.04);
      cone.rotation.x = -0.22;
      bodyGroup.add(robe, trim, head, brim, cone);

      const orb = new THREE.Mesh(new THREE.OctahedronGeometry(0.09), new THREE.MeshBasicMaterial({ color: 0x7dd3fc }));
      orb.position.set(0.34, 0.68, 0.14);
      bodyGroup.add(orb);
      parts.orb = orb;
    } else {
      // ゴブリン・火炎トカゲ・黒曜騎士・ボス類（立体3Dモデル＋角＋武器！）
      const colInt = parseInt(tpl.color.replace("#", ""), 16);
      const matMain = makeToonMat(colInt);
      const matAccent = makeToonMat(tpl.isBoss ? 0xfacc15 : 0x475569);
      const matEye = new THREE.MeshBasicMaterial({ color: tpl.isBoss ? 0xfef08a : 0xff4d6d });

      const torso = makePart(new THREE.CylinderGeometry(0.20, 0.26, 0.48, 12), matMain, true, 1.07);
      torso.position.y = 0.34;
      const head = makePart(new THREE.SphereGeometry(0.23, 14, 12), matMain, true, 1.07);
      head.position.y = 0.72;
      bodyGroup.add(torso, head);

      [-1, 1].forEach((side) => {
        const horn = makePart(new THREE.ConeGeometry(0.068, tpl.isBoss ? 0.32 : 0.22, 8), matAccent, true, 1.1);
        horn.position.set(side * 0.17, 0.92, 0);
        horn.rotation.z = -side * 0.42;
        bodyGroup.add(horn);

        const eye = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.05, 0.05), matEye);
        eye.position.set(side * 0.085, 0.73, 0.21);
        bodyGroup.add(eye);

        const arm = new THREE.Group();
        arm.position.set(side * 0.27, 0.46, 0);
        const aMesh = makePart(new THREE.CylinderGeometry(0.065, 0.075, 0.28, 8), matAccent, true, 1.1);
        aMesh.position.y = -0.10;
        arm.add(aMesh);
        bodyGroup.add(arm);
        parts.arms.push(arm);

        if (tpl.isBoss) {
          const wing = new THREE.Group();
          wing.position.set(side * 0.18, 0.50, -0.12);
          const wMesh = makePart(new THREE.BoxGeometry(0.46, 0.34, 0.06), makeToonMat(0x581c87), true, 1.08);
          wMesh.position.set(side * 0.22, 0.12, -0.05);
          wMesh.rotation.z = side * 0.36;
          wing.add(wMesh);
          bodyGroup.add(wing);
          parts.wings.push({ g: wing, side });
        }
      });
    }

    return parts;
  }

  // 3D回転アイテム生成
  function createItem3D(def) {
    const g = new THREE.Group();
    if (def.kind.startsWith("scroll") || def.kind === "return") {
      const m = makePart(new THREE.CylinderGeometry(0.09, 0.09, 0.38, 10), makeToonMat(0xfef3c7), true, 1.1);
      m.rotation.z = Math.PI / 2;
      g.add(m);
    } else if (def.kind.startsWith("staff")) {
      const stick = makePart(new THREE.CylinderGeometry(0.035, 0.035, 0.46, 8), makeToonMat(0x92400e), true, 1.12);
      const gem = makePart(new THREE.OctahedronGeometry(0.10), makeToonMat(0x38bdf8), true, 1.1);
      gem.position.y = 0.24;
      stick.add(gem);
      stick.rotation.z = -0.5;
      g.add(stick);
    } else if (def.kind === "food") {
      const rice = makePart(new THREE.ConeGeometry(0.18, 0.26, 4), makeToonMat(0xf8fafc), true, 1.1);
      const nori = makePart(new THREE.BoxGeometry(0.18, 0.12, 0.19), makeToonMat(0x1e293b), false, 0);
      nori.position.y = -0.07;
      g.add(rice, nori);
    } else if (def.kind === "heal") {
      const leaf = makePart(new THREE.DodecahedronGeometry(0.15), makeToonMat(0x4ade80), true, 1.1);
      g.add(leaf);
    } else if (def.kind === "mp") {
      const bottle = makePart(new THREE.SphereGeometry(0.14, 12, 10), makeToonMat(0x38bdf8), true, 1.1);
      g.add(bottle);
    } else {
      const dia = makePart(new THREE.OctahedronGeometry(0.16), makeToonMat(0x60a5fa), true, 1.1);
      g.add(dia);
    }
    g.position.y = 0.28;
    return g;
  }

  // --- Three.js 初期化 ---
  function initThree() {
    threeRenderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
    threeRenderer.shadowMap.enabled = true;
    threeRenderer.shadowMap.type = THREE.PCFSoftShadowMap;
    threeRenderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

    threeScene = new THREE.Scene();
    threeCamera = new THREE.PerspectiveCamera(36, 16 / 9, 0.5, 90);

    // 明るく温かみのある太陽光＋空の半球ライト（ミニチュアジオラマ風！）
    hemiLight = new THREE.HemisphereLight(0xe0f2fe, 0x5c3a21, 0.92);
    threeScene.add(hemiLight);

    sunLight = new THREE.DirectionalLight(0xfff7ed, 1.15);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 1024;
    sunLight.shadow.mapSize.height = 1024;
    sunLight.shadow.camera.near = 2;
    sunLight.shadow.camera.far = 36;
    const d = 11;
    sunLight.shadow.camera.left = -d;
    sunLight.shadow.camera.right = d;
    sunLight.shadow.camera.top = d;
    sunLight.shadow.camera.bottom = -d;
    sunLight.shadow.bias = -0.0015;
    threeScene.add(sunLight);
    threeScene.add(sunLight.target);

    floorGroup = new THREE.Group();
    entityGroup = new THREE.Group();
    fx3dGroup = new THREE.Group();
    threeScene.add(floorGroup, entityGroup, fx3dGroup);

    // ふわふわ漂う3D入道雲（浮島の周囲）
    const cloudMat = makeToonMat(0xffffff);
    const puffGeo = new THREE.SphereGeometry(1.15, 12, 10);
    for (let i = 0; i < 12; i++) {
      const cg = new THREE.Group();
      for (let p = 0; p < 3; p++) {
        const m = new THREE.Mesh(puffGeo, cloudMat);
        m.position.set((p - 1) * 1.1, p === 1 ? 0.35 : 0, (p % 2) * 0.4);
        m.scale.set(1.1, 0.72, 0.9);
        cg.add(m);
      }
      cg.position.set((i % 4) * 11 - 4, -2.6 - (i % 3) * 0.9, Math.floor(i / 4) * 11 - 4);
      threeScene.add(cg);
      cloudMeshes3D.push(cg);
    }

    // 主人公3Dモデル＆シアン台座枠＆向き矢印
    heroRig = createHero3D();
    threeScene.add(heroRig.root);

    heroTileFrame = createGlowingFrame3D(0x22d3ee);
    threeScene.add(heroTileFrame);

    heroDirArrow = makePart(new THREE.ConeGeometry(0.13, 0.28, 4), makeToonMat(0x22d3ee), false, 1.12);
    heroDirArrow.rotation.x = Math.PI / 2;
    threeScene.add(heroDirArrow);
  }

  function clearGroup(grp) {
    while (grp.children.length > 0) {
      grp.remove(grp.children[0]);
    }
  }

  function createStairs3D() {
    const group = new THREE.Group();
    const matCurb = makeToonMat(0x475569);
    const matRiser = makeToonMat(0x334155);
    const matStepA = makeToonMat(0xfef3c7);
    const matStepB = makeToonMat(0xe2e8f0);

    // 1. 深い階段ピットの底面
    const pitFloor = new THREE.Mesh(
      new THREE.BoxGeometry(0.86, 0.06, 0.86),
      new THREE.MeshBasicMaterial({ color: 0x05070e })
    );
    pitFloor.position.set(0, -0.25, 0);
    pitFloor.receiveShadow = true;
    group.add(pitFloor);

    // 2. 四方を囲む石造りの縁枠（南側だけ少し低くして階段を見やすくする）
    const curbs = [
      { size: [0.98, 0.34, 0.11], pos: [0, -0.10, -0.435] },
      { size: [0.98, 0.24, 0.11], pos: [0, -0.15, 0.435] },
      { size: [0.11, 0.34, 0.98], pos: [-0.435, -0.10, 0] },
      { size: [0.11, 0.34, 0.98], pos: [0.435, -0.10, 0] },
    ];
    curbs.forEach((c) => {
      const m = makePart(new THREE.BoxGeometry(c.size[0], c.size[1], c.size[2]), matCurb, true, 1.04);
      m.position.set(c.pos[0], c.pos[1], c.pos[2]);
      group.add(m);
    });

    // 3. 北東・北西コーナーの光る灯籠石柱
    const caps = [];
    const pillarGeo = new THREE.BoxGeometry(0.14, 0.28, 0.14);
    const capGeo = new THREE.BoxGeometry(0.16, 0.07, 0.16);
    const capMat = new THREE.MeshBasicMaterial({ color: 0xfde047 });
    [-0.41, 0.41].forEach((cx) => {
      const pil = makePart(pillarGeo, matCurb, true, 1.06);
      pil.position.set(cx, 0.14, -0.41);
      const cap = new THREE.Mesh(capGeo, capMat);
      cap.position.set(cx, 0.31, -0.41);
      group.add(pil, cap);
      caps.push(cap);
    });

    // 4. 左→右へ降りていく5段の高コントラスト石段
    for (let s = 0; s < 5; s++) {
      const h = Math.max(0.06, 0.30 - s * 0.062);
      const sx = -0.31 + s * 0.155;
      const stepMat = s % 2 === 0 ? matStepA : matStepB;
      const step = makePart(new THREE.BoxGeometry(0.155, h, 0.74), stepMat, false, 1.04);
      step.position.set(sx, -0.24 + h / 2, 0);
      group.add(step);

      const riserEdge = new THREE.Mesh(new THREE.BoxGeometry(0.155, 0.028, 0.03), matRiser);
      riserEdge.position.set(sx, -0.24 + h - 0.014, 0.36);
      group.add(riserEdge);
    }

    // 5. 光るエメラルド縁枠
    const frame = createGlowingFrame3D(0x34d399);
    frame.position.y = 0.06;
    group.add(frame);

    // 6. 上空へ伸びる半透明の光の柱（ランドマークビーコン）
    const beamMat = new THREE.MeshBasicMaterial({
      color: 0x34d399,
      transparent: true,
      opacity: 0.20,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.38, 1.45, 16, 1, true), beamMat);
    beam.position.set(0, 0.72, 0);
    group.add(beam);

    // 7. 浮遊して回転・上下するゴールドの下向き3D矢印
    const arrow = new THREE.Group();
    arrow.position.set(0, 1.18, 0);
    const arrowMat = makeToonMat(0xfde047);
    const cone = makePart(new THREE.ConeGeometry(0.16, 0.26, 4), arrowMat, false, 1.1);
    cone.rotation.x = Math.PI;
    const shaft = makePart(new THREE.BoxGeometry(0.09, 0.16, 0.09), arrowMat, false, 1.1);
    shaft.position.y = 0.18;
    arrow.add(cone, shaft);
    group.add(arrow);

    // 8. 階段専用ポイントライト
    const light = new THREE.PointLight(0x34d399, 0.85, 4.8);
    light.position.set(0, 0.65, 0);
    group.add(light);

    return { group, frame, beam, arrow, caps, light };
  }

  function rebuildFloor3D() {
    if (!threeScene) return;
    clearGroup(floorGroup);
    clearGroup(entityGroup);
    clearGroup(fx3dGroup);
    enemyRigs.clear();
    itemMeshes.clear();
    trapMeshes.clear();
    torchFlames3D = [];
    stairsRig3D = null;

    const biome = getBiome(floorNum);
    threeScene.background = new THREE.Color(biome.sky);
    threeScene.fog = new THREE.Fog(biome.fog, 19, 36);
    hemiLight.color.setHex(biome.ambient);
    sunLight.color.setHex(biome.sun);

    const floorGeo = new THREE.BoxGeometry(0.96, 0.28, 0.96);
    const wallGeo = new THREE.BoxGeometry(0.98, 1.32, 0.98);
    const pillarGeo = new THREE.CylinderGeometry(0.32, 0.36, 1.25, 10);

    const matFloorA = makeToonMat(0xffffff, { map: getPaintedTileTex(biome.floorA, biome.floorB, false) });
    const matFloorB = makeToonMat(0xffffff, { map: getPaintedTileTex(biome.floorB, biome.floorA, false) });
    const matMossA = makeToonMat(0xffffff, { map: getPaintedTileTex(biome.mossA, biome.mossB, true) });
    const matMossB = makeToonMat(0xffffff, { map: getPaintedTileTex(biome.mossB, biome.mossA, true) });
    const matWall = makeToonMat(0xffffff, { map: getPaintedTileTex(biome.wallTop, biome.wallSide, false) });
    const matWater = makeToonMat(biome.water, { transparent: true, opacity: 0.88 });

    floorTiles3D = Array.from({ length: MAP_H }, () => new Array(MAP_W).fill(null));

    for (let y = 0; y < MAP_H; y++) {
      for (let x = 0; x < MAP_W; x++) {
        const t = grid[y][x];
        if (t === T.WALL) {
          // 部屋や通路に隣接する壁だけ立体生成（軽量＆浮島シルエット！）
          let nearOpen = false;
          for (let dy = -1; dy <= 1 && !nearOpen; dy++) {
            for (let dx = -1; dx <= 1 && !nearOpen; dx++) {
              const ny = y + dy;
              const nx = x + dx;
              if (ny >= 0 && ny < MAP_H && nx >= 0 && nx < MAP_W && grid[ny][nx] !== T.WALL) nearOpen = true;
            }
          }
          if (!nearOpen) continue;
          const wm = new THREE.Mesh(wallGeo, matWall);
          wm.position.set(x, 0.52, y);
          wm.castShadow = true;
          wm.receiveShadow = true;
          floorGroup.add(wm);
          floorTiles3D[y][x] = wm;
        } else if (t === T.STAIRS) {
          stairsRig3D = createStairs3D();
          stairsRig3D.group.position.set(x, 0, y);
          floorGroup.add(stairsRig3D.group);
          floorTiles3D[y][x] = stairsRig3D.group;
        } else {
          const isMoss = ((x * 73 + y * 137) & 15) < 4 && t === T.FLOOR;
          const even = (x + y) % 2 === 0;
          const fMat = isMoss ? (even ? matMossA : matMossB) : (even ? matFloorA : matFloorB);
          const fm = new THREE.Mesh(floorGeo, fMat);
          fm.position.set(x, -0.14, y);
          fm.receiveShadow = true;
          floorGroup.add(fm);

          if (t === T.WATER) {
            const wMesh = new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.08, 0.92), matWater);
            wMesh.position.set(0, 0.145, 0);
            fm.add(wMesh);
          } else if (t === T.PILLAR) {
            const pm = makePart(pillarGeo, matWall, true, 1.05);
            pm.position.set(0, 0.72, 0);
            fm.add(pm);
          }
          floorTiles3D[y][x] = fm;
        }
      }
    }

    // 3D石の篝火（燃える炎＋暖色ポイントライト）
    const bowlMat = makeToonMat(0x5c3317);
    const flameMat = new THREE.MeshBasicMaterial({ color: 0xff9800 });
    torches.forEach((tc, idx) => {
      const tg = new THREE.Group();
      tg.position.set(tc.x, 1.18, tc.y);
      const bowl = makePart(new THREE.CylinderGeometry(0.24, 0.14, 0.16, 8), bowlMat, false, 1.08);
      const flame = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.34, 7), flameMat);
      flame.position.y = 0.22;
      tg.add(bowl, flame);
      if (idx < 5) {
        const pl = new THREE.PointLight(biome.torch, 0.9, 6.5);
        pl.position.y = 0.45;
        tg.add(pl);
      }
      floorGroup.add(tg);
      torchFlames3D.push({ flame, tc, group: tg });
    });

    updateVisibility3D();
  }

  function updateVisibility3D() {
    if (!floorTiles3D.length) return;
    for (let y = 0; y < MAP_H; y++) {
      for (let x = 0; x < MAP_W; x++) {
        const obj = floorTiles3D[y][x];
        if (!obj) continue;
        obj.visible = explored[y][x] === 1;
      }
    }
  }

  function syncEntities3D() {
    if (!entityGroup) return;
    // 敵3Dモデルの同期
    const aliveSet = new Set();
    enemies.forEach((e) => {
      if (e.hp <= 0) return;
      aliveSet.add(e);
      if (!enemyRigs.has(e)) {
        const rig = createEnemy3D(e.tpl);
        rig.root.position.set(e.rx, 0, e.ry);
        entityGroup.add(rig.root);
        enemyRigs.set(e, rig);
      }
    });
    for (const [e, rig] of enemyRigs.entries()) {
      if (!aliveSet.has(e)) {
        entityGroup.remove(rig.root);
        enemyRigs.delete(e);
      }
    }

    // 床アイテム3Dモデルの同期
    const itemSet = new Set(floorItems);
    floorItems.forEach((it) => {
      if (!itemMeshes.has(it)) {
        const m = createItem3D(ITEM_DEFS[it.id]);
        m.position.set(it.x, 0.28, it.y);
        entityGroup.add(m);
        itemMeshes.set(it, m);
      }
    });
    for (const [it, m] of itemMeshes.entries()) {
      if (!itemSet.has(it)) {
        entityGroup.remove(m);
        itemMeshes.delete(it);
      }
    }

    // 露出ワナ3Dマーカーの同期
    traps.forEach((tr) => {
      if (tr.revealed && !trapMeshes.has(tr)) {
        const m = new THREE.Mesh(
          new THREE.CylinderGeometry(0.32, 0.34, 0.05, 10),
          new THREE.MeshBasicMaterial({ color: 0xef4444 })
        );
        m.position.set(tr.x, 0.03, tr.y);
        entityGroup.add(m);
        trapMeshes.set(tr, m);
      }
    });
  }

  function projectToScreen(wx, wy, wz, cw, ch) {
    const v = new THREE.Vector3(wx, wy, wz);
    v.project(threeCamera);
    return {
      x: (v.x * 0.5 + 0.5) * cw,
      y: (-v.y * 0.5 + 0.5) * ch,
      visible: v.z < 1,
    };
  }

  function renderFrame(now) {
    requestAnimationFrame(renderFrame);
    if (!threeRenderer) return;
    const tSec = now * 0.001;

    const cw = canvas.clientWidth;
    const ch = canvas.clientHeight;
    if (!cw || !ch) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    if (canvas.width !== Math.round(cw * dpr) || canvas.height !== Math.round(ch * dpr)) {
      threeRenderer.setSize(cw, ch, false);
      threeCamera.aspect = cw / ch;
      threeCamera.updateProjectionMatrix();
    }
    if (fxCanvas.width !== Math.round(cw * dpr) || fxCanvas.height !== Math.round(ch * dpr)) {
      fxCanvas.width = Math.round(cw * dpr);
      fxCanvas.height = Math.round(ch * dpr);
    }

    if (isEndingPlaying && endingScene && endingCamera && endingData) {
      renderEndingFrame(now, cw, ch, dpr);
      return;
    }

    syncEntities3D();

    // スムーズ移動補間＆3D歩行・斬撃アニメーション更新
    const pDist = Math.hypot(player.x - player.rx, player.y - player.ry);
    const pMoving = pDist > 0.025;
    if (pMoving) player.walkPhase += 0.42;
    player.rx += (player.x - player.rx) * 0.26;
    player.ry += (player.y - player.ry) * 0.26;
    player.lungeX *= 0.72;
    player.lungeY *= 0.72;
    if (player.swingTimer > 0) player.swingTimer = Math.max(0, player.swingTimer - 0.016);
    if (player.hitFlash > 0) player.hitFlash = Math.max(0, player.hitFlash - 0.016);

    // 主人公3Dリグの更新（向き回転・脚スイング・腕剣振り・敗北転倒！）
    const targetHeroAngle = Math.atan2(player.dx, player.dy);
    let diff = targetHeroAngle - heroAngle;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    heroAngle += diff * 0.25;

    const hx = player.rx + player.lungeX;
    const hz = player.ry + player.lungeY;
    heroRig.root.position.set(hx, 0, hz);
    heroRig.root.rotation.y = heroAngle;

    // 装備色のリアルタイム反映
    const wCol = parseInt(WEAPONS[save.weaponIdx].color.replace("#", ""), 16);
    heroRig.bladeMesh.material.color.setHex(wCol);
    heroRig.tipMesh.material.color.setHex(wCol);
    const sCol = parseInt(SHIELDS[save.shieldIdx].color.replace("#", ""), 16);
    heroRig.shieldFace.material.color.setHex(sCol);

    if (isDefeated) {
      heroRig.headMesh.material = heroRig.matFaceDefeated;
      heroRig.bodyGroup.rotation.x += (-Math.PI * 0.48 - heroRig.bodyGroup.rotation.x) * 0.2;
      heroRig.bodyGroup.position.y += (0.16 - heroRig.bodyGroup.position.y) * 0.2;
      heroDirArrow.visible = false;
      heroTileFrame.children.forEach((m) => m.material.color.setHex(0xef4444));
    } else {
      heroRig.headMesh.material = heroRig.matFaceNormal;
      heroRig.bodyGroup.rotation.x += (0 - heroRig.bodyGroup.rotation.x) * 0.25;
      const stepSin = pMoving ? Math.sin(player.walkPhase) : 0;
      const hop = pMoving ? Math.abs(stepSin) * 0.14 : Math.sin(tSec * 4.2) * 0.025;
      heroRig.bodyGroup.position.y = hop;
      heroRig.legL.rotation.x = stepSin * 0.72;
      heroRig.legR.rotation.x = -stepSin * 0.72;
      heroRig.armL.rotation.x = -stepSin * 0.45;
      heroRig.headGroup.rotation.y = Math.sin(tSec * 1.8) * 0.08;

      // 3D剣振りアニメーション
      if (player.swingTimer > 0) {
        const sp = 1 - player.swingTimer / 0.24;
        heroRig.armR.rotation.x = -1.7 + sp * 2.8;
        heroRig.armR.rotation.y = -0.6 + sp * 1.2;
      } else {
        heroRig.armR.rotation.x = stepSin * 0.45;
        heroRig.armR.rotation.y = 0;
      }

      heroDirArrow.visible = true;
      heroDirArrow.position.set(player.rx + player.dx * 0.56, 0.14, player.ry + player.dy * 0.56);
      heroDirArrow.rotation.set(Math.PI / 2, 0, -Math.atan2(player.dx, player.dy));
      heroDirArrow.material.color.setHex(turnDirOnly ? 0xfde047 : 0x22d3ee);
      heroTileFrame.children.forEach((m) => m.material.color.setHex(0x22d3ee));
    }
    heroTileFrame.position.set(player.rx, 0, player.ry);

    // 敵3Dリグの更新
    enemies.forEach((e) => {
      if (e.hp <= 0) return;
      const eDist = Math.hypot(e.x - e.rx, e.y - e.ry);
      const eMoving = eDist > 0.025;
      if (eMoving) e.walkPhase = (e.walkPhase || 0) + 0.38;
      e.rx += (e.x - e.rx) * 0.25;
      e.ry += (e.y - e.ry) * 0.25;
      e.lungeX = (e.lungeX || 0) * 0.72;
      e.lungeY = (e.lungeY || 0) * 0.72;
      if (e.hitFlash > 0) e.hitFlash = Math.max(0, e.hitFlash - 0.016);

      const rig = enemyRigs.get(e);
      if (!rig) return;
      const isVis = visible[e.y][e.x] === 1;
      rig.root.visible = isVis;
      if (!isVis) return;

      rig.root.position.set(e.rx + (e.lungeX || 0), 0, e.ry + (e.lungeY || 0));
      const lookAng = Math.atan2(player.rx - e.rx, player.ry - e.ry);
      rig.bodyGroup.rotation.y = lookAng;

      const wv = Math.sin(tSec * 4.8 + e.phase);
      const eHop = eMoving ? Math.abs(Math.sin(e.walkPhase || 0)) * 0.16 : wv * 0.035;
      rig.bodyGroup.position.y = Math.max(0, eHop);

      if (e.tpl.id === "slime") {
        const sq = 1 + wv * 0.09;
        rig.bodyGroup.scale.set(1.05 * sq, 1.05 / sq, 1.05 * sq);
      }
      rig.wings.forEach((w) => {
        w.g.rotation.y = w.side * (0.25 + Math.sin(tSec * 8 + e.phase) * 0.42);
      });
      rig.arms.forEach((a, idx) => {
        a.rotation.x = Math.sin(tSec * 5 + e.phase + idx * Math.PI) * 0.35;
      });
      if (rig.orb) {
        rig.orb.rotation.y = tSec * 3.5;
        rig.orb.position.y = 0.68 + Math.sin(tSec * 4 + e.phase) * 0.08;
      }
    });

    // 床アイテムの回転＆浮遊
    floorItems.forEach((it) => {
      const m = itemMeshes.get(it);
      if (!m) return;
      m.visible = visible[it.y][it.x] === 1;
      m.rotation.y = tSec * 2.2 + it.x;
      m.position.y = 0.28 + Math.sin(tSec * 3.6 + it.x) * 0.06;
    });

    // 篝火の炎アニメーション
    torchFlames3D.forEach((tf) => {
      tf.group.visible = explored[tf.tc.y]?.[tf.tc.x] === 1;
      const sc = 0.9 + Math.sin(tSec * 14 + tf.tc.x) * 0.18;
      tf.flame.scale.set(1, sc, 1);
    });

    // 階段ランドマークのアニメーション＆解放状態カラー連動
    const bossAlive = enemies.some((e) => e.hp > 0 && e.tpl.isBoss);
    if (stairsRig3D && explored[stairsPos.y]?.[stairsPos.x]) {
      const accentHex = bossAlive ? 0xef4444 : 0x34d399;
      const capHex = bossAlive ? 0xfca5a5 : 0xfde047;
      stairsRig3D.arrow.position.y = 1.16 + Math.sin(tSec * 4.2) * 0.12;
      stairsRig3D.arrow.rotation.y = tSec * 1.8;
      stairsRig3D.beam.material.opacity = 0.14 + Math.sin(tSec * 3.5) * 0.07;
      stairsRig3D.beam.material.color.setHex(accentHex);
      stairsRig3D.light.color.setHex(accentHex);
      stairsRig3D.frame.children.forEach((m) => m.material.color.setHex(accentHex));
      stairsRig3D.caps.forEach((c) => c.material.color.setHex(capHex));
    }

    // 背景雲のゆっくり移動
    cloudMeshes3D.forEach((c, i) => {
      c.position.x += 0.008 * (1 + (i % 3) * 0.2);
      if (c.position.x > MAP_W + 8) c.position.x = -8;
    });

    // 3D斬撃・リング・ビームエフェクト
    for (let i = fxList.length - 1; i >= 0; i--) {
      const f = fxList[i];
      f.life -= 0.016;
      if (f.life <= 0) {
        if (f.mesh) fx3dGroup.remove(f.mesh);
        fxList.splice(i, 1);
        continue;
      }
      const ratio = f.life / f.max;
      if (!f.mesh) {
        const col = parseInt(f.color.replace("#", ""), 16);
        const mat = new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.9, side: THREE.DoubleSide });
        if (f.kind === "ring" || f.kind === "slash") {
          const geo = new THREE.RingGeometry(0.28, 0.45, 24);
          f.mesh = new THREE.Mesh(geo, mat);
          f.mesh.rotation.x = -Math.PI / 2;
          f.mesh.position.set(f.tx, 0.35, f.ty);
        } else if (f.kind === "beam") {
          const dx = f.x2 - f.x1;
          const dz = f.y2 - f.y1;
          const len = Math.max(0.4, Math.hypot(dx, dz));
          const geo = new THREE.CylinderGeometry(0.10, 0.10, len, 8);
          f.mesh = new THREE.Mesh(geo, mat);
          f.mesh.position.set((f.x1 + f.x2) / 2, 0.48, (f.y1 + f.y2) / 2);
          f.mesh.rotation.z = Math.PI / 2;
          f.mesh.rotation.y = -Math.atan2(dz, dx);
        }
        if (f.mesh) fx3dGroup.add(f.mesh);
      }
      if (f.mesh) {
        f.mesh.material.opacity = ratio;
        if (f.kind === "ring") {
          const s = 0.6 + (1 - ratio) * (f.maxR || 2.0);
          f.mesh.scale.setScalar(s);
        } else if (f.kind === "slash") {
          f.mesh.scale.setScalar(0.8 + (1 - ratio) * 1.1);
        }
      }
    }

    // カメラ追従（添付画像のような斜め見下ろし3Dミニチュア視点！）
    camX += (player.rx - camX) * 0.14;
    camY += (player.ry - camY) * 0.14;
    let sx = 0;
    let sz = 0;
    if (shakeTime > 0) {
      shakeTime = Math.max(0, shakeTime - 0.016);
      sx = (Math.random() - 0.5) * 0.25;
      sz = (Math.random() - 0.5) * 0.25;
    }

    threeCamera.position.set(camX + sx, 8.8, camY + 7.2 + sz);
    threeCamera.lookAt(camX, 0.35, camY);

    sunLight.position.set(camX - 6, 13, camY + 5);
    sunLight.target.position.set(camX, 0, camY);

    threeRenderer.render(threeScene, threeCamera);

    // 2Dオーバーレイ（階段ラベル・ダメージ数字＆敵ミニHPバーを3D座標から正確に投影）
    fxCtx.save();
    fxCtx.scale(dpr, dpr);
    fxCtx.clearRect(0, 0, cw, ch);

    if (explored[stairsPos.y]?.[stairsPos.x] === 1) {
      const pt = projectToScreen(stairsPos.x, 1.62 + Math.sin(tSec * 4.2) * 0.08, stairsPos.y, cw, ch);
      if (pt.visible && pt.x >= -40 && pt.x <= cw + 40 && pt.y >= -20 && pt.y <= ch + 20) {
        const label = bossAlive ? L("🔒 ボス撃破で解放", "🔒 Defeat Boss") : L(`🪜 B${floorNum + 1}Fへ`, `🪜 To B${floorNum + 1}F`);
        fxCtx.save();
        fxCtx.font = "800 12px sans-serif";
        const tw = fxCtx.measureText(label).width;
        const bw = tw + 16;
        const bh = 22;
        const bx = pt.x - bw / 2;
        const by = pt.y - bh / 2;
        fxCtx.fillStyle = "rgba(44, 24, 16, 0.88)";
        fxCtx.strokeStyle = bossAlive ? "#f87171" : "#34d399";
        fxCtx.lineWidth = 2;
        fxCtx.beginPath();
        fxCtx.roundRect(bx, by, bw, bh, 11);
        fxCtx.fill();
        fxCtx.stroke();
        fxCtx.fillStyle = "#fef9c3";
        fxCtx.textAlign = "center";
        fxCtx.textBaseline = "middle";
        fxCtx.fillText(label, pt.x, pt.y + 0.5);
        fxCtx.restore();
      }
    }

    enemies.forEach((e) => {
      if (e.hp <= 0 || !visible[e.y][e.x]) return;
      if (e.hp < e.maxHp || e.tpl.isBoss || e.bindTurns > 0) {
        const pt = projectToScreen(e.rx, e.tpl.isBoss ? 1.85 : 1.38, e.ry, cw, ch);
        if (!pt.visible) return;
        if (e.hp < e.maxHp || e.tpl.isBoss) {
          const bw = e.tpl.isBoss ? 56 : 40;
          fxCtx.fillStyle = "#2c1810";
          fxCtx.beginPath();
          fxCtx.roundRect(pt.x - bw / 2 - 1, pt.y - 1, bw + 2, 7, 3.5);
          fxCtx.fill();
          fxCtx.fillStyle = e.tpl.isBoss ? "#f43f5e" : "#fb7185";
          fxCtx.beginPath();
          fxCtx.roundRect(pt.x - bw / 2, pt.y, bw * Math.max(0, e.hp / e.maxHp), 5, 2.5);
          fxCtx.fill();
        }
        if (e.bindTurns > 0) {
          fxCtx.font = "16px sans-serif";
          fxCtx.textAlign = "center";
          fxCtx.fillText("❄️", pt.x, pt.y - 6);
        }
      }
    });

    for (let i = floatNums.length - 1; i >= 0; i--) {
      const fn = floatNums[i];
      fn.life -= 0.016;
      fn.yOff += 0.018;
      if (fn.life <= 0) { floatNums.splice(i, 1); continue; }
      const pt = projectToScreen(fn.tx, fn.yOff, fn.ty, cw, ch);
      if (!pt.visible) continue;
      fxCtx.save();
      fxCtx.globalAlpha = Math.min(1, fn.life * 2);
      fxCtx.font = "900 18px sans-serif";
      fxCtx.textAlign = "center";
      fxCtx.strokeStyle = "#2c1810";
      fxCtx.lineWidth = 4.5;
      fxCtx.strokeText(fn.text, pt.x, pt.y);
      fxCtx.fillStyle = fn.color;
      fxCtx.fillText(fn.text, pt.x, pt.y);
      fxCtx.restore();
    }

    fxCtx.restore();
    renderMinimap();
  }

  // =========================================================================
  // --- 魔王討伐 5幕リアルタイム3Dシネマエンディングエンジン ---
  // =========================================================================
  let endingScene = null;
  let endingCamera = null;
  let endingData = null;

  function buildEndingScene() {
    endingScene = new THREE.Scene();
    const aspect = (canvas.clientWidth || 16) / (canvas.clientHeight || 9);
    endingCamera = new THREE.PerspectiveCamera(38, aspect, 0.3, 140);

    const skyCol = new THREE.Color(0x161032);
    endingScene.background = skyCol.clone();
    endingScene.fog = new THREE.Fog(0x161032, 36, 110);

    const hemi = new THREE.HemisphereLight(0xc7d2fe, 0x3b2314, 0.9);
    endingScene.add(hemi);

    const sun = new THREE.DirectionalLight(0xfff7ed, 1.15);
    sun.position.set(-6, 12, 6);
    sun.castShadow = true;
    sun.shadow.mapSize.width = 1024;
    sun.shadow.mapSize.height = 1024;
    sun.shadow.camera.near = 1;
    sun.shadow.camera.far = 36;
    const sd = 8;
    sun.shadow.camera.left = -sd;
    sun.shadow.camera.right = sd;
    sun.shadow.camera.top = sd;
    sun.shadow.camera.bottom = -sd;
    endingScene.add(sun);

    const heroSpot = new THREE.PointLight(0xfef08a, 1.0, 9);
    heroSpot.position.set(0, 2.2, 0.8);
    endingScene.add(heroSpot);

    // 1. 空中聖域の浮島ステージ
    const islandGroup = new THREE.Group();
    const deckMat = makeToonMat(0xffffff, { map: getPaintedTileTex("#dfb372", "#c89654", false) });
    const deck = makePart(new THREE.CylinderGeometry(4.6, 4.35, 0.38, 24), deckMat, false, 1.02);
    deck.position.y = -0.19;
    const cliff = makePart(new THREE.CylinderGeometry(4.3, 2.1, 1.45, 16), makeToonMat(0x6b492c), false, 1.03);
    cliff.position.y = -1.08;
    const goldRim = new THREE.Mesh(new THREE.TorusGeometry(4.62, 0.12, 8, 36), makeToonMat(0xfacc15));
    goldRim.rotation.x = Math.PI / 2;
    goldRim.position.y = 0.02;
    const runeMat = new THREE.MeshBasicMaterial({ color: 0xfacc15, transparent: true, opacity: 0.72, side: THREE.DoubleSide });
    const runeRing = new THREE.Mesh(new THREE.RingGeometry(2.55, 2.85, 36), runeMat);
    runeRing.rotation.x = -Math.PI / 2;
    runeRing.position.y = 0.015;
    islandGroup.add(deck, cliff, goldRim, runeRing);

    // 外周6本の星晶柱
    const pilMat = makeToonMat(0x94a3b8);
    const crystalMat = new THREE.MeshBasicMaterial({ color: 0xfde047 });
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + 0.3;
      const px = Math.cos(a) * 3.75;
      const pz = Math.sin(a) * 3.75;
      const pil = makePart(new THREE.CylinderGeometry(0.18, 0.22, 0.95, 8), pilMat, true, 1.05);
      pil.position.set(px, 0.47, pz);
      const crys = new THREE.Mesh(new THREE.OctahedronGeometry(0.17), crystalMat);
      crys.position.set(px, 1.12, pz);
      islandGroup.add(pil, crys);
    }

    // 岸辺の焚き火＆暖色ライト（第4〜5幕のエモーショナルキャンプ）
    const campGroup = new THREE.Group();
    campGroup.position.set(2.25, 0, -1.75);
    const logMat = makeToonMat(0x5c3317);
    const stoneMat = makeToonMat(0x64748b);
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const st = new THREE.Mesh(new THREE.SphereGeometry(0.11, 8, 6), stoneMat);
      st.position.set(Math.cos(a) * 0.34, 0.06, Math.sin(a) * 0.34);
      campGroup.add(st);
    }
    const log1 = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.48, 7), logMat);
    log1.rotation.z = Math.PI / 2;
    log1.rotation.y = 0.5;
    log1.position.y = 0.08;
    const log2 = log1.clone();
    log2.rotation.y = -0.6;
    const flameMain = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.42, 7), new THREE.MeshBasicMaterial({ color: 0xff7b00 }));
    flameMain.position.y = 0.25;
    const flameCore = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.26, 7), new THREE.MeshBasicMaterial({ color: 0xfef08a }));
    flameCore.position.y = 0.20;
    const campLight = new THREE.PointLight(0xff9800, 1.3, 8.5);
    campLight.position.y = 0.55;
    campGroup.add(log1, log2, flameMain, flameCore, campLight);
    islandGroup.add(campGroup);
    endingScene.add(islandGroup);

    // 2. 地平線から昇る黄金の3D太陽
    const sunOrbGroup = new THREE.Group();
    sunOrbGroup.position.set(0, -6.5, -28);
    const sunCore = new THREE.Mesh(new THREE.SphereGeometry(3.4, 24, 18), new THREE.MeshBasicMaterial({ color: 0xfef08a }));
    const sunHalo = new THREE.Mesh(
      new THREE.SphereGeometry(4.9, 24, 18),
      new THREE.MeshBasicMaterial({ color: 0xfb923c, transparent: true, opacity: 0.34 })
    );
    sunOrbGroup.add(sunCore, sunHalo);
    endingScene.add(sunOrbGroup);

    // 3. 満天の3D星空ドーム（220個）
    const starCount = 220;
    const starPositions = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      const th = Math.random() * Math.PI * 2;
      const ph = Math.random() * Math.PI * 0.45 + 0.08;
      const rad = 36 + Math.random() * 18;
      starPositions[i * 3] = Math.cos(th) * Math.cos(ph) * rad;
      starPositions[i * 3 + 1] = Math.sin(ph) * rad * 0.65 + 2.5;
      starPositions[i * 3 + 2] = Math.sin(th) * Math.cos(ph) * rad;
    }
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute("position", new THREE.BufferAttribute(starPositions, 3));
    const starMat = new THREE.PointsMaterial({ color: 0xfffbeb, size: 0.38, transparent: true, opacity: 0.85 });
    const starsPoints = new THREE.Points(starGeo, starMat);
    endingScene.add(starsPoints);

    // 4. 漂う3D入道雲（14個）
    const clouds = [];
    const cloudMat = makeToonMat(0xffffff);
    const puffGeo = new THREE.SphereGeometry(1.15, 12, 10);
    for (let i = 0; i < 14; i++) {
      const cg = new THREE.Group();
      for (let p = 0; p < 3; p++) {
        const m = new THREE.Mesh(puffGeo, cloudMat);
        m.position.set((p - 1) * 1.05, p === 1 ? 0.35 : 0, (p % 2) * 0.35);
        m.scale.set(1.15, 0.72, 0.92);
        cg.add(m);
      }
      const a = (i / 14) * Math.PI * 2;
      const r = 8.5 + (i % 3) * 4.5;
      cg.position.set(Math.cos(a) * r, -1.8 + (i % 4) * 1.45, Math.sin(a) * r - 4);
      endingScene.add(cg);
      clouds.push({ g: cg, spd: 0.008 + (i % 3) * 0.004 });
    }

    // 5. 登場キャラクター（主人公＋魔王＋祝福する仲間モンスター3体）
    const hero = createHero3D();
    const wCol = parseInt(WEAPONS[save.weaponIdx].color.replace("#", ""), 16);
    hero.bladeMesh.material.color.setHex(wCol);
    hero.tipMesh.material.color.setHex(wCol);
    const sCol = parseInt(SHIELDS[save.shieldIdx].color.replace("#", ""), 16);
    hero.shieldFace.material.color.setHex(sCol);
    endingScene.add(hero.root);

    const boss = createEnemy3D(MONSTER_DEFS.boss_zargaus);
    if (boss.frame) boss.frame.visible = false;
    const shatterAura = new THREE.Mesh(
      new THREE.SphereGeometry(1.05, 18, 14),
      new THREE.MeshBasicMaterial({ color: 0xfef08a, transparent: true, opacity: 0 })
    );
    shatterAura.position.y = 0.8;
    boss.root.add(shatterAura);
    endingScene.add(boss.root);

    const compSpecs = [
      { id: "slime", x: -1.55, z: -0.65 },
      { id: "ice_mage", x: 1.55, z: -0.65 },
      { id: "gargoyle", x: 0.0, z: -1.95 },
    ];
    const companions = compSpecs.map((cs, idx) => {
      const rig = createEnemy3D(MONSTER_DEFS[cs.id]);
      if (rig.frame) rig.frame.visible = false;
      rig.root.position.set(cs.x, 0, cs.z);
      rig.root.visible = false;
      endingScene.add(rig.root);
      return { rig, baseX: cs.x, baseZ: cs.z, phase: idx * 1.7 };
    });

    // 6. 英雄を照らす第2幕の聖なる光柱＋第1幕ショックウェーブ
    const heroBeam = new THREE.Mesh(
      new THREE.CylinderGeometry(0.75, 1.05, 9, 20, 1, true),
      new THREE.MeshBasicMaterial({ color: 0xfef08a, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false })
    );
    heroBeam.position.set(0, 4.5, 0);
    endingScene.add(heroBeam);

    const shockRing = new THREE.Mesh(
      new THREE.RingGeometry(0.35, 0.58, 28),
      new THREE.MeshBasicMaterial({ color: 0xfde047, transparent: true, opacity: 0, side: THREE.DoubleSide })
    );
    shockRing.rotation.x = -Math.PI / 2;
    shockRing.position.set(0, 0.35, -1.2);
    endingScene.add(shockRing);

    // 7. 魔王崩壊の星屑シャード（80個）
    const shards = [];
    const shardGeo = new THREE.OctahedronGeometry(0.14);
    const shardMatA = new THREE.MeshBasicMaterial({ color: 0xfef08a, transparent: true, opacity: 1 });
    const shardMatB = new THREE.MeshBasicMaterial({ color: 0xf472b6, transparent: true, opacity: 1 });
    for (let i = 0; i < 80; i++) {
      const m = new THREE.Mesh(shardGeo, i % 3 === 0 ? shardMatB : shardMatA);
      m.visible = false;
      const a = (i / 80) * Math.PI * 2 * 3;
      const spd = 1.4 + (i % 7) * 0.45;
      endingScene.add(m);
      shards.push({
        mesh: m,
        vx: Math.cos(a) * spd,
        vy: 1.8 + (i % 5) * 0.85,
        vz: Math.sin(a) * spd,
      });
    }

    // 8. 第3幕の3D打ち上げ花火クラスター（3基 × 18粒子）
    const fwColors = [0xfde047, 0x38bdf8, 0xf472b6];
    const fireworks = [];
    const fwGeo = new THREE.SphereGeometry(0.09, 6, 6);
    for (let f = 0; f < 3; f++) {
      const fwGroup = new THREE.Group();
      const mat = new THREE.MeshBasicMaterial({ color: fwColors[f], transparent: true, opacity: 0 });
      const dots = [];
      for (let k = 0; k < 18; k++) {
        const theta = (k / 18) * Math.PI * 2;
        const phi = ((k % 3) - 1) * 0.72;
        const dm = new THREE.Mesh(fwGeo, mat);
        fwGroup.add(dm);
        dots.push({
          m: dm,
          dx: Math.cos(theta) * Math.cos(phi),
          dy: Math.sin(phi) * 0.85 + 0.2,
          dz: Math.sin(theta) * Math.cos(phi),
        });
      }
      fwGroup.position.set((f - 1) * 3.1, 4.2 + (f % 2) * 0.8, -5.5 - f * 0.9);
      endingScene.add(fwGroup);
      fireworks.push({ g: fwGroup, mat, dots, offset: f * 1.15 });
    }

    // 2Dシネマ演出用ボケ＆流れ星リスト
    const bokeh = Array.from({ length: 24 }, (_, i) => ({
      x: (i * 0.137) % 1,
      y: (i * 0.293) % 1,
      r: 8 + (i % 5) * 6,
      spd: 0.015 + (i % 4) * 0.006,
      alpha: 0.12 + (i % 3) * 0.08,
    }));
    const shootingStars = Array.from({ length: 5 }, (_, i) => ({
      offset: i * 1.9,
      x0: 0.2 + ((i * 0.23) % 0.65),
      y0: 0.1 + ((i * 0.11) % 0.25),
    }));

    return {
      startMs: performance.now(),
      t: 0,
      lastSub: "",
      resultShown: false,
      skyCol,
      hemi,
      sun,
      heroSpot,
      campLight,
      flameMain,
      flameCore,
      sunOrbGroup,
      starsPoints,
      starMat,
      clouds,
      hero,
      boss,
      shatterAura,
      companions,
      heroBeam,
      shockRing,
      shards,
      fireworks,
      bokeh,
      shootingStars,
    };
  }

  function startEndingMovie({ replayFromTown = false } = {}) {
    if (endingTimerId) {
      clearTimeout(endingTimerId);
      endingTimerId = null;
    }
    pendingEndingMovie = false;
    isEndingPlaying = true;
    endingReplayFromTown = replayFromTown;
    waitingStairsPrompt = false;
    inTown = false;

    ui.stairsPrompt.classList.add("hidden");
    ui.invModal.classList.add("hidden");
    ui.saveModal.classList.add("hidden");
    ui.townOverlay.classList.add("hidden");
    ui.defeatOverlay.classList.add("hidden");
    ui.app.classList.add("cinema-mode");
    document.body.classList.add("cinema-locked");
    ui.endingOverlay.classList.remove("hidden");

    endingData = buildEndingScene();
    buildEndingOverlayTexts();

    ui.endingTitleBanner.classList.add("hidden");
    ui.endingCredits.classList.add("hidden");
    ui.endingResultCard.classList.add("hidden");
    ui.btnEndingSkip.classList.remove("hidden");
    ui.endingFlash.style.opacity = "0";
    ui.endingSubtitle.textContent = "";

    sfx.unlock();
    const bgmOk = sfx.startEndingBgm();
    ui.btnEndingAudio.classList.toggle("hidden", bgmOk || !sfx.on);
    if (!bgmOk && sfx.on) {
      const unlockOnce = () => {
        if (!isEndingPlaying) return;
        sfx.unlock();
        if (sfx.startEndingBgm()) ui.btnEndingAudio.classList.add("hidden");
      };
      ui.endingOverlay.addEventListener("pointerdown", unlockOnce, { once: true });
    }
  }

  function skipToEndingResult() {
    if (!isEndingPlaying || !endingData) return;
    endingData.startMs = performance.now() - 33200;
    endingData.resultShown = true;
    endingData.boss.root.visible = false;
    endingData.heroBeam.material.opacity = 0;
    endingData.shockRing.material.opacity = 0;
    endingData.shards.forEach((s) => { s.mesh.visible = false; });
    endingData.hero.root.position.set(1.5, 0, -1.35);
    endingData.hero.root.rotation.y = Math.PI * 0.72;
    endingData.companions.forEach((c) => {
      c.rig.root.visible = true;
      c.rig.root.position.set(c.baseX, 0, c.baseZ);
    });
    endingScene.background.setHex(0x0f172a);
    endingScene.fog.color.setHex(0x0f172a);
    ui.endingFlash.style.opacity = "0";
    ui.endingTitleBanner.classList.add("hidden");
    ui.endingCredits.classList.add("hidden");
    ui.endingSubtitle.textContent = "";
    ui.btnEndingSkip.classList.add("hidden");
    ui.endingResultCard.classList.remove("hidden");
  }

  function stopEndingMovie(dest = "town") {
    if (endingTimerId) {
      clearTimeout(endingTimerId);
      endingTimerId = null;
    }
    sfx.stopEndingBgm();
    isEndingPlaying = false;
    pendingEndingMovie = false;
    ui.app.classList.remove("cinema-mode");
    document.body.classList.remove("cinema-locked");
    ui.endingOverlay.classList.add("hidden");
    ui.endingTitleBanner.classList.add("hidden");
    ui.endingCredits.classList.add("hidden");
    ui.endingResultCard.classList.add("hidden");
    ui.btnEndingAudio.classList.add("hidden");
    ui.endingFlash.style.opacity = "0";
    ui.endingSubtitle.textContent = "";
    endingScene = null;
    endingCamera = null;
    endingData = null;

    if (dest === "town" || endingReplayFromTown) {
      openTown("dive");
    } else {
      save.hp = getMaxHp();
      save.mp = save.maxMp;
      updateHud();
      persistSave();
    }
  }

  function renderEndingFrame(now, cw, ch, dpr) {
    const ed = endingData;
    const t = (now - ed.startMs) * 0.001;
    ed.t = t;
    if (Math.abs(endingCamera.aspect - cw / ch) > 0.001) {
      endingCamera.aspect = cw / ch;
      endingCamera.updateProjectionMatrix();
    }

    const cSkyDark = new THREE.Color(0x161032);
    const cSkyDawn = new THREE.Color(0xf97316);
    const cSkyDay = new THREE.Color(0x38bdf8);
    const cSkyNight = new THREE.Color(0x0f172a);

    // 浮島雲・焚き火アニメーション（全幕共通）
    ed.clouds.forEach((cl) => {
      cl.g.position.x += cl.spd;
      if (cl.g.position.x > 16) cl.g.position.x = -16;
    });
    const flick = 0.85 + Math.sin(t * 15) * 0.22;
    ed.flameMain.scale.set(1, flick, 1);
    ed.flameCore.scale.set(1, flick * 1.05, 1);

    // 字幕更新ヘルパー
    let nextSub = "";
    if (t < 2.8) nextSub = L("「星を喰らう闇は、いま聖なる刃によって討ち払われた！」", "\"The darkness that devoured the stars is vanquished by your holy blade!\"");
    else if (t < 5.8) nextSub = L("「魔王ザルガウスは光の粒子へと砕け、長き戦いに終止符が打たれた——」", "\"Demon Lord Zargaus shatters into motes of light, ending the long battle—\"");
    else if (t < 9.4) nextSub = L("「晴れた朝空の下、星辰の迷宮に再び希望の太陽が昇る。」", "\"Beneath the clear morning sky, the sun of hope rises once more over Astral Labyrinth.\"");
    else if (t < 12.5) nextSub = L("「剣を掲げよ、星辰の英雄！」", "\"Raise your sword high, Hero of the Stars!\"");
    else if (t < 17.2) nextSub = L("「空の仲間たちも集い、あなたの勝利を祝福している！」", "\"Even the creatures of the sky gather to celebrate your triumph!\"");
    else if (t < 21.5) nextSub = L("「雲海に祝福の花火が舞い上がる——。」", "\"Celebratory fireworks blossom across the sea of clouds—\"");
    else nextSub = "";

    if (nextSub !== ed.lastSub) {
      ed.lastSub = nextSub;
      ui.endingSubtitle.textContent = nextSub;
    }

    // 主人公デフォルト関節リセット
    const hr = ed.hero;
    hr.headMesh.material = hr.matFaceNormal;
    hr.bodyGroup.rotation.set(0, 0, 0);
    hr.legL.rotation.x = 0;
    hr.legR.rotation.x = 0;
    hr.armL.rotation.x = 0;
    hr.armR.rotation.set(0, 0, 0);

    // --- 第1幕 (0 - 5.8s): 魔王撃破・崩壊クライマックス ---
    if (t < 5.8) {
      endingScene.background.copy(cSkyDark);
      endingScene.fog.color.copy(cSkyDark);
      ed.starMat.opacity = 0.72;
      ed.sunOrbGroup.position.set(0, -8, -28);
      ed.heroBeam.material.opacity = 0;
      ed.campLight.intensity = 0.8;

      if (t < 2.2) {
        const lunge = Math.sin(Math.min(1, t / 1.4) * Math.PI);
        hr.root.position.set(0, 0, 1.35 - lunge * 1.1);
        hr.root.rotation.y = Math.PI;
        hr.armR.rotation.x = -1.6 + lunge * 2.5;
        hr.armR.rotation.y = -0.3 + lunge * 0.6;
        hr.bodyGroup.position.y = lunge * 0.14;
      } else {
        hr.root.position.set(0, 0, 1.25);
        hr.root.rotation.y = Math.PI;
        hr.armR.rotation.x = -0.25;
      }

      if (t < 4.35) {
        ed.boss.root.visible = true;
        const p2 = Math.max(0, (t - 1.8) / 2.55);
        const shake = t > 1.8 ? Math.sin(t * 52) * 0.14 * (1 - p2 * 0.4) : 0;
        ed.boss.root.position.set(shake, p2 * 1.15, -1.2);
        ed.boss.bodyGroup.rotation.y = p2 * 5.2;
        ed.boss.bodyGroup.scale.setScalar(1.48 * (1 + Math.sin(p2 * Math.PI) * 0.28));
        ed.shatterAura.material.opacity = p2 * 0.92;
        ed.shatterAura.scale.setScalar(0.8 + p2 * 1.6);
      } else {
        ed.boss.root.visible = false;
      }

      // 衝撃波リング
      if (t > 1.0 && t < 3.6) {
        const rp = (t - 1.0) / 2.6;
        ed.shockRing.material.opacity = (1 - rp) * 0.95;
        ed.shockRing.scale.setScalar(0.8 + rp * 5.5);
      } else {
        ed.shockRing.material.opacity = 0;
      }

      // 80個の黄金星屑シャード爆発
      if (t >= 3.2) {
        const st = t - 3.2;
        ed.shards.forEach((sh) => {
          sh.mesh.visible = true;
          sh.mesh.position.set(
            sh.vx * st * 0.9,
            1.1 + sh.vy * st - 0.55 * st * st,
            -1.2 + sh.vz * st * 0.9
          );
          sh.mesh.rotation.x += 0.15;
          sh.mesh.rotation.y += 0.12;
        });
      }

      // 浄化の大閃光フラッシュ
      if (t >= 3.85) {
        const fp = t < 4.35 ? (t - 3.85) / 0.5 : Math.max(0, 1 - (t - 4.35) / 1.35);
        ui.endingFlash.style.opacity = fp.toFixed(3);
      } else {
        ui.endingFlash.style.opacity = "0";
      }

      const camAng = -0.35 + t * 0.24;
      endingCamera.position.set(Math.sin(camAng) * 5.2, 2.2 + t * 0.18, Math.cos(camAng) * 5.2);
      endingCamera.lookAt(0, 0.85, -0.3);

    // --- 第2幕 (5.8 - 12.5s): 朝日の夜明け＆英雄の剣掲げ ---
    } else if (t < 12.5) {
      const m2 = (t - 5.8) / 6.7;
      ui.endingFlash.style.opacity = "0";
      ed.boss.root.visible = false;
      ed.shockRing.material.opacity = 0;
      ed.shards.forEach((s) => { s.mesh.visible = false; });

      // 空が闇→朝焼け→晴天へとドラマチックに変化
      if (m2 < 0.45) {
        ed.skyCol.copy(cSkyDark).lerp(cSkyDawn, m2 / 0.45);
      } else {
        ed.skyCol.copy(cSkyDawn).lerp(cSkyDay, (m2 - 0.45) / 0.55);
      }
      endingScene.background.copy(ed.skyCol);
      endingScene.fog.color.copy(ed.skyCol);
      ed.starMat.opacity = Math.max(0, 0.65 * (1 - m2 * 1.4));
      ed.sunOrbGroup.position.set(0, -5.5 + m2 * 14.5, -28);

      // 主人公は祭壇中央で剣を天に掲げる！
      hr.root.position.set(0, 0, 0);
      hr.root.rotation.y = 0;
      hr.bodyGroup.position.y = Math.sin(t * 3.2) * 0.03;
      hr.armR.rotation.x = -2.42;
      hr.armL.rotation.x = -0.35;

      ed.heroBeam.material.opacity = 0.22 + Math.sin(t * 4) * 0.08;
      ed.heroBeam.rotation.y = t * 0.8;

      if (t >= 6.8 && t <= 11.8) ui.endingTitleBanner.classList.remove("hidden");
      else ui.endingTitleBanner.classList.add("hidden");

      const orbit = m2 * Math.PI * 1.75 - 0.5;
      endingCamera.position.set(Math.sin(orbit) * 4.4, 1.9 + m2 * 2.1, Math.cos(orbit) * 4.4);
      endingCamera.lookAt(0, 0.8, 0);

    // --- 第3幕 (12.5 - 21.5s): 行進＆仲間たちの祝福＆花火大会 ---
    } else if (t < 21.5) {
      const m3 = (t - 12.5) / 9.0;
      ui.endingTitleBanner.classList.add("hidden");
      endingScene.background.copy(cSkyDay);
      endingScene.fog.color.copy(cSkyDay);
      ed.starMat.opacity = 0;
      ed.sunOrbGroup.position.set(0, 8.8, -28);
      ed.heroBeam.material.opacity = 0.08;

      if (t < 15.5) {
        // 祭壇から前へ誇らしく歩行行進
        const mp = (t - 12.5) / 3.0;
        const step = Math.sin(t * 10);
        hr.root.position.set(0, 0, -0.6 + mp * 2.1);
        hr.root.rotation.y = 0;
        hr.bodyGroup.position.y = Math.abs(step) * 0.14;
        hr.legL.rotation.x = step * 0.72;
        hr.legR.rotation.x = -step * 0.72;
        hr.armL.rotation.x = -step * 0.45;
        hr.armR.rotation.x = step * 0.45;
      } else {
        const bounce = Math.abs(Math.sin(t * 5.2)) * 0.16;
        hr.root.position.set(0, 0, 1.5);
        hr.root.rotation.y = Math.sin(t * 1.6) * 0.25;
        hr.bodyGroup.position.y = bounce;
        hr.armR.rotation.x = -2.1 + Math.sin(t * 7) * 0.22;
      }

      // 祝福の仲間モンスター3体が現れて跳ねてお祝い！
      ed.companions.forEach((c) => {
        c.rig.root.visible = true;
        const hop = Math.abs(Math.sin(t * 5.5 + c.phase)) * 0.26;
        c.rig.root.position.set(c.baseX, 0, c.baseZ);
        c.rig.bodyGroup.position.y = hop;
        c.rig.bodyGroup.rotation.y = Math.atan2(hr.root.position.x - c.baseX, hr.root.position.z - c.baseZ);
        c.rig.wings.forEach((w) => {
          w.g.rotation.y = w.side * (0.25 + Math.sin(t * 9 + c.phase) * 0.45);
        });
        c.rig.arms.forEach((a, idx) => {
          a.rotation.x = -0.8 + Math.sin(t * 7 + c.phase + idx) * 0.5;
        });
      });

      // 3D祝砲花火
      ed.fireworks.forEach((fw) => {
        const cycle = ((t - 12.6 + fw.offset) % 3.2) / 3.2;
        fw.mat.opacity = Math.max(0, 1 - cycle * 1.15);
        const rad = 0.25 + Math.sin(cycle * Math.PI * 0.65) * 2.2;
        const grav = cycle * cycle * 0.9;
        fw.dots.forEach((d) => {
          d.m.position.set(d.dx * rad, d.dy * rad - grav, d.dz * rad);
        });
      });

      endingCamera.position.set(Math.sin(m3 * 0.9 - 0.45) * 5.6, 3.4, 5.8);
      endingCamera.lookAt(0, 0.7, 0);

    // --- 第4〜5幕 (21.5s〜): 星空キャンプエピローグ＆スタッフロール＆クリア記念カード ---
    } else {
      const m4 = Math.min(1, (t - 21.5) / 5.5);
      ed.skyCol.copy(cSkyDay).lerp(cSkyNight, m4);
      endingScene.background.copy(ed.skyCol);
      endingScene.fog.color.copy(ed.skyCol);
      ed.sunOrbGroup.position.set(0, 8.8 - m4 * 16, -28);
      ed.starMat.opacity = m4 * 0.95;
      ed.starsPoints.rotation.y = t * 0.015;
      ed.heroBeam.material.opacity = 0;
      ed.campLight.intensity = 1.65;
      ed.fireworks.forEach((fw) => { fw.mat.opacity = 0; });

      // 主人公と仲間たちは焚き火を囲んで星空を見上げる
      hr.root.position.set(1.5, 0, -1.35);
      hr.root.rotation.y = Math.PI * 0.72;
      hr.bodyGroup.position.y = Math.sin(t * 2.8) * 0.025;
      ed.companions.forEach((c) => {
        c.rig.root.visible = true;
        c.rig.bodyGroup.position.y = Math.abs(Math.sin(t * 3.0 + c.phase)) * 0.06;
        c.rig.bodyGroup.rotation.y = Math.atan2(2.25 - c.baseX, -1.75 - c.baseZ);
      });

      const calmAng = 0.45 + (t - 21.5) * 0.065;
      endingCamera.position.set(Math.sin(calmAng) * 6.4, 3.0, Math.cos(calmAng) * 6.4);
      endingCamera.lookAt(1.0, 0.55, -1.2);

      if (t < 33.0) {
        ui.endingCredits.classList.remove("hidden");
        const progress = Math.max(0, Math.min(1, (t - 21.8) / 10.6));
        const containerH = ui.endingCredits.clientHeight || 360;
        const contentH = ui.endingCreditsInner.scrollHeight || 620;
        const yPos = containerH * 0.88 - progress * (contentH + containerH * 0.40);
        ui.endingCreditsInner.style.transform = `translateY(${yPos.toFixed(1)}px)`;
      } else {
        ui.endingCredits.classList.add("hidden");
        ui.btnEndingSkip.classList.add("hidden");
        if (!ed.resultShown) {
          ed.resultShown = true;
          ui.endingResultCard.classList.remove("hidden");
        }
      }
    }

    threeRenderer.render(endingScene, endingCamera);

    // 2Dシネマ・ボケ＆サンビーム＆流れ星オーバーレイ（#fx-canvas）
    fxCtx.save();
    fxCtx.scale(dpr, dpr);
    fxCtx.clearRect(0, 0, cw, ch);

    if (t >= 5.8 && t < 24.0) {
      const beamAlpha = t < 21.5 ? 0.16 : Math.max(0, 0.16 * (1 - (t - 21.5) / 2.5));
      const sg = fxCtx.createLinearGradient(cw * 0.85, 0, cw * 0.25, ch * 0.85);
      sg.addColorStop(0, `rgba(254, 240, 138, ${beamAlpha.toFixed(3)})`);
      sg.addColorStop(1, "rgba(254, 240, 138, 0)");
      fxCtx.fillStyle = sg;
      fxCtx.beginPath();
      fxCtx.moveTo(cw * 0.55, 0);
      fxCtx.lineTo(cw, 0);
      fxCtx.lineTo(cw * 0.45, ch);
      fxCtx.lineTo(cw * 0.08, ch);
      fxCtx.closePath();
      fxCtx.fill();
    }

    // 浮遊光の粒ボケ
    ed.bokeh.forEach((b, idx) => {
      const bx = ((b.x + Math.sin(t * 0.35 + idx) * 0.025) % 1) * cw;
      const by = ((b.y - t * b.spd) % 1 + 1) % 1 * ch;
      const gr = fxCtx.createRadialGradient(bx, by, 0, bx, by, b.r);
      const col = t >= 22.0 ? "191, 219, 254" : "254, 240, 138";
      gr.addColorStop(0, `rgba(${col}, ${b.alpha})`);
      gr.addColorStop(1, `rgba(${col}, 0)`);
      fxCtx.fillStyle = gr;
      fxCtx.beginPath();
      fxCtx.arc(bx, by, b.r, 0, Math.PI * 2);
      fxCtx.fill();
    });

    // 星空エピローグの流れ星
    if (t >= 23.0) {
      ed.shootingStars.forEach((ss) => {
        const cyc = (t + ss.offset) % 5.5;
        if (cyc < 0.85) {
          const p = cyc / 0.85;
          const sx0 = ss.x0 * cw + p * 180;
          const sy0 = ss.y0 * ch + p * 95;
          const sg = fxCtx.createLinearGradient(sx0 - 70, sy0 - 36, sx0, sy0);
          sg.addColorStop(0, "rgba(255, 255, 255, 0)");
          sg.addColorStop(1, `rgba(254, 249, 195, ${(1 - p).toFixed(2)})`);
          fxCtx.strokeStyle = sg;
          fxCtx.lineWidth = 2.4;
          fxCtx.lineCap = "round";
          fxCtx.beginPath();
          fxCtx.moveTo(sx0 - 70, sy0 - 36);
          fxCtx.lineTo(sx0, sy0);
          fxCtx.stroke();
        }
      });
    }

    fxCtx.restore();
  }

  function renderMinimap() {
    const mw = mmCanvas.width;
    const mh = mmCanvas.height;
    const cw = mw / MAP_W;
    const ch = mh / MAP_H;
    mmCtx.clearRect(0, 0, mw, mh);

    for (let y = 0; y < MAP_H; y++) {
      for (let x = 0; x < MAP_W; x++) {
        if (!explored[y][x]) continue;
        const t = grid[y][x];
        if (t === T.WALL) continue;
        mmCtx.fillStyle = t === T.WATER ? "#0284c7" : visible[y][x] ? "rgba(148,163,184,0.75)" : "rgba(71,85,105,0.45)";
        mmCtx.fillRect(x * cw, y * ch, Math.ceil(cw), Math.ceil(ch));
      }
    }
    floorItems.forEach((it) => {
      if (!explored[it.y][it.x]) return;
      mmCtx.fillStyle = "#38bdf8";
      mmCtx.fillRect(it.x * cw, it.y * ch, Math.max(2, cw), Math.max(2, ch));
    });
    enemies.forEach((e) => {
      if (e.hp > 0 && visible[e.y][e.x]) {
        mmCtx.fillStyle = e.tpl.isBoss ? "#f43f5e" : "#fb7185";
        mmCtx.fillRect(e.x * cw, e.y * ch, Math.max(3, cw), Math.max(3, ch));
      }
    });
    if (explored[stairsPos.y]?.[stairsPos.x]) {
      const sx = stairsPos.x * cw - 1;
      const sy = stairsPos.y * ch - 1;
      const sw = Math.max(6, cw + 2);
      const sh = Math.max(6, ch + 2);
      const pulse = Math.sin(Date.now() * 0.006);
      mmCtx.fillStyle = pulse > 0 ? "#4ade80" : "#22c55e";
      mmCtx.fillRect(sx, sy, sw, sh);
      mmCtx.strokeStyle = "#ffffff";
      mmCtx.lineWidth = 1.5;
      mmCtx.strokeRect(sx, sy, sw, sh);
      mmCtx.fillStyle = "#052e16";
      mmCtx.fillRect(sx + 1.5, sy + sh * 0.5, Math.max(2, sw - 3), 1.5);
    }
    mmCtx.fillStyle = "#fde047";
    mmCtx.fillRect(player.x * cw - 0.5, player.y * ch - 0.5, Math.max(3.5, cw + 1), Math.max(3.5, ch + 1));
  }

  // --- 入力ハンドリング（キーボード・8方向パッド・キャンバスタップ） ---
  window.addEventListener("keydown", (e) => {
    const k = e.key.toLowerCase();
    if (["arrowup", "arrowdown", "arrowleft", "arrowright", " "].includes(k)) e.preventDefault();

    if (isEndingPlaying) {
      if (k === "escape" && ui.endingResultCard.classList.contains("hidden")) {
        skipToEndingResult();
      }
      return;
    }
    if (pendingEndingMovie) return;

    if (isDefeated) {
      if ((k === "enter" || k === " ") && !ui.defeatOverlay.classList.contains("hidden")) {
        confirmDefeatReturn();
      }
      return;
    }

    if (waitingStairsPrompt) {
      if (k === "enter" || k === " ") {
        sfx.stairs();
        generateFloor(floorNum + 1);
      } else if (k === "escape") {
        waitingStairsPrompt = false;
        ui.stairsPrompt.classList.add("hidden");
      }
      return;
    }
    if (k === "escape") {
      ui.invModal.classList.add("hidden");
      ui.saveModal.classList.add("hidden");
      return;
    }
    if (inTown) return;

    if (k === "w" || k === "arrowup") tryMoveOrAttack(0, -1);
    else if (k === "s" || k === "arrowdown") tryMoveOrAttack(0, 1);
    else if (k === "a" || k === "arrowleft") tryMoveOrAttack(-1, 0);
    else if (k === "d" || k === "arrowright") tryMoveOrAttack(1, 0);
    else if (k === "q") tryMoveOrAttack(-1, -1);
    else if (k === "e") tryMoveOrAttack(1, -1);
    else if (k === "z") tryMoveOrAttack(-1, 1);
    else if (k === "c") tryMoveOrAttack(1, 1);
    else if (k === "enter" && grid[player.y][player.x] === T.STAIRS && ui.invModal.classList.contains("hidden") && ui.saveModal.classList.contains("hidden")) {
      const bossAlive = enemies.some((e) => e.hp > 0 && e.tpl.isBoss);
      if (bossAlive) {
        pushLog(L("ボスを倒すまで次の階へは進めない！", "Defeat the boss to unlock the stairs!"), "warn");
      } else {
        waitingStairsPrompt = true;
        ui.stairsDesc.textContent = L(`B${floorNum + 1}F（${biomeName(getBiome(floorNum + 1))}）へ降りますか？`, `Descend to B${floorNum + 1}F (${biomeName(getBiome(floorNum + 1))})?`);
        ui.stairsPrompt.classList.remove("hidden");
      }
    } else if (k === " " || k === "enter") {
      const foe = getEnemyAt(player.x + player.dx, player.y + player.dy);
      if (foe) { meleeAttack(foe); endPlayerTurn(); }
      else { player.swingTimer = 0.22; addSlashFx(player.x + player.dx, player.y + player.dy, "#94a3b8"); endPlayerTurn(); }
    } else if (k === "r") restOneTurn();
    else if (k === "t") { turnDirOnly = !turnDirOnly; pushLog(turnDirOnly ? L("🧭 向き変更モード：次の入力で向きだけ変えます", "🧭 Turn Mode: Next input changes facing only") : L("向き変更モード解除", "Turn mode canceled")); }
    else if (k === "1") useSkillSpin();
    else if (k === "2") useSkillFire();
    else if (k === "3") useSkillHeal();
    else if (k === "i") {
      if (ui.invModal.classList.contains("hidden")) openInventory();
      else ui.invModal.classList.add("hidden");
    }
  });

  // 3Dキャンバス直接クリック/タップでレイキャスト移動・攻撃
  canvas.addEventListener("pointerdown", (e) => {
    if (inTown || isDefeated || isEndingPlaying || pendingEndingMovie || waitingStairsPrompt || !threeCamera) return;
    const rect = canvas.getBoundingClientRect();
    const ndcX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const ndcY = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(new THREE.Vector2(ndcX, ndcY), threeCamera);
    const hitPt = new THREE.Vector3();
    if (!raycaster.ray.intersectPlane(groundPlane, hitPt)) return;
    const tx = Math.round(hitPt.x);
    const ty = Math.round(hitPt.z);
    const dx = Math.sign(tx - player.x);
    const dy = Math.sign(ty - player.y);
    if (dx === 0 && dy === 0) restOneTurn();
    else tryMoveOrAttack(dx, dy);
  });

  document.querySelectorAll("#pad-8dir button[data-dx]").forEach((btn) => {
    btn.addEventListener("click", () => {
      tryMoveOrAttack(Number(btn.dataset.dx), Number(btn.dataset.dy));
    });
  });

  document.getElementById("btn-pad-rest").addEventListener("click", restOneTurn);
  document.getElementById("btn-attack").addEventListener("click", () => {
    if (inTown || isDefeated || isEndingPlaying || pendingEndingMovie || waitingStairsPrompt) return;
    sfx.unlock();
    const foe = getEnemyAt(player.x + player.dx, player.y + player.dy);
    if (foe) { meleeAttack(foe); endPlayerTurn(); }
    else { player.swingTimer = 0.22; addSlashFx(player.x + player.dx, player.y + player.dy, "#94a3b8"); endPlayerTurn(); }
  });
  document.getElementById("btn-turn-dir").addEventListener("click", () => {
    if (inTown || isDefeated || isEndingPlaying || pendingEndingMovie) return;
    turnDirOnly = !turnDirOnly;
    pushLog(turnDirOnly ? L("🧭 向き変更モードON", "🧭 Turn Mode ON") : L("向き変更モードOFF", "Turn Mode OFF"));
  });

  document.getElementById("btn-defeat-return").addEventListener("click", confirmDefeatReturn);
  ui.btnEndingSkip.addEventListener("click", skipToEndingResult);
  ui.btnEndingAudio.addEventListener("click", () => {
    sfx.unlock();
    if (sfx.startEndingBgm()) ui.btnEndingAudio.classList.add("hidden");
  });
  document.getElementById("btn-ending-continue").addEventListener("click", () => {
    stopEndingMovie(endingReplayFromTown ? "town" : "continue");
  });
  document.getElementById("btn-ending-town").addEventListener("click", () => {
    stopEndingMovie("town");
  });

  document.getElementById("sk-spin").addEventListener("click", useSkillSpin);
  document.getElementById("sk-fire").addEventListener("click", useSkillFire);
  document.getElementById("sk-heal").addEventListener("click", useSkillHeal);
  document.getElementById("sk-rest").addEventListener("click", restOneTurn);

  document.getElementById("btn-stairs-yes").addEventListener("click", () => {
    sfx.stairs();
    generateFloor(floorNum + 1);
  });
  document.getElementById("btn-stairs-no").addEventListener("click", () => {
    waitingStairsPrompt = false;
    ui.stairsPrompt.classList.add("hidden");
  });

  document.getElementById("btn-inv").addEventListener("click", () => {
    if (!isDefeated && !isEndingPlaying && !pendingEndingMovie) openInventory();
  });
  document.getElementById("btn-close-inv").addEventListener("click", () => ui.invModal.classList.add("hidden"));
  document.getElementById("btn-skill").addEventListener("click", () => {
    if (isDefeated || isEndingPlaying || pendingEndingMovie) return;
    if (inTown) { activeTownTab = "skills"; renderTownTab(); }
    else pushLog(L("✨ スキル強化は拠点の「スキル強化」タブで行えます（ショートカット 1/2/3 で発動）", "✨ Upgrade skills in Town's Skills tab (use keys 1/2/3 to cast in battle)"));
  });
  document.getElementById("btn-town").addEventListener("click", () => {
    if (inTown || isDefeated || isEndingPlaying || pendingEndingMovie) return;
    if (floorNum === 1 && enemies.every((e) => !e.awake)) openTown("dive");
    else pushLog(L("🌀 ダンジョン探索中は「帰還の巻物」で拠点へ戻れます！", "🌀 Use a Return Scroll to return to Town from deep floors!"), "warn");
  });

  document.querySelectorAll(".town-tabs .tab-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      activeTownTab = btn.dataset.tab;
      renderTownTab();
    });
  });

  document.getElementById("btn-save").addEventListener("click", () => {
    if (isEndingPlaying || pendingEndingMovie) return;
    document.getElementById("save-code-text").value = encodeSave();
    ui.saveModal.classList.remove("hidden");
  });
  document.getElementById("btn-close-save").addEventListener("click", () => ui.saveModal.classList.add("hidden"));
  document.getElementById("btn-save-now").addEventListener("click", () => {
    persistSave();
    document.getElementById("save-code-text").value = encodeSave();
    pushLog(L("💾 冒険の記録をセーブしました！", "💾 Adventure saved!"), "good");
  });
  document.getElementById("btn-copy-save").addEventListener("click", () => {
    const t = document.getElementById("save-code-text").value;
    if (navigator.clipboard) navigator.clipboard.writeText(t).then(() => pushLog(L("引き継ぎコードをコピーしました！", "Transfer code copied!"), "good"));
  });
  document.getElementById("btn-load-save").addEventListener("click", () => {
    try {
      save = decodeSave(document.getElementById("save-code-text").value);
      persistSave();
      ui.saveModal.classList.add("hidden");
      openTown("dive");
      pushLog(L("セーブコードから復元しました！", "Restored from transfer code!"), "good");
    } catch (_e) {
      pushLog(L("セーブコードが正しくありません", "Invalid save code"), "danger");
    }
  });
  document.getElementById("btn-reset-game").addEventListener("click", () => {
    localStorage.removeItem(SAVE_KEY);
    save = defaultSave();
    isDefeated = false;
    runKills = 0;
    lastDamageCause = "";
    ui.defeatOverlay.classList.add("hidden");
    ui.saveModal.classList.add("hidden");
    openTown("dive");
    pushLog(L("データを初期化しました。", "Save data reset."));
  });

  if (ui.btnLang) {
    ui.btnLang.addEventListener("click", () => {
      applyLanguage(isEn() ? "ja" : "en");
      pushLog(L("🌐 表示言語を日本語に切り替えました", "🌐 Switched language to English"));
    });
  }

  document.getElementById("btn-sound").addEventListener("click", (e) => {
    sfx.on = !sfx.on;
    if (!sfx.on) sfx.stopEndingBgm();
    e.currentTarget.textContent = sfx.on ? "🔊" : "🔇";
  });

  window.playEndingMovie = () => startEndingMovie({ replayFromTown: false });

  // --- 初回起動（Three.js 3D初期化＆B1Fを即座に生成してすぐ遊べる状態に） ---
  initThree();
  applyLanguage(lang);
  generateFloor(1);
  requestAnimationFrame(renderFrame);
  if (new URLSearchParams(window.location.search).get("ending") === "1") {
    startEndingMovie({ replayFromTown: false });
  }
}());
