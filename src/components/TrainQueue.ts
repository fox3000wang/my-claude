import { Component } from '../core/ecs/Component';

export class TrainQueue extends Component {
  constructor(
    public queue: string[] = [],
    public currentProgress: number = 0,
    public trainingTime: number = 2,
  ) {
    super('TrainQueue');
  }

  enqueue(unitType: string): void {
    this.queue.push(unitType);
  }

  dequeue(): string | null {
    return this.queue.shift() ?? null;
  }

  tick(delta: number): void {
    if (this.queue.length === 0) return;
    this.currentProgress += delta / this.trainingTime;
    if (this.currentProgress >= 1) {
      this.currentProgress = 0;
      this.queue.shift();
    }
  }

  isEmpty(): boolean {
    return this.queue.length === 0;
  }
}
