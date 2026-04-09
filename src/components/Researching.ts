import { Component } from '../core/ecs/Component';

export class Researching extends Component {
  constructor(
    public techId: string,
    public progress: number = 0,
    public time: number = 60,
  ) {
    super('Researching');
  }

  tick(delta: number): boolean {
    this.progress += delta / this.time;
    return this.progress >= 1;
  }
}
