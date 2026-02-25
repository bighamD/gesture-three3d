import * as THREE from 'three';
import Stats from 'stats.ts';
import { HandTracker } from './components/HandTracker';
import { CameraDisplay } from './components/CameraDisplay';
import { ParticleSystem } from './components/ParticleSystem';

export class App {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private stats: Stats;
  private handTracker: HandTracker;
  private cameraDisplay: CameraDisplay;
  private particleSystem: ParticleSystem;

  constructor() {
    // Scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x000000);

    // Camera
    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    this.camera.position.z = 30;

    // Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(window.devicePixelRatio);
    document.body.appendChild(this.renderer.domElement);

    // Handle resize
    window.addEventListener('resize', this.onWindowResize.bind(this));

    // FPS counter
    this.stats = new Stats();
    this.stats.showPanel(0);
    document.body.appendChild(this.stats.dom);

    // Initialize hand tracking
    this.handTracker = new HandTracker();
    this.initHandTracking();

    // Initialize particle system
    this.particleSystem = new ParticleSystem(this.scene);

    // Start animation loop
    this.animate();
  }

  private onWindowResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  private async initHandTracking() {
    try {
      await this.handTracker.init();
      await this.handTracker.startCamera();

      // Initialize camera display
      this.cameraDisplay = new CameraDisplay(this.handTracker.video);

      console.log('Hand tracking initialized');
    } catch (error) {
      console.error('Failed to initialize hand tracking:', error);
    }
  }

  private animate() {
    this.stats.begin();

    // Detect hand
    this.handTracker.detect();

    // Update particle system
    this.particleSystem.update(0.016); // Assume 60 FPS

    // Draw camera frame with skeleton
    const results = this.handTracker.getLandmarks();
    if (results?.landmarks[0]) {
      this.cameraDisplay.drawFrame(results.landmarks[0]);
    }

    requestAnimationFrame(this.animate.bind(this));
    this.renderer.render(this.scene, this.camera);
    this.stats.end();
  }
}
