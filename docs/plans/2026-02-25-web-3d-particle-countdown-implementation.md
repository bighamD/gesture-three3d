# Web 3D Particle Countdown Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build an interactive web experience where users show hand gestures (0-5 fingers) via webcam to trigger a 3D particle countdown animation (5→4→3→2→1) with smooth morphing particle numbers and particle trails following hand movement.

**Architecture:** Three-layer architecture with Input Layer (webcam + MediaPipe), Processing Layer (GPU particle engine + morphing + trails), and Presentation Layer (Three.js WebGL + custom shaders). Uses GPU acceleration everywhere for 60 FPS performance with 20,000 particles.

**Tech Stack:** Vite 6.x + TypeScript 5.x, Three.js r160+, MediaPipe Tasks Vision (GPU), Tailwind CSS 4.x

---

## Phase 1: Project Setup & Basic Three.js

### Task 1.1: Initialize Vite + TypeScript Project

**Files:**
- Create: `package.json`, `vite.config.ts`, `tsconfig.json`, `index.html`, `src/main.ts`

**Step 1: Create package.json**

```bash
cd /Users/pengdahan/WorkSpace/gesture-three3d
npm create vite@latest . -- --template vanilla-ts
```

Expected: Creates `package.json`, `vite.config.ts`, `tsconfig.json`, `index.html`, `src/main.ts`

**Step 2: Install dependencies**

```bash
npm install three @types/three@^0.160.0 @mediapipe/tasks-vision
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

Expected: Packages installed, `tailwind.config.js` and `postcss.config.js` created

**Step 3: Configure Tailwind**

Edit `tailwind.config.js`:

```javascript
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
```

Edit `src/style.css` (replace entire content):

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

body {
  margin: 0;
  overflow: hidden;
  background: #000;
}
```

**Step 4: Commit**

```bash
git add .
git commit -m "feat: initialize Vite + TypeScript + Tailwind project"
```

---

### Task 1.2: Create Basic Three.js Scene

**Files:**
- Create: `src/App.ts`, `src/types/particle.ts`

**Step 1: Create type definitions**

Create `src/types/particle.ts`:

```typescript
export interface ParticleShape {
  positions: Float32Array;
  colors: Float32Array;
}

export enum CountdownState {
  IDLE = 'idle',
  COUNTDOWN = 'countdown',
  COMPLETE = 'complete'
}

export interface AppState {
  currentDigit: string;
  countdownState: CountdownState;
  fingerCount: number;
  handPosition: [number, number, number];
  morphProgress: number;
  currentPhase: number;
}
```

**Step 2: Create basic App.ts**

Create `src/App.ts`:

```typescript
import * as THREE from 'three';

export class App {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;

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

    // Start animation loop
    this.animate();
  }

  private onWindowResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  private animate() {
    requestAnimationFrame(this.animate.bind(this));
    this.renderer.render(this.scene, this.camera);
  }
}
```

**Step 3: Update main.ts**

Edit `src/main.ts`:

```typescript
import { App } from './App';

new App();
```

**Step 4: Test basic scene**

```bash
npm run dev
```

Expected: Black screen opens in browser at http://localhost:5173, no console errors

**Step 5: Commit**

```bash
git add src/
git commit -m "feat: create basic Three.js scene with camera and renderer"
```

---

### Task 1.3: Add FPS Counter

**Files:**
- Modify: `src/App.ts`

**Step 1: Add Stats.js for FPS monitoring**

```bash
npm install -D stats.ts
```

**Step 2: Integrate FPS counter in App.ts**

Add to `import` section:

```typescript
import Stats from 'stats.ts';
```

Add to `App` class properties:

```typescript
private stats: Stats;
```

Add to `constructor` after renderer setup:

```typescript
// FPS counter
this.stats = new Stats();
this.stats.showPanel(0);
document.body.appendChild(this.stats.dom);
```

Add to `animate` method at start:

```typescript
this.stats.begin();
```

Add to `animate` method before `requestAnimationFrame`:

```typescript
this.stats.end();
```

**Step 3: Test FPS counter**

