declare module "mind-ar/dist/mindar-image-three.prod.js" {
  import * as THREE from "three";

  interface MindARThreeOptions {
    container: HTMLElement;
    imageTargetSrc: string;
    maxTrack?: number;
    uiLoading?: "yes" | "no";
    uiScanning?: "yes" | "no";
    uiError?: "yes" | "no";
    filterMinCF?: number;
    filterBeta?: number;
    warmupTolerance?: number;
    missTolerance?: number;
  }

  interface Anchor {
    group: THREE.Group;
    onTargetFound: (() => void) | null;
    onTargetLost: (() => void) | null;
    onTargetUpdate: (() => void) | null;
  }

  export class MindARThree {
    constructor(options: MindARThreeOptions);
    renderer: THREE.WebGLRenderer;
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    addAnchor(targetIndex: number): Anchor;
    start(): Promise<void>;
    stop(): void;
  }
}
