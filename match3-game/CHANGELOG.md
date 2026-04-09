# Changelog

All notable changes to 开心消消乐 (match3-game) will be documented here.

## [1.2.0] - 2026-04-09

### Added
- **梦幻星空糖果（Cosmic Candy）UI 风格**: 全面视觉升级
  - App.css: 深空星空背景（5层径向渐变 + ~100颗闪烁/漂移星星 + 2个漂浮光球）+ Fredoka One 字体
  - Header.css: 毛玻璃卡片（backdrop-blur + 微光边框）+ 各统计项糖果色发光
  - GameBoard.css: 深色玻璃棋盘 + 玻璃质感方块（顶部高光弧形）+ emoji 白色辉光
  - Modal.css: 深空黑 overlay + 淡紫光晕 + overshoot 弹跳动画
  - WinModal.css: 彩虹渐变星星（旋转弹入）+ 半透明文字
  - LoseModal.css: 薰衣草紫标题 + 温暖粉橙信息

### Changed
- **方块配色统一**: 每种动物专属糖果色，背景渐变 + 外发光与 emoji 原色配套
  - 🐱 Cat: 暖桃粉 `#FF8FAB` + 粉 glow
  - 🐶 Dog: 琥珀金 `#FFAA47` + 金 glow
  - 🐰 Rabbit: 樱花粉 `#FF7EB3` + 粉 glow
  - 🐼 Panda: 薰衣草紫 `#C4B5FD` + 紫 glow
  - 🦊 Fox: 蜜橙金 `#FF9F45` + 橙 glow
- 爆炸动画优化: 亮度提升至 3x，全白/金色光晕，视觉更炸裂
- `TILE_COLORS` 从单色字符串升级为 `{ primary, glow }` 结构化配置

## [1.1.0] - 2026-04-09

### Added
- **动画系统**: Framer Motion 驱动的流畅游戏动画
  - 下落动画: 精确 1 秒 easeOut，基于 `visualRow` → `row` 补间
  - 爆炸动画: 250ms CSS `@keyframes`，含亮度闪烁、多层 box-shadow 光晕、旋转
  - 选中动画: spring 弹跳放大 1.15x
  - 级联动画: 循环匹配→爆炸→下落，每轮间隔 50ms
- **两阶段匹配处理**: `processMatchesInStages` 先标记 `isMatching` 触发动画，300ms 后执行实际消除
- **稳定 Tile 追踪**: `stableId` 作为 Framer Motion key，保证 tile 移动后不丢失 DOM 节点

### Changed
- 移除"重新开始"按钮（保留在弹窗中）
- 页面标题: "消消乐" → "开心消消乐"
- Header 数字间距调整（padding: 0 12px, gap: 6px）
- 爆炸效果迭代优化（从简单缩放到多帧亮度+光晕）

## [1.0.0] - 2026-04-09

### Added
- **核心游戏功能**: 完整的三消游戏逻辑
  - 点击选中/取消选中方块
  - 相邻方块交换
  - 横向/纵向三消检测
  - 方块消除 + 分数计算
  - 级联消除（连续消除）
  - 方块下落填充
- **关卡模式**: 目标分数 + 步数限制
- **UI 组件**: Header、GameBoard、WinModal / LoseModal
- **可爱动物 emoji**: 🐱🐶🐰🐼🦊
- **E2E 测试**: 7 个 Playwright 测试用例
- **单元测试**: 9 个 Vitest 测试用例

### Fixed
- 页面卡死（无限循环）
- Null 引用错误

### Technical
- React 18 + Vite + TypeScript + Framer Motion
- Vitest (单元测试) + Playwright (E2E)
