import * as THREE from 'three';

export class OrbitCameraController {
  private camera: THREE.PerspectiveCamera;
  private domElement: HTMLElement;
  private target = new THREE.Vector3(0, 0, 0);
  private spherical = new THREE.Spherical(50, Math.PI / 4, 0);

  private rotateSpeed = 0.005;
  private zoomSpeed = 1.2;
  private minDistance = 10;
  private maxDistance = 200;
  private minPolarAngle = 0.1;
  private maxPolarAngle = Math.PI / 2 - 0.1;

  private isDragging = false;
  private prevMouse = { x: 0, y: 0 };
  private onChange?: () => void;

  constructor(camera: THREE.PerspectiveCamera, domElement: HTMLElement, onChange?: () => void) {
    this.camera = camera;
    this.domElement = domElement;
    this.onChange = onChange;
    this.bindEvents();
    this.updateCamera();
  }

  private bindEvents(): void {
    this.domElement.addEventListener('mousedown', this.onMouseDown);
    this.domElement.addEventListener('mousemove', this.onMouseMove);
    this.domElement.addEventListener('mouseup', this.onMouseUp);
    this.domElement.addEventListener('mouseleave', this.onMouseUp);
    this.domElement.addEventListener('wheel', this.onWheel, { passive: false });
    this.domElement.addEventListener('contextmenu', e => e.preventDefault());
    this.domElement.addEventListener('touchstart', this.onTouchStart);
    this.domElement.addEventListener('touchmove', this.onTouchMove);
    this.domElement.addEventListener('touchend', this.onTouchEnd);
  }

  private onMouseDown = (e: MouseEvent): void => {
    if (e.button !== 0 && e.button !== 2) return;
    this.isDragging = true;
    this.prevMouse = { x: e.clientX, y: e.clientY };
  };

  private onMouseMove = (e: MouseEvent): void => {
    if (!this.isDragging) return;
    const dx = e.clientX - this.prevMouse.x;
    const dy = e.clientY - this.prevMouse.y;
    if (e.button === 2 || e.buttons === 2) {
      this.spherical.theta -= dx * this.rotateSpeed;
      this.spherical.phi += dy * this.rotateSpeed;
      this.spherical.phi = THREE.MathUtils.clamp(
        this.spherical.phi,
        this.minPolarAngle,
        this.maxPolarAngle,
      );
    } else {
      const right = new THREE.Vector3().setFromMatrixColumn(this.camera.matrix, 0);
      const up = new THREE.Vector3().setFromMatrixColumn(this.camera.matrix, 2);
      right.multiplyScalar(-dx * 0.1);
      up.multiplyScalar(dy * 0.1);
      this.target.add(right).add(up);
    }
    this.prevMouse = { x: e.clientX, y: e.clientY };
    this.updateCamera();
  };

  private onMouseUp = (): void => {
    this.isDragging = false;
  };

  private onWheel = (e: WheelEvent): void => {
    e.preventDefault();
    this.spherical.radius *= e.deltaY > 0 ? this.zoomSpeed : 1 / this.zoomSpeed;
    this.spherical.radius = THREE.MathUtils.clamp(
      this.spherical.radius,
      this.minDistance,
      this.maxDistance,
    );
    this.updateCamera();
  };

  private lastTouchDist = 0;

  private onTouchStart = (e: TouchEvent): void => {
    if (e.touches.length === 1) {
      this.isDragging = true;
      this.prevMouse = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    } else if (e.touches.length === 2) {
      this.lastTouchDist = Math.hypot(
        e.touches[1].clientX - e.touches[0].clientX,
        e.touches[1].clientY - e.touches[0].clientY,
      );
    }
  };

  private onTouchMove = (e: TouchEvent): void => {
    e.preventDefault();
    if (e.touches.length === 1 && this.isDragging) {
      const dx = e.touches[0].clientX - this.prevMouse.x;
      const dy = e.touches[0].clientY - this.prevMouse.y;
      this.spherical.theta -= dx * this.rotateSpeed;
      this.spherical.phi = THREE.MathUtils.clamp(
        this.spherical.phi + dy * this.rotateSpeed,
        this.minPolarAngle,
        this.maxPolarAngle,
      );
      this.prevMouse = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      this.updateCamera();
    } else if (e.touches.length === 2) {
      const dist = Math.hypot(
        e.touches[1].clientX - e.touches[0].clientX,
        e.touches[1].clientY - e.touches[0].clientY,
      );
      const delta = this.lastTouchDist / dist;
      this.spherical.radius = THREE.MathUtils.clamp(
        this.spherical.radius * delta,
        this.minDistance,
        this.maxDistance,
      );
      this.lastTouchDist = dist;
      this.updateCamera();
    }
  };

  private onTouchEnd = (): void => {
    this.isDragging = false;
  };

  private updateCamera(): void {
    const pos = new THREE.Vector3().setFromSpherical(this.spherical);
    this.camera.position.copy(pos.add(this.target));
    this.camera.lookAt(this.target);
    this.onChange?.();
  }

  getTarget(): THREE.Vector3 {
    return this.target.clone();
  }

  setTarget(x: number, y: number, z: number): void {
    this.target.set(x, y, z);
    this.updateCamera();
  }

  dispose(): void {
    this.domElement.removeEventListener('mousedown', this.onMouseDown);
    this.domElement.removeEventListener('mousemove', this.onMouseMove);
    this.domElement.removeEventListener('mouseup', this.onMouseUp);
    this.domElement.removeEventListener('mouseleave', this.onMouseUp);
    this.domElement.removeEventListener('wheel', this.onWheel);
    this.domElement.removeEventListener('touchstart', this.onTouchStart);
    this.domElement.removeEventListener('touchmove', this.onTouchMove);
    this.domElement.removeEventListener('touchend', this.onTouchEnd);
  }
}
