export class CameraDisplay {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private videoElement: HTMLVideoElement;
  private animationId: number | null = null;
  private landmarks: Array<{x: number, y: number, z: number}> | null = null;

  constructor(videoElement: HTMLVideoElement) {
    this.videoElement = videoElement;

    // Create canvas for camera feed + skeleton
    this.canvas = document.createElement('canvas');
    this.canvas.width = 320;
    this.canvas.height = 240;
    this.canvas.style.position = 'fixed';
    this.canvas.style.bottom = '30px';
    this.canvas.style.right = '30px';
    this.canvas.style.border = '1px solid rgba(255, 255, 255, 0.15)';
    this.canvas.style.borderRadius = '12px';
    this.canvas.style.zIndex = '10';
    this.canvas.style.overflow = 'hidden';
    this.canvas.style.boxShadow = '0 4px 24px rgba(0, 0, 0, 0.5)';
    this.canvas.style.transform = 'scaleX(-1)'; // Mirror effect
    this.canvas.style.backdropFilter = 'blur(4px)';
    document.body.appendChild(this.canvas);

    const ctx = this.canvas.getContext('2d');
    if (!ctx) throw new Error('Could not get canvas context');
    this.ctx = ctx;

    // Start animation loop
    this.startAnimation();
  }

  private startAnimation(): void {
    const draw = () => {
      this.drawFrame();
      this.animationId = requestAnimationFrame(draw);
    };
    draw();
  }

  updateLandmarks(landmarks: Array<{x: number, y: number, z: number}> | null): void {
    this.landmarks = landmarks;
  }

  private drawFrame(): void {
    const width = this.canvas.width;
    const height = this.canvas.height;

    // Clear canvas
    this.ctx.clearRect(0, 0, width, height);

    // Draw video frame
    if (this.videoElement.readyState >= 2) {
      this.ctx.save();
      this.ctx.scale(-1, 1); // Mirror effect
      this.ctx.drawImage(this.videoElement, -width, 0, width, height);
      this.ctx.restore();
    }

    // Draw skeleton if landmarks available
    if (this.landmarks) {
      this.drawSkeleton(this.landmarks, width, height);
    }
  }

  private drawSkeleton(landmarks: Array<{x: number, y: number, z: number}>, width: number, height: number): void {
    this.ctx.save();
    this.ctx.scale(-1, 1); // Mirror effect for skeleton too
    this.ctx.translate(-width, 0);

    // Draw connections
    const connections = [
      [0, 1], [1, 2], [2, 3], [3, 4], // Thumb
      [0, 5], [5, 6], [6, 7], [7, 8], // Index
      [0, 9], [9, 10], [10, 11], [11, 12], // Middle
      [0, 13], [13, 14], [14, 15], [15, 16], // Ring
      [0, 17], [17, 18], [18, 19], [19, 20], // Pinky
      [5, 9], [9, 13], [13, 17] // Palm
    ];

    // Draw lines
    this.ctx.strokeStyle = 'rgba(0, 255, 255, 0.8)';
    this.ctx.lineWidth = 2;
    this.ctx.lineCap = 'round';

    for (const [start, end] of connections) {
      const startX = landmarks[start].x * width;
      const startY = landmarks[start].y * height;
      const endX = landmarks[end].x * width;
      const endY = landmarks[end].y * height;

      this.ctx.beginPath();
      this.ctx.moveTo(startX, startY);
      this.ctx.lineTo(endX, endY);
      this.ctx.stroke();
    }

    // Draw keypoints
    this.ctx.fillStyle = 'rgba(255, 100, 100, 0.9)';
    for (const landmark of landmarks) {
      this.ctx.beginPath();
      this.ctx.arc(landmark.x * width, landmark.y * height, 4, 0, 2 * Math.PI);
      this.ctx.fill();
    }

    this.ctx.restore();
  }

  dispose(): void {
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
    }
    if (this.canvas.parentNode) {
      this.canvas.parentNode.removeChild(this.canvas);
    }
  }
}
