import { Canvas, useFrame } from '@react-three/fiber';
import type { MutableRefObject } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';

type SkullTone = 'light' | 'dark';

type SkullParticle = {
  baseX: number;
  baseY: number;
  velocityX: number;
  velocityY: number;
  phase: number;
  amplitude: number;
  speed: number;
  color: THREE.Color;
};

type Point = {
  x: number;
  y: number;
};

const SKULL_OUTLINE: Point[] = [
  { x: -0.16, y: -1.04 },
  { x: 0.16, y: -1.04 },
  { x: 0.31, y: -0.98 },
  { x: 0.39, y: -0.84 },
  { x: 0.39, y: -0.61 },
  { x: 0.53, y: -0.50 },
  { x: 0.65, y: -0.26 },
  { x: 0.60, y: -0.04 },
  { x: 0.49, y: 0.10 },
  { x: 0.67, y: 0.36 },
  { x: 0.74, y: 0.66 },
  { x: 0.66, y: 0.94 },
  { x: 0.46, y: 1.16 },
  { x: 0.18, y: 1.29 },
  { x: 0, y: 1.32 },
  { x: -0.18, y: 1.29 },
  { x: -0.46, y: 1.16 },
  { x: -0.66, y: 0.94 },
  { x: -0.74, y: 0.66 },
  { x: -0.67, y: 0.36 },
  { x: -0.49, y: 0.10 },
  { x: -0.60, y: -0.04 },
  { x: -0.65, y: -0.26 },
  { x: -0.53, y: -0.50 },
  { x: -0.39, y: -0.61 },
  { x: -0.39, y: -0.84 },
  { x: -0.31, y: -0.98 },
];

const NOSE_VOID: Point[] = [
  { x: 0, y: 0.08 },
  { x: 0.12, y: -0.10 },
  { x: 0.09, y: -0.30 },
  { x: 0.03, y: -0.43 },
  { x: 0, y: -0.47 },
  { x: -0.03, y: -0.43 },
  { x: -0.09, y: -0.30 },
  { x: -0.12, y: -0.10 },
];

const TEETH_RECTS = [-0.28, -0.20, -0.12, -0.04, 0.04, 0.12, 0.20].map((x) => ({
  x,
  y: -0.97,
  width: 0.058,
  height: 0.31,
}));

const CHEEKBONE_LINES: Array<[Point, Point]> = [
  [{ x: -0.60, y: -0.02 }, { x: -0.18, y: -0.28 }],
  [{ x: 0.60, y: -0.02 }, { x: 0.18, y: -0.28 }],
  [{ x: -0.49, y: -0.20 }, { x: -0.27, y: -0.54 }],
  [{ x: 0.49, y: -0.20 }, { x: 0.27, y: -0.54 }],
];

const LIGHT_COLORS = ['#BBBBBB', '#CCCCCC', '#D4D4D4'];
const DARK_COLORS = ['#444444', '#555555', '#666666'];
const CENTER = new THREE.Vector2(0, 0.08);
const matrix = new THREE.Matrix4();
const tempColor = new THREE.Color();

function pointInPolygon(point: Point, polygon: Point[]) {
  let inside = false;

  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x;
    const yi = polygon[i].y;
    const xj = polygon[j].x;
    const yj = polygon[j].y;
    const intersects =
      yi > point.y !== yj > point.y &&
      point.x < ((xj - xi) * (point.y - yi)) / (yj - yi) + xi;

    if (intersects) inside = !inside;
  }

  return inside;
}

function ellipseContains(x: number, y: number, cx: number, cy: number, rx: number, ry: number, rotation: number) {
  const cos = Math.cos(rotation);
  const sin = Math.sin(rotation);
  const dx = x - cx;
  const dy = y - cy;
  const localX = dx * cos + dy * sin;
  const localY = -dx * sin + dy * cos;

  return (localX * localX) / (rx * rx) + (localY * localY) / (ry * ry) < 1;
}

function isInToothCluster(x: number, y: number) {
  return TEETH_RECTS.some(
    (rect) =>
      x >= rect.x &&
      x <= rect.x + rect.width &&
      y >= rect.y &&
      y <= rect.y + rect.height,
  );
}

