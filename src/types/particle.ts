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
