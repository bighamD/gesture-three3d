import * as THREE from 'three';
import Stats from 'stats.ts';
import { HandTracker } from './components/HandTracker';

export class App {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private stats: Stats;
  private handTracker: HandTracker;

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
      console.log('Hand tracking initialized');
    } catch (error) {
      console.error('Failed to initialize hand tracking:', error);
    }
  }

  private animate() {
    this.stats.begin();
    requestAnimationFrame(this.animate.bind(this));
    this.renderer.render(this.scene, this.camera);
    this.stats.end();
  }
}
