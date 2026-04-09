# 开心消消乐 — CLAUDE.md

## 项目概述

开心消消乐是一款移动端 H5 消除类游戏，使用 React + TypeScript + Vite 开发。

- **分支**: `feature/match3-game`
- **运行**: `cd match3-game && pnpm dev`
- **测试**: `cd match3-game && pnpm test`
- **E2E**: `cd match3-game && npx playwright test`

## 技术栈

- React 18 + TypeScript + Vite
- Vitest (单元测试) + Playwright (E2E)
- Emoji 渲染（🐱🐶🐰🐼🦊）

## 核心模块

| 文件 | 职责 |
|------|------|
| `src/types/game.ts` | Tile、TileType、Position、GameState 类型定义 |
| `src/constants/gameConfig.ts` | 棋盘大小、方块大小、间距、emoji 映射 |
| `src/utils/boardUtils.ts` | 棋盘工具：生成、匹配检测、交换、消除、下落 |
| `src/hooks/useGameLogic.ts` | 核心游戏逻辑 hook |
| `src/components/Game/GameBoard.tsx` | React 棋盘渲染 |

## 关键设计决策

### TileType 使用动物 emoji
```typescript
export type TileType = 'cat' | 'dog' | 'rabbit' | 'panda' | 'fox';
export const TILE_EMOJIS: Record<TileType, string> = {
  cat: '🐱', dog: '🐶', rabbit: '🐰', panda: '🐼', fox: '🦊',
};
```

### 防御性空值检查（关键）
`boardUtils.ts` 中的所有数组访问必须使用可选链 `?.`，因为消除后棋盘格可能为 null。`dropTiles` 依赖 `removeMatches` 的结果是 null 格，必须在 `processMatches` 中先调用 `removeMatches` 再调用 `dropTiles`。

### 级联消除流程
```
processMatches:
  1. findMatches 找所有匹配
  2. removeMatches 标记匹配格为 null
  3. dropTiles 下落并填充新格
  4. 若有新匹配则递归重复
```

## Bug 历史

- **无限循环导致页面卡死**: `processMatches` 调用 `dropTiles` 但没有先调用 `removeMatches`，导致 `findMatches` 每次找到相同的匹配。**修复**: 在 `dropTiles` 前调用 `removeMatches`。
- **Null 引用错误**: `board[row]?.[col]` 中 `board[row]` 可能为 undefined。**修复**: 全局使用可选链 `?.` 防御性检查。

## 代码规范

- 遵循 `rules/common/coding-style.md` — 不可变性优先
- 遵循 `rules/web/` — 移动端优先，emoji 替代图片
- 文件组织按功能模块，非按类型
