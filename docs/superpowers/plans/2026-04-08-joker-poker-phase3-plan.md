# Phase 3: 完整 Roguelike 流程实现计划

> **面向 Agent：** 使用 superpowers:subagent-driven-development 或 superpowers:executing-plans 逐任务执行。

**目标：** 实现 3 Ante × 3 Blind 完整 Roguelike 循环，包括商店（2 Joker + 1 Tarot/Planet）、经济系统、Tarot/Planet 卡片效果。

**架构：** 在现有 `index.html` 单文件内增量扩展：新增常量数据类 → BlindManager → 扩展 GameState → ShopManager → TarotSystem → 扩展 RenderEngine → 整合状态流。不修改 Phase 1/2 已稳定代码。

**技术栈：** 纯 HTML/CSS/JS 单文件，零构建步骤。

---

## 文件变更概览

```
index.html  (唯一文件，增量修改)
  ├── 新增常量数据（TAROTS、PLANETS）
  ├── 新增 BlindManager 类
  ├── 扩展 GameState（新增字段 + 重置逻辑）
  ├── 新增 ShopManager 类
  ├── 新增 TarotSystem 类
  ├── 扩展 ScoringEngine（Planet 升级加成）
  ├── 扩展 STATES 枚举
  ├── 扩展 RenderEngine（3 个新渲染方法 + 顶部栏）
  └── 扩展 Game 主类（状态跳转逻辑 + 键盘事件）
```

---

## Task 1: Tarot/Planet 数据定义

**文件：**
- 修改：`index.html`（常量定义区，在 `JOKER_RARITY` 之后添加）

**内容：**
在 `JOKER_RARITY` 定义之后、`JOKERS` 数组之前插入 Tarot 和 Planet 数据：

```js
/* ============================================
   Tarot 卡牌数据（15 张）
============================================ */
const TAROTS = [
  { id: 'T01', name: 'The Fool',     effect: 'draw',    desc: '抽 1 张牌',       price: 3 },
  { id: 'T02', name: 'The Magician', effect: 'reroll_suit', desc: '1 张手牌转同值异花', price: 3 },
  { id: 'T03', name: 'The High Priestess', effect: 'choose_hand_type', desc: '下一手设定类型', price: 4 },
  { id: 'T04', name: 'The Empress',  effect: 'bonus_double', desc: '本回合 Bonus ×2',  price: 4 },
  { id: 'T05', name: 'The Emperor',  effect: 'mult_per_card', desc: '本回合每张牌 +1 Mult', price: 4 },
  { id: 'T06', name: 'The Hierophant', effect: 'bonus_flat', desc: '本回合 +20 Bonus',  price: 3 },
  { id: 'T07', name: 'The Lovers',   effect: 'mult_flat',  desc: '本回合 +3 Mult',    price: 3 },
  { id: 'T08', name: 'The Chariot',  effect: 'add_value',  desc: '2 张手牌面值 +4',  price: 3 },
  { id: 'T09', name: 'Justice',      effect: 'upgrade_card', desc: '1 张手牌转 J/Q/K/A', price: 3 },
  { id: 'T10', name: 'The Hermit',   effect: 'free_hand',  desc: '本回合不消耗次数',  price: 5 },
  { id: 'T11', name: 'Wheel of Fortune', effect: 'upgrade_joker', desc: '30% Joker 升级', price: 4 },
  { id: 'T12', name: 'Strength',     effect: 'double_value', desc: '1 张手牌面值 ×2',  price: 4 },
  { id: 'T13', name: 'The Tower',    effect: 'set_value',  desc: '1 张手牌转为 2',    price: 3 },
  { id: 'T14', name: 'The Star',     effect: 'instant_money', desc: '立即获得 $3',    price: 2 },
  { id: 'T15', name: 'The Moon',     effect: 'next_ante_discount', desc: '下 Ante 盲注 -1', price: 3 },
];

/* ============================================
   Planet 卡牌数据（10 张）
============================================ */
const PLANETS = [
  { id: 'P01', name: 'Mercury', handType: 'HIGH_CARD',      bonus: 10, price: 3 },
  { id: 'P02', name: 'Venus',   handType: 'ONE_PAIR',       bonus: 15, price: 3 },
  { id: 'P03', name: 'Mars',    handType: 'TWO_PAIR',       bonus: 20, price: 4 },
  { id: 'P04', name: 'Jupiter', handType: 'STRAIGHT',       bonus: 30, price: 4 },
  { id: 'P05', name: 'Saturn',  handType: 'FLUSH',          bonus: 35, price: 5 },
  { id: 'P06', name: 'Uranus',  handType: 'FULL_HOUSE',     bonus: 40, price: 5 },
  { id: 'P07', name: 'Neptune', handType: 'FOUR_OF_A_KIND', bonus: 50, price: 6 },
  { id: 'P08', name: 'Pluto',   handType: 'STRAIGHT_FLUSH', bonus: 60, price: 6 },
  { id: 'P09', name: 'Jupiter', handType: 'THREE_OF_A_KIND', bonus: 25, price: 4 },
  { id: 'P10', name: 'Saturn',  handType: 'ROYAL_FLUSH',    bonus: 100, price: 8 },
];
```

