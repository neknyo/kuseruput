import { Component, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useLoader, useThree } from "@react-three/fiber";
import { Center, Html, OrbitControls } from "@react-three/drei";
import { Box3, MeshStandardMaterial, Vector3 } from "three";
import { OBJLoader } from "three-stdlib";

const MODEL_PATH = "/produk.obj";
const TARGET_SIZE = 2; // model is normalised so its longest side is 2 world units
const PART_COLORS = ["#d5f554", "#502119"]; // the OBJ ships without its .mtl, so we colour its two materials ourselves

class ModelErrorBoundary extends Component {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    if (this.state.failed) {
      return (
        <Html center className="w-48 text-center text-[11px] text-[#502119]">
          Model 3D gagal dimuat.
        </Html>
      );
    }
    return this.props.children;
  }
}

function Model() {
  const source = useLoader(OBJLoader, MODEL_PATH);

  const { object, scale } = useMemo(() => {
    const object = source.clone(true);
    object.traverse((child) => {
      if (!child.isMesh) return;
      const paint = (_, i) => new MeshStandardMaterial({ color: PART_COLORS[i % PART_COLORS.length], roughness: 0.45 });
      child.material = Array.isArray(child.material) ? child.material.map(paint) : paint(null, 0);
    });
    const size = new Box3().setFromObject(object).getSize(new Vector3());
    return { object, scale: TARGET_SIZE / Math.max(size.x, size.y, size.z) };
  }, [source]);

  return (
    <group scale={scale}>
      <Center>
        <primitive object={object} />
      </Center>
    </group>
  );
}

// Lives inside <Canvas> only to hand the renderer to the AR button outside it.
function ArBridge({ startRef }) {
  const { gl } = useThree();
  useEffect(() => {
    startRef.current = async () => {
      const session = await navigator.xr.requestSession("immersive-ar", { optionalFeatures: ["hit-test"] });
      gl.xr.enabled = true;
      await gl.xr.setSession(session);
    };
  }, [gl, startRef]);
  return null;
}

export default function ProductViewer3D({ className = "" }) {
  const [arSupported, setArSupported] = useState(false);
  const startAr = useRef(null);

  useEffect(() => {
    navigator.xr?.isSessionSupported?.("immersive-ar").then(setArSupported).catch(() => setArSupported(false));
  }, []);

  return (
    <div className={`flex flex-col ${className}`}>
      <div className="min-h-0 flex-1">
        <Canvas camera={{ position: [0, 0, 4], fov: 40 }}>
          <ambientLight intensity={1.2} />
          <directionalLight position={[3, 4, 3]} intensity={2} />
          <directionalLight position={[-3, -1, -2]} intensity={0.6} />
          <Suspense
            fallback={
              <Html center className="whitespace-nowrap text-[11px] text-[#502119]">
                Memuat model…
              </Html>
            }
          >
            <ModelErrorBoundary>
              <Model />
              <ArBridge startRef={startAr} />
            </ModelErrorBoundary>
          </Suspense>
          <OrbitControls enablePan={false} enableZoom={false} autoRotate autoRotateSpeed={1.5} />
        </Canvas>
      </div>

      {/* AR launcher sits directly below the canvas */}
      <div className="flex shrink-0 items-center justify-end gap-2 p-3">
        {!arSupported && <p className="text-[10px] text-[#502119]/60">AR tidak didukung di perangkat ini</p>}
        <button
          type="button"
          disabled={!arSupported}
          onClick={() => startAr.current?.()}
          aria-label="Lihat di AR"
          className="grid size-12 shrink-0 place-items-center rounded-full bg-[#d9d9d9] text-sm text-[#1e1e1e] transition-transform hover:scale-105 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:scale-100"
        >
          AR
        </button>
      </div>
    </div>
  );
}
