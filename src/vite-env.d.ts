/// <reference types="vite/client" />

declare module 'stats.ts' {
  export class Stats {
    dom: HTMLElement;
    showPanel(id: number): void;
    begin(): void;
    end(): void;
  }
}