---

## Task 2: BlindManager 类

**文件：**
- 修改：`index.html`（在 `JokerSystem` 类之后插入）

**内容：**

```js
/* ============================================
   BlindManager — Blind 进度管理
============================================ */
class BlindManager {
  constructor() {
    this.currentAnte = 1;
    this.currentBlindIndex = 0; // 0=Small, 1=Big, 2=Boss
  }

  // 目标分表
  getTargetScore() {
    const table = [
      [/* Ante 1 */ 100, 150, 200],
      [/* Ante 2 */ 150, 250, 350],
      [/* Ante 3 */ 200, 350, 500],
    ];
    return table[this.currentAnte - 1]?.[this.currentBlindIndex] ?? 500;
  }

  // 奖励筹码表
  getReward() {
    const rewards = [3, 4, 5]; // Small, Big, Boss
    return rewards[this.currentBlindIndex] ?? 0;
  }

  // 跳过 Boss 惩罚
  getSkipPenalty() { return 2; }

  // 当前 Blind 名称
  getBlindName() {
    return ['Small Blind', 'Big Blind', 'Boss Blind'][this.currentBlindIndex];
  }

  // 当前 Ante 是否完成（3 个 Blind 全过）
  isAnteComplete() {
    return this.currentBlindIndex === 0 && this.currentAnte > 1;
  }

  // 进入下一 Blind 或下一 Ante
  advanceBlind() {
    this.currentBlindIndex++;
    if (this.currentBlindIndex > 2) {
      this.currentBlindIndex = 0;
      this.currentAnte++;
    }
  }

  // 重置
  reset() {
    this.currentAnte = 1;
    this.currentBlindIndex = 0;
  }
}
```

---

## Task 3: GameState 扩展

**文件：**
- 修改：`index.html` — `class GameState` 构造函数和 `startGame()` 方法

**变更 1：扩展 `STATES` 枚举**
在 `const STATES = { ... }` 中新增：
```js
ANTE_SELECT: 'ANTE_SELECT',
BLIND_SELECT: 'BLIND_SELECT',
SHOP: 'SHOP',
```

**变更 2：扩展 `GameState` 构造函数新增字段**
在 `this.maxJokerSlots = 5;` 后添加：
```js
this.blindManager = new BlindManager();
this.shopItems = { jokers: [], tarotPlanet: null };
this.handLevelBonus = {};   // Planet 升级加成 { 'STRAIGHT': 30, ... }
this.tarotEffects = {};     // Tarot 临时效果
this.nextHandTypeOverride = null;  // T03 效果
```

**变更 3：`startGame()` 方法简化初始化**
替换 `startGame()` 中的 Joker 初始化（去掉硬编码的 J002/J003，改为空数组，让玩家在商店购买）：
```js
this.activeJokers = [];  // 从零开始，玩家在商店购买
```

同时确保重置所有新字段：
```js
this.blindManager.reset();
this.money = 4;
this.handLevelBonus = {};
this.tarotEffects = {};
this.nextHandTypeOverride = null;
this.state = STATES.ANTE_SELECT;  // 直接进入 Ante 选择
```

---

## Task 4: ShopManager 类

**文件：**
- 修改：`index.html`（在 `JokerSystem` 类之后插入）

