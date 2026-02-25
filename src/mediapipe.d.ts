declare module '@mediapipe/hands' {
  export class Hands {
    constructor(config?: any);
    setOptions(options: any): void;
    onResults(callback: (results: any) => void): void;
    send(data: any): Promise<any>;
  }
}

declare module '@mediapipe/camera_utils' {
  export class Camera {
    constructor(videoElement: HTMLVideoElement, options?: any);
    start(): Promise<void>;
  }
}
