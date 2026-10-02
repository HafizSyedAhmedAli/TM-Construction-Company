// apps/web/src/components/HouseViewer.tsx
"use client";

import { useMemo, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Grid } from "@react-three/drei";
import type { Geometry } from "@tmcc/shared-types";

function Walls({ geometry, showRoof }: { geometry: Geometry; showRoof: boolean }) {
  const { walls, cx, cz, w, d, h } = useMemo(() => {
    const xs = geometry.walls.flatMap((s) => [s.startX, s.endX]);
    const ys = geometry.walls.flatMap((s) => [s.startY, s.endY]);
    const minX = Math.min(...xs), maxX = Math.max(...xs);
    const minY = Math.min(...ys), maxY = Math.max(...ys);
    return {
      walls: geometry.walls,
      cx: (minX + maxX) / 2,
      cz: (minY + maxY) / 2,
      w: maxX - minX,
      d: maxY - minY,
      h: geometry.walls[0]?.height ?? 10,
    };
  }, [geometry]);

  if (walls.length === 0) return null;

  return (
    <group>
      {/* floor slab */}
      <mesh position={[0, -0.25, 0]} receiveShadow>
        <boxGeometry args={[w + 2, 0.5, d + 2]} />
        <meshStandardMaterial color="#e6e2d9" />
      </mesh>

      {walls.map((s) => {
        const dx = s.endX - s.startX;
        const dy = s.endY - s.startY;
        const len = Math.hypot(dx, dy);
        if (len === 0) return null;
        const exterior = s.thickness >= 0.6;
        return (
          <mesh
            key={s.id}
            position={[
              (s.startX + s.endX) / 2 - cx,
              s.height / 2,
              (s.startY + s.endY) / 2 - cz,
            ]}
            rotation={[0, -Math.atan2(dy, dx), 0]}
            castShadow
            receiveShadow
          >
            {/* + thickness closes the corners */}
            <boxGeometry args={[len + s.thickness, s.height, s.thickness]} />
            <meshStandardMaterial color={exterior ? "#d8d4cc" : "#efece6"} />
          </mesh>
        );
      })}

      {showRoof && (
        <mesh position={[0, h + 0.25, 0]} castShadow>
          <boxGeometry args={[w + 1, 0.5, d + 1]} />
          <meshStandardMaterial color="#b9b4aa" />
        </mesh>
      )}
    </group>
  );
}

export function HouseViewer({ geometry }: { geometry: Geometry }) {
  const [roof, setRoof] = useState(false);
  const size = Math.max(
    ...geometry.walls.flatMap((s) => [s.endX - s.startX, s.endY - s.startY].map(Math.abs)),
    20,
  );

  return (
    <div className="relative h-[480px] w-full rounded-xl overflow-hidden border border-stone-200 bg-stone-100">
      <Canvas shadows camera={{ position: [size, size, size], fov: 45 }}>
        <ambientLight intensity={0.6} />
        <directionalLight position={[size, size * 1.5, size / 2]} intensity={1.1} castShadow />
        <Walls geometry={geometry} showRoof={roof} />
        <Grid args={[200, 200]} position={[0, -0.51, 0]} cellColor="#ccc" sectionColor="#aaa" fadeDistance={150} />
        <OrbitControls makeDefault maxPolarAngle={Math.PI / 2.05} />
      </Canvas>
      <label className="absolute top-3 right-3 text-xs bg-white/90 rounded px-2 py-1 cursor-pointer">
        <input type="checkbox" checked={roof} onChange={(e) => setRoof(e.target.checked)} /> Roof
      </label>
    </div>
  );
}