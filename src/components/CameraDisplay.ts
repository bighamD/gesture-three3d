export class CameraDisplay {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private videoElement: HTMLVideoElement;

  constructor(videoElement: HTMLVideoElement) {
    this.videoElement = videoElement;

    // Create canvas for camera feed + skeleton
    this.canvas = document.createElement('canvas');
    this.canvas.width = 320;
    this.canvas.height = 240;
    this.canvas.style.position = 'fixed';
    this.canvas.style.bottom = '20px';
    this.canvas.style.right = '20px';
    this.canvas.style.border = '2px solid white';
    this.canvas.style.borderRadius = '8px';
    this.canvas.style.zIndex = '100';
    document.body.appendChild(this.canvas);

    const ctx = this.canvas.getContext('2d');
    if (!ctx) throw new Error('Could not get canvas context');
    this.ctx = ctx;
  }

  drawFrame(landmarks?: Array<{x: number, y: number, z: number}>): void {
    const width = this.canvas.width;
    const height = this.canvas.height;

    // Clear canvas
    this.ctx.clearRect(0, 0, width, height);

    // Draw video frame
    this.ctx.drawImage(this.videoElement, 0, 0, width, height);

    // Draw skeleton if landmarks available
    if (landmarks) {
      this.drawSkeleton(landmarks, width, height);
    }
  }

  private drawSkeleton(landmarks: Array<{x: number, y: number, z: number}>, width: number, height: number): void {
    this.ctx.strokeStyle = '#00FF00';
    this.ctx.lineWidth = 2;

    // Draw connections
    const connections = [
      [0, 1], [1, 2], [2, 3], [3, 4], // Thumb
      [0, 5], [5, 6], [6, 7], [7, 8], // Index
      [0, 9], [9, 10], [10, 11], [11, 12], // Middle
      [0, 13], [13, 14], [14, 15], [15, 16], // Ring
      [0, 17], [17, 18], [18, 19], [19, 20], // Pinky
      [5, 9], [9, 13], [13, 17] // Palm
    ];

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
    this.ctx.fillStyle = '#FF0000';
    for (const landmark of landmarks) {
      this.ctx.beginPath();
      this.ctx.arc(landmark.x * width, landmark.y * height, 3, 0, 2 * Math.PI);
      this.ctx.fill();
    }
  }
}
