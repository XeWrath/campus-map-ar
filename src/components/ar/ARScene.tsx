"use client";

import { useState, useRef, Suspense, useEffect, useMemo } from "react";
import { Canvas } from "@react-three/fiber";
import { ARButton, XR, useHitTest, Interactive, useXR } from "@react-three/xr";
import { Html, Text, OrbitControls, useGLTF, Center, Environment } from "@react-three/drei";
import * as THREE from "three";
import { arConfig } from "@/lib/ar-config";
import { campusLocations } from "@/data/campus";

function GedungEModel({ position }: { position: THREE.Vector3 }) {
  const { scene } = useGLTF("/models/model_if.glb");
  // Clone the scene so multiple instances can be rendered independently
  const clonedScene = useMemo(() => scene.clone(), [scene]);

  return (
    <group position={position}>
      <Center>
        <primitive object={clonedScene} />
      </Center>
    </group>
  );
}

// Preload the model to prevent lag when it's first spawned
useGLTF.preload("/models/model_if.glb");

function MasjidModel({ position }: { position: THREE.Vector3 }) {
  return (
    <group position={position}>
      {/* Courtyard */}
      <mesh castShadow receiveShadow position={[0, 0.05, 0]}>
        <boxGeometry args={[3, 0.1, 3]} />
        <meshStandardMaterial color="#cbd5e1" />
      </mesh>

      {/* Main Hall */}
      <mesh castShadow receiveShadow position={[0, 0.6, 0]}>
        <boxGeometry args={[2, 1, 2]} />
        <meshStandardMaterial color="#f8fafc" />
      </mesh>

      {/* Main Dome */}
      <mesh castShadow receiveShadow position={[0, 1.1, 0]}>
        <sphereGeometry args={[0.8, 32, 32, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color="#38bdf8" metalness={0.2} roughness={0.8} />
      </mesh>
      
      {/* Dome Top Finial */}
      <mesh castShadow receiveShadow position={[0, 2.0, 0]}>
        <cylinderGeometry args={[0.02, 0.02, 0.3]} />
        <meshStandardMaterial color="#eab308" />
      </mesh>

      {/* Minaret */}
      <group position={[1.2, 0, 1.2]}>
        <mesh castShadow receiveShadow position={[0, 0.8, 0]}>
          <cylinderGeometry args={[0.15, 0.2, 1.6]} />
          <meshStandardMaterial color="#f1f5f9" />
        </mesh>
        <mesh castShadow receiveShadow position={[0, 1.7, 0]}>
          <sphereGeometry args={[0.15, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <meshStandardMaterial color="#38bdf8" />
        </mesh>
      </group>
    </group>
  );
}

function LibraryModel({ position }: { position: THREE.Vector3 }) {
  return (
    <group position={position}>
      {/* Base Plaza */}
      <mesh castShadow receiveShadow position={[0, 0.05, 0]}>
        <boxGeometry args={[3.5, 0.1, 3.5]} />
        <meshStandardMaterial color="#94a3b8" />
      </mesh>

      {/* Core Building */}
      <mesh castShadow receiveShadow position={[0, 0.7, 0]}>
        <boxGeometry args={[2, 1.2, 2]} />
        <meshStandardMaterial color="#334155" />
      </mesh>

      {/* Wraparound Glass */}
      <mesh castShadow receiveShadow position={[0, 0.7, 0]}>
        <boxGeometry args={[2.1, 1.0, 2.1]} />
        <meshStandardMaterial color="#38bdf8" opacity={0.4} transparent metalness={0.9} roughness={0.1} />
      </mesh>

      {/* Flat Roof */}
      <mesh castShadow receiveShadow position={[0, 1.35, 0]}>
        <boxGeometry args={[2.3, 0.1, 2.3]} />
        <meshStandardMaterial color="#cbd5e1" />
      </mesh>
    </group>
  );
}

function HitTestManager({ locationId }: { locationId: string }) {
  const [modelPosition, setModelPosition] = useState<THREE.Vector3 | null>(null);
  const reticleRef = useRef<THREE.Mesh>(null);
  const { isPresenting } = useXR();

  useHitTest((hitMatrix: THREE.Matrix4, hit: any) => {
    if (reticleRef.current) {
      hitMatrix.decompose(
        reticleRef.current.position,
        reticleRef.current.quaternion,
        reticleRef.current.scale
      );
      reticleRef.current.rotation.set(-Math.PI / 2, 0, 0);
    }
  });

  const placeModel = () => {
    if (reticleRef.current) {
      setModelPosition(reticleRef.current.position.clone());
    }
  };

  // 1) Desktop / Non-AR Preview
  if (!isPresenting) {
    const centerPos = new THREE.Vector3(0, 0, 0);
    return (
      <>
        {locationId === "gedung-e" && <GedungEModel position={centerPos} />}
        {locationId === "masjid-fsm" && <MasjidModel position={centerPos} />}
        {locationId === "perpustakaan-fsm" && <LibraryModel position={centerPos} />}
        {!["gedung-e", "masjid-fsm", "perpustakaan-fsm"].includes(locationId) && (
          <GedungEModel position={centerPos} />
        )}
      </>
    );
  }

  // 2) Actual AR Mode (Hit Testing)
  return (
    <>
      <Interactive onSelect={placeModel}>
        <mesh ref={reticleRef} rotation-x={-Math.PI / 2}>
          <ringGeometry args={[0.1, 0.15, 32]} />
          <meshBasicMaterial color="#34d399" />
        </mesh>
      </Interactive>

      {modelPosition && locationId === "gedung-e" && <GedungEModel position={modelPosition} />}
      {modelPosition && locationId === "masjid-fsm" && <MasjidModel position={modelPosition} />}
      {modelPosition && locationId === "perpustakaan-fsm" && <LibraryModel position={modelPosition} />}
      {modelPosition && !["gedung-e", "masjid-fsm", "perpustakaan-fsm"].includes(locationId) && (
        <GedungEModel position={modelPosition} /> // fallback
      )}
    </>
  );
}

function WebcamBackground({ onStop }: { onStop: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    let stream: MediaStream | null = null;
    async function startCamera() {
      try {
        // Try rear camera first (for mobile), then front camera, then any camera
        try {
          stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        } catch {
          console.warn("Kamera belakang tidak tersedia, mencoba kamera depan...");
          try {
            stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } });
          } catch {
            console.warn("facingMode tidak didukung, mencoba kamera apa saja...");
            stream = await navigator.mediaDevices.getUserMedia({ video: true });
          }
        }
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.error("Gagal membuka kamera:", err);
        const errorMessage = err instanceof Error ? err.message : String(err);
        if (errorMessage.includes("NotAllowedError") || errorMessage.includes("Permission")) {
          alert("Izin kamera ditolak. Buka pengaturan browser → izinkan akses kamera untuk localhost:3000");
        } else if (errorMessage.includes("NotFoundError") || errorMessage.includes("DevicesNotFound")) {
          alert("Tidak ditemukan kamera pada perangkat ini.");
        } else {
          alert("Gagal membuka kamera: " + errorMessage);
        }
        onStop();
      }
    }
    startCamera();

    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [onStop]);

  return (
    <video
      ref={videoRef}
      autoPlay
      playsInline
      muted
      className="absolute inset-0 w-full h-full object-cover z-0"
    />
  );
}

function DOMOverlayManager() {
  const { isPresenting } = useXR();
  useEffect(() => {
    const el = document.getElementById("ar-instructions");
    if (el) {
      el.style.display = isPresenting ? "flex" : "none";
    }
  }, [isPresenting]);
  return null;
}

export function ARScene({ locationId }: { locationId: string }) {
  const [overlayReady, setOverlayReady] = useState(false);
  const [isSimulatedAR, setIsSimulatedAR] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  
  useEffect(() => {
    setIsMobile(/Mobi|Android/i.test(navigator.userAgent));
    setOverlayReady(true);
  }, []);

  return (
    <div className={`relative h-full w-full flex flex-col items-center justify-center overflow-hidden ${isSimulatedAR ? 'bg-transparent' : 'bg-slate-950'}`}>
      
      {/* Fallback Laptop Camera */}
      {isSimulatedAR && <WebcamBackground onStop={() => setIsSimulatedAR(false)} />}

      {/* WebXR Native Button */}
      {overlayReady && !isSimulatedAR && (
        <ARButton
          sessionInit={{
            requiredFeatures: ["hit-test"],
            optionalFeatures: ["dom-overlay"],
            domOverlay: { root: document.getElementById("ar-overlay") || document.body }
          }}
          className="!absolute !bottom-32 !left-1/2 !-translate-x-1/2 !z-[100] !rounded-full !bg-slate-900/90 !px-8 !py-4 !font-bold !text-white !shadow-2xl border border-slate-700 !transition active:scale-95"
        />
      )}

      {/* Simulated AR Fallback Button for Desktop */}
      {overlayReady && !isSimulatedAR && (
        <button
          onClick={() => setIsSimulatedAR(true)}
          className="absolute bottom-16 left-1/2 -translate-x-1/2 z-[100] rounded-full bg-emerald-600 px-6 py-3 font-bold text-white shadow-xl transition active:scale-95 whitespace-nowrap"
        >
          {isMobile ? "BUKA KAMERA HP" : "BUKA KAMERA LAPTOP"}
        </button>
      )}
      
      {/* Stop Simulated AR Button */}
      {isSimulatedAR && (
        <button
          onClick={() => setIsSimulatedAR(false)}
          className="absolute bottom-16 left-1/2 -translate-x-1/2 z-[100] rounded-full bg-rose-600 px-6 py-3 font-bold text-white shadow-xl transition active:scale-95"
        >
          TUTUP KAMERA
        </button>
      )}

      <Canvas style={{ width: "100%", height: "100%", position: "absolute", inset: 0 }}>
        <XR>
          <DOMOverlayManager />
          <ambientLight intensity={1.2} />
          <directionalLight position={[5, 10, 5]} intensity={2} castShadow />
          
          <Suspense fallback={null}>
            <Environment preset="city" />
            <HitTestManager locationId={locationId} />
          </Suspense>
          
          <OrbitControls />
        </XR>
      </Canvas>
    </div>
  );
}
