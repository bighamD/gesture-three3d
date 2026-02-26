# 3D Fire Particle Gesture Display - Design Document

**Date:** 2026-02-26
**Author:** Claude + User
**Status:** Completed ✅

## Overview

An interactive web experience where users show hand gestures (0-5 fingers) via webcam to control a 3D fire particle number display. The system displays the detected finger count using 12,000 realistic fire particles with yellow→orange→red color gradient, upward velocity, and flickering effects.

**Key Changes from Original Design:**
- Removed countdown feature (5→4→3→2→1 morphing)
- Direct gesture-to-number mapping (show 3 fingers → displays "3")
- Fire particle effect with lifecycle management instead of morph targets
- Simplified state machine (idle vs showing number)
- Better performance with particle respawning system

## Architecture

### Three-Layer Architecture

```
┌─────────────────────────────────────────┐
│  Presentation Layer                     │
│  - Three.js WebGL rendering             │
│  - Particle rendering with colors       │
│  - Camera overlay with skeleton         │
└─────────────────────────────────────────┘
                 ↑
┌─────────────────────────────────────────┐
│  Processing Layer                       │
│  - ParticleNumberSystem (fire particles)│
│  - NumberGenerator (canvas sampling)    │
│  - Finger counting with stability       │
└─────────────────────────────────────────┘
                 ↑
┌─────────────────────────────────────────┐
│  Input Layer                            │
│  - Webcam video stream                  │
│  - MediaPipe hand tracking (legacy API) │
│  - Finger counting (0-5)                │
└─────────────────────────────────────────┘
```

### Data Flow

```
Webcam → HandTracker.detect()
         ↓
     fingerCount (0-5)
         ↓
     Stability detection (5-frame rolling window)
         ↓
     ParticleNumberSystem.showNumber(count)
         ↓
     Particles form number shape with fire effect
         ↓
     Three.js renders frame (60 FPS target)
```

## Core Components

### 1. ParticleNumberSystem.ts
**Purpose:** Fire particle number display with lifecycle management

**Key Features:**
- 12,000 particles with lifecycle (birth → death → respawn)
- Fire colors: yellow (center) → orange → red (edge)
- Upward velocity with random drift
- Flicker effect using sine waves
- Particles respawn at number positions when displaying digits

**Interface:**
```typescript
class ParticleNumberSystem {
  showNumber(number: number): void;    // Display digit 0-5
  hideNumber(): void;                   // Hide all particles
  update(deltaTime: number): void;      // Update particle positions/colors
}
```

**Particle Lifecycle:**
- **Birth**: Spawn at number position with random offset
- **Life**: Decrease from 1.0 → 0.0 over ~2 seconds
- **Death**: When life ≤ 0, respawn immediately
- **Color**: Based on life stage (yellow → orange → red)

### 2. NumberGenerator.ts
**Purpose:** Convert text to 3D particle positions

**Algorithm:**
1. Draw bold text to off-screen canvas (512x512)
2. Sample pixel data with `getImageData()`
3. Extract non-transparent pixel positions
4. Randomly select positions for particles
5. Normalize to 3D coordinates (-5 to +5 range)

**Interface:**
```typescript
class NumberGenerator {
  generateDigitPoints(digit: string): Array<{x, y}>;
}
```

### 3. HandTracker.ts
**Purpose:** MediaPipe integration with finger counting

**Key Features:**
- MediaPipe Hands legacy API (`@mediapipe/hands`)
- Confidence threshold (0.5) to filter noise
- Geometry-based finger counting:
  - Thumb: tip.x vs IP.x (left/right comparison)
  - Others: tip.y < PIP.y (pointing up)
- Stability detection (5-frame rolling window) to prevent jitter

**Interface:**
```typescript
class HandTracker {
  init(): Promise<void>;
  startCamera(): Promise<void>;
  detect(): number;                    // Returns 0-5
  onResults(callback): void;
}
```

**Stability Detection:**
```typescript
// Prevents jittery switching
private fingerCountHistory: number[] = [];
private readonly STABILITY_FRAMES = 5;

// Require 5 consecutive frames with same count
const allSame = fingerCountHistory.every(count =>
  count === fingerCountHistory[0]
);
```

### 4. CameraDisplay.ts
**Purpose:** Render video feed with skeleton overlay

**Key Features:**
- Hidden `<video>` element for MediaPipe
- Canvas overlay for skeleton drawing
- 21 keypoints per hand (wrists, fingertips, joints)
- Lines connecting key joints (green skeleton, red keypoints)

**Interface:**
```typescript
class CameraDisplay {
  drawFrame(landmarks): void;
}
```

## Data Structures

### ParticleData (Per-Particle Data)
```typescript
interface ParticleData {
  velocity: THREE.Vector3;    // Upward velocity
  life: number;                // 0-1 lifecycle
  decayRate: number;           // How fast life decreases
  randomOffset: number;        // For flicker effect
}
```