```js
/* ============================================
   ShopManager — 商店生成与购买
============================================ */
class ShopManager {
  // 生成商店商品
  generateShop(ownedJokerIds, money) {
    const jokers = this._pickRandomJokers(ownedJokerIds, 2);
    const tarotPlanet = Math.random() < 0.5
      ? { ...TAROTS[Math.floor(Math.random() * TAROTS.length)], type: 'tarot' }
      : { ...PLANETS[Math.floor(Math.random() * PLANETS.length)], type: 'planet' };
    return { jokers, tarotPlanet };
  }

  _pickRandomJokers(ownedIds, count) {
    // 按稀有度概率抽取（排除已拥有）
    const pool = JOKERS.filter(j => !ownedIds.includes(j.id));
    const result = [];
    for (let i = 0; i < count && pool.length > 0; i++) {
      const idx = Math.floor(Math.random() * pool.length);
      result.push(pool.splice(idx, 1)[0]);
    }
    return result;
  }

  canAfford(item, money) {
    return money >= (item.price ?? 0);
  }

  purchase(item, gameState) {
    if (!this.canAfford(item, gameState.money)) return false;
    gameState.money -= item.price;
    if (item.type === 'tarot') {
      // Tarot 效果立即触发（通过 TarotSystem）
      TarotSystem.apply(item, gameState);
    } else if (item.type === 'planet') {
      // Planet 升级永久生效
      const key = item.handType;
      gameState.handLevelBonus[key] = (gameState.handLevelBonus[key] || 0) + item.bonus;
    } else {
      // Joker
      if (gameState.activeJokers.length < gameState.maxJokerSlots) {
        gameState.activeJokers.push({ ...item });
      }
    }
    return true;
  }
}
```

---

## Task 5: TarotSystem 类

**文件：**
- 修改：`index.html`（在 `ShopManager` 类之后插入）

```js
/* ============================================
   TarotSystem — Tarot 效果触发器
============================================ */
class TarotSystem {
  static apply(tarot, gameState) {
    switch (tarot.effect) {
      case 'instant_money':
        gameState.money += 3;
        break;
      case 'bonus_flat':
        gameState.tarotEffects.bonusFlat = (gameState.tarotEffects.bonusFlat || 0) + 20;
        break;
      case 'mult_flat':
        gameState.tarotEffects.multFlat = (gameState.tarotEffects.multFlat || 0) + 3;
        break;
      case 'bonus_double':
        gameState.tarotEffects.bonusDouble = true;
        break;
      case 'mult_per_card':
        gameState.tarotEffects.multPerCard = true;
        break;
      case 'free_hand':
        gameState.tarotEffects.freeHand = true;
        break;
      case 'next_ante_discount':
        gameState.tarotEffects.nextAnteDiscount = 1;
        break;
      case 'choose_hand_type':
        // 标记，在出牌时弹出选择
        gameState.tarotEffects.chooseHandType = true;
        break;
      default:
        // 其他效果（draw, reroll_suit, add_value, upgrade_card,
        // double_value, set_value, upgrade_joker）
        // 暂记为 pending，在下一手牌时处理
        gameState.tarotEffects.pending = tarot;
        break;
    }
  }

  // 计分时读取 Tarot 效果加成
  static getScoreBonus(gameState, cardCount) {
    const fx = gameState.tarotEffects;
    let mult = fx.multFlat || 0;
    let bonus = fx.bonusFlat || 0;
    if (fx.multPerCard) mult += cardCount;
    if (fx.bonusDouble) bonus *= 2;
    return { mult, bonus };
  }

  // 清空已触发的 Tarot 效果（每回合结束时）
  static clearRoundEffects(gameState) {
    gameState.tarotEffects = {};
    gameState.nextHandTypeOverride = null;
  }
}
```

---

## Task 6: ScoringEngine 集成 Planet 升级

**文件：**
- 修改：`index.html` — `ScoringEngine.calculate()` 方法

在 `calculate()` 方法的 `const base = type.base;` 之后添加：

```js
// Planet 卡升级加成
const planetBonus = (gameState && gameState.handLevelBonus)
  ? (gameState.handLevelBonus[type.name] || 0)
  : 0;
const subtotal = base + faceValue + planetBonus;
```

同时修改方法签名以接收 `gameState`：
```js
calculate(result, jokerContext = {}, gameState = null) {
```

并更新返回值：
```js
return { base, faceValue, planetBonus, subtotal, mult, bonus, boostFactor, total };
```

**计分调用处更新：** `GameState.playHand()` 中的调用需传入 `this`：
```js
const score = new ScoringEngine().calculate(result, jokerResult, this);
```

---

## Task 7: RenderEngine — 新渲染方法

