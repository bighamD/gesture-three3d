import * as THREE from 'three';
import { NumberGenerator } from './NumberGenerator';

export class ParticleSystem {
  private scene: THREE.Scene;
  private generator: NumberGenerator;
  private geometry: THREE.BufferGeometry;
  private material: THREE.ShaderMaterial;
  private points: THREE.Points;
  private morphTargets: Map<string, Float32Array> = new Map();
  private digitColors: Map<string, THREE.Color> = new Map([
    ['5', new THREE.Color(0xFFFFFF)], // White
    ['4', new THREE.Color(0xFFAA00)], // Orange
    ['3', new THREE.Color(0xFF0000)], // Red
    ['2', new THREE.Color(0xAA00FF)], // Purple
    ['1', new THREE.Color(0x00AAFF)]  // Blue
  ]);
  private currentDigit: string = '5';
  private targetDigit: string = '5';
  private morphProgress: number = 0;
  private morphDuration: number = 1500; // ms
  private morphStartTime: number = 0;
  private isMorphing: boolean = false;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.generator = new NumberGenerator();

    // Generate all digit shapes
    this.generateAllShapes();

    // Create geometry with initial shape
    const positions = this.morphTargets.get('5')!;
    this.geometry = new THREE.BufferGeometry();
    this.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    // Add morph targets
    ['4', '3', '2', '1'].forEach(digit => {
      const targetPositions = this.morphTargets.get(digit)!;
      this.geometry.morphAttributes.position = this.geometry.morphAttributes.position || [];
      this.geometry.morphAttributes.position.push(new THREE.BufferAttribute(targetPositions, 3));
    });

    // Create points material (using standard material first)
    this.material = new THREE.PointsMaterial({
      color: 0xFFFFFF,
      size: 2.0,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true
    });

    // Create points mesh
    this.points = new THREE.Points(this.geometry, this.material);
    this.scene.add(this.points);
  }

  private generateAllShapes(): void {
    const digits = ['5', '4', '3', '2', '1'];
    digits.forEach(digit => {
      const positions = this.generator.generateDigit(digit, 10000);
      this.morphTargets.set(digit, positions);
    });
  }

  morphTo(targetDigit: string, duration: number = 1500): void {
    if (this.isMorphing) return;

    this.targetDigit = targetDigit;
    this.morphDuration = duration;
    this.morphStartTime = performance.now();
    this.isMorphing = true;
    this.morphProgress = 0;

    console.log(`Morphing from ${this.currentDigit} to ${targetDigit}`);

    // Update geometry to target digit immediately (simplified version)
    const targetPositions = this.morphTargets.get(targetDigit)!;
    const positionAttr = this.geometry.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < targetPositions.length; i++) {
      positionAttr.array[i] = targetPositions[i];
    }
    positionAttr.needsUpdate = true;

    // Complete morphing immediately (for now, without animation)
    this.isMorphing = false;
    this.currentDigit = targetDigit;
    this.morphProgress = 0;

    // Update material color
    this.material.color.setHex(parseInt(this.digitColors.get(targetDigit)!.getHexString(), 16));
  }

  update(_deltaTime: number): void {
    // Animation handled by morphTo for now
    // Can add smooth transitions later
  }

  getCurrentDigit(): string {
    return this.currentDigit;
  }
}
