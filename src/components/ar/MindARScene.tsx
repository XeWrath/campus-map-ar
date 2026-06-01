"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Script from "next/script";

interface MindARSceneProps {
  locationId: string;
  onTrackingStatus?: (status: "searching" | "found" | "lost") => void;
}

// Helper to load MindAR via CDN script (avoids webpack bundling issues with TF.js internals)
function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    // Check if already loaded
    if (document.querySelector(`script[src="${src}"]`)) {
      resolve();
      return;
    }
    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Failed to load script: ${src}`));
    document.head.appendChild(script);
  });
}

export function MindARScene({ locationId, onTrackingStatus }: MindARSceneProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mindarRef = useRef<any>(null);
  const [status, setStatus] = useState<"loading" | "starting" | "searching" | "found" | "error">("loading");
  const [errorMsg, setErrorMsg] = useState<string>("");

  const updateStatus = useCallback(
    (s: "searching" | "found" | "lost") => {
      if (s === "found") setStatus("found");
      else if (s === "lost" || s === "searching") setStatus("searching");
      onTrackingStatus?.(s);
    },
    [onTrackingStatus]
  );

  useEffect(() => {
    if (!containerRef.current) return;

    let stopped = false;

    async function initAR() {
      try {
        setStatus("loading");

        // Load Three.js and MindAR via CDN to avoid webpack/TF.js bundling conflicts
        await loadScript("https://cdn.jsdelivr.net/npm/mind-ar@1.2.5/dist/mindar-image-three.prod.js");

        // Access globals set by the CDN scripts
        const THREE = (window as any).MINDAR?.IMAGE?.THREE || (window as any).THREE;
        const MindARThree = (window as any).MINDAR?.IMAGE?.MindARThree;

        if (!MindARThree) {
          throw new Error("MindAR library failed to initialize. Please refresh the page.");
        }

        if (stopped) return;

        setStatus("starting");

        const mindarThree = new MindARThree({
          container: containerRef.current!,
          imageTargetSrc: "/targets/campus-map.mind",
          uiLoading: "no",
          uiScanning: "no",
          uiError: "no",
        });

        mindarRef.current = mindarThree;

        const { renderer, scene, camera } = mindarThree;

        // Lighting
        const ambientLight = new THREE.AmbientLight(0xffffff, 1.5);
        scene.add(ambientLight);

        const directionalLight = new THREE.DirectionalLight(0xffffff, 2.0);
        directionalLight.position.set(5, 10, 5);
        directionalLight.castShadow = true;
        scene.add(directionalLight);

        // Anchor for the first (only) image target
        const anchor = mindarThree.addAnchor(0);

        // Track found/lost
        anchor.onTargetFound = () => {
          if (!stopped) updateStatus("found");
        };
        anchor.onTargetLost = () => {
          if (!stopped) updateStatus("lost");
        };

        // Load 3D model based on locationId
        const modelPath = getModelPath(locationId);

        if (modelPath) {
          // Use Three.js GLTFLoader from the MindAR bundle's Three.js
          const { GLTFLoader } = await import("three/examples/jsm/loaders/GLTFLoader.js");
          const loader = new GLTFLoader();
          try {
            const gltf = await new Promise<any>((resolve, reject) => {
              loader.load(modelPath, resolve, undefined, reject);
            });

            if (stopped) return;

            const model = gltf.scene;

            // Scale and position the model to fit on the marker
            const box = new THREE.Box3().setFromObject(model);
            const size = box.getSize(new THREE.Vector3());
            const maxDim = Math.max(size.x, size.y, size.z);
            const scale = 1.0 / maxDim; // Normalize to ~1 unit
            model.scale.setScalar(scale);

            // Center the model
            const center = box.getCenter(new THREE.Vector3());
            model.position.sub(center.multiplyScalar(scale));
            // Lift it slightly above the marker
            model.position.y += 0.1;

            anchor.group.add(model);
          } catch (loadErr) {
            console.warn("GLB model tidak ditemukan, menggunakan placeholder:", loadErr);
            addPlaceholderModel(THREE, anchor.group, locationId);
          }
        } else {
          addPlaceholderModel(THREE, anchor.group, locationId);
        }

        // Add a label text (using sprite)
        const locationLabel = getLocationLabel(locationId);
        if (locationLabel) {
          const sprite = createTextSprite(THREE, locationLabel);
          sprite.position.set(0, 0.7, 0);
          sprite.scale.set(1.0, 0.25, 1);
          anchor.group.add(sprite);
        }

        // Start AR
        await mindarThree.start();

        if (stopped) {
          mindarThree.stop();
          return;
        }

        setStatus("searching");

        renderer.setAnimationLoop(() => {
          renderer.render(scene, camera);
        });
      } catch (err: any) {
        console.error("MindAR init error:", err);
        if (!stopped) {
          setStatus("error");
          if (err?.message?.includes("getUserMedia") || err?.message?.includes("Permission")) {
            setErrorMsg("Izin kamera ditolak. Buka pengaturan browser → izinkan akses kamera.");
          } else if (err?.message?.includes("NotFoundError")) {
            setErrorMsg("Tidak ditemukan kamera pada perangkat ini.");
          } else {
            setErrorMsg("Gagal memulai AR: " + (err?.message || String(err)));
          }
        }
      }
    }

    initAR();

    return () => {
      stopped = true;
      if (mindarRef.current) {
        try {
          mindarRef.current.stop();
        } catch (e) {
          // ignore cleanup errors
        }
        mindarRef.current = null;
      }
    };
  }, [locationId, updateStatus]);

  return (
    <div className="relative h-full w-full">
      {/* MindAR renders into this container (video + canvas) */}
      <div ref={containerRef} className="absolute inset-0 w-full h-full" />

      {/* Status overlay */}
      {status === "loading" && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-slate-950">
          <div className="flex flex-col items-center gap-4">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
            <p className="text-sm text-slate-300">Memuat AR engine...</p>
          </div>
        </div>
      )}

      {status === "starting" && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-slate-950/80">
          <div className="flex flex-col items-center gap-4">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
            <p className="text-sm text-slate-300">Menyalakan kamera...</p>
          </div>
        </div>
      )}

      {status === "searching" && (
        <div className="absolute bottom-24 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
          <div className="rounded-xl bg-slate-900/80 px-6 py-3 text-center backdrop-blur-md border border-emerald-500/30 animate-pulse">
            <p className="text-sm font-bold text-white">🔍 Arahkan kamera ke peta kampus</p>
            <p className="text-xs text-slate-300 mt-1">Scan gambar peta FSM UNDIP</p>
          </div>
        </div>
      )}

      {status === "found" && (
        <div className="absolute bottom-24 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
          <div className="rounded-xl bg-emerald-600/80 px-6 py-3 text-center backdrop-blur-md border border-emerald-400/50">
            <p className="text-sm font-bold text-white">✅ Marker terdeteksi!</p>
          </div>
        </div>
      )}

      {status === "error" && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-slate-950 p-6">
          <div className="rounded-2xl border border-rose-500/30 bg-slate-900/80 p-6 text-center max-w-sm backdrop-blur-md">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-rose-500/10 text-rose-400 text-3xl">
              ⚠️
            </div>
            <h3 className="mb-2 text-lg font-bold text-white">Gagal Memulai AR</h3>
            <p className="text-sm text-slate-400 leading-relaxed">{errorMsg}</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 rounded-xl bg-emerald-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 transition"
            >
              Coba Lagi
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Helpers ───

function getModelPath(locationId: string): string | null {
  const modelMap: Record<string, string> = {
    "gedung-e": "/models/model_if.glb",
  };
  return modelMap[locationId] || modelMap["gedung-e"]; // fallback to gedung-e
}

function getLocationLabel(locationId: string): string {
  const labels: Record<string, string> = {
    "gedung-e": "Gedung E - Informatika",
    "gedung-a": "Gedung A - Matematika",
    "gedung-b": "Gedung B - Fisika",
    "gedung-d": "Gedung D - Kimia",
    "masjid-fsm": "Masjid Al-Kautsar",
    "perpustakaan-fsm": "Perpustakaan FSM",
  };
  return labels[locationId] || "FSM UNDIP";
}

function addPlaceholderModel(THREE: any, group: any, locationId: string) {
  const colors: Record<string, number> = {
    "gedung-e": 0x34d399,
    "gedung-a": 0x60a5fa,
    "gedung-b": 0xf59e0b,
    "gedung-d": 0xf87171,
    "masjid-fsm": 0x38bdf8,
    "perpustakaan-fsm": 0x818cf8,
  };
  const color = colors[locationId] || 0x34d399;

  const base = new THREE.Mesh(
    new THREE.BoxGeometry(0.6, 0.05, 0.4),
    new THREE.MeshStandardMaterial({ color: 0x94a3b8 })
  );
  base.position.y = 0.025;
  group.add(base);

  const body = new THREE.Mesh(
    new THREE.BoxGeometry(0.5, 0.3, 0.3),
    new THREE.MeshStandardMaterial({ color })
  );
  body.position.y = 0.2;
  group.add(body);

  const roof = new THREE.Mesh(
    new THREE.BoxGeometry(0.55, 0.03, 0.35),
    new THREE.MeshStandardMaterial({ color: 0xcbd5e1 })
  );
  roof.position.y = 0.365;
  group.add(roof);
}

function createTextSprite(THREE: any, text: string): any {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d")!;
  canvas.width = 512;
  canvas.height = 128;

  ctx.fillStyle = "rgba(15, 23, 42, 0.85)";
  ctx.beginPath();
  ctx.roundRect(8, 8, canvas.width - 16, canvas.height - 16, 16);
  ctx.fill();

  ctx.strokeStyle = "rgba(52, 211, 153, 0.6)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(8, 8, canvas.width - 16, canvas.height - 16, 16);
  ctx.stroke();

  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 32px Arial, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, canvas.width / 2, canvas.height / 2);

  const texture = new THREE.CanvasTexture(canvas);
  const material = new THREE.SpriteMaterial({ map: texture, transparent: true });
  const sprite = new THREE.Sprite(material);

  return sprite;
}
