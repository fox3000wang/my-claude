# 开心消消乐 — CLAUDE.md

## 项目概述

开心消消乐是一款移动端 H5 消除类游戏，使用 React + TypeScript + Vite 开发。

- **分支**: `feature/match3-game`
- **运行**: `cd match3-game && pnpm dev`
- **测试**: `cd match3-game && pnpm test`
- **E2E**: `cd match3-game && npx playwright test`

## 技术栈

- React 18 + TypeScript + Vite
- Framer Motion（动画）
- Vitest（单元测试）+ Playwright（E2E）
- Emoji 渲染（🐱🐶🐰🐼🦊）

## 核心模块

| 文件 | 职责 |
|------|------|
| `src/types/game.ts` | Tile、TileType、Position、GameState 类型定义 |
| `src/constants/gameConfig.ts` | 棋盘大小、方块大小、间距、emoji 映射 |
| `src/utils/boardUtils.ts` | 棋盘工具：生成、匹配检测、交换、消除、下落 |
| `src/hooks/useGameLogic.ts` | 核心游戏逻辑 hook（两阶段匹配处理） |
| `src/components/Game/GameBoard.tsx` | React + Framer Motion 棋盘渲染 |
| `src/components/Game/GameBoard.css` | CSS 动画（选中态、爆炸效果） |

## Tile 数据结构

```typescript
interface Tile {
  type: TileType;
  row: number;       // 逻辑行（用于碰撞检测）
  col: number;       // 逻辑列
  isSelected: boolean;
  isMatching: boolean; // 匹配中（触发表格爆炸动画）
  visualRow: number;   // 视觉行（下落动画时滞后于 row）
  stableId: number;    // 稳定 ID（贯穿 tile 生命周期，用于 Framer Motion key）
}
```

## 动画系统

### 原理
- `stableId` 作为 Framer Motion `key`，保证 tile 移动后 React 能追踪同一 DOM 节点
- `visualRow` 初始等于 `row`；下落时 `row` 先更新，`visualRow` 保持旧值，Framer Motion 从旧 visualRow 动画到新 row
- 消除时 `isMatching: true` 触发表格 `.matching` CSS 类（爆炸动画）

### 动画时长
- **消除爆炸**: 250ms CSS `@keyframes explode`
- **下落**: 1 秒 easeOut（`top` 从 `visualRow` 动画到 `row`）
- **选中**: spring（stiffness: 500, damping: 25）
- **新生成**: scale 0→1 配合 spring

### 两阶段匹配处理（useGameLogic.ts）
```
1. findMatches 找匹配
2. 标记 isMatching: true（触发表格爆炸动画）
3. 等待 300ms（爆炸动画时长）
4. removeMatches + dropTiles
5. 递归处理级联匹配（间隔 50ms）
```

## 关键设计决策

### TileType 使用动物 emoji
```typescript
export type TileType = 'cat' | 'dog' | 'rabbit' | 'panda' | 'fox';
export const TILE_EMOJIS: Record<TileType, string> = {
  cat: '🐱', dog: '🐶', rabbit: '🐰', panda: '🐼', fox: '🦊',
};
```

### 防御性空值检查（关键）
`boardUtils.ts` 中的所有数组访问必须使用可选链 `?.`，因为消除后棋盘格可能为 null。

## Bug 历史

- **无限循环导致页面卡死**: `dropTiles` 前未调用 `removeMatches`。**修复**: 添加两阶段处理。
- **Null 引用错误**: `board[row]?.[col]` 可能为 undefined。**修复**: 全局使用可选链 `?.`。

## 代码规范

- 遵循 `rules/common/coding-style.md` — 不可变性优先
- 遵循 `rules/web/` — 移动端优先，emoji 替代图片
- 文件组织按功能模块，非按类型