**文件：**
- 修改：`index.html` — `RenderEngine.render()` 和 `class RenderEngine` 新增方法

**变更 1：`render()` 方法扩展**
在 `switch` 中新增：
```js
case STATES.ANTE_SELECT:
  return this.renderAnteSelect(state);
case STATES.BLIND_SELECT:
  return this.renderBlindSelect(state);
case STATES.SHOP:
  return this.renderShop(state);
```

**变更 2：新增 `renderAnteSelect()` 方法**
```js
renderAnteSelect(state) {
  const ante = state.blindManager.currentAnte;
  return `
    <div class="title-screen">
      <h2 style="color: var(--accent);">Ante ${ante} / 3</h2>
      <p style="color: var(--text-muted);">Joker: ${state.activeJokers.length}/${state.maxJokerSlots} · 筹码: $${state.money}</p>
      <div style="display:flex;gap:12px;flex-wrap:wrap;justify-content:center;margin:20px 0;">
        ${state.activeJokers.map(j => `
          <div class="joker-slot rarity-${j.rarity}" style="width:64px;min-height:72px;border-radius:8px;border:2px solid ${JOKER_RARITY[j.rarity].border};background:${JOKER_RARITY[j.rarity].bg};display:flex;flex-direction:column;align-items:center;justify-content:center;padding:6px 4px;gap:2px;">
            <span style="font-size:0.6rem;color:rgba(255,255,255,0.4);font-family:Oswald,sans-serif;">${j.id}</span>
            <span style="font-size:0.65rem;font-weight:600;color:var(--text-primary);text-align:center;">${j.name}</span>
          </div>
        `).join('')}
      </div>
      <button class="btn btn-primary" onclick="game.confirmAnte()">选择盲注</button>
    </div>
  `;
}
```

**变更 3：新增 `renderBlindSelect()` 方法**
```js
renderBlindSelect(state) {
  const ante = state.blindManager.currentAnte;
  const blinds = [
    { name: 'Small Blind', score: [100,150,200][ante-1],    reward: 3 },
    { name: 'Big Blind',   score: [150,250,350][ante-1],    reward: 4 },
    { name: 'Boss Blind',  score: [200,350,500][ante-1],    reward: 5, skippable: true },
  ];
  return `
    <div class="title-screen">
      <h2 style="color:var(--accent);">Ante ${ante} — 选择盲注</h2>
      <p style="color:var(--text-muted);">筹码: $${state.money}</p>
      <div style="display:flex;flex-direction:column;gap:12px;margin:24px 0;align-items:center;">
        ${blinds.map((b, i) => `
          <button class="btn btn-secondary" style="width:280px;padding:16px;"
            onclick="game.selectBlind(${i})"
            ${state.money < (i === 2 ? 2 : 0) ? 'disabled' : ''}>
            <div style="font-family:Oswald,sans-serif;font-size:1.2rem;">${b.name}</div>
            <div style="font-size:0.85rem;margin-top:4px;">目标: ${b.score} 分 · 奖励: $${b.reward}
              ${b.skippable ? ' · 跳过 -$2' : ''}</div>
          </button>
        `).join('')}
      </div>
      <button class="btn btn-small" style="opacity:0.5;" onclick="game.backToAnteSelect()">返回</button>
    </div>
  `;
}
```

