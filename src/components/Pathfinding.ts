import { Component } from '../core/ecs/Component';

export class Pathfinding extends Component {
  public path: { x: number; y: number; z: number }[] = [];
  public currentIndex = 0;
  public isActive = false;

  constructor() {
    super('Pathfinding');
  }

  setPath(path: { x: number; y: number; z: number }[]): void {
    this.path = path;
    this.currentIndex = 0;
    this.isActive = path.length > 0;
  }

  clear(): void {
    this.path = [];
    this.currentIndex = 0;
    this.isActive = false;
  }

  currentWaypoint(): { x: number; y: number; z: number } | null {
    if (this.currentIndex < this.path.length) {
      return this.path[this.currentIndex];
    }
    return null;
  }

  advance(): void {
    this.currentIndex++;
    if (this.currentIndex >= this.path.length) {
      this.clear();
    }
  }
}