```bash
npm run dev
```

Expected: FPS counter shows in top-left corner, showing ~60 FPS

**Step 4: Commit**

```bash
git add src/ package.json
git commit -m "feat: add FPS counter with Stats.js"
```

---

## Phase 2: MediaPipe Hand Tracking

### Task 2.1: Create HandTracker Component

**Files:**
- Create: `src/components/HandTracker.ts`

**Step 1: Create HandTracker skeleton**

Create `src/components/HandTracker.ts`:

```typescript
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
    this.handPosition = this.getHandPosition(landmarks);

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

  private getHandPosition(landmarks: Array<{x: number, y: number, z: number}>): [number, number, number] {
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
}
```

**Step 2: Commit**

```bash
git add src/components/
git commit -m "feat: create HandTracker with MediaPipe Tasks Vision"
```

---

### Task 2.2: Integrate HandTracker with App

**Files:**
- Modify: `src/App.ts`

**Step 1: Add HandTracker to App**

Add import:

```typescript
import { HandTracker } from './components/HandTracker';
```

Add property to `App` class:

```typescript
private handTracker: HandTracker;
```

Add to `constructor` before `animate()`:

```typescript
// Initialize hand tracking
this.handTracker = new HandTracker();
this.initHandTracking();
```

Add method:

```typescript
private async initHandTracking() {
  try {
    await this.handTracker.init();
    await this.handTracker.startCamera();
    console.log('Hand tracking initialized');
  } catch (error) {
    console.error('Failed to initialize hand tracking:', error);
  }
}
```

**Step 2: Test hand tracking initialization**

```bash
npm run dev
```

Expected: Browser requests camera permission, hand tracking initializes, console shows "Hand tracking initialized"

**Step 3: Commit**

```bash
git add src/
git commit -m "feat: integrate HandTracker with App"
```

---

### Task 2.3: Create CameraDisplay Component

**Files:**
- Create: `src/components/CameraDisplay.ts`

**Step 1: Create CameraDisplay with skeleton overlay**

Create `src/components/CameraDisplay.ts`:

```typescript
export class CameraDisplay {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private videoElement: HTMLVideoElement;

  constructor(videoElement: HTMLVideoElement) {
    this.videoElement = videoElement;

    // Create canvas for camera feed + skeleton
    this.canvas = document.createElement('canvas');
    this.canvas.style.position = 'fixed';
    this.canvas.style.bottom = '20px';
    this.canvas.style.right = '20px';
    this.canvas.style.width = '320px';
    this.canvas.style.height = '240px';
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
```

**Step 2: Integrate CameraDisplay with App**

Edit `src/App.ts`:

Add import:

```typescript
import { CameraDisplay } from './components/CameraDisplay';
```

Add property:

```typescript
private cameraDisplay: CameraDisplay;
```

Add to `initHandTracking` after `startCamera`:

```typescript
// Initialize camera display
this.cameraDisplay = new CameraDisplay(this.handTracker['videoElement']);
```

**Step 3: Update animation loop to draw skeleton**

Edit `animate` method in `src/App.ts`:

```typescript
private animate() {
  this.stats.begin();

  // Detect hand
  this.handTracker.detect();

  // Draw camera frame with skeleton
  const results = this.handTracker['landmarker']?.detectForVideo(
    this.handTracker['videoElement'],
    performance.now()
  );
  if (results?.landmarks[0]) {
    this.cameraDisplay.drawFrame(results.landmarks[0]);
  }

  this.renderer.render(this.scene, this.camera);
  this.stats.end();
  requestAnimationFrame(this.animate.bind(this));
}
```

**Step 4: Test camera display with skeleton**

```bash
npm run dev
```

Expected: Small camera feed in bottom-right corner shows live video with green skeleton overlay when hand is visible

**Step 5: Commit**

```bash
git add src/
git commit -m "feat: add CameraDisplay with skeleton overlay"
```

---

## Phase 3: Particle Number Generation

### Task 3.1: Create NumberGenerator Component

**Files:**
- Create: `src/components/NumberGenerator.ts`