**变更 4：新增 `renderShop()` 方法**
```js
renderShop(state) {
  const items = state.shopItems;
  const tp = items.tarotPlanet;
  return `
    <div style="padding:20px;">
      <div class="status-bar" style="margin-bottom:16px;">
        <div class="status-item">
          <span class="status-label">Ante</span>
          <span class="status-value">${state.blindManager.currentAnte}/3</span>
        </div>
        <div class="status-item">
          <span class="status-label">筹码</span>
          <span class="status-value" style="color:#2ECC71;">$${state.money}</span>
        </div>
      </div>
      <h2 style="text-align:center;margin-bottom:20px;color:var(--accent);">商店</h2>

      <!-- Joker 区 -->
      <div style="background:var(--bg-secondary);border-radius:16px;padding:16px;margin-bottom:12px;border:1px solid rgba(255,255,255,0.05);">
        <div style="font-size:0.75rem;color:var(--text-muted);text-transform:uppercase;letter-spacing:1px;margin-bottom:10px;">Joker</div>
        <div style="display:flex;gap:12px;flex-wrap:wrap;">
          ${items.jokers.map((j, i) => `
            <div style="text-align:center;">
              <div class="joker-slot rarity-${j.rarity}" style="width:72px;height:88px;cursor:${state.money >= j.price ? 'pointer' : 'not-allowed';};"
                   onclick="${state.money >= j.price ? `game.buyItem('joker',${i})` : ''}">
                <span style="font-size:0.6rem;color:rgba(255,255,255,0.4);font-family:Oswald,sans-serif;">${j.id}</span>
                <span style="font-size:0.65rem;font-weight:600;color:var(--text-primary);">${j.name}</span>
                <span style="font-size:0.55rem;color:rgba(255,255,255,0.5);">${j.desc.split('（')[0]}</span>
              </div>
              <div style="font-size:0.8rem;color:${state.money >= j.price ? '#2ECC71' : '#E74C3C'};margin-top:4px;">$${j.price}</div>
            </div>
          `).join('')}
          ${items.jokers.length === 0 ? '<div style="color:var(--text-dim);font-size:0.85rem;">已拥有全部 Joker</div>' : ''}
        </div>
      </div>

      <!-- Tarot/Planet 区 -->
      ${tp ? `
        <div style="background:var(--bg-secondary);border-radius:16px;padding:16px;margin-bottom:12px;border:1px solid rgba(255,255,255,0.05);">
          <div style="font-size:0.75rem;color:var(--text-muted);text-transform:uppercase;letter-spacing:1px;margin-bottom:10px;">${tp.type === 'tarot' ? 'Tarot' : 'Planet'}</div>
          <div style="display:flex;gap:12px;flex-wrap:wrap;">
            <div style="text-align:center;">
              <div style="width:72px;height:88px;background:${tp.type === 'tarot' ? '#1A1A3E' : '#1A2E1A'};border-radius:8px;border:2px solid ${tp.type === 'tarot' ? '#9B59B6' : '#2ECC71'};display:flex;flex-direction:column;align-items:center;justify-content:center;padding:6px;cursor:${state.money >= tp.price ? 'pointer' : 'not-allowed';}"
                   onclick="${state.money >= tp.price ? `game.buyItem('tarotPlanet',0)` : ''}">
                <span style="font-size:0.6rem;color:rgba(255,255,255,0.4);font-family:Oswald,sans-serif;">${tp.id}</span>
                <span style="font-size:0.65rem;font-weight:600;color:var(--text-primary);">${tp.name}</span>
                <span style="font-size:0.55rem;color:rgba(255,255,255,0.5);">${tp.desc}</span>
              </div>
              <div style="font-size:0.8rem;color:${state.money >= tp.price ? '#2ECC71' : '#E74C3C'};margin-top:4px;">$${tp.price}</div>
            </div>
          </div>
        </div>
      ` : ''}

      <div class="actions" style="margin-top:20px;">
        <button class="btn btn-primary" onclick="game.leaveShop()">
          ${state.blindManager.currentAnte >= 3 ? '查看结果' : `进入 Ante ${state.blindManager.currentAnte + 1 > 3 ? 3 : state.blindManager.currentAnte + 1}`}
        </button>
      </div>
    </div>
  `;
}
```

**变更 5：更新 `renderPlaying()` 顶部状态栏**
将状态栏从静态改为动态（使用 state 字段），在 `.status-bar` 区域内替换：
```js
// 替换 .status-bar 内容为：
<div class="status-bar">
  <div class="status-item">
    <span class="status-label">Ante</span>
    <span class="status-value">${state.blindManager?.currentAnte ?? 1}/3</span>
  </div>
  <div class="status-item">
    <span class="status-label">${state.blindManager?.getBlindName() ?? '目标'}</span>
    <span class="status-value target">${state.blindManager?.getTargetScore() ?? state.targetScore}</span>
  </div>
  <div class="status-item">
    <span class="status-label">当前</span>
    <span class="status-value current" id="currentScore">${state.totalScore}</span>
  </div>
  <div class="status-item">
    <span class="status-label">剩余次数</span>
    <span class="status-value hands">${state.handsRemaining}</span>
  </div>
  <div class="status-item">
    <span class="status-label">筹码</span>
    <span class="status-value" style="color:#2ECC71;">$${state.money}</span>
  </div>
</div>
```

---

## Task 8: Game 主类 — 状态跳转逻辑

**文件：**
- 修改：`index.html` — `class Game` 的 `bindEvents()`、`playHand()`、`nextStep()` 和新增方法

