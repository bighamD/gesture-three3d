# Web 3D Particle Countdown - Design Document

**Date:** 2025-02-25
**Author:** Claude + User
**Status:** Approved

## Overview

Build an interactive web experience where users show hand gestures (0-5 fingers) via MacBook webcam, triggering a 3D particle countdown animation (5→4→3→2→1) with smooth morphing particle numbers, camera feed display with hand skeleton overlay, and particle trails following hand movement.

## Architecture

### Three-Layer Architecture

```
┌─────────────────────────────────────────┐
│  Presentation Layer                     │
│  - Three.js WebGL rendering             │
│  - Custom shaders (vertex + fragment)   │
│  - Camera overlay with skeleton         │
└─────────────────────────────────────────┘
                 ↑
┌─────────────────────────────────────────┐
│  Processing Layer                       │
│  - ParticleSystem (GPU morphing)        │
│  - ParticleTrail (object pooling)       │
│  - NumberGenerator (canvas sampling)    │
└─────────────────────────────────────────┘
                 ↑
┌─────────────────────────────────────────┐
│  Input Layer                            │
│  - Webcam video stream                  │
│  - MediaPipe hand tracking              │
│  - Finger counting (0-5)                │
└─────────────────────────────────────────┘
```

### Data Flow

```
Webcam → HandTracker.detect()
         ↓
     fingerCount (0-5)
         ↓
     trigger: 5 fingers held for 500ms
         ↓
     Countdown starts (5→4→3→2→1)
         ↓
     ParticleSystem.morphTo(nextNumber)
     ParticleTrail.update(handPosition)
         ↓
     Three.js renders frame (60 FPS target)
```

## Core Components

### 1. ParticleSystem.ts
**Purpose:** GPU-accelerated particle engine with morph targets

**Key Features:**
- Pre-generates number shapes (5,4,3,2,1) as Float32Array positions
- Uses Three.js morphTargets for smooth transitions
- Custom ShaderMaterial with `morphProgress` uniform (0→1)
- Vertex shader: `mix(currentPosition, targetPosition, morphProgress)`
- Ease-out cubic easing for natural deceleration

**Interface:**
```typescript
class ParticleSystem {
  generateShape(digit: string): ParticleShape;
  morphTo(targetDigit: string, duration: number): void;
  update(deltaTime: number): void;
}
```

### 2. NumberGenerator.ts
**Purpose:** Convert text to 3D particle positions

**Algorithm:**
1. Draw bold text to off-screen canvas (512x512)
2. Sample pixel data with `getImageData()`
3. Extract non-transparent pixel positions
4. Randomly select 10,000 positions
5. Normalize to 3D coordinates (-5 to +5 range)

**Interface:**
```typescript
class NumberGenerator {
  generateDigit(digit: string, particleCount: number): Float32Array;
}
```

### 3. HandTracker.ts
**Purpose:** MediaPipe integration with finger counting

**Key Features:**
- MediaPipe Tasks Vision API (new, GPU-accelerated)
- Confidence threshold (0.5) to filter noise
- 500ms debounce on 5-finger detection
- Simple geometry-based counting:
  - Thumb: tip.x vs IP.x (left/right comparison)
  - Others: tip.y < PIP.y (pointing up)

**Interface:**
```typescript
class HandTracker {
  init(): Promise<void>;
  detect(): number; // Returns 0-5
  getHandPosition(): [number, number, number];
  onSkeletonDraw(callback): void;
}
```

### 4. CameraDisplay.ts
**Purpose:** Render video feed with skeleton overlay

**Key Features:**
- Hidden `<video>` element for MediaPipe
- Canvas overlay for skeleton drawing
- 21 keypoints per hand (wrists, fingertips, joints)
- Lines connecting key joints

**Interface:**
```typescript
class CameraDisplay {
  start(): Promise<void>;
  drawSkeleton(landmarks): void;
}
```

### 5. ParticleTrail.ts
**Purpose:** Hand-following particle trails

**Key Features:**
- Object pooling (pre-allocated 500 particles)
- Spawn at hand position every frame
- Perlin noise velocity for organic movement
- Fade out over 2 seconds (life: 1.0 → 0.0)
- Color gradient: white → blue → purple

**Interface:**
```typescript
class ParticleTrail {
  spawn(position: [number, number, number]): void;
  update(deltaTime: number): void;
  getGeometry(): BufferGeometry;
}
```

## Data Structures

### ParticleShape
```typescript
interface ParticleShape {
  positions: Float32Array;  // [x, y, z] × 10,000
  colors: Float32Array;     // [r, g, b] × 10,000
}
```

### Countdown State Machine
```typescript
enum CountdownState {
  IDLE = 'idle',              // Waiting for 5 fingers
  COUNTDOWN = 'countdown',    // Morphing 5→4→3→2→1
  COMPLETE = 'complete'       // Finished, waiting for reset
}
```

### TrailParticle (Object Pool)
```typescript
interface TrailParticle {
  active: boolean;
  life: number;              // 1.0 → 0.0 over 2 seconds
  position: [number, number, number];
  velocity: [number, number, number];
  color: [number, number, number];
}
```

## App-Level State