**Step 1: Implement canvas text sampling**

Create `src/components/NumberGenerator.ts`:

```typescript
import { ParticleShape } from '../types/particle';

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
```

**Step 2: Commit**

```bash
git add src/components/
git commit -m "feat: create NumberGenerator with canvas text sampling"
```

---

### Task 3.2: Create ParticleSystem Component

**Files:**
- Create: `src/components/ParticleSystem.ts`

**Step 1: Create basic particle system with morph targets**

Create `src/components/ParticleSystem.ts`:

```typescript
import * as THREE from 'three';
import { NumberGenerator } from './NumberGenerator';
import type { ParticleShape } from '../types/particle';

export class ParticleSystem {
  private scene: THREE.Scene;
  private generator: NumberGenerator;
  private geometry: THREE.BufferGeometry;
  private material: THREE.ShaderMaterial;
  private points: THREE.Points;
  private morphTargets: Map<string, Float32Array> = new Map();
  private currentDigit: string = '5';
  private targetDigit: string = '5';
  private morphProgress: number = 0;
  private morphDuration: number = 1500; // ms
  private morphStartTime: number = 0;
  private isMorphing: boolean = false;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.generator = new NumberGenerator();

    // Generate all digit shapes
    this.generateAllShapes();

    // Create geometry with initial shape
    const positions = this.morphTargets.get('5')!;
    this.geometry = new THREE.BufferGeometry();
    this.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    // Add morph targets
    ['4', '3', '2', '1'].forEach(digit => {
      const targetPositions = this.morphTargets.get(digit)!;
      this.geometry.morphAttributes.position = this.geometry.morphAttributes.position || [];
      this.geometry.morphAttributes.position.push(new THREE.BufferAttribute(targetPositions, 3));
    });

    // Create shader material
    this.material = new THREE.ShaderMaterial({
      uniforms: {
        morphProgress: { value: 0.0 },
        color: { value: new THREE.Color(0xFFFFFF) },
        pointSize: { value: 4.0 }
      },
      vertexShader: `
        uniform float morphProgress;
        uniform float pointSize;

        void main() {
          vec3 pos = position;
          if (morphAttributes.position.length > 0) {
            pos = mix(position, morphAttributes.position[0], morphProgress);
          }
          gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
          gl_PointSize = pointSize;
        }
      `,
      fragmentShader: `
        uniform vec3 color;

        void main() {
          float r = distance(gl_PointCoord, vec2(0.5));
          if (r > 0.5) discard;
          float alpha = 1.0 - smoothstep(0.3, 0.5, r);
          gl_FragColor = vec4(color, alpha);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });

    // Create points mesh
    this.points = new THREE.Points(this.geometry, this.material);
    this.scene.add(this.points);
  }

  private generateAllShapes(): void {
    const digits = ['5', '4', '3', '2', '1'];
    digits.forEach(digit => {
      const positions = this.generator.generateDigit(digit, 10000);
      this.morphTargets.set(digit, positions);
    });
  }

  morphTo(targetDigit: string, duration: number = 1500): void {
    if (this.isMorphing) return;

    this.targetDigit = targetDigit;
    this.morphDuration = duration;
    this.morphStartTime = performance.now();
    this.isMorphing = true;
    this.morphProgress = 0;

    // Update morph target index based on current and target
    const digitOrder = ['5', '4', '3', '2', '1'];
    const targetIndex = digitOrder.indexOf(targetDigit);

    // Update geometry to use current shape as base
    this.geometry.attributes.position.array = this.morphTargets.get(this.currentDigit)!;
    this.geometry.attributes.position.needsUpdate = true;

    // Set morph target
    if (targetIndex > 0 && this.geometry.morphAttributes.position) {
      // Morph targets are stored in order [4, 3, 2, 1]
      const morphIndex = targetIndex - 1;
    }
  }

  update(deltaTime: number): void {
    if (this.isMorphing) {
      const elapsed = performance.now() - this.morphStartTime;
      this.morphProgress = Math.min(elapsed / this.morphDuration, 1.0);

      // Ease-out cubic
      const eased = 1 - Math.pow(1 - this.morphProgress, 3);
      this.material.uniforms.morphProgress.value = eased;

      if (this.morphProgress >= 1.0) {
        this.isMorphing = false;
        this.currentDigit = this.targetDigit;
        this.morphProgress = 0;
        this.material.uniforms.morphProgress.value = 0;
      }
    }
  }

  getCurrentDigit(): string {
    return this.currentDigit;
  }
}
```

**Step 2: Integrate ParticleSystem with App**

Edit `src/App.ts`:

Add import:

```typescript
import { ParticleSystem } from './components/ParticleSystem';
```

Add property:

```typescript
private particleSystem: ParticleSystem;
```

Add to `constructor` after scene creation:

```typescript
// Initialize particle system
this.particleSystem = new ParticleSystem(this.scene);
```

**Step 3: Test particle number display**

```bash
npm run dev
```

Expected: White particle number "5" displayed in center of screen

**Step 4: Commit**

```bash
git add src/
git commit -m "feat: create ParticleSystem with morph targets"
```

---

### Task 3.3: Add Manual Number Switching (Testing)

**Files:**
- Modify: `src/App.ts`

**Step 1: Add keyboard controls for testing**

Add method to `App` class:

```typescript
private setupKeyboardControls() {
  window.addEventListener('keydown', (e) => {
    const key = e.key;
    if (['5', '4', '3', '2', '1'].includes(key)) {
      this.particleSystem.morphTo(key, 1500);
    }
  });
}
```

Call in `constructor` before `animate()`:

```typescript
this.setupKeyboardControls();
```

**Step 2: Test number switching**

```bash
npm run dev
```

Expected: Press keys 5, 4, 3, 2, 1 to see particle morphing animations

**Step 3: Commit**

```bash
git add src/
git commit -m "feat: add keyboard controls for testing particle morphing"
```

---

## Phase 4: Morphing Animation Refinement

### Task 4.1: Improve Shader with Glow Effect

**Files:**
- Modify: `src/components/ParticleSystem.ts`

**Step 1: Update fragment shader for better glow**

Replace `fragmentShader` in `ParticleSystem.ts`:

```typescript
fragmentShader: `
  uniform vec3 color;

  void main() {
    vec2 center = gl_PointCoord - vec2(0.5);
    float dist = length(center);

    // Soft circular gradient
    float alpha = 1.0 - smoothstep(0.0, 0.5, dist);

    // Add glow effect
    float glow = exp(-dist * 3.0) * 0.5;
    alpha += glow;

    gl_FragColor = vec4(color, alpha);
  }
`,
```

**Step 2: Test improved glow**

```bash
npm run dev
```

Expected: Particles have softer, glowing appearance

**Step 3: Commit**

```bash
git add src/
git commit -m "feat: improve particle glow effect in shader"
```

---

### Task 4.2: Add Color Changes During Countdown

**Files:**
- Modify: `src/components/ParticleSystem.ts`

**Step 1: Add color uniform changes**

Add property to `ParticleSystem` class:

```typescript
private digitColors: Map<string, THREE.Color> = new Map([
  ['5', new THREE.Color(0xFFFFFF)], // White
  ['4', new THREE.Color(0xFFAA00)], // Orange
  ['3', new THREE.Color(0xFF0000)], // Red
  ['2', new THREE.Color(0xAA00FF)], // Purple
  ['1', new THREE.Color(0x00AAFF)]  // Blue
]);
```

Update `morphTo` method to include color transition:

```typescript
morphTo(targetDigit: string, duration: number = 1500): void {
  if (this.isMorphing) return;

  this.targetDigit = targetDigit;
  this.morphDuration = duration;
  this.morphStartTime = performance.now();
  this.isMorphing = true;
  this.morphProgress = 0;

  // Update geometry
  this.geometry.attributes.position.array = this.morphTargets.get(this.currentDigit)!;
  this.geometry.attributes.position.needsUpdate = true;

  // Start color transition (will be handled in update)
}
```

Update `update` method to interpolate color:

```typescript
update(deltaTime: number): void {
  if (this.isMorphing) {
    const elapsed = performance.now() - this.morphStartTime;
    this.morphProgress = Math.min(elapsed / this.morphDuration, 1.0);

    // Ease-out cubic
    const eased = 1 - Math.pow(1 - this.morphProgress, 3);
    this.material.uniforms.morphProgress.value = eased;

    // Interpolate color
    const startColor = this.digitColors.get(this.currentDigit)!;
    const endColor = this.digitColors.get(this.targetDigit)!;
    const currentColor = startColor.clone().lerp(endColor, eased);
    this.material.uniforms.color.value = currentColor;

    if (this.morphProgress >= 1.0) {
      this.isMorphing = false;
      this.currentDigit = this.targetDigit;
      this.morphProgress = 0;
      this.material.uniforms.morphProgress.value = 0;
      this.material.uniforms.color.value = this.digitColors.get(this.targetDigit);
    }
  }
}
```

**Step 2: Test color transitions**

```bash
npm run dev
```

Expected: Press 5→4→3→2→1 keys to see color transitions (white→orange→red→purple→blue)

**Step 3: Commit**

```bash
git add src/
git commit -m "feat: add color transitions during morphing"
```

---

## Phase 5: Gesture-Controlled Countdown

### Task 5.1: Add Countdown State Machine

**Files:**
- Modify: `src/App.ts`

**Step 1: Add countdown properties to App**

Add properties to `App` class:

```typescript
private countdownState: CountdownState = CountdownState.IDLE;
private currentPhase: number = 0;
private countdownSequence: string[] = ['5', '4', '3', '2', '1'];
private lastFiveFingerTime: number = 0;
private readonly TRIGGER_THRESHOLD = 500; // ms
```

**Step 2: Update animation loop with countdown logic**

Replace `animate` method:

```typescript
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
  const results = this.handTracker['landmarker']?.detectForVideo(
    this.handTracker['videoElement'],
    performance.now()
  );
  if (results?.landmarks[0]) {
    this.cameraDisplay.drawFrame(results.landmarks[0]);
  }

  this.renderer.render(this.scene, this.camera);
  this.stats.end();
  requestAnimationFrame(this.animate.bind(this));
}
```

**Step 3: Implement state handlers**

Add methods to `App` class:

```typescript
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
```

**Step 4: Test gesture-controlled countdown**

```bash
npm run dev
```

Expected:
1. Show 5 fingers to camera for 0.5s
2. Countdown starts automatically: 5→4→3→2→1
3. Show 5 fingers again after completion to reset

**Step 5: Commit**

```bash
git add src/
git commit -m "feat: implement gesture-controlled countdown with state machine"
```

---

### Task 5.2: Add Visual Feedback

**Files:**
- Modify: `src/App.ts`

**Step 1: Add status indicator**

Add property to `App` class:

```typescript
private statusElement: HTMLElement;
```

Add to `constructor`:

```typescript
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
```

Add method:

```typescript
private updateStatus(message: string, color: string = 'rgba(100, 100, 100, 0.8)') {
  this.statusElement.textContent = message;
  this.statusElement.style.backgroundColor = color;
}
```

Update state handlers to show status:

```typescript
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
```

**Step 2: Test visual feedback**

```bash
npm run dev
```

Expected: Status indicator shows countdown progress and current digit

**Step 3: Commit**

```bash
git add src/
git commit -m "feat: add visual status indicator for countdown"
```

---

## Phase 6: Particle Trails

### Task 6.1: Create ParticleTrail Component

**Files:**
- Create: `src/components/ParticleTrail.ts`

**Step 1: Implement object-pooled trail system**

Create `src/components/ParticleTrail.ts`:

```typescript
import * as THREE from 'three';

