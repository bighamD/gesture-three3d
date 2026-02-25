import * as THREE from 'three';
import { NumberGenerator, Point2D } from './NumberGenerator';

interface CubeData {
  velocity: THREE.Vector3;
  angularVelocity: THREE.Vector3;
}

export class GravityCubeSystem {
  private scene: THREE.Scene;
  private numberGenerator: NumberGenerator;
  private cubes: THREE.Mesh[] = [];
  private readonly MAX_CUBES = 500;
  private readonly gravity = -0.025;
  private readonly groundHeight = -5;
  private readonly wallLimit = 12;
  private currentNumber: number | null = null;

  // Scene elements
  private ground!: THREE.Mesh;
  private gridHelper!: THREE.GridHelper;
  private walls: THREE.Mesh[] = [];
  private lights: THREE.Light[] = [];

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.numberGenerator = new NumberGenerator();

    this.setupEnvironment();
  }

  private setupEnvironment(): void {
    // Ground
    const groundGeometry = new THREE.PlaneGeometry(25, 25);
    const groundMaterial = new THREE.MeshStandardMaterial({
      color: 0x16213e,
      roughness: 0.8,
      metalness: 0.2
    });
    this.ground = new THREE.Mesh(groundGeometry, groundMaterial);
    this.ground.rotation.x = -Math.PI / 2;
    this.ground.position.y = this.groundHeight;
    this.ground.receiveShadow = true;
    this.scene.add(this.ground);

    // Grid helper
    this.gridHelper = new THREE.GridHelper(25, 25, 0x444444, 0x222222);
    this.gridHelper.position.y = this.groundHeight + 0.01;
    this.scene.add(this.gridHelper);

    // Walls (transparent)
    const wallMaterial = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.05,
      side: THREE.DoubleSide
    });

    // Front and back walls
    const wallGeometry = new THREE.PlaneGeometry(25, 20);
    const frontWall = new THREE.Mesh(wallGeometry, wallMaterial);
    frontWall.position.set(0, 5, 12.5);
    this.scene.add(frontWall);
    this.walls.push(frontWall);

    const backWall = new THREE.Mesh(wallGeometry, wallMaterial);
    backWall.position.set(0, 5, -12.5);
    this.scene.add(backWall);
    this.walls.push(backWall);

    // Left and right walls
    const sideWallGeometry = new THREE.PlaneGeometry(25, 20);
    const leftWall = new THREE.Mesh(sideWallGeometry, wallMaterial);
    leftWall.rotation.y = Math.PI / 2;
    leftWall.position.set(-12.5, 5, 0);
    this.scene.add(leftWall);
    this.walls.push(leftWall);

    const rightWall = new THREE.Mesh(sideWallGeometry, wallMaterial);
    rightWall.rotation.y = Math.PI / 2;
    rightWall.position.set(12.5, 5, 0);
    this.scene.add(rightWall);
    this.walls.push(rightWall);

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(ambientLight);
    this.lights.push(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(10, 20, 10);
    directionalLight.castShadow = true;
    this.scene.add(directionalLight);
    this.lights.push(directionalLight);

    const pointLight1 = new THREE.PointLight(0xff6b6b, 0.5, 50);
    pointLight1.position.set(-10, 10, 10);
    this.scene.add(pointLight1);
    this.lights.push(pointLight1);

    const pointLight2 = new THREE.PointLight(0x4ecdc4, 0.5, 50);
    pointLight2.position.set(10, 10, -10);
    this.scene.add(pointLight2);
    this.lights.push(pointLight2);
  }

  createNumberCubes(number: number): void {
    // Clear existing cubes
    this.clearCubes();

    // Generate digit points
    const points = this.numberGenerator.generateDigitPoints(number.toString());

    // Create cubes for each point
    const baseHue = Math.random();

    points.forEach((point) => {
      const size = 0.25 + Math.random() * 0.15;
      const geometry = new THREE.BoxGeometry(size, size, size);

      // Color variation around base hue
      const hue = (baseHue + (Math.random() - 0.5) * 0.2) % 1;
      const material = new THREE.MeshStandardMaterial({
        color: new THREE.Color().setHSL(hue, 0.85, 0.55),
        roughness: 0.3,
        metalness: 0.7
      });

      const cube = new THREE.Mesh(geometry, material);

      // Position: high above, but keep XZ pattern
      cube.position.set(
        point.x + (Math.random() - 0.5) * 0.2,
        15 + Math.random() * 3,
        point.y + (Math.random() - 0.5) * 0.2
      );

      // Physics data
      cube.userData = {
        velocity: new THREE.Vector3(
          (Math.random() - 0.5) * 0.05,
          0,
          (Math.random() - 0.5) * 0.05
        ),
        angularVelocity: new THREE.Vector3(
          (Math.random() - 0.5) * 0.1,
          (Math.random() - 0.5) * 0.1,
          (Math.random() - 0.5) * 0.1
        )
      } as CubeData;

      cube.castShadow = true;
      cube.receiveShadow = true;

      this.scene.add(cube);
      this.cubes.push(cube);
    });

    this.currentNumber = number;
    console.log(`Created ${this.cubes.length} cubes for number ${number}`);
  }

  clearCubes(): void {
    this.cubes.forEach(cube => this.scene.remove(cube));
    this.cubes = [];
    this.currentNumber = null;
  }

  update(deltaTime: number): void {
    this.cubes.forEach(cube => {
      const data = cube.userData as CubeData;

      // Apply gravity
      data.velocity.y += this.gravity;

      // Update position
      cube.position.add(data.velocity);

      // Update rotation
      cube.rotation.x += data.angularVelocity.x;
      cube.rotation.y += data.angularVelocity.y;
      cube.rotation.z += data.angularVelocity.z;

      // Ground collision
      const halfSize = 0.5;
      if (cube.position.y - halfSize < this.groundHeight) {
        cube.position.y = this.groundHeight + halfSize;
        data.velocity.y *= -0.6; // Bounce

        // Friction
        data.velocity.x *= 0.95;
        data.velocity.z *= 0.95;

        // Reduce angular velocity
        data.angularVelocity.multiplyScalar(0.98);
      }

      // Wall collision
      if (Math.abs(cube.position.x) > this.wallLimit) {
        cube.position.x = Math.sign(cube.position.x) * this.wallLimit;
        data.velocity.x *= -0.6;
      }
      if (Math.abs(cube.position.z) > this.wallLimit) {
        cube.position.z = Math.sign(cube.position.z) * this.wallLimit;
        data.velocity.z *= -0.6;
      }
    });
  }

  getCurrentNumber(): number | null {
    return this.currentNumber;
  }

  getCubeCount(): number {
    return this.cubes.length;
  }

  dispose(): void {
    this.clearCubes();

    // Remove environment objects
    this.scene.remove(this.ground);
    this.scene.remove(this.gridHelper);
    this.walls.forEach(wall => this.scene.remove(wall));
    this.lights.forEach(light => this.scene.remove(light));

    // Dispose geometries and materials
    this.ground.geometry.dispose();
    (this.ground.material as THREE.Material).dispose();
  }
}
