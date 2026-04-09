# 消消乐游戏设计文档

## 概述

一款卡通可爱风格的移动端 H5 消消乐游戏，采用 React 技术栈开发。

## 技术选型

- **框架**：React 18+
- **构建工具**：Vite
- **样式**：CSS Modules / Tailwind CSS
- **动画**：CSS Transitions + requestAnimationFrame
- **渲染策略**：Canvas 渲染棋盘 + React 渲染 UI

## 游戏规则

### 核心玩法

- **棋盘**：6x6 方块矩阵
- **方块类型**：5 种卡通糖果（红、黄、蓝、绿、紫）
- **操作方式**：点击选中一个方块，再次点击相邻方块进行交换
- **消除规则**：横向或纵向连续 3 个及以上相同方块消除
- **连锁反应**：消除后上方方块下落补位，自动检测新消除
- **步数限制**：每关 20 步
- **过关条件**：达到目标分数

### 关卡设计

- **初始目标分数**：第 1 关 1000 分
- **分数增幅**：每关 +500 分（第 2 关 1500，第 3 关 2000...）
- **初始步数**：20 步
- **MVP 版本**：5 关

### 计分规则

- 消除 3 个：100 分
- 消除 4 个：200 分
- 消除 5 个及以上：300 分
- 连锁加成：第 N 次连锁 × N 倍基础分

## 界面设计

### 页面结构

1. **开始页面**
   - 游戏标题
   - 开始游戏按钮

2. **游戏页面**
   - 顶部：当前关卡、目标分数、当前分数、剩余步数
   - 中央：6x6 游戏棋盘
   - 底部：重新开始按钮

3. **过关弹窗**
   - 显示获得的分数和星数
   - 下一关按钮

4. **失败弹窗**
   - 提示未达成目标
   - 重新挑战按钮

### 视觉风格

- **配色**：明亮糖果色
  - 红色糖果：#FF6B6B
  - 黄色糖果：#FFE66D
  - 蓝色糖果：#4ECDC4
  - 绿色糖果：#95E1A3
  - 紫色糖果：#C9B1FF
- **背景**：浅色渐变 + 装饰元素
- **方块**：圆角矩形，带阴影和光泽效果
- **动画**：
  - 方块选中：放大 + 发光边框
  - 交换：平滑位移过渡
  - 消除：缩放消失 + 粒子效果
  - 下落：弹性动画

## 技术架构

### 目录结构

```
src/
├── components/
│   ├── GameBoard/      # 游戏棋盘
│   ├── Tile/           # 单个方块
│   ├── UI/             # 分数、步数等 UI
│   └── Modal/          # 弹窗组件
├── hooks/
│   └── useGameLogic.ts # 游戏核心逻辑
├── utils/
│   └── boardUtils.ts   # 棋盘工具函数
├── App.tsx
└── main.tsx
```

### 状态管理

使用 React useState + useReducer 管理游戏状态：

```typescript
interface GameState {
  board: TileType[][];      // 棋盘数据
  selectedTile: Position | null;  // 选中的方块
  score: number;            // 当前分数
  targetScore: number;      // 目标分数
  level: number;            // 当前关卡
  moves: number;            // 剩余步数
  gameStatus: 'playing' | 'won' | 'lost';
}
```

### 核心算法

1. **交换检测**：检查交换后是否有 3+ 连续相同方块
2. **消除检测**：遍历整个棋盘，标记所有可消除的方块组合
3. **下落填充**：消除后，方块下落填补空位
4. **连锁检测**：填充后递归检测是否产生新的消除

## 项目里程碑

1. **Phase 1**：项目搭建、棋盘渲染、方块点击选中
2. **Phase 2**：方块交换、消除判定、下落逻辑
3. **Phase 3**：连锁检测、分数计算、步数限制
4. **Phase 4**：关卡系统、UI 优化、弹窗
5. **Phase 5**：动画效果、视觉美化

## 验收标准

- [x] 5 关关卡可正常游玩
- [x] 消除、连锁逻辑正确
- [x] 分数计算准确
- [x] 过关/失败判定正确
- [x] 移动端触摸操作流畅
- [x] 无明显性能问题

## 已知问题修复

### Bug: 点击第二个方块后页面卡死 (已修复)

**问题描述**：点击第二个方块进行交换时，页面会卡死无响应。

**根本原因**：`processMatches` 函数中的 while 循环只调用了 `dropTiles` 下落填充，但没有先调用 `removeMatches` 清除匹配的方块。这导致 `findMatches` 永远能找到相同的匹配，形成无限循环。

**修复方案**：在 `dropTiles` 之前添加 `removeMatches` 调用，确保匹配的方块被真正清除后再进行下落填充。

```typescript
// 修复前
while (hasMatches) {
  const matches = findMatches(newBoard);
  if (matches.length === 0) {
    hasMatches = false;
  } else {
    newBoard = dropTiles(newBoard); // 错误：未清除匹配
  }
}

// 修复后
while (hasMatches) {
  const matches = findMatches(newBoard);
  if (matches.length === 0) {
    hasMatches = false;
  } else {
    newBoard = removeMatches(newBoard, matches); // 先清除
    newBoard = dropTiles(newBoard);              // 再下落
  }
}
```

## 测试

### 单元测试

运行：`pnpm test`

覆盖：棋盘工具函数（创建、匹配检测、分数计算、交换、下落）

### E2E 测试

运行：`pnpm exec playwright test`

覆盖：
- 页面加载正确性
- 游戏交互（选中、交换）
- 重新开始功能
- 移动端视口适配
- 弹窗组件显示
