import { Component } from '../core/ecs/Component';

export class Renderable extends Component {
  // 关联的 Three.js Mesh 或 Group 的引用
  public object3d: unknown = null;

  constructor(
    public meshType: string, // e.g. 'unit_marine', 'building_command_center'
    public scale: number = 1,
  ) {
    super('Renderable');
  }
}
