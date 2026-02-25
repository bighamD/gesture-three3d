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
          vec2 center = gl_PointCoord - vec2(0.5);
          float dist = length(center);

          // Soft circular gradient
          float alpha = 1.0 - smoothstep(0.0, 0.5, dist);

          // Add glow effect
          float glow = exp(-dist * 3.0) * 0.5;
          alpha += glow;

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

    // Update geometry
    const currentPositions = this.morphTargets.get(this.currentDigit)!;
    const positionAttr = this.geometry.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < currentPositions.length; i++) {
      positionAttr.array[i] = currentPositions[i];
    }
    positionAttr.needsUpdate = true;

    // Start color transition (will be handled in update)
  }

  update(_deltaTime: number): void {
    if (this.isMorphing) {
      const elapsed = performance.now() - this.morphStartTime;
      this.morphProgress = Math.min(elapsed / this.morphDuration, 1.0);

      // Ease-out cubic
      const eased = 1 - Math.pow(1 - this.morphProgress, 3);
      this.material.uniforms.morphProgress.value = eased;

      // Interpolate color
      const startColor = this.digitColors.get(this.currentDigit)!;
      const endColor = this.digitColors.get(this.targetDigit)!;
      const currentColor = startColor.clone().lerp(endColor, eased);
      this.material.uniforms.color.value = currentColor;

      if (this.morphProgress >= 1.0) {
        this.isMorphing = false;
        this.currentDigit = this.targetDigit;
        this.morphProgress = 0;
        this.material.uniforms.morphProgress.value = 0;
        this.material.uniforms.color.value = this.digitColors.get(this.targetDigit);
      }
    }
  }

  getCurrentDigit(): string {
    return this.currentDigit;
  }
}