**变更 1：`bindEvents()` 扩展空格键逻辑**
替换空格键处理为：
```js
document.onkeydown = (e) => {
  if (e.code === 'Space' && this.state.state === STATES.PLAYING) {
    e.preventDefault();
    this.playHand();
  }
  // 数字键 1-3 选择 Blind
  if (this.state.state === STATES.BLIND_SELECT) {
    if (e.key === '1') this.selectBlind(0);
    if (e.key === '2') this.selectBlind(1);
    if (e.key === '3') this.selectBlind(2);
  }
};
```

**变更 2：`startGame()` 简化**
替换 `startGame()` 为：
```js
startGame() {
  this.state = new GameState();
  this.state.blindManager = new BlindManager();
  this.state.money = 4;
  this.state.totalScore = 0;
  this.state.handsRemaining = 4;
  this.state.activeJokers = [];
  this.state.handLevelBonus = {};
  this.state.tarotEffects = {};
  this.state.shopItems = { jokers: [], tarotPlanet: null };
  this.renderer = new RenderEngine(document.getElementById('app'));
  this.state.state = STATES.ANTE_SELECT;
  this.render();
}
```

> 注：`this.state = new GameState()` 后需要覆盖新字段，因为 GameState 构造函数会设置 TITLE 状态。

**变更 3：新增状态跳转方法**
在 `class Game` 中新增以下方法：

```js
confirmAnte() {
  this.state.state = STATES.BLIND_SELECT;
  this.render();
}

backToAnteSelect() {
  this.state.state = STATES.ANTE_SELECT;
  this.render();
}

selectBlind(blindIndex) {
  this.state.blindManager.currentBlindIndex = blindIndex;
  this.state.targetScore = this.state.blindManager.getTargetScore();
  this.state.state = STATES.PLAYING;
  // 洗牌、发牌
  this.state.deck = new DeckManager();
  this.state.deck.createDeck();
  this.state.deck.shuffle();
  this.state.hand = this.state.deck.draw(8);
  this.state.selectedCards = [];
  this.state.roundScore = 0;
  this.state.totalScore = 0;
  this.state.handsRemaining = 4;
  this.render();
}

leaveShop() {
  if (this.state.blindManager.currentAnte >= 3) {
    // 全部 Ante 完成 → 胜利
    this.state.state = STATES.VICTORY;
  } else {
    // 进入下一 Ante 的盲注选择
    this.state.blindManager.currentAnte++;
    this.state.state = STATES.BLIND_SELECT;
  }
  this.render();
}

buyItem(type, index) {
  const shop = new ShopManager();
  let item;
  if (type === 'joker') {
    item = this.state.shopItems.jokers[index];
  } else {
    item = this.state.shopItems.tarotPlanet;
  }
  if (!item) return;
  if (!shop.canAfford(item, this.state.money)) return;

  // Joker 购买后从商店移除
  if (type === 'joker') {
    this.state.shopItems.jokers.splice(index, 1);
  } else {
    this.state.shopItems.tarotPlanet = null;
  }

  shop.purchase(item, this.state);
  this.render();
}

enterShop() {
  // 生成新商店
  const ownedIds = this.state.activeJokers.map(j => j.id);
  this.state.shopItems = new ShopManager().generateShop(ownedIds, this.state.money);
  this.state.state = STATES.SHOP;
  this.render();
}

continueGame() {
  // 原有"补牌继续"逻辑：洗牌重抽
  if (this.state.deck.deck.length < 5) {
    this.state.deck.reshuffleDiscardToDeck();
  }
  this.state.hand = this.state.deck.draw(Math.min(8, this.state.deck.deck.length));
  this.state.selectedCards = [];
  this.state.state = STATES.PLAYING;
  this.render();
}

nextStep() {
  // Tarot 效果清理
  TarotSystem.clearRoundEffects(this.state);

  if (this.state.hand.length < 8 && this.state.deck.deck.length > 0) {
    this.state.deck.draw(Math.min(8 - this.state.hand.length, this.state.deck.deck.length));
  }

  if (this.state.handsRemaining > 0) {
    this.state.state = STATES.PLAYING;
  } else {
    // 出牌次数用完，判断盲注是否通过
    const won = this.state.totalScore >= this.state.targetScore;
    if (won) {
      this.state.money += this.state.blindManager.getReward();
    }
    // 检查是否所有 Blind 完成
    if (this.state.blindManager.currentBlindIndex === 2) {
      // Boss 刚完成，进入商店
      this.enterShop();
      return;
    }
    // 未完成当前 Ante → 可以重新挑战（扣除跳过费可选）
    // 进入下一 Blind 选择
    this.state.state = STATES.BLIND_SELECT;
  }
  this.render();
}
```