interface TrailParticle {
  active: boolean;
  life: number;
  position: [number, number, number];
  velocity: [number, number, number];
  color: [number, number, number];
}

export class ParticleTrail {
  private scene: THREE.Scene;
  private geometry: THREE.BufferGeometry;
  private material: THREE.PointsMaterial;
  private points: THREE.Points;
  private particles: TrailParticle[] = [];
  private maxParticles: number = 500;
  private positions: Float32Array;
  private colors: Float32Array;
  private sizes: Float32Array;

  constructor(scene: THREE.Scene) {
    this.scene = scene;

    // Initialize particle pool
    for (let i = 0; i < this.maxParticles; i++) {
      this.particles.push({
        active: false,
        life: 0,
        position: [0, 0, 0],
        velocity: [0, 0, 0],
        color: [1, 1, 1]
      });
    }

    // Create geometry
    this.positions = new Float32Array(this.maxParticles * 3);
    this.colors = new Float32Array(this.maxParticles * 3);
    this.sizes = new Float32Array(this.maxParticles);

    this.geometry = new THREE.BufferGeometry();
    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    this.geometry.setAttribute('color', new THREE.BufferAttribute(this.colors, 3));
    this.geometry.setAttribute('size', new THREE.BufferAttribute(this.sizes, 1));

    // Create material
    this.material = new THREE.PointsMaterial({
      size: 3,
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    this.points = new THREE.Points(this.geometry, this.material);
    this.scene.add(this.points);
  }

  spawn(position: [number, number, number]): void {
    // Find inactive particle
    const particle = this.particles.find(p => !p.active);
    if (!particle) return;

    particle.active = true;
    particle.life = 1.0;
    particle.position = [...position];

    // Random velocity with slight spread
    particle.velocity = [
      (Math.random() - 0.5) * 0.3,
      (Math.random() - 0.5) * 0.3,
      (Math.random() - 0.5) * 0.3
    ];

    // Color gradient based on life (will be updated in update)
    particle.color = [1, 1, 1];
  }

  update(deltaTime: number): void {
    let activeCount = 0;

    for (let i = 0; i < this.maxParticles; i++) {
      const p = this.particles[i];

      if (p.active) {
        // Update life
        p.life -= deltaTime / 2.0; // 2 second lifetime

        if (p.life <= 0) {
          p.active = false;
          continue;
        }

        // Update position
        p.position[0] += p.velocity[0];
        p.position[1] += p.velocity[1];
        p.position[2] += p.velocity[2];

        // Update color based on life (white → blue → purple)
        if (p.life > 0.6) {
          // White to blue
          const t = (1 - p.life) / 0.4;
          p.color = [1 - t, 1 - t, 1];
        } else {
          // Blue to purple
          const t = (0.6 - p.life) / 0.6;
          p.color = [t, 0, 1];
        }

        // Update arrays
        this.positions[i * 3] = p.position[0];
        this.positions[i * 3 + 1] = p.position[1];
        this.positions[i * 3 + 2] = p.position[2];

        this.colors[i * 3] = p.color[0];
        this.colors[i * 3 + 1] = p.color[1];
        this.colors[i * 3 + 2] = p.color[2];

        this.sizes[i] = p.life * 3; // Shrink with age

        activeCount++;
      } else {
        // Hide inactive particles
        this.sizes[i] = 0;
      }
    }

    this.geometry.attributes.position.needsUpdate = true;
    this.geometry.attributes.color.needsUpdate = true;
    this.geometry.attributes.size.needsUpdate = true;
  }
}
```

**Step 2: Commit**

```bash
git add src/components/
git commit -m "feat: create ParticleTrail with object pooling"
```

---

### Task 6.2: Integrate ParticleTrail with App

**Files:**
- Modify: `src/App.ts`

**Step 1: Add ParticleTrail to App**

Add import:

```typescript
import { ParticleTrail } from './components/ParticleTrail';
```

Add property:

```typescript
private particleTrail: ParticleTrail;
```

Add to `constructor` after particle system initialization:

```typescript
// Initialize particle trail
this.particleTrail = new ParticleTrail(this.scene);
```

**Step 2: Spawn trail particles at hand position**

Update `animate` method to spawn trail particles:

```typescript
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
  const results = this.handTracker['landmarker']?.detectForVideo(
    this.handTracker['videoElement'],
    performance.now()
  );
  if (results?.landmarks[0]) {
    this.cameraDisplay.drawFrame(results.landmarks[0]);
  }

  this.renderer.render(this.scene, this.camera);
  this.stats.end();
  requestAnimationFrame(this.animate.bind(this));
}
```

**Step 3: Test particle trails**

```bash
npm run dev
```

Expected: Moving hand creates colorful particle trails that follow movement

**Step 4: Commit**

```bash
git add src/
git commit -m "feat: integrate ParticleTrail with hand tracking"
```

---

## Phase 7: Polish & Optimization

### Task 7.1: Add Error Handling

**Files:**
- Modify: `src/App.ts`, `src/components/HandTracker.ts`

**Step 1: Add camera permission error handling**

Edit `src/App.ts`, update `initHandTracking` method:

```typescript
private async initHandTracking() {
  try {
    await this.handTracker.init();
    await this.handTracker.startCamera();
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
```

**Step 2: Test error handling**

```bash
npm run dev
```

Expected: If camera permission denied, show error message with retry button

**Step 3: Commit**

```bash
git add src/
git commit -m "feat: add camera permission error handling"
```

---

### Task 7.2: Add Performance Monitoring

**Files:**
- Modify: `src/App.ts`

**Step 1: Add adaptive quality based on FPS**

Add property to `App` class:

```typescript
private lastFrameTime: number = performance.now();
private frameCount: number = 0;
private fpsUpdateInterval: number = 1000; // ms
private currentFPS: number = 60;
```

Update `animate` method to track FPS:

```typescript
private animate() {
  this.stats.begin();

  // Calculate FPS
  this.frameCount++;
  const now = performance.now();
  if (now - this.lastFrameTime >= this.fpsUpdateInterval) {
    this.currentFPS = Math.round((this.frameCount * 1000) / (now - this.lastFrameTime));
    this.frameCount = 0;
    this.lastFrameTime = now;

    // Adaptive quality: reduce particles if FPS drops
    if (this.currentFPS < 45) {
      console.warn(`Low FPS detected: ${this.currentFPS}`);
      this.updateStatus(`${this.currentFPS} FPS - Low performance`, 'rgba(255, 170, 0, 0.8)');
    }
  }

  // ... rest of animate method
}
```

**Step 2: Test FPS monitoring**

```bash
npm run dev
```

Expected: FPS is tracked and warnings shown if performance drops

**Step 3: Commit**

```bash
git add src/
git commit -m "feat: add performance monitoring with FPS tracking"
```

---

### Task 7.3: Add Loading Screen

**Files:**
- Modify: `src/App.ts`

**Step 1: Create loading screen**

Add property to `App` class:

```typescript
private loadingElement: HTMLElement;
```

Add to `constructor` at the start:

```typescript
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
    Loading 3D Particle Countdown
  </div>
  <div style="color: #aaa; font-size: 16px;">Please wait while we load the hand tracking model...</div>
`;
document.body.appendChild(this.loadingElement);
```

Add method to hide loading screen:

```typescript
private hideLoadingScreen() {
  this.loadingElement.style.opacity = '0';
  this.loadingElement.style.transition = 'opacity 0.5s';
  setTimeout(() => {
    this.loadingElement.remove();
  }, 500);
}
```

Update `initHandTracking` to hide loading screen on success:

```typescript
private async initHandTracking() {
  try {
    await this.handTracker.init();
    await this.handTracker.startCamera();
    console.log('Hand tracking initialized');
    this.hideLoadingScreen();
    this.updateStatus('Show 5 fingers to start', 'rgba(100, 100, 100, 0.8)');
  } catch (error) {
    // ... error handling
  }
}
```

**Step 2: Test loading screen**

```bash
npm run dev
```

Expected: Loading screen shows during initialization, fades out when ready

**Step 3: Commit**

```bash
git add src/
git commit -m "feat: add loading screen during initialization"
```

---

## Phase 8: Deployment

### Task 8.1: Build Production Bundle

**Files:**
- Modify: `vite.config.ts`

**Step 1: Configure Vite for production**

Edit `vite.config.ts`:

```typescript
import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
    minify: 'terser',
    rollupOptions: {
      output: {
        manualChunks: {
          'three': ['three'],
          'mediapipe': ['@mediapipe/tasks-vision']
        }
      }
    }
  }
});
```

**Step 2: Build production bundle**

```bash
npm run build
```

Expected: Production bundle created in `dist/` directory

**Step 3: Test production build locally**

```bash
npm install -D serve
npx serve dist
```

Expected: App runs from production build at http://localhost:3000

**Step 4: Commit**

```bash
git add vite.config.ts
git commit -m "chore: configure Vite for production build"
```

---

### Task 8.2: Prepare for Deployment

**Files:**
- Create: `dist/.nojekyll`, `README.md`

**Step 1: Create .nojekyll file (for GitHub Pages if needed)**

```bash
touch dist/.nojekyll
```

**Step 2: Create README.md**

Create `README.md`:

```markdown
# Web 3D Particle Countdown

An interactive web experience using hand gestures to trigger 3D particle countdown animations.

## Features

- **Hand Gesture Control**: Show 5 fingers to start countdown
- **3D Particle Morphing**: Numbers smoothly transition (5→4→3→2→1) with 10,000+ particles
- **Real-time Hand Tracking**: Uses MediaPipe with GPU acceleration
- **Particle Trails**: Colorful trails follow your hand movement
- **60 FPS Performance**: GPU-accelerated rendering for smooth animations

## Tech Stack

- **Vite 6.x** - Fast build tool
- **TypeScript 5.x** - Type safety
- **Three.js r160+** - 3D particle rendering
- **MediaPipe Tasks Vision** - Hand tracking (GPU)
- **Tailwind CSS 4.x** - UI styling

## Local Development

```bash
npm install
npm run dev
```

Open http://localhost:5173 and allow camera access.

## Usage

1. Allow camera access when prompted
2. Show 5 fingers to the camera for 1 second
3. Watch the particle countdown (5→4→3→2→1)
4. Move your hand to create particle trails
5. Show 5 fingers again to restart

## Performance Targets

- 60 FPS with 20,000 particles
- <50ms hand tracking latency
- <3s initial load time

## Browser Support

- Chrome 90+ (recommended)
- Firefox 88+
- Safari 14+

**Note**: Requires HTTPS or localhost for camera access.
```

**Step 3: Commit**

```bash
git add README.md
git commit -m "docs: add README with usage instructions"
```

---

### Task 8.3: Final Testing

**Files:**
- None (testing)

**Step 1: Complete verification checklist**

Run through the full verification checklist:

- [ ] Hand Detection: Show 5 fingers → skeleton displays → count shows "5"
- [ ] Countdown Trigger: Hold 5 fingers for 0.5s → countdown starts
- [ ] Particle Morphing: Numbers transition smoothly (5→4→3→2→1)
- [ ] Particle Trails: Move hand → colorful trails follow
- [ ] Performance: 55-60 FPS throughout
- [ ] Reset: After countdown, can restart with 5 fingers

**Step 2: Test in different browsers**

Test in Chrome, Firefox, and Safari if available.

**Step 3: Document any issues**

If issues found, create tasks to fix them before final deployment.

**Step 4: Final commit**

```bash
git add .
git commit -m "chore: complete Phase 8 - ready for deployment"
```

---

## Completion Criteria

✅ All 8 phases complete
✅ App runs locally at 60 FPS
✅ Hand tracking works reliably
✅ Countdown triggers on 5-finger gesture
✅ Particle morphing is smooth
✅ Particle trails follow hand movement
✅ Error handling works (camera denial, loading failures)
✅ Production build creates optimized bundle
✅ README documents usage

## Final Commands

```bash
# Development
npm run dev

# Production build
npm run build

# Preview production build
npx serve dist
```

---

**Total estimated time:** 12-18 hours for full implementation
**Lines of code:** ~1,500 lines across 10 files
**Dependencies:** 3.js, @mediapipe/tasks-vision, tailwindcss

Ready to deploy to Vercel, Netlify, or GitHub Pages!
