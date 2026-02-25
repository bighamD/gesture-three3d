import { Hands } from '@mediapipe/hands';
import { Camera as CameraUtils } from '@mediapipe/camera_utils';

export class HandTracker {
  private hands: Hands;
  private camera: any = null;
  private videoElement: HTMLVideoElement;
  private fingerCount: number = 0;
  private handPosition: [number, number, number] = [0, 0, 0];
  private onResultsCallback: ((fingers: number) => void) | null = null;
  private cameraDisplay: any = null; // CameraDisplay reference
  private currentLandmarks: any[] | null = null;

  constructor() {
    this.videoElement = document.createElement('video');
    this.videoElement.autoplay = true;
    this.videoElement.playsInline = true;
    this.videoElement.muted = true;
    this.videoElement.style.display = 'none';
    document.body.appendChild(this.videoElement);

    // Initialize Hands with the same config as gemini.html
    this.hands = new Hands({
      locateFile: (file: string) => {
        return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
      }
    });

    this.hands.setOptions({
      maxNumHands: 1,
      modelComplexity: 1,
      minDetectionConfidence: 0.6,
      minTrackingConfidence: 0.6
    });
  }

  async init(): Promise<void> {
    console.log('Initializing MediaPipe Hands (legacy API)...');

    return new Promise<void>((resolve) => {
      this.hands.onResults((results) => {
        if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
          const landmarks = results.multiHandLandmarks[0];
          this.currentLandmarks = landmarks;
          this.fingerCount = this.countFingers(landmarks);
          this.handPosition = this.calculateHandPosition(landmarks);

          // Update camera display with landmarks
          if (this.cameraDisplay) {
            this.cameraDisplay.updateLandmarks(landmarks);
          }

          // Call callback if registered
          if (this.onResultsCallback) {
            this.onResultsCallback(this.fingerCount);
          }
        } else {
          this.fingerCount = 0;
          this.currentLandmarks = null;
          // Clear landmarks from display
          if (this.cameraDisplay) {
            this.cameraDisplay.updateLandmarks(null);
          }
        }
      });

      // Resolve immediately after setting up onResults
      resolve();
      console.log('✅ MediaPipe Hands initialized');
    });
  }

  async startCamera(): Promise<void> {
    console.log('Starting camera...');

    this.camera = new CameraUtils(this.videoElement, {
      onFrame: async () => {
        await this.hands.send({ image: this.videoElement });
      },
      width: 640,
      height: 480
    });

    await this.camera.start();

    console.log('✅ Camera started');
  }

  detect(): number {
    // Detection happens automatically via CameraUtils
    return this.fingerCount;
  }

  private countFingers(landmarks: any[]): number {
    let count = 0;

    // Thumb: compare tip (4) with IP (2) - using gemini.html's approach
    const thumbTip = landmarks[4];
    const thumbBase = landmarks[2];
    const isThumbOut = Math.abs(thumbTip.x - thumbBase.x) > 0.05;
    if (isThumbOut) count++;

    // Index finger (8 tip, 6 PIP)
    if (landmarks[8].y < landmarks[6].y) count++;

    // Middle finger (12 tip, 10 PIP)
    if (landmarks[12].y < landmarks[10].y) count++;

    // Ring finger (16 tip, 14 PIP)
    if (landmarks[16].y < landmarks[14].y) count++;

    // Pinky finger (20 tip, 18 PIP)
    if (landmarks[20].y < landmarks[18].y) count++;

    return Math.min(count, 5);
  }

  private calculateHandPosition(landmarks: any[]): [number, number, number] {
    // Use wrist position (landmark 0)
    return [
      (landmarks[0].x - 0.5) * 20,
      -(landmarks[0].y - 0.5) * 20,
      landmarks[0].z * 10
    ];
  }

  getHandPosition(): [number, number, number] {
    return this.handPosition;
  }

  getFingerCount(): number {
    return this.fingerCount;
  }

  get video() {
    return this.videoElement;
  }

  onResults(callback: (fingers: number) => void) {
    this.onResultsCallback = callback;
  }

  setCameraDisplay(cameraDisplay: any): void {
    this.cameraDisplay = cameraDisplay;
  }

  getLandmarks() {
    return this.currentLandmarks;
  }
}