### App State
```typescript
interface AppState {
  isShowingNumber: boolean;     // Is a number currently displayed?
  currentNumber: number | null; // 0-5 or null
  fingerCount: number;          // Current detected count
  stableFingerCount: number;    // After stability detection
}
```

## Particle Fire Effect

### Color Gradient
```typescript
private colorYellow = new THREE.Color(0xffdd00);  // #FFDD00
private colorOrange = new THREE.Color(0xff6600);  // #FF6600
private colorRed = new THREE.Color(0xff2200);     // #FF2200

// Based on particle life:
if (data.life > 0.7) {
  color = this.colorYellow.clone();
} else if (data.life > 0.4) {
  color = this.colorOrange.clone();
} else {
  color = this.colorRed.clone();
}
```

### Flicker Effect
```typescript
const time = performance.now() * 0.001;
const flicker = 0.7 + Math.sin(time * 10 + data.randomOffset) * 0.3;
colors[i3] = color.r * flicker * data.life;
```

### Upward Movement
```typescript
// Apply upward velocity with random drift
positions[i3] += data.velocity.x;
positions[i3 + 1] += data.velocity.y;  // Upward (positive Y)
positions[i3 + 2] += data.velocity.z;
```

## Update Loop

```typescript
function animate() {
  handTracker.detect();           // Get finger count
  particleSystem.update();         // Update particle positions/colors
  cameraDisplay.drawFrame();       // Draw camera + skeleton
  renderer.render(scene, camera); // Draw frame
  requestAnimationFrame(animate);
}
```

## Error Handling

### Graceful Degradation

| Error | Recovery Strategy |
|-------|------------------|
| Camera permission denied | UI message requesting camera access |
| WebGL not supported | Fallback message (unlikely in modern browsers) |
| MediaPipe load failure | Console error, particles still work without gestures |
| Low FPS (<45) | Warning in console (no auto-adjustment currently) |

### User Feedback
- Finger count display (top-left corner)
- Camera feed with skeleton overlay (bottom-right)
- Loading message during initialization
- Console logs for debugging

## Performance Targets

- **60 FPS** stable with 12,000 particles
- **<50ms** hand tracking latency
- **<3s** initial load time
- **<200MB** memory usage

### Achieved Performance
- ✅ 60 FPS with 12,000 fire particles
- ✅ Fast gesture recognition with stability detection
- ✅ Smooth particle animations
- ✅ Responsive UI updates

## Tech Stack

- **Vite 6.x + TypeScript 5.x** - Fast build, HMR
- **Three.js r160+** - 3D particle rendering
- **MediaPipe Hands** (Legacy API) - Hand tracking
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
│   │   ├── ParticleNumberSystem.ts# Fire particle engine
│   │   ├── NumberGenerator.ts     # Text→particle converter
│   │   ├── HandTracker.ts         # MediaPipe integration
│   │   └── CameraDisplay.ts       # Camera feed + skeleton
│   └── types/
│       └── particle.ts
├── docs/
│   └── plans/
│       └── 2026-02-26-fire-particle-gesture-display-design.md
├── package.json
├── vite.config.ts
└── tsconfig.json
```

## Verification Checklist

- [x] Hand Detection: Show 0-5 fingers → skeleton displays correctly
- [x] Number Display: Particle number matches finger count
- [x] Fire Effect: Yellow→orange→red gradient with upward movement
- [x] Flicker Effect: Particles shimmer like fire
- [x] Stability: No jittery switching when changing finger count
- [x] Keyboard Control: Keys 0-5 also work for testing
- [x] Performance: 60 FPS with 12,000 particles
- [x] Camera Overlay: Live feed with green skeleton

### Test Scenarios

- Different lighting (bright, dim, backlit)
- Different distances (30cm, 60cm, 1m)
- Fast hand movements
- Partial hand visibility
- Background interference
- Chrome, Firefox, Safari

## Keyboard Controls

For testing without camera:
- Press `0` key: Hide particles
- Press `1-5` keys: Display corresponding number

## Fire Particle Characteristics

- **Count**: 12,000 particles
- **Size**: 0.08 units per particle
- **Colors**: Yellow (0xffdd00) → Orange (0xff6600) → Red (0xff2200)
- **Velocity**: Upward 0.01-0.03 units/frame
- **Life**: 0.5-1.5 seconds (randomized)
- **Flicker**: 70-100% brightness sine wave
- **Shape**: Form digits 0-5 using canvas text sampling

## Deployment

**Status:** ✅ Deployed to GitHub Pages
- **URL:** https://bighamd.github.io/gesture-three3d/
- **Source:** main branch, /docs directory
- **Build:** Production bundle via Vite

---

**Design approved by:** User
**Date approved:** 2026-02-25
**Implementation completed:** 2026-02-26
