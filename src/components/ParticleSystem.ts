import * as THREE from 'three';
import { NumberGenerator } from './NumberGenerator';
import type { ParticleShape } from '../types/particle';

export class ParticleSystem {
  private scene: THREE.Scene;
  private generator: NumberGenerator;
  private geometry: THREE.BufferGeometry;
  private material: THREE.ShaderMaterial;
  private points: THREE.Points;
  private morphTargets: Map<string, Float32Array> = new Map();
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

    // Create shader material
    this.material = new THREE.ShaderMaterial({
      uniforms: {
        morphProgress: { value: 0.0 },
        color: { value: new THREE.Color(0xFFFFFF) },
        pointSize: { value: 4.0 }
      },
      vertexShader: `
        uniform float morphProgress;
        uniform float pointSize;

        void main() {
          vec3 pos = position;
          if (morphAttributes.position.length > 0) {
            pos = mix(position, morphAttributes.position[0], morphProgress);
          }
          gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
          gl_PointSize = pointSize;
        }
      `,
      fragmentShader: `
        uniform vec3 color;

        void main() {
          float r = distance(gl_PointCoord, vec2(0.5));
          if (r > 0.5) discard;
          float alpha = 1.0 - smoothstep(0.3, 0.5, r);
          gl_FragColor = vec4(color, alpha);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending
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

    // Update morph target index based on current and target
    const digitOrder = ['5', '4', '3', '2', '1'];
    const targetIndex = digitOrder.indexOf(targetDigit);

    // Update geometry to use current shape as base
    this.geometry.attributes.position.array = this.morphTargets.get(this.currentDigit)!;
    this.geometry.attributes.position.needsUpdate = true;

    // Set morph target
    if (targetIndex > 0 && this.geometry.morphAttributes.position) {
      // Morph targets are stored in order [4, 3, 2, 1]
      const morphIndex = targetIndex - 1;
    }
  }

  update(deltaTime: number): void {
    if (this.isMorphing) {
      const elapsed = performance.now() - this.morphStartTime;
      this.morphProgress = Math.min(elapsed / this.morphDuration, 1.0);

      // Ease-out cubic
      const eased = 1 - Math.pow(1 - this.morphProgress, 3);
      this.material.uniforms.morphProgress.value = eased;

      if (this.morphProgress >= 1.0) {
        this.isMorphing = false;
        this.currentDigit = this.targetDigit;
        this.morphProgress = 0;
        this.material.uniforms.morphProgress.value = 0;
      }
    }
  }

  getCurrentDigit(): string {
    return this.currentDigit;
  }
}
