import * as THREE from 'three';

export interface MouseState {
  x: number;
  y: number;
  worldX: number;
  worldY: number;
  worldZ: number;
  isDown: boolean;
  button: number;
  dragStart: { x: number; y: number } | null;
}

export interface InputManager {
  getMouseState(): MouseState;
  getSelectionBox(): { x1: number; y1: number; x2: number; y2: number } | null;
  onMouseDown(callback: (state: MouseState) => void): void;
  onMouseUp(callback: (state: MouseState) => void): void;
  onMouseMove(callback: (state: MouseState) => void): void;
  onKeyDown(callback: (key: string) => void): void;
  dispose(): void;
}

export class DOMInputManager implements InputManager {
  private canvas: HTMLElement;
  private camera: THREE.PerspectiveCamera;
  private raycaster = new THREE.Raycaster();
  private groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  private mouse = new THREE.Vector2();

  private _mouseState: MouseState = {
    x: 0, y: 0,
    worldX: 0, worldY: 0, worldZ: 0,
    isDown: false, button: 0,
    dragStart: null,
  };

  private selectionBox: { x1: number; y1: number; x2: number; y2: number } | null = null;
  private downCallbacks: ((state: MouseState) => void)[] = [];
  private upCallbacks: ((state: MouseState) => void)[] = [];
  private moveCallbacks: ((state: MouseState) => void)[] = [];
  private keyCallbacks: ((key: string) => void)[] = [];

  constructor(canvas: HTMLElement, camera: THREE.PerspectiveCamera) {
    this.canvas = canvas;
    this.camera = camera;
    this.canvas.addEventListener('mousedown', this._handleMouseDown);
    this.canvas.addEventListener('mouseup', this._handleMouseUp);
    this.canvas.addEventListener('mousemove', this._handleMouseMove);
    window.addEventListener('keydown', this._handleKeyDown);
  }

  private screenToWorld(clientX: number, clientY: number): { x: number; y: number; z: number } {
    const rect = this.canvas.getBoundingClientRect();
    this.mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersection = new THREE.Vector3();
    this.raycaster.ray.intersectPlane(this.groundPlane, intersection);
    return { x: intersection.x, y: intersection.y, z: intersection.z };
  }

  private _handleMouseDown = (e: MouseEvent): void => {
    e.preventDefault();
    const world = this.screenToWorld(e.clientX, e.clientY);
    this._mouseState = {
      x: e.clientX, y: e.clientY,
      worldX: world.x, worldY: world.y, worldZ: world.z,
      isDown: true, button: e.button,
      dragStart: { x: e.clientX, y: e.clientY },
    };
    this.downCallbacks.forEach(cb => cb(this._mouseState));
  };

  private _handleMouseMove = (e: MouseEvent): void => {
    const world = this.screenToWorld(e.clientX, e.clientY);
    const dragStart = this._mouseState.isDown ? this._mouseState.dragStart : null;

    this._mouseState = {
      x: e.clientX, y: e.clientY,
      worldX: world.x, worldY: world.y, worldZ: world.z,
      isDown: this._mouseState.isDown,
      button: this._mouseState.button,
      dragStart,
    };

    if (dragStart) {
      this.selectionBox = {
        x1: Math.min(dragStart.x, e.clientX),
        y1: Math.min(dragStart.y, e.clientY),
        x2: Math.max(dragStart.x, e.clientX),
        y2: Math.max(dragStart.y, e.clientY),
      };
    }

    this.moveCallbacks.forEach(cb => cb(this._mouseState));
  };

  private _handleMouseUp = (e: MouseEvent): void => {
    const world = this.screenToWorld(e.clientX, e.clientY);
    this._mouseState = {
      x: e.clientX, y: e.clientY,
      worldX: world.x, worldY: world.y, worldZ: world.z,
      isDown: false, button: e.button,
      dragStart: this._mouseState.dragStart,
    };
    this.selectionBox = null;
    this.upCallbacks.forEach(cb => cb(this._mouseState));
  };

  private _handleKeyDown = (e: KeyboardEvent): void => {
    this.keyCallbacks.forEach(cb => cb(e.key));
  };

  getMouseState(): MouseState {
    return { ...this._mouseState };
  }

  getSelectionBox(): { x1: number; y1: number; x2: number; y2: number } | null {
    return this.selectionBox;
  }

  onMouseDown(callback: (state: MouseState) => void): void {
    this.downCallbacks.push(callback);
  }

  onMouseUp(callback: (state: MouseState) => void): void {
    this.upCallbacks.push(callback);
  }

  onMouseMove(callback: (state: MouseState) => void): void {
    this.moveCallbacks.push(callback);
  }

  onKeyDown(callback: (key: string) => void): void {
    this.keyCallbacks.push(callback);
  }

  dispose(): void {
    this.canvas.removeEventListener('mousedown', this._handleMouseDown);
    this.canvas.removeEventListener('mouseup', this._handleMouseUp);
    this.canvas.removeEventListener('mousemove', this._handleMouseMove);
    window.removeEventListener('keydown', this._handleKeyDown);
  }
}
