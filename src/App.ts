import * as THREE from 'three';
import Stats from 'stats.ts';
import { HandTracker } from './components/HandTracker';
import { CameraDisplay } from './components/CameraDisplay';
import { ParticleSystem } from './components/ParticleSystem';
import { ParticleTrail } from './components/ParticleTrail';
import { CountdownState } from './types/particle';

export class App {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private stats: Stats;
  private handTracker: HandTracker;
  private cameraDisplay: CameraDisplay;
  private particleSystem: ParticleSystem;
  private particleTrail: ParticleTrail;
  private countdownState: CountdownState = CountdownState.IDLE;
  private currentPhase: number = 0;
  private countdownSequence: string[] = ['5', '4', '3', '2', '1'];
  private lastFiveFingerTime: number = 0;
  private readonly TRIGGER_THRESHOLD = 500; // ms
  private statusElement: HTMLElement;

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

    // Initialize particle trail
    this.particleTrail = new ParticleTrail(this.scene);

    // Create status indicator
    this.statusElement = document.createElement('div');
    this.statusElement.style.position = 'fixed';
    this.statusElement.style.top = '20px';
    this.statusElement.style.left = '50%';
    this.statusElement.style.transform = 'translateX(-50%)';
    this.statusElement.style.padding = '12px 24px';
    this.statusElement.style.borderRadius = '8px';
    this.statusElement.style.fontFamily = 'Arial, sans-serif';
    this.statusElement.style.fontSize = '18px';
    this.statusElement.style.fontWeight = 'bold';
    this.statusElement.style.color = 'white';
    this.statusElement.style.zIndex = '100';
    this.statusElement.style.transition = 'background-color 0.3s';
    this.statusElement.textContent = 'Show 5 fingers to start';
    this.statusElement.style.backgroundColor = 'rgba(100, 100, 100, 0.8)';
    document.body.appendChild(this.statusElement);

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
      this.updateStatus('Hand tracking active', 'rgba(0, 255, 0, 0.8)');
    } catch (error) {
      console.error('Failed to initialize hand tracking:', error);

      // Check if camera permission was denied
      if (error instanceof DOMException && error.name === 'NotAllowedError') {
        this.updateStatus('Camera access denied. Please allow camera access.', 'rgba(255, 0, 0, 0.8)');

        // Add retry button
        const retryButton = document.createElement('button');
        retryButton.textContent = 'Enable Camera';
        retryButton.style.position = 'fixed';
        retryButton.style.top = '80px';
        retryButton.style.left = '50%';
        retryButton.style.transform = 'translateX(-50%)';
        retryButton.style.padding = '12px 24px';
        retryButton.style.borderRadius = '8px';
        retryButton.style.fontSize = '16px';
        retryButton.style.cursor = 'pointer';
        retryButton.style.zIndex = '100';
        retryButton.onclick = async () => {
          retryButton.remove();
          await this.initHandTracking();
        };
        document.body.appendChild(retryButton);
      } else {
        this.updateStatus('Failed to load hand tracking. Please refresh.', 'rgba(255, 0, 0, 0.8)');
      }
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
      const elapsed = this.lastFiveFingerTime > 0 ? performance.now() - this.lastFiveFingerTime : 0;
      if (elapsed === 0) {
        this.lastFiveFingerTime = performance.now();
      }
      const progress = Math.min(elapsed / this.TRIGGER_THRESHOLD, 1);
      this.updateStatus(
        `Hold 5 fingers... ${Math.round(progress * 100)}%`,
        `rgba(255, ${Math.round(170 * progress)}, 0, 0.8)`
      );

      if (elapsed > this.TRIGGER_THRESHOLD) {
        this.startCountdown();
      }
    } else {
      this.lastFiveFingerTime = 0;
      this.updateStatus('Show 5 fingers to start', 'rgba(100, 100, 100, 0.8)');
    }
  }

  private startCountdown() {
    this.countdownState = CountdownState.COUNTDOWN;
    this.currentPhase = 0;
    this.updateStatus('Countdown: 5', 'rgba(0, 170, 255, 0.8)');
    this.scheduleNextMorph();
  }

  private scheduleNextMorph() {
    if (this.currentPhase < this.countdownSequence.length - 1) {
      setTimeout(() => {
        const nextDigit = this.countdownSequence[this.currentPhase + 1];
        this.particleSystem.morphTo(nextDigit, 1500);
        this.currentPhase++;

        const colors = ['5', '4', '3', '2', '1'].map(d => {
          const map: Record<string, string> = {
            '5': 'rgba(255, 255, 255, 0.8)',
            '4': 'rgba(255, 170, 0, 0.8)',
            '3': 'rgba(255, 0, 0, 0.8)',
            '2': 'rgba(170, 0, 255, 0.8)',
            '1': 'rgba(0, 170, 255, 0.8)'
          };
          return map[d];
        });

        this.updateStatus(`Countdown: ${nextDigit}`, colors[this.currentPhase]);

        if (this.currentPhase < this.countdownSequence.length - 1) {
          this.scheduleNextMorph();
        } else {
          setTimeout(() => {
            this.countdownState = CountdownState.COMPLETE;
            this.updateStatus('Complete! Show 5 fingers to reset', 'rgba(0, 255, 0, 0.8)');
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

  private updateStatus(message: string, color: string = 'rgba(100, 100, 100, 0.8)') {
    this.statusElement.textContent = message;
    this.statusElement.style.backgroundColor = color;
  }

  private animate() {
    this.stats.begin();

    // Detect hand
    const fingerCount = this.handTracker.detect();
    const handPos = this.handTracker.getHandPosition();

    // Spawn trail particles if hand is detected
    if (fingerCount > 0) {
      this.particleTrail.spawn(handPos);
    }

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

    // Update particle systems
    this.particleSystem.update(0.016);
    this.particleTrail.update(0.016);

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
