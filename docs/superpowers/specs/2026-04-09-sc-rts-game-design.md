# 星际争霸网页版 - 技术设计规格

**版本:** v0.1.0 Draft
**日期:** 2026-04-09
**状态:** 已批准，待实施

---

## 1. 愿景与目标

用现代 Web 技术（Three.js + React + Vite）在浏览器中复刻星际争霸的核心体验：

- 三个种族的完整单位/科技/战役内容
- 帧同步多人对战与观战系统
- 可扩展的地图编辑和 Mod 支持

**Alpha 目标：** 验证人族 RTS 核心循环（资源采集 → 出兵 → 战斗）是否有趣，跑通 ECS 架构和帧同步接口。

---

## 2. 技术栈

| 层级 | 技术选型 | 说明 |
|------|---------|------|
| 渲染引擎 | Three.js | WebGL 3D 渲染 |
| 前端框架 | React 18 + Vite | UI 组件和构建工具 |
| 语言 | TypeScript (strict) | 类型安全 |
| 游戏架构 | ECS (Entity-Component-System) | 实体-组件-系统模式 |
| 状态同步 | 帧同步 (Turn-based frame sync) | 客户端模拟，指令序列化 |
| 网络（预留） | WebSocket | 帧同步服务器接口预留 |

---

## 3. 架构分层

```
┌──────────────────────────────────────┐
│  UI 层 (React)                       │
│  HUD · 小地图 · 建筑面板 · 资源显示   │
├──────────────────────────────────────┤
│  渲染层 (Three.js)                   │
│  场景管理 · 相机控制 · 粒子特效       │
├──────────────────────────────────────┤
│  核心层 (TypeScript / ECS)           │
│  单位系统 · 资源系统 · 碰撞 · 寻路    │
│  战斗系统 · 帧同步 · 输入处理         │
├──────────────────────────────────────┤
│  适配层                             │
│  输入适配器 · 音频适配器 · 存档适配器  │
│  网络同步接口（Alpha 为空实现）        │
└──────────────────────────────────────┘
```

### 3.1 ECS 设计

**实体 (Entity)** — 仅有 ID，无逻辑
**组件 (Component)** —纯数据：Position, Renderable, Unit, Building, ResourceCarrier, Health, etc.
**系统 (System)** — 纯逻辑：MovementSystem, CombatSystem, ResourceSystem, BuildSystem, etc.

```
src/
├── core/                   # ECS 核心（Entity, Component, System, World）
├── components/             # 所有游戏组件
├── systems/                # 所有游戏系统
├── renderer/               # Three.js 渲染层
├── ui/                     # React UI 组件
├── adapters/               # 输入、音频、存档、网络接口
├── data/                   # 单位/建筑/科技配置数据（JSON）
└── scenes/                 # 游戏场景、地图加载
```

---

## 4. Alpha MVP 范围 — 人族核心

### 4.1 单位

| 单位 | 组件 | 描述 |
|------|------|------|
| SCV | ResourceCarrier, Builder | 采集矿物，建造建筑，维修 |
| Marine | Combat, Health | 基础步兵，轻型单位 |
| Firebat | Combat, Health, ShortRange | 近战火焰兵，高伤害 |
| Tank | Combat, Health, SiegeMode | 攻城坦克，两种形态 |

### 4.2 建筑

| 建筑 | 功能 | 解锁 |
|------|------|------|
| Command Center | 主基地，SCV 生产 | 初始 |
| Supply Depot | 人口上限 +8 | 初始 |
| Barracks | 地面单位生产 | 初始 |
| Engineering Bay | 升级攻防 | Barracks 后 |

### 4.3 资源系统

- **矿物 (Minerals):** 地图上晶矿点，SCV 采集 → 携带(8) → 返回基地闭环
- **油气 (Vespene Gas):** 后续阶段加入
- **人口上限 (Supply):** 初始10，每 SCV +1，每个 Supply Depot +8

### 4.4 战斗系统

- 攻击 / 护甲 / 射程 / 移速数值化
- 单位聚集仇恨逻辑（被攻击后反击）
- 建筑攻击（基地/Tower）
- 人口上限约束

### 4.5 帧同步接口（预留）

```typescript
// 每帧指令结构
interface FrameCommand {
  frame: number;
  playerId: number;
  actions: Action[];
}

interface Action {
  type: 'move' | 'attack' | 'build' | 'train' | 'harvest' | 'stop';
  entityId: number;
  target?: Vec3;
  queued?: boolean;
}
```

Alpha 为空实现，后续接入 WebSocket 服务器。

---

## 5. 开发阶段规划

| 阶段 | 内容 | 目标 |
|------|------|------|
| **Phase 1** | 项目搭建、ECS 架构、Three.js 场景 | 渲染出地图和相机 |
| **Phase 2** | 人族单位/建筑/资源采集闭环 | 能完整进行一局 PVE |
| **Phase 3** | 战斗系统、寻路、AI 简单敌人 | 有挑战性的对战体验 |
| **Phase 4** | 虫族 Zerg | 阶段二内容 |
| **Phase 5** | 神族 Protoss | 阶段三内容 |
| **Phase 6** | 网络同步后端、观战、回放 | 多人 PvP |

---

## 6. 质量标准

- **测试覆盖率:** 核心逻辑 (systems) 80%+
- **TypeScript:** strict 模式，无 any
- **ECS:** 组件无逻辑，系统无状态
- **帧同步:** 相同输入 → 相同结果（确定性）

---

## 7. 参考项目

- [StarCraft II Web (sc2ai.net)](https://sc2ai.net/) — SC2 AI 接口
- [Prime.Engine](https://github.com/holywyvern/prime-engine) — TypeScript ECS RTS 框架
- [Cocos Creator](https://www.cocos.com/) — 游戏引擎参考
- [Three.js RTS 示例](https://threejs.org/examples/) — 渲染参考
