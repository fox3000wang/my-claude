import { Component } from '../core/ecs/Component';

export class Selected extends Component {
  constructor(
    public selected: boolean = false,
  ) {
    super('Selected');
  }

  select(): void {
    this.selected = true;
  }

  deselect(): void {
    this.selected = false;
  }
}
