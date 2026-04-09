# 开心消消乐

一款移动端 H5 三消游戏，使用 React + TypeScript + Vite 开发。

## 游戏规则

- 点击选中一个动物方块，再点击相邻方块进行交换
- 横向或纵向 3 个及以上相同动物连成一线即可消除
- 消除后上方方块下落，新方块从顶部填充
- 连续消除（级联）可以获得更高分数
- 在限定步数内达到目标分数即可过关

## 开始游戏

```bash
cd match3-game
pnpm install
pnpm dev
```

访问 http://localhost:5173

## 开发命令

```bash
pnpm dev          # 启动开发服务器
pnpm build        # 构建生产版本
pnpm preview      # 预览生产版本
pnpm test         # 运行 Vitest 单元测试
npx playwright test  # 运行 E2E 测试
```

## 项目结构

```
src/
├── types/game.ts          # 类型定义
├── constants/gameConfig.ts # 游戏配置（棋盘大小、emoji 映射等）
├── utils/boardUtils.ts    # 棋盘工具函数
├── hooks/useGameLogic.ts   # 核心游戏逻辑
└── components/
    ├── Game/GameBoard.tsx  # 棋盘组件
    ├── UI/Header.tsx       # 顶部信息栏
    └── Modal/              # 通关/失败弹窗
```

## 技术栈

- React 18
- TypeScript
- Vite
- Vitest（单元测试）
- Playwright（E2E 测试）
