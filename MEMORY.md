# 项目记忆

## 用户偏好

- **语言**： brainstorming 和设计文档使用中文（中文提问、中文回复）
- **开发方式**：Subagent-Driven Development（子代理驱动开发）
- **TDD**：严格执行测试先行

## 项目概况

StarCraft RTS 网页游戏，TypeScript + ECS 架构，6阶段路线图：
- Phase 1-6 已完成（含网络同步、录像回放）
- Phase A（ArmyGroup + Group Attack）已完成

## 当前工作

- Phase B：Economic Management — 设计阶段
  - EconomicSystem：supply 检查 + 生产建筑 + 单位训练
  - 种族配置：Zerg（Overlord/Hatchery/蜂群节奏）/ Protoss（Pylon/Nexus/狂热者/龙骑）
  - 训练策略：Phase 1 仅工人，Phase 2 固定比例填充生产线
  - Supply buffer = 4，20% 预算保留给工人