function belongsToSkull(x: number, y: number) {
  const insideSilhouette = pointInPolygon({ x, y }, SKULL_OUTLINE);
  const leftEye = ellipseContains(x, y, -0.27, 0.27, 0.19, 0.29, -0.13);
  const rightEye = ellipseContains(x, y, 0.27, 0.27, 0.19, 0.29, 0.13);
  const nose = pointInPolygon({ x, y }, NOSE_VOID) || ellipseContains(x, y, 0, -0.20, 0.13, 0.25, 0);
  const templeCut = Math.abs(x) > 0.58 && y < 0.10 && y > -0.36;
  const jawGap = y < -0.65 && y > -1.00 && Math.abs(x) < 0.34 && !isInToothCluster(x, y);
  const lowerCornerCut = y < -0.78 && Math.abs(x) > 0.32;

  return insideSilhouette && !leftEye && !rightEye && !nose && !templeCut && !jawGap && !lowerCornerCut;
}

function seededRandom(seed: number) {
  const x = Math.sin(seed * 12.9898) * 43758.5453;

  return x - Math.floor(x);
}

function addLinePoints(points: Point[], from: Point, to: Point, spacing: number) {
  const distance = Math.hypot(to.x - from.x, to.y - from.y);
  const steps = Math.max(2, Math.floor(distance / spacing));

  for (let i = 0; i <= steps; i += 1) {
    const progress = i / steps;
    points.push({
      x: from.x + (to.x - from.x) * progress,
      y: from.y + (to.y - from.y) * progress,
    });
  }
}

function addPolygonPoints(points: Point[], polygon: Point[], spacing: number) {
  polygon.forEach((point, index) => {
    addLinePoints(points, point, polygon[(index + 1) % polygon.length], spacing);
  });
}

function buildPointMap(targetCount: number, tone: SkullTone) {
  const colors = tone === 'light' ? LIGHT_COLORS : DARK_COLORS;
  const candidates: Point[] = [];
  const spacing = targetCount <= 520 ? 0.063 : 0.031;

  for (let y = -1.05; y <= 1.32; y += spacing) {
    for (let x = -0.76; x <= 0.76; x += spacing) {
      const index = candidates.length + Math.floor((x + 2) * 1000) + Math.floor((y + 2) * 100);
      const jitterX = (seededRandom(index + 11) - 0.5) * spacing * 0.34;
      const jitterY = (seededRandom(index + 23) - 0.5) * spacing * 0.34;
      const point = { x: x + jitterX, y: y + jitterY };
      const interiorCranium = point.y > 0.38 && Math.abs(point.x) < 0.48;
      const keepInterior = !interiorCranium || seededRandom(index + 37) > 0.36;

      if (belongsToSkull(point.x, point.y) && keepInterior) {
        candidates.push(point);
      }
    }
  }

  addPolygonPoints(candidates, SKULL_OUTLINE, spacing * 0.38);
  addPolygonPoints(candidates, NOSE_VOID, spacing * 0.50);
  CHEEKBONE_LINES.forEach(([from, to]) => addLinePoints(candidates, from, to, spacing * 0.36));

  TEETH_RECTS.forEach((rect) => {
    for (let y = rect.y + 0.018; y < rect.y + rect.height - 0.018; y += spacing * 0.48) {
      for (let x = rect.x + 0.012; x < rect.x + rect.width - 0.012; x += spacing * 0.48) {
        candidates.push({ x, y });
      }
    }
  });

  const stride = Math.max(1, candidates.length / targetCount);
  const selected: Point[] = [];

  for (let i = 0; i < targetCount && i * stride < candidates.length; i += 1) {
    selected.push(candidates[Math.floor(i * stride)]);
  }

  return selected.map((point, index): SkullParticle => {
    const seed = index + (tone === 'light' ? 101 : 701);

    return {
      baseX: point.x,
      baseY: point.y,
      velocityX: (seededRandom(seed + 1) - 0.5) * 0.012,
      velocityY: (seededRandom(seed + 2) - 0.5) * 0.012,
      phase: seededRandom(seed + 3) * Math.PI * 2,
      amplitude: 0.02 + seededRandom(seed + 4) * 0.06,
      speed: 0.3 + seededRandom(seed + 5) * 0.5,
      color: new THREE.Color(colors[index % colors.length]),
    };
  });
}

