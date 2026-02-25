import * as THREE from 'three';
import Stats from 'stats.ts';
import { HandTracker } from './components/HandTracker';
import { CameraDisplay } from './components/CameraDisplay';
import { ParticleSystem } from './components/ParticleSystem';
import { CountdownState } from './types/particle';

export class App {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private stats: Stats;
  private handTracker: HandTracker;
  private cameraDisplay: CameraDisplay;
  private particleSystem: ParticleSystem;
  private countdownState: CountdownState = CountdownState.IDLE;
  private currentPhase: number = 0;
  private countdownSequence: string[] = ['5', '4', '3', '2', '1'];
  private lastFiveFingerTime: number = 0;
  private readonly TRIGGER_THRESHOLD = 500; // ms

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

    // Setup keyboard controls for testing
    this.setupKeyboardControls();

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

  private setupKeyboardControls() {
    window.addEventListener('keydown', (e) => {
      const key = e.key;
      if (['5', '4', '3', '2', '1'].includes(key)) {
        this.particleSystem.morphTo(key, 1500);
      }
    });
  }

  private handleIdleState(fingerCount: number) {
    if (fingerCount === 5) {
      if (this.lastFiveFingerTime === 0) {
        this.lastFiveFingerTime = performance.now();
      } else if (performance.now() - this.lastFiveFingerTime > this.TRIGGER_THRESHOLD) {
        // Start countdown
        this.startCountdown();
      }
    } else {
      this.lastFiveFingerTime = 0;
    }
  }

  private startCountdown() {
    this.countdownState = CountdownState.COUNTDOWN;
    this.currentPhase = 0;
    this.scheduleNextMorph();
    console.log('Countdown started!');
  }

  private scheduleNextMorph() {
    if (this.currentPhase < this.countdownSequence.length - 1) {
      setTimeout(() => {
        const nextDigit = this.countdownSequence[this.currentPhase + 1];
        this.particleSystem.morphTo(nextDigit, 1500);
        this.currentPhase++;

        if (this.currentPhase < this.countdownSequence.length - 1) {
          this.scheduleNextMorph();
        } else {
          setTimeout(() => {
            this.countdownState = CountdownState.COMPLETE;
            console.log('Countdown complete!');
          }, 1500);
        }
      }, 1500);
    }
  }

  private handleCountdownState() {
    // Countdown is running, morphs are scheduled
    // Can add cancellation logic here if hand is removed
  }

  private handleCompleteState(fingerCount: number) {
    // Reset when 5 fingers shown again
    if (fingerCount === 5) {
      this.lastFiveFingerTime = performance.now();
    } else if (this.lastFiveFingerTime > 0 && performance.now() - this.lastFiveFingerTime > this.TRIGGER_THRESHOLD) {
      this.resetCountdown();
    }
  }

  private resetCountdown() {
    this.countdownState = CountdownState.IDLE;
    this.currentPhase = 0;
    this.lastFiveFingerTime = 0;
    this.particleSystem.morphTo('5', 1000);
    console.log('Countdown reset');
  }

  private animate() {
    this.stats.begin();

    // Detect hand
    const fingerCount = this.handTracker.detect();

    // State machine
    switch (this.countdownState) {
      case CountdownState.IDLE:
        this.handleIdleState(fingerCount);
        break;
      case CountdownState.COUNTDOWN:
        this.handleCountdownState();
        break;
      case CountdownState.COMPLETE:
        this.handleCompleteState(fingerCount);
        break;
    }

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
