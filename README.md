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

## Project Structure

```
gesture-three3d/
├── src/
│   ├── main.ts                    # Vite entry
│   ├── App.ts                     # Main orchestrator
│   ├── components/
│   │   ├── ParticleSystem.ts      # GPU particle engine
│   │   ├── NumberGenerator.ts     # Text→particle converter
│   │   ├── HandTracker.ts         # MediaPipe integration
│   │   ├── CameraDisplay.ts       # Camera feed + skeleton
│   │   └── ParticleTrail.ts       # Hand-following trails
│   └── types/
│       └── particle.ts
├── public/
│   └── index.html
├── docs/
│   └── plans/
│       ├── 2026-02-25-web-3d-particle-countdown-design.md
│       └── 2026-02-25-web-3d-particle-countdown-implementation.md
├── package.json
├── vite.config.ts
└── tsconfig.json
```

## License

MIT
