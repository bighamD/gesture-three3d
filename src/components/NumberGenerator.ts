export interface Point2D {
  x: number;
  y: number;
}

export class NumberGenerator {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;

  constructor() {
    this.canvas = document.createElement('canvas');
    this.canvas.width = 200;
    this.canvas.height = 200;
    const ctx = this.canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) throw new Error('Could not get canvas context');
    this.ctx = ctx;
  }

  /**
   * Generate 2D points that form the shape of the digit
   * Based on gemini.html implementation
   */
  generateDigitPoints(digit: string, sampleStep: number = 3): Point2D[] {
    // Clear canvas
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Draw text
    this.ctx.fillStyle = 'white';
    this.ctx.font = 'bold 160px -apple-system, BlinkMacSystemFont, "SF Pro Display", Arial, sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText(digit, this.canvas.width / 2, this.canvas.height / 2);

    // Sample pixels
    const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
    const pixels = imageData.data;
    const points: Point2D[] = [];

    for (let y = 0; y < this.canvas.height; y += sampleStep) {
      for (let x = 0; x < this.canvas.width; x += sampleStep) {
        const alpha = pixels[(y * this.canvas.width + x) * 4 + 3];
        if (alpha > 128) {
          points.push({
            x: (x - this.canvas.width / 2) * 0.08,
            y: -(y - this.canvas.height / 2) * 0.08
          });
        }
      }
    }

    return points;
  }
}
