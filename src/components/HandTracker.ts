import { HandLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';

export class HandTracker {
  private landmarker: HandLandmarker | null = null;
  private videoElement: HTMLVideoElement;
  private lastDetectionTime: number = 0;
  private fingerCount: number = 0;
  private handPosition: [number, number, number] = [0, 0, 0];

  constructor() {
    this.videoElement = document.createElement('video');
    this.videoElement.autoplay = true;
    this.videoElement.playsInline = true;
    this.videoElement.style.display = 'none';
    document.body.appendChild(this.videoElement);
  }

  async init(): Promise<void> {
    const vision = await FilesetResolver.forVisionTasks(
      'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm'
    );

    this.landmarker = await HandLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
        delegate: 'GPU'
      },
      runningMode: 'VIDEO',
      numHands: 1
    });
  }

  async startCamera(): Promise<void> {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { width: 1280, height: 720 }
    });
    this.videoElement.srcObject = stream;
    await this.videoElement.play();
  }

  detect(): number {
    if (!this.landmarker || this.videoElement.readyState < 2) {
      return 0;
    }

    const results = this.landmarker.detectForVideo(this.videoElement, performance.now());

    if (results.landmarks.length === 0) {
      this.fingerCount = 0;
      return 0;
    }

    const landmarks = results.landmarks[0];
    this.fingerCount = this.countFingers(landmarks);
    this.handPosition = this.calculateHandPosition(landmarks);

    return this.fingerCount;
  }

  private countFingers(landmarks: Array<{x: number, y: number, z: number}>): number {
    // Thumb: compare tip (4) vs IP (3)
    const thumbIsOpen = Math.abs(landmarks[4].x - landmarks[3].x) > 0.05;

    // Other fingers: tip y < PIP y (pointing up)
    const indexIsOpen = landmarks[8].y < landmarks[6].y;
    const middleIsOpen = landmarks[12].y < landmarks[10].y;
    const ringIsOpen = landmarks[16].y < landmarks[14].y;
    const pinkyIsOpen = landmarks[20].y < landmarks[18].y;

    let count = 0;
    if (thumbIsOpen) count++;
    if (indexIsOpen) count++;
    if (middleIsOpen) count++;
    if (ringIsOpen) count++;
    if (pinkyIsOpen) count++;

    return count;
  }

  private calculateHandPosition(landmarks: Array<{x: number, y: number, z: number}>): [number, number, number] {
    // Use wrist position (landmark 0) as hand position
    // Normalize to 3D space (-10 to +10)
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

  getLandmarks() {
    return this.landmarker?.detectForVideo(this.videoElement, performance.now());
  }

  get video() {
    return this.videoElement;
  }
}
