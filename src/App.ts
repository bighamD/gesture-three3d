import * as THREE from 'three';
import { HandTracker } from './components/HandTracker';
import { CameraDisplay } from './components/CameraDisplay';
import { ParticleNumberSystem } from './components/ParticleNumberSystem';
import { CountdownState } from './types/particle';

export class App {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private handTracker: HandTracker;
  private cameraDisplay!: CameraDisplay;
  private particleSystem: ParticleNumberSystem;
  private countdownState: CountdownState = CountdownState.IDLE;
  private currentPhase: number = 0;
  private countdownSequence: string[] = ['5', '4', '3', '2', '1'];
  private lastFiveFingerTime: number = 0;
  private readonly TRIGGER_THRESHOLD = 500; // ms
  private statusElement: HTMLElement;
  private loadingElement: HTMLElement;

  // 手势稳定性检测
  private fingerCountHistory: number[] = [];
  private readonly STABILITY_FRAMES = 5; // 需要连续N帧相同才认为稳定
  private stableFingerCount: number = 0;

  constructor() {
    // Create loading screen
    this.loadingElement = document.createElement('div');
    this.loadingElement.style.position = 'fixed';
    this.loadingElement.style.top = '0';
    this.loadingElement.style.left = '0';
    this.loadingElement.style.width = '100%';
    this.loadingElement.style.height = '100%';
    this.loadingElement.style.backgroundColor = 'rgba(0, 0, 0, 0.9)';
    this.loadingElement.style.display = 'flex';
    this.loadingElement.style.flexDirection = 'column';
    this.loadingElement.style.justifyContent = 'center';
    this.loadingElement.style.alignItems = 'center';
    this.loadingElement.style.zIndex = '1000';
    this.loadingElement.style.fontFamily = 'Arial, sans-serif';
    this.loadingElement.innerHTML = `
      <div style="color: white; font-size: 32px; font-weight: bold; margin-bottom: 20px;">
        Initializing...
      </div>
      <div style="color: #aaa; font-size: 16px;">Please wait while we load the hand tracking model...</div>
    `;
    document.body.appendChild(this.loadingElement);

    // Scene - dark background for fire effect
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x050505);
    this.scene.fog = new THREE.FogExp2(0x050505, 0.02);

    // Camera - positioned for better particle viewing
    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    this.camera.position.set(0, 0, 20);
    this.camera.lookAt(0, 0, 0);

    // Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(window.devicePixelRatio);
    document.body.appendChild(this.renderer.domElement);

    // Handle resize
    window.addEventListener('resize', this.onWindowResize.bind(this));

    // Initialize hand tracking
    this.handTracker = new HandTracker();
    this.initHandTracking();

    // Initialize particle system
    this.particleSystem = new ParticleNumberSystem(this.scene);

    // Create status indicator
    this.statusElement = document.createElement('div');
    this.statusElement.style.position = 'fixed';
    this.statusElement.style.top = '30px';
    this.statusElement.style.left = '30px';
    this.statusElement.style.zIndex = '100';
    this.statusElement.style.pointerEvents = 'none';
    this.statusElement.style.fontFamily = '-apple-system, BlinkMacSystemFont, "SF Pro Display", Arial, sans-serif';
    this.statusElement.innerHTML = `
      <div style="font-size: 13px; font-weight: 500; color: rgba(255, 255, 255, 0.6); margin-bottom: 6px;">
        Fingers Detected
      </div>
      <div id="finger-count" style="font-size: 48px; font-weight: 200; color: #ffffff; letter-spacing: -1px;">
        —
      </div>
    `;
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
      console.log('Hand tracker initialized, starting camera...');

      await this.handTracker.startCamera();

      // Initialize camera display and link it to hand tracker
      this.cameraDisplay = new CameraDisplay(this.handTracker.video);
      this.handTracker.setCameraDisplay(this.cameraDisplay);

