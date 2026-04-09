import type { World } from './World';

export abstract class System {
  abstract readonly name: string;
  protected world?: World;

  setWorld(world: World): void {
    this.world = world;
  }

  // 每帧调用，delta 为自上一帧以来的时间（秒）
  abstract update(delta: number): void;
}