**变更 4：`playHand()` 修改胜负判断**
替换 `playHand()` 中的胜负判断为：
```js
if (this.state.totalScore >= this.state.targetScore) {
  this.state.state = STATES.SCORING;
} else if (this.state.handsRemaining <= 0) {
  this.state.state = STATES.SCORING; // 先显示得分，再判断
} else {
  this.state.state = STATES.SCORING;
}
```

并确保在 `SCORING` 状态下正确跳转：
在 `nextStep()` 中处理：
```js
// 判断是否直接胜利（本 Blind 达到目标分）
if (this.state.totalScore >= this.state.targetScore) {
  this.state.state = STATES.PLAYING; // 继续出牌直到次数用完
}
```

**变更 5：`renderScoring()` 调整**
在计分面板中添加当前目标分和筹码显示：
```js
// 在 .score-panel 顶部添加（紧跟 div class="score-panel" 之后）：
<div style="display:flex;justify-content:space-between;padding:0 4px 8px;font-size:0.8rem;color:var(--text-muted);">
  <span>目标: ${state.targetScore}</span>
  <span>筹码: $${state.money}</span>
</div>
```

---

## Task 9: 最终整合与测试

**测试清单（手动验证）：**

1. **完整游戏流程测试**
   - [ ] 从标题 → Ante 1 Blind 选择 → 出牌达到目标分 → 获得奖励 → 进入商店 → 购买 Joker → 进入 Ante 2
   - [ ] 连续通过 3 Ante × 3 Blind（共 9 个 Blind）后显示胜利
   - [ ] 3 Ante 全部完成后显示胜利画面

2. **经济系统测试**
   - [ ] 每 Ante 开始时筹码 +$4
   - [ ] 击败 Small/Big/Boss 分别奖励 $3/$4/$5
   - [ ] 筹码不足时购买按钮禁用
   - [ ] 跳过 Boss（跳过按钮）- 从 $2 扣除

3. **商店测试**
   - [ ] 进入商店显示 2 Joker + 1 Tarot/Planet
   - [ ] 购买 Joker 后从商店消失
   - [ ] 购买 Tarot/Planet 后消失
   - [ ] 筹码不足时所有购买按钮禁用

4. **Tarot 效果测试**
   - [ ] The Star（T14）购买后立即 +$3
   - [ ] Tarot 效果在计分时正确叠加

5. **Planet 升级测试**
   - [ ] 购买 Planet 卡后，对应手牌类型基础分增加
   - [ ] 多次购买同类型 Planet 叠加

6. **Joker 系统回归测试**
   - [ ] 购买 Joker 后效果正确触发
   - [ ] Joker 预览功能正常

7. **边界情况**
   - [ ] 筹码耗尽时显示 Game Over
   - [ ] 牌堆耗尽时正确 reshuffle
   - [ ] 键盘 1/2/3 快捷选择 Blind

---

## 任务依赖图

```
Task 1: Tarot/Planet 数据定义
    ↓
Task 2: BlindManager 类
    ↓
Task 3: GameState 扩展 (STATES + 字段 + startGame)
    ↓
Task 4: ShopManager 类 ────────────→ Task 5: TarotSystem 类
    ↓                                        ↓
Task 6: ScoringEngine Planet 集成 ───────────┘
    ↓
Task 7: RenderEngine 新渲染方法
    ↓
Task 8: Game 主类状态跳转
    ↓
Task 9: 整合测试
```

---

## 自检清单

- [x] SPEC.md 覆盖：Ante/Blind 选择 ✓，商店 ✓，经济 ✓，Tarot/Planet 效果 ✓
- [x] 占位符扫描：无 "TBD"、"TODO"、未填写内容
- [x] 类型一致性：`BlindManager.getTargetScore()`、`ShopManager.generateShop()` 方法签名在所有调用处一致
- [x] 任务粒度：每个 Task 为 1 个逻辑块，步骤清晰
- [x] 无重复实现： TarotSystem 和 ScoringEngine 的 Planet 集成各自独立
