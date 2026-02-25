import * as THREE from 'three';

interface TrailParticle {
  active: boolean;
  life: number;
  position: [number, number, number];
  velocity: [number, number, number];
  color: [number, number, number];
}

export class ParticleTrail {
  private scene: THREE.Scene;
  private geometry: THREE.BufferGeometry;
  private material: THREE.PointsMaterial;
  private points: THREE.Points;
  private particles: TrailParticle[] = [];
  private maxParticles: number = 500;
  private positions: Float32Array;
  private colors: Float32Array;
  private sizes: Float32Array;

  constructor(scene: THREE.Scene) {
    this.scene = scene;

    // Initialize particle pool
    for (let i = 0; i < this.maxParticles; i++) {
      this.particles.push({
        active: false,
        life: 0,
        position: [0, 0, 0],
        velocity: [0, 0, 0],
        color: [1, 1, 1]
      });
    }

    // Create geometry
    this.positions = new Float32Array(this.maxParticles * 3);
    this.colors = new Float32Array(this.maxParticles * 3);
    this.sizes = new Float32Array(this.maxParticles);

    this.geometry = new THREE.BufferGeometry();
    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    this.geometry.setAttribute('color', new THREE.BufferAttribute(this.colors, 3));
    this.geometry.setAttribute('size', new THREE.BufferAttribute(this.sizes, 1));

    // Create material
    this.material = new THREE.PointsMaterial({
      size: 3,
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    this.points = new THREE.Points(this.geometry, this.material);
    this.scene.add(this.points);
  }

  spawn(position: [number, number, number]): void {
    // Find inactive particle
    const particle = this.particles.find(p => !p.active);
    if (!particle) return;

    particle.active = true;
    particle.life = 1.0;
    particle.position = [...position];

    // Random velocity with slight spread
    particle.velocity = [
      (Math.random() - 0.5) * 0.3,
      (Math.random() - 0.5) * 0.3,
      (Math.random() - 0.5) * 0.3
    ];

    // Color gradient based on life (will be updated in update)
    particle.color = [1, 1, 1];
  }

  update(deltaTime: number): void {
    let activeCount = 0;

    for (let i = 0; i < this.maxParticles; i++) {
      const p = this.particles[i];

      if (p.active) {
        // Update life
        p.life -= deltaTime / 2.0; // 2 second lifetime

        if (p.life <= 0) {
          p.active = false;
          continue;
        }

        // Update position
        p.position[0] += p.velocity[0];
        p.position[1] += p.velocity[1];
        p.position[2] += p.velocity[2];

        // Update color based on life (white → blue → purple)
        if (p.life > 0.6) {
          // White to blue
          const t = (1 - p.life) / 0.4;
          p.color = [1 - t, 1 - t, 1];
        } else {
          // Blue to purple
          const t = (0.6 - p.life) / 0.6;
          p.color = [t, 0, 1];
        }

        // Update arrays
        this.positions[i * 3] = p.position[0];
        this.positions[i * 3 + 1] = p.position[1];
        this.positions[i * 3 + 2] = p.position[2];

        this.colors[i * 3] = p.color[0];
        this.colors[i * 3 + 1] = p.color[1];
        this.colors[i * 3 + 2] = p.color[2];

        this.sizes[i] = p.life * 3; // Shrink with age

        activeCount++;
      } else {
        // Hide inactive particles
        this.sizes[i] = 0;
      }
    }

    this.geometry.attributes.position.needsUpdate = true;
    this.geometry.attributes.color.needsUpdate = true;
    this.geometry.attributes.size.needsUpdate = true;
  }
}
