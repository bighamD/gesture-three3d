import * as THREE from 'three';
import { NumberGenerator } from './NumberGenerator';

interface ParticleData {
  velocity: THREE.Vector3;    // 上升速度
  life: number;                // 生命周期 0-1
  decayRate: number;           // 衰减速度
  randomOffset: number;        // 随机偏移
}

export class ParticleNumberSystem {
  private scene: THREE.Scene;
  private numberGenerator: NumberGenerator;
  private particles: THREE.Points | null = null;
  private particleData: ParticleData[] = [];
  private readonly PARTICLE_COUNT = 12000;
  private readonly PARTICLE_SIZE = 0.08;
  private currentNumber: number | null = null;
  private isShowingNumber = false;

  // Animation
  private clock = new THREE.Clock();

  // Fire colors
  private colorYellow = new THREE.Color(0xffdd00);   // 黄色（中心）
  private colorOrange = new THREE.Color(0xff6600);   // 橙色
  private colorRed = new THREE.Color(0xff2200);      // 红色（边缘）

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.numberGenerator = new NumberGenerator();
    this.initParticles();
  }

  private initParticles(): void {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(this.PARTICLE_COUNT * 3);
    const colors = new Float32Array(this.PARTICLE_COUNT * 3);

    this.particleData = [];

    for (let i = 0; i < this.PARTICLE_COUNT; i++) {
      const i3 = i * 3;

      // 初始位置：随机分布
      positions[i3] = (Math.random() - 0.5) * 20;
      positions[i3 + 1] = (Math.random() - 0.5) * 20;
      positions[i3 + 2] = (Math.random() - 0.5) * 20;

      // 初始颜色：黄色
      colors[i3] = this.colorYellow.r;
      colors[i3 + 1] = this.colorYellow.g;
      colors[i3 + 2] = this.colorYellow.b;

      this.particleData.push({
        velocity: new THREE.Vector3(
          (Math.random() - 0.5) * 0.02,
          0.02 + Math.random() * 0.03, // 向上飘动
          (Math.random() - 0.5) * 0.02
        ),
        life: Math.random(), // 随机生命周期
        decayRate: 0.003 + Math.random() * 0.005,
        randomOffset: Math.random() * Math.PI * 2
      });
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: this.PARTICLE_SIZE,
      sizeAttenuation: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexColors: true,
      transparent: true,
      opacity: 0.9
    });

    this.particles = new THREE.Points(geometry, material);
    this.scene.add(this.particles);

    console.log(`Initialized ${this.PARTICLE_COUNT} fire particles`);
  }

  /**
   * 显示数字（手指伸出时调用）
   */
  showNumber(number: number): void {
    if (this.currentNumber === number && this.isShowingNumber) {
      return;
    }

    this.currentNumber = number;
    this.isShowingNumber = true;

    // 生成数字形状的点
    const points = this.numberGenerator.generateDigitPoints(number.toString());

    // 将粒子移动到数字位置
    const positions = this.particles!.geometry.attributes.position.array as Float32Array;

    for (let i = 0; i < this.PARTICLE_COUNT; i++) {
      const i3 = i * 3;

      if (i < points.length) {
        // 形成数字的粒子
        const point = points[i];
        positions[i3] = point.x + (Math.random() - 0.5) * 0.1;
        positions[i3 + 1] = point.y + (Math.random() - 0.5) * 0.1;
        positions[i3 + 2] = (Math.random() - 0.5) * 0.5;
      } else {
        // 多余粒子散布在周围
        const angle = Math.random() * Math.PI * 2;
        const radius = 5 + Math.random() * 8;
        positions[i3] = Math.cos(angle) * radius;
        positions[i3 + 1] = (Math.random() - 0.5) * 10;
        positions[i3 + 2] = Math.sin(angle) * radius;
      }
    }

    this.particles!.geometry.attributes.position.needsUpdate = true;

    console.log(`Showing number ${number} with ${points.length} particles`);
  }

  /**
   * 隐藏数字，恢复随机分布（无手指时调用）
   */
  hideNumber(): void {
    if (!this.isShowingNumber) {
      return;
    }

    this.isShowingNumber = false;
    this.currentNumber = null;

    // 粒子散开
    const positions = this.particles!.geometry.attributes.position.array as Float32Array;

    for (let i = 0; i < this.PARTICLE_COUNT; i++) {
      const i3 = i * 3;
      positions[i3] = (Math.random() - 0.5) * 20;
      positions[i3 + 1] = (Math.random() - 0.5) * 20;
      positions[i3 + 2] = (Math.random() - 0.5) * 20;
    }

    this.particles!.geometry.attributes.position.needsUpdate = true;

    console.log('Hiding number, particles dispersed');
  }

  update(_deltaTime: number): void {
    if (!this.particles) return;

    const time = this.clock.getElapsedTime();
    const positions = this.particles.geometry.attributes.position.array as Float32Array;
    const colors = this.particles.geometry.attributes.color.array as Float32Array;

    for (let i = 0; i < this.PARTICLE_COUNT; i++) {
      const i3 = i * 3;
      const data = this.particleData[i];

      // 更新生命周期
      data.life -= data.decayRate;

      // 重置死亡的粒子
      if (data.life <= 0) {
        data.life = 1;

        if (this.isShowingNumber && this.currentNumber !== null) {
          // 重新生成在数字位置
          const points = this.numberGenerator.generateDigitPoints(this.currentNumber.toString());
          const index = i % points.length;
          const point = points[index];

          positions[i3] = point.x + (Math.random() - 0.5) * 0.2;
          positions[i3 + 1] = point.y + (Math.random() - 0.5) * 0.2;
          positions[i3 + 2] = (Math.random() - 0.5) * 0.3;

          // 速度向上
          data.velocity.set(
            (Math.random() - 0.5) * 0.01,
            0.01 + Math.random() * 0.02,
            (Math.random() - 0.5) * 0.01
          );
        } else {
          // 重新生成在随机位置
          positions[i3] = (Math.random() - 0.5) * 20;
          positions[i3 + 1] = -8 + Math.random() * 2; // 从底部产生
          positions[i3 + 2] = (Math.random() - 0.5) * 20;

          // 速度向上
          data.velocity.set(
            (Math.random() - 0.5) * 0.02,
            0.02 + Math.random() * 0.03,
            (Math.random() - 0.5) * 0.02
          );
        }
      }

      // 应用速度
      positions[i3] += data.velocity.x;
      positions[i3 + 1] += data.velocity.y;
      positions[i3 + 2] += data.velocity.z;

      // 添加火焰闪烁效果
      const flicker = 0.7 + Math.sin(time * 10 + data.randomOffset) * 0.3;

      // 根据生命周期更新颜色（黄色→橙色→红色）
      let color: THREE.Color;
      if (data.life > 0.7) {
        // 黄色阶段
        color = this.colorYellow.clone();
      } else if (data.life > 0.4) {
        // 橙色阶段
        color = this.colorOrange.clone();
      } else {
        // 红色阶段
        color = this.colorRed.clone();
      }

      colors[i3] = color.r * flicker * data.life;
      colors[i3 + 1] = color.g * flicker * data.life;
      colors[i3 + 2] = color.b * flicker * data.life;
    }

    // 整体轻微旋转
    this.particles.rotation.y = Math.sin(time * 0.2) * 0.1;

    this.particles.geometry.attributes.position.needsUpdate = true;
    this.particles.geometry.attributes.color.needsUpdate = true;
  }

  getCurrentNumber(): number | null {
    return this.currentNumber;
  }

  getParticleCount(): number {
    return this.particles ? this.PARTICLE_COUNT : 0;
  }

  dispose(): void {
    if (this.particles) {
      this.scene.remove(this.particles);
      this.particles.geometry.dispose();
      (this.particles.material as THREE.Material).dispose();
      this.particles = null;
    }
    this.particleData = [];
    this.currentNumber = null;
  }
}
