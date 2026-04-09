// 组件基类，所有游戏组件需继承此类
export abstract class Component {
  readonly name: string;

  protected constructor(name: string) {
    this.name = name;
  }
}

// 组件注册表，用于类型安全查询
export class ComponentRegistry {
  private static map = new Map<string, new () => Component>();

  static register<T extends Component>(name: string, ctor: new () => T): void {
    this.map.set(name, ctor);
  }

  static get(name: string): (new () => Component) | undefined {
    return this.map.get(name);
  }
}