```typescript
interface AppState {
  currentDigit: string;           // '5', '4', '3', '2', '1'
  countdownState: CountdownState;
  fingerCount: number;            // 0-5 from HandTracker
  handPosition: [number, number, number];
  morphProgress: number;          // 0-1 for current transition
  currentPhase: number;           // 0-4 (index into COUNTDOWN_SEQUENCE)
}
```

## Update Loop

```typescript
function animate() {
  handTracker.detect();           // Get finger count
  particleSystem.update();         // Update morph progress
  particleTrail.update(handPos);   // Spawn/update trails
  renderer.render(scene, camera); // Draw frame
  requestAnimationFrame(animate);
}
```

## Error Handling

### Graceful Degradation

| Error | Recovery Strategy |
|-------|------------------|
| Camera permission denied | UI message + "Enable camera" button |
| WebGL not supported | "Browser not supported" message |
| MediaPipe load failure | Retry 3x (exp backoff), then error UI |
| Low FPS (<45) | Auto-reduce particles: 20k → 10k → 5k |
| Hand tracking lost | Show "Show hand" message, don't crash |

### User Feedback
- Toast notifications for errors
- FPS counter (top-right, toggleable)
- Loading progress bar during model download (~20MB)
- Visual indicator when countdown triggers (border flash)

## Performance Targets

- **60 FPS** stable with 20,000 particles
- **<50ms** hand tracking latency
- **<3s** initial load time
- **<200MB** memory usage

### Optimization Strategies

1. **GPU Acceleration:**
   - Morph interpolation in vertex shader
   - MediaPipe GPU delegate
   - Particle rendering as single BufferGeometry

2. **Object Pooling:**
   - Trail particles pre-allocated (no GC)
   - Fixed Float32Array updates (batch)

3. **Adaptive Quality:**
   - Monitor FPS, reduce particles if needed
   - Skip trail rendering if FPS < 30

## Tech Stack

- **Vite 6.x + TypeScript 5.x** - Fast build, HMR
- **Three.js r160+** - 3D particle rendering
- **MediaPipe Tasks Vision** - Hand tracking (GPU)
- **Tailwind CSS 4.x** - UI styling

## Project Structure

```
gesture-three3d/
├── public/
│   └── index.html
├── src/
│   ├── main.ts                    # Vite entry
│   ├── App.ts                     # Main orchestrator
│   ├── components/
│   │   ├── ParticleSystem.ts      # GPU particle engine
│   │   ├── NumberGenerator.ts     # Text→particle converter
│   │   ├── HandTracker.ts         # MediaPipe integration
│   │   ├── CameraDisplay.ts       # Camera feed + skeleton
│   │   └── ParticleTrail.ts       # Hand-following trails
│   ├── shaders/
│   │   ├── particle.vert.glsl     # Morphing vertex shader
│   │   └── particle.frag.glsl     # Glow fragment shader
│   └── types/
│       └── particle.ts
├── docs/
│   └── plans/
│       └── 2026-02-25-web-3d-particle-countdown-design.md
├── package.json
├── vite.config.ts
└── tsconfig.json
```

## Verification Checklist

- [ ] Hand Detection: Show 5 fingers → skeleton displays → count shows "5"
- [ ] Countdown Trigger: Hold 5 fingers for 500ms → countdown starts
- [ ] Particle Morphing: Numbers transition smoothly (5→4→3→2→1)
- [ ] Particle Trails: Move hand → colorful trails follow
- [ ] Performance: 55-60 FPS throughout
- [ ] Reset: After countdown, can restart with 5 fingers

### Test Scenarios

- Different lighting (bright, dim, backlit)
- Different distances (30cm, 60cm, 1m)
- Fast hand movements
- Partial hand visibility
- Background interference
- Chrome, Firefox, Safari

## Countdown Sequence

```typescript
const COUNTDOWN_SEQUENCE = ['5', '4', '3', '2', '1'];
const MORPH_DURATION = 1500; // ms per digit
const TRIGGER_THRESHOLD = 500; // ms hold 5 fingers

// Timeline:
// 0.0s: 5 fingers detected (start countdown)
// 0.0-1.5s: 5 → 4 morph
// 1.5-3.0s: 4 → 3 morph
// 3.0-4.5s: 3 → 2 morph
// 4.5-6.0s: 2 → 1 morph
// 6.0s+: Complete, show "Finished" message
```

## Shaders

### Vertex Shader (particle.vert.glsl)
```glsl
uniform float morphProgress;
attribute vec3 morphTarget0;

void main() {
  vec3 pos = mix(position, morphTarget0, morphProgress);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  gl_PointSize = 4.0;
}
```

### Fragment Shader (particle.frag.glsl)
```glsl
uniform vec3 color;

void main() {
  float r = distance(gl_PointCoord, vec2(0.5));
  if (r > 0.5) discard;
  float alpha = 1.0 - smoothstep(0.3, 0.5, r);
  gl_FragColor = vec4(color, alpha);
}
```

## Next Steps

1. ✅ Design document approved
2. ⏭️ Create detailed implementation plan (writing-plans skill)
3. ⏭️ Initialize project with Vite + dependencies
4. ⏭️ Implement phases 1-8 sequentially

---

**Design approved by:** User
**Date approved:** 2025-02-25