function useMobileParticleCount() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const query = window.matchMedia('(max-width: 767px)');
    const update = () => setIsMobile(query.matches);

    update();
    query.addEventListener('change', update);

    return () => query.removeEventListener('change', update);
  }, []);

  return isMobile ? 520 : 1400;
}

function SkullParticles({
  tone,
  scale,
  mouse,
}: {
  tone: SkullTone;
  scale: number;
  mouse: MutableRefObject<{ active: boolean; x: number; y: number }>;
}) {
  const count = useMobileParticleCount();
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const geometryRef = useRef<THREE.SphereGeometry>(null);
  const materialRef = useRef<THREE.MeshBasicMaterial>(null);
  const particlesRef = useRef<SkullParticle[]>([]);
  const timeRef = useRef(0);

  const particles = useMemo(() => buildPointMap(count, tone), [count, tone]);
  particlesRef.current = particles;

  useEffect(() => {
    const mesh = meshRef.current;

    if (!mesh) return;

    particlesRef.current.forEach((particle, index) => {
      mesh.setColorAt(index, particle.color);
    });

    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [particles]);

  useEffect(() => {
    return () => {
      geometryRef.current?.dispose();
      materialRef.current?.dispose();
    };
  }, []);

  useFrame((state, delta) => {
    const mesh = meshRef.current;

    if (!mesh) return;

    timeRef.current += Math.min(delta, 1 / 60);
    const time = timeRef.current;
    const breath = Math.sin(time * 0.5) * 0.04;
    const viewport = state.viewport.getCurrentViewport(state.camera);
    const mouseX = (state.pointer.x * viewport.width) / 2 / scale;
    const mouseY = (state.pointer.y * viewport.height) / 2 / scale;

    if (mouse.current.active) {
      mouse.current.x = mouseX;
      mouse.current.y = mouseY;
    }

    particlesRef.current.forEach((particle, index) => {
      let x =
        particle.baseX +
        particle.velocityX +
        Math.sin(time * particle.speed + particle.phase) * particle.amplitude;
      let y =
        particle.baseY +
        particle.velocityY +
        Math.cos(time * particle.speed + particle.phase * 1.3) * particle.amplitude * 0.7;
      const radialX = particle.baseX - CENTER.x;
      const radialY = particle.baseY - CENTER.y;
      const radialLength = Math.max(0.001, Math.hypot(radialX, radialY));

      x += (radialX / radialLength) * breath;
      y += (radialY / radialLength) * breath;

      if (mouse.current.active) {
        const distance = Math.hypot(mouse.current.x - x, mouse.current.y - y);

        if (distance < 0.3) {
          const force = (0.3 - distance) / 0.3;
          x += (x - mouse.current.x) * force * 0.15;
          y += (y - mouse.current.y) * force * 0.15;
        }
      }

      matrix.makeTranslation(x, y, 0);
      mesh.setMatrixAt(index, matrix);

      const alphaPulse = 0.88 + Math.sin(time * particle.speed + particle.phase) * 0.12;
      tempColor.copy(particle.color).multiplyScalar(alphaPulse);
      mesh.setColorAt(index, tempColor);
    });

    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  });

  return (
    <group scale={scale}>
      <instancedMesh ref={meshRef} args={[undefined, undefined, particles.length]} frustumCulled={false}>
        <sphereGeometry ref={geometryRef} args={[0.018, 8, 8]} />
        <meshBasicMaterial ref={materialRef} vertexColors transparent opacity={0.82} />
      </instancedMesh>
    </group>
  );
}

export default function SkullCanvas({
  tone = 'light',
  scale = 1,
}: {
  tone?: SkullTone;
  scale?: number;
}) {
  const mouseRef = useRef({ active: false, x: 0, y: 0 });

  return (
    <Canvas
      aria-hidden="true"
      orthographic
      camera={{ position: [0, 0, 6], zoom: 175 }}
      gl={{ alpha: true, antialias: true }}
      dpr={[1, 1.7]}
      onPointerMove={() => {
        mouseRef.current.active = true;
      }}
      onPointerLeave={() => {
        mouseRef.current.active = false;
      }}
      style={{ height: '100%', width: '100%', background: 'transparent' }}
    >
      <SkullParticles tone={tone} scale={scale} mouse={mouseRef} />
    </Canvas>
  );
}
