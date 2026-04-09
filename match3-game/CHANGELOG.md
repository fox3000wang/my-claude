# Changelog

All notable changes to 开心消消乐 (match3-game) will be documented here.

## [1.0.0] - 2026-04-09

### Added
- **核心游戏功能**: 完整的三消游戏逻辑
  - 点击选中/取消选中方块
  - 相邻方块交换
  - 横向/纵向三消检测
  - 方块消除动画 + 分数计算
  - 级联消除（连续消除）
  - 方块下落填充
- **关卡模式**: 目标分数 + 步数限制
- **UI 组件**:
  - Header: 显示关卡、目标分数、当前得分、剩余步数
  - GameBoard: 8x8 棋盘，CSS 绝对定位方块
  - WinModal / LoseModal: 通关/失败弹窗
  - 重新开始按钮
- **可爱动物 emoji**: 🐱🐶🐰🐼🦊 替代彩色圆球
- **E2E 测试**: 7 个 Playwright 测试用例，全部通过
- **单元测试**: 9 个 Vitest 测试用例（boardUtils），全部通过

### Fixed
- 页面卡死（无限循环）: `processMatches` 中 `dropTiles` 前添加 `removeMatches` 调用
- Null 引用错误: `boardUtils.ts` 全局添加可选链 `?.` 防御性检查

### Changed
- 标题: "消消乐" → "开心消消乐"
- Header 数字间距调整（padding: 0 12px, gap: 6px）
- 初始棋盘生成时避免出现可消除的组合

### Technical
- React 18 + Vite + TypeScript
- Vitest (单元测试) + Playwright (E2E)
- 使用子代理驱动开发（subagent-driven development）流程完成 9 个任务
