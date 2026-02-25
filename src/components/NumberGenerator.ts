import type { ParticleShape } from '../types/particle';

export class NumberGenerator {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;

  constructor() {
    this.canvas = document.createElement('canvas');
    this.canvas.width = 512;
    this.canvas.height = 512;
    const ctx = this.canvas.getContext('2d');
    if (!ctx) throw new Error('Could not get canvas context');
    this.ctx = ctx;
  }

  generateDigit(digit: string, particleCount: number = 10000): Float32Array {
    // Clear canvas
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Draw text
    this.ctx.fillStyle = '#FFFFFF';
    this.ctx.font = 'bold 400px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText(digit, this.canvas.width / 2, this.canvas.height / 2);

    // Sample pixels
    const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
    const pixels = imageData.data;
    const validPositions: Array<{x: number, y: number}> = [];

    for (let y = 0; y < this.canvas.height; y += 2) {
      for (let x = 0; x < this.canvas.width; x += 2) {
        const index = (y * this.canvas.width + x) * 4;
        const alpha = pixels[index + 3];

        if (alpha > 128) {
          validPositions.push({ x, y });
        }
      }
    }

    // Randomly select particles
    const positions = new Float32Array(particleCount * 3);
    const step = Math.max(1, Math.floor(validPositions.length / particleCount));

    for (let i = 0; i < particleCount; i++) {
      const pos = validPositions[i * step % validPositions.length];
      // Normalize to -5 to +5 range
      positions[i * 3] = (pos.x / this.canvas.width - 0.5) * 10;
      positions[i * 3 + 1] = -(pos.y / this.canvas.height - 0.5) * 10;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 0.5; // Slight depth variation
    }

    return positions;
  }

  generateColor(particleCount: number = 10000): Float32Array {
    const colors = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i++) {
      // White with slight blue tint
      colors[i * 3] = 0.9 + Math.random() * 0.1;     // R
      colors[i * 3 + 1] = 0.9 + Math.random() * 0.1; // G
      colors[i * 3 + 2] = 1.0;                        // B
    }
    return colors;
  }
}
