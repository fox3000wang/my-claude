import type { Component } from './Component';

export class Entity {
  readonly id: number;
  private components = new Map<string, Component>();

  constructor(id: number) {
    this.id = id;
  }

  addComponent(component: Component): this {
    this.components.set(component.name, component);
    return this;
  }

  getComponent<T extends Component>(name: string): T | undefined {
    return this.components.get(name) as T | undefined;
  }

  hasComponent(name: string): boolean {
    return this.components.has(name);
  }

  removeComponent(name: string): void {
    this.components.delete(name);
  }

  getComponentTypes(): string[] {
    return Array.from(this.components.keys());
  }
}
