import { Canvas, useFrame } from '@react-three/fiber';
import type { MutableRefObject } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';

type PadlockVariant = 'light' | 'dark';

type PadlockParticle = {
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

const LIGHT_COLORS = ['#BBBBBB', '#CCCCCC', '#D4D4D4'];
const DARK_COLORS = ['#FFFFFF', '#F0F0F0', '#E0E0E0'];
const CENTER = new THREE.Vector2(0, -0.15);
const matrix = new THREE.Matrix4();
const tempColor = new THREE.Color();

const BODY_WIDTH = 2.4;
const BODY_HEIGHT = 1.8;
const BODY_LEFT = -BODY_WIDTH / 2;
const BODY_RIGHT = BODY_WIDTH / 2;
const BODY_TOP = 0;
const BODY_BOTTOM = -BODY_HEIGHT;
const BODY_RADIUS = 0.24;
const KEYHOLE_X = 0;
const KEYHOLE_TOP_Y = -0.62;
const KEYHOLE_RADIUS = 0.22;
const KEYHOLE_TRIANGLE: [Point, Point, Point] = [
  { x: -0.16, y: -0.72 },
  { x: 0.16, y: -0.72 },
  { x: 0, y: -1.07 },
];

function seededRandom(seed: number) {
  const x = Math.sin(seed * 12.9898) * 43758.5453;

  return x - Math.floor(x);
}

function isInsideTriangle(x: number, y: number, triangle: [Point, Point, Point]) {
  const [a, b, c] = triangle;
  const area = (p1: Point, p2: Point, p3: Point) =>
    Math.abs((p1.x * (p2.y - p3.y) + p2.x * (p3.y - p1.y) + p3.x * (p1.y - p2.y)) / 2);
  const total = area(a, b, c);
  const a1 = area({ x, y }, b, c);
  const a2 = area(a, { x, y }, c);
  const a3 = area(a, b, { x, y });

  return Math.abs(total - (a1 + a2 + a3)) < 0.001;
}

function isInKeyholeVoid(x: number, y: number) {
  const inCircle = Math.pow(x - KEYHOLE_X, 2) + Math.pow(y - KEYHOLE_TOP_Y, 2) < Math.pow(KEYHOLE_RADIUS, 2);
  const inTriangle = isInsideTriangle(x, y, KEYHOLE_TRIANGLE);

  return inCircle || inTriangle;
}

function isInsideRoundedRect(x: number, y: number) {
  const clampedX = Math.max(BODY_LEFT + BODY_RADIUS, Math.min(x, BODY_RIGHT - BODY_RADIUS));
  const clampedY = Math.max(BODY_BOTTOM + BODY_RADIUS, Math.min(y, BODY_TOP - BODY_RADIUS));

  return Math.hypot(x - clampedX, y - clampedY) <= BODY_RADIUS;
}

function addLinePoints(points: Point[], from: Point, to: Point, spacing: number) {
  const distance = Math.hypot(to.x - from.x, to.y - from.y);
  const steps = Math.max(2, Math.floor(distance / spacing));

  for (let i = 0; i <= steps; i += 1) {
    const progress = i / steps;
    const point = {
      x: from.x + (to.x - from.x) * progress,
      y: from.y + (to.y - from.y) * progress,
    };

    if (!isInKeyholeVoid(point.x, point.y)) points.push(point);
  }
}

function addArcPoints(points: Point[], radius: number, spacing: number, edgePasses = 1) {
  const circumference = Math.PI * radius;
  const steps = Math.max(12, Math.floor(circumference / spacing));

  for (let pass = 0; pass < edgePasses; pass += 1) {
    for (let i = 0; i <= steps; i += 1) {
      const angle = Math.PI - (Math.PI * i) / steps;
      const offset = (seededRandom(i + pass * 101) - 0.5) * spacing * 0.18;
      points.push({
        x: Math.cos(angle) * radius + offset,
        y: Math.sin(angle) * radius + BODY_TOP,
      });
    }
  }
}

function addRoundedRectBorder(points: Point[], spacing: number) {
  addLinePoints(points, { x: BODY_LEFT + BODY_RADIUS, y: BODY_TOP }, { x: BODY_RIGHT - BODY_RADIUS, y: BODY_TOP }, spacing);
  addLinePoints(points, { x: BODY_RIGHT, y: BODY_TOP - BODY_RADIUS }, { x: BODY_RIGHT, y: BODY_BOTTOM + BODY_RADIUS }, spacing);
  addLinePoints(points, { x: BODY_RIGHT - BODY_RADIUS, y: BODY_BOTTOM }, { x: BODY_LEFT + BODY_RADIUS, y: BODY_BOTTOM }, spacing);
  addLinePoints(points, { x: BODY_LEFT, y: BODY_BOTTOM + BODY_RADIUS }, { x: BODY_LEFT, y: BODY_TOP - BODY_RADIUS }, spacing);

  const corners = [
    { cx: BODY_RIGHT - BODY_RADIUS, cy: BODY_TOP - BODY_RADIUS, start: 0, end: Math.PI / 2 },
    { cx: BODY_RIGHT - BODY_RADIUS, cy: BODY_BOTTOM + BODY_RADIUS, start: -Math.PI / 2, end: 0 },
    { cx: BODY_LEFT + BODY_RADIUS, cy: BODY_BOTTOM + BODY_RADIUS, start: Math.PI, end: Math.PI * 1.5 },
    { cx: BODY_LEFT + BODY_RADIUS, cy: BODY_TOP - BODY_RADIUS, start: Math.PI / 2, end: Math.PI },
  ];

  corners.forEach((corner) => {
    const steps = Math.max(4, Math.floor((BODY_RADIUS * Math.PI * 0.5) / spacing));

    for (let i = 0; i <= steps; i += 1) {
      const angle = corner.start + ((corner.end - corner.start) * i) / steps;
      const point = {
        x: corner.cx + Math.cos(angle) * BODY_RADIUS,
        y: corner.cy + Math.sin(angle) * BODY_RADIUS,
      };

      if (!isInKeyholeVoid(point.x, point.y)) points.push(point);
    }
  });
}

function buildPointMap(targetCount: number, variant: PadlockVariant) {
  const colors = variant === 'light' ? LIGHT_COLORS : DARK_COLORS;
  const candidates: Point[] = [];
  const borderSpacing = 0.04;
  const interiorSpacing = targetCount <= 520 ? 0.16 : 0.075;

  addArcPoints(candidates, 1.1, borderSpacing, 2);
  addArcPoints(candidates, 0.75, borderSpacing * 1.1);
  addLinePoints(candidates, { x: -0.75, y: BODY_TOP }, { x: -0.75, y: -0.18 }, borderSpacing);
  addLinePoints(candidates, { x: 0.75, y: BODY_TOP }, { x: 0.75, y: -0.18 }, borderSpacing);
  addRoundedRectBorder(candidates, borderSpacing);

  let seedIndex = 0;
  for (let y = BODY_BOTTOM + 0.12; y <= BODY_TOP - 0.12; y += interiorSpacing) {
    for (let x = BODY_LEFT + 0.12; x <= BODY_RIGHT - 0.12; x += interiorSpacing) {
      seedIndex += 1;
      const jitterX = (seededRandom(seedIndex + 17) - 0.5) * interiorSpacing * 0.52;
      const jitterY = (seededRandom(seedIndex + 31) - 0.5) * interiorSpacing * 0.52;
      const point = { x: x + jitterX, y: y + jitterY };

      if (isInsideRoundedRect(point.x, point.y) && !isInKeyholeVoid(point.x, point.y)) candidates.push(point);
    }
  }

  addLinePoints(candidates, { x: -KEYHOLE_RADIUS, y: KEYHOLE_TOP_Y }, { x: KEYHOLE_RADIUS, y: KEYHOLE_TOP_Y }, borderSpacing * 0.9);

  const selected: Point[] = [];
  const stride = Math.max(1, candidates.length / targetCount);

  for (let i = 0; i < targetCount && i * stride < candidates.length; i += 1) {
    selected.push(candidates[Math.floor(i * stride)]);
  }

  return selected.map((point, index): PadlockParticle => {
    const seed = index + (variant === 'light' ? 101 : 701);

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

function PadlockParticles({
  variant,
  scale,
  mouse,
}: {
  variant: PadlockVariant;
  scale: number;
  mouse: MutableRefObject<{ active: boolean; x: number; y: number }>;
}) {
  const count = useMobileParticleCount();
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const geometryRef = useRef<THREE.SphereGeometry>(null);
  const materialRef = useRef<THREE.MeshBasicMaterial>(null);
  const particlesRef = useRef<PadlockParticle[]>([]);
  const timeRef = useRef(0);

  const particles = useMemo(() => buildPointMap(count, variant), [count, variant]);
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
    <group scale={scale} position={[0, 0.35, 0]}>
      <instancedMesh ref={meshRef} args={[undefined, undefined, particles.length]} frustumCulled={false}>
        <sphereGeometry ref={geometryRef} args={[0.018, 8, 8]} />
        <meshBasicMaterial ref={materialRef} vertexColors transparent opacity={variant === 'light' ? 0.82 : 0.9} />
      </instancedMesh>
    </group>
  );
}

export default function PadlockCanvas({
  variant = 'light',
  scale = 1,
}: {
  variant?: PadlockVariant;
  scale?: number;
}) {
  const mouseRef = useRef({ active: false, x: 0, y: 0 });

  return (
    <Canvas
      aria-hidden="true"
      orthographic
      camera={{ position: [0, 0, 6], zoom: 145 }}
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
      <PadlockParticles variant={variant} scale={scale} mouse={mouseRef} />
    </Canvas>
  );
}
