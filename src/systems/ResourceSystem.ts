import { System } from '../core/ecs/System';
import { Position } from '../components/Position';
import { ResourceCarrier } from '../components/ResourceCarrier';
import { MineralDeposit } from '../components/MineralDeposit';
import { PlayerResources } from '../components/PlayerResources';
import { Building } from '../components/Building';

export class ResourceSystem extends System {
  readonly name = 'ResourceSystem';
  private playerResources: PlayerResources | null = null;

  setPlayerResources(resources: PlayerResources): void {
    this.playerResources = resources;
  }

  update(_delta: number): void {
    if (!this.playerResources) return;

    const carriers = this.world!.getEntitiesWithComponents(
      'ResourceCarrier', 'Position', 'Unit',
    );

    for (const entity of carriers) {
      const carrier = entity.getComponent<ResourceCarrier>('ResourceCarrier')!;
      const pos = entity.getComponent<Position>('Position')!;

      // 满载 → 返回基地交付
      if (carrier.isFull()) {
        this.returnToBase(entity, carrier, pos);
        continue;
      }

      // 寻找矿物目标
      if (carrier.mineralTargetId === null) {
        const nearest = this.findNearestMineral(pos);
        if (nearest) carrier.mineralTargetId = nearest.id;
        continue;
      }

      // 走向矿物点
      const mineral = this.world!.getEntity(carrier.mineralTargetId);
      if (!mineral?.hasComponent('MineralDeposit')) {
        carrier.mineralTargetId = null;
        continue;
      }

      const mineralPos = mineral.getComponent<MineralDeposit>('MineralDeposit')!
        ? (mineral.getComponent<MineralDeposit>('MineralDeposit')!)
        : null;
      if (!mineralPos) { carrier.mineralTargetId = null; continue; }

      const mpos = mineral.getComponent<Position>('Position')!;
      const dist = Math.hypot(mpos.x - pos.x, mpos.z - pos.z);

      if (dist < 2) {
        // 采集
        const mineralData = mineral.getComponent<MineralDeposit>('MineralDeposit')!;
        const harvestAmt = Math.min(5 * 0.016, mineralData.amount, carrier.capacity - carrier.carrying);
        carrier.harvest(harvestAmt);
        mineralData.amount -= harvestAmt;
        if (mineralData.amount <= 0) {
          this.world!.removeEntity(mineral.id);
          carrier.mineralTargetId = null;
        }
      }
    }
  }

  private returnToBase(
    entity: ReturnType<typeof this.world!.getEntity>,
    carrier: ResourceCarrier,
    pos: ReturnType<typeof this.world!.getEntitiesWithComponents>[0]['getComponent<Position>'],
  ): void {
    if (!entity || !pos) return;
    const bases = this.world!.getEntitiesWithComponents('Building', 'Position');
    let nearestBase: ReturnType<typeof this.world!.getEntity> | null = null;
    let minDist = Infinity;

    for (const b of bases) {
      const building = b.getComponent<Building>('Building')!;
      if (building.buildingType !== 'command_center' || building.isConstructing) continue;
      const bpos = b.getComponent<Position>('Position')!;
      const dist = Math.hypot(bpos.x - pos.x, bpos.z - pos.z);
      if (dist < minDist) { minDist = dist; nearestBase = b; }
    }

    if (nearestBase && minDist < 4) {
      const delivered = carrier.deposit();
      this.playerResources!.addMinerals(delivered);
      carrier.mineralTargetId = null;
    }
  }

  private findNearestMineral(
    pos: ReturnType<typeof this.world!.getEntitiesWithComponents>[0]['getComponent<Position>'],
  ): ReturnType<typeof this.world!.getEntity> | null {
    if (!pos) return null;
    const minerals = this.world!.getEntitiesWithComponents('MineralDeposit', 'Position');
    let nearest: ReturnType<typeof this.world!.getEntity> | null = null;
    let minDist = Infinity;
    for (const m of minerals) {
      const mpos = m.getComponent<Position>('Position')!;
      const dist = Math.hypot(mpos.x - pos.x, mpos.z - pos.z);
      if (dist < minDist) { minDist = dist; nearest = m; }
    }
    return nearest;
  }
}