      console.log('✅ Hand tracking fully initialized');
      this.hideLoadingScreen();
    } catch (error) {
      console.error('❌ Failed to initialize hand tracking:', error);

      // Hide loading screen on error
      this.hideLoadingScreen();

      // Check if camera permission was denied
      if (error instanceof DOMException && error.name === 'NotAllowedError') {
        this.updateStatus('Camera access denied. Please allow camera access.');

        // Add retry button
        const retryButton = document.createElement('button');
        retryButton.textContent = 'Enable Camera';
        retryButton.style.position = 'fixed';
        retryButton.style.top = '100px';
        retryButton.style.left = '30px';
        retryButton.style.padding = '12px 24px';
        retryButton.style.borderRadius = '8px';
        retryButton.style.fontSize = '16px';
        retryButton.style.cursor = 'pointer';
        retryButton.style.zIndex = '100';
        retryButton.style.backgroundColor = '#4CAF50';
        retryButton.style.color = 'white';
        retryButton.style.border = 'none';
        retryButton.onclick = async () => {
          retryButton.remove();
          // Show loading again
          this.loadingElement = document.createElement('div');
          this.loadingElement.style.position = 'fixed';
          this.loadingElement.style.top = '0';
          this.loadingElement.style.left = '0';
          this.loadingElement.style.width = '100%';
          this.loadingElement.style.height = '100%';
          this.loadingElement.style.backgroundColor = 'rgba(0, 0, 0, 0.9)';
          this.loadingElement.style.display = 'flex';
          this.loadingElement.style.flexDirection = 'column';
          this.loadingElement.style.justifyContent = 'center';
          this.loadingElement.style.alignItems = 'center';
          this.loadingElement.style.zIndex = '1000';
          this.loadingElement.style.fontFamily = 'Arial, sans-serif';
          this.loadingElement.innerHTML = `
            <div style="color: white; font-size: 32px; font-weight: bold; margin-bottom: 20px;">
              Initializing...
            </div>
          `;
          document.body.appendChild(this.loadingElement);
          await this.initHandTracking();
        };
        document.body.appendChild(retryButton);
      } else {
        this.updateStatus('Failed to load hand tracking. Please refresh.');
      }
    }
  }

  private setupKeyboardControls() {
    window.addEventListener('keydown', (e) => {
      const key = e.key;
      if (['0', '1', '2', '3', '4', '5'].includes(key)) {
        const num = parseInt(key);
        if (num > 0) {
          this.particleSystem.showNumber(num);
        } else {
          this.particleSystem.hideNumber();
        }
      }
    });
  }

  /**
   * 计算稳定的手指数量（防抖）
   * 只有连续N帧都检测到相同数量才认为稳定
   */
  private getStableFingerCount(currentCount: number): number {
    this.fingerCountHistory.push(currentCount);

    // 只保留最近的N帧
    if (this.fingerCountHistory.length > this.STABILITY_FRAMES) {
      this.fingerCountHistory.shift();
    }

    // 如果历史记录不足N帧，返回0（等待稳定）
    if (this.fingerCountHistory.length < this.STABILITY_FRAMES) {
      return this.stableFingerCount;
    }

    // 检查最近N帧是否都相同
    const allSame = this.fingerCountHistory.every(count => count === this.fingerCountHistory[0]);

    if (allSame) {
      this.stableFingerCount = this.fingerCountHistory[0];
    }

    return this.stableFingerCount;
  }

  private handleIdleState(fingerCount: number) {
    // 使用稳定的手指数量
    const stableCount = this.getStableFingerCount(fingerCount);

    // Update finger count display（显示实时检测值）
    const countElement = document.getElementById('finger-count');
    if (countElement) {
      countElement.textContent = fingerCount > 0 ? fingerCount.toString() : '—';
    }

    // Direct control: show/hide number based on finger count
    if (stableCount > 0) {
      this.particleSystem.showNumber(stableCount);
    } else {
      this.particleSystem.hideNumber();
    }
  }

  private startCountdown() {
    this.countdownState = CountdownState.COUNTDOWN;
    this.currentPhase = 0;
    this.scheduleNextMorph();
  }

  private scheduleNextMorph() {
    if (this.currentPhase < this.countdownSequence.length - 1) {
      setTimeout(() => {
        const nextDigit = parseInt(this.countdownSequence[this.currentPhase + 1]);
        this.particleSystem.showNumber(nextDigit);
        this.currentPhase++;

        if (this.currentPhase < this.countdownSequence.length - 1) {
          this.scheduleNextMorph();
        } else {
          setTimeout(() => {
            this.countdownState = CountdownState.COMPLETE;
          }, 1500);
        }
      }, 1500);
    }
  }

  private updateStatus(message: string) {
    const countElement = document.getElementById('finger-count');
    if (countElement) {
      countElement.textContent = message;
    }
  }

  private hideLoadingScreen() {
    this.loadingElement.style.opacity = '0';
    this.loadingElement.style.transition = 'opacity 0.5s';
    setTimeout(() => {
      this.loadingElement.remove();
    }, 500);
  }

  private animate() {
    // Detect hand
    const fingerCount = this.handTracker.detect();

    // State machine
    switch (this.countdownState) {
      case CountdownState.IDLE:
        this.handleIdleState(fingerCount);
        break;
      case CountdownState.COUNTDOWN:
        // Countdown is running, cubes are being scheduled
        break;
      case CountdownState.COMPLETE:
        // Can add reset logic here
        break;
    }

    // Update particle system
    this.particleSystem.update(0.016);

    requestAnimationFrame(this.animate.bind(this));
    this.renderer.render(this.scene, this.camera);
  }
}
