import Head from 'next/head';
import Link from 'next/link';
import { useEffect, useRef } from 'react';

function FaintSkull() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d');
    if (!canvas || !context) return undefined;

    let frame = 0;
    let dots: Array<{ x: number; y: number; phase: number }> = [];

    const belongs = (x: number, y: number) => {
      const cranium = x * x / 0.82 + (y + 0.2) * (y + 0.2) / 0.78 < 1;
      const cheek = Math.abs(x) < 0.58 - Math.max(y - 0.12, 0) * 0.22 && y > -0.18 && y < 0.58;
      const jaw = Math.abs(x) < 0.34 && y >= 0.46 && y < 0.9;
      const eyeLeft = (x + 0.28) * (x + 0.28) / 0.05 + (y + 0.08) * (y + 0.08) / 0.075 < 1;
      const eyeRight = (x - 0.28) * (x - 0.28) / 0.05 + (y + 0.08) * (y + 0.08) / 0.075 < 1;
      const nose = Math.abs(x) < 0.11 + (y - 0.16) * 0.2 && y > 0.12 && y < 0.42;
      return (cranium || cheek || jaw) && !eyeLeft && !eyeRight && !nose;
    };

    const build = () => {
      const width = canvas.parentElement?.clientWidth || 520;
      const height = canvas.parentElement?.clientHeight || 420;
      const ratio = window.devicePixelRatio || 1;
      canvas.width = width * ratio;
      canvas.height = height * ratio;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      context.setTransform(ratio, 0, 0, ratio, 0, 0);

      const scale = Math.min(width * 0.5, height * 0.7);
      const centerX = width / 2;
      const centerY = height / 2;
      const spacing = Math.max(13, scale / 30);
      dots = [];

      for (let px = centerX - scale * 0.55; px <= centerX + scale * 0.55; px += spacing) {
        for (let py = centerY - scale * 0.58; py <= centerY + scale * 0.58; py += spacing) {
          const nx = (px - centerX) / (scale * 0.5);
          const ny = (py - centerY) / (scale * 0.5);
          if (belongs(nx, ny)) dots.push({ x: px, y: py, phase: Math.random() * Math.PI * 2 });
        }
      }
    };

    const draw = (time: number) => {
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.fillStyle = '#CCCCCC';
      dots.forEach((dot) => {
        const breath = Math.sin(time * 0.0014 + dot.phase);
        context.globalAlpha = 0.18 + breath * 0.04;
        context.beginPath();
        context.arc(dot.x, dot.y + breath, 2, 0, Math.PI * 2);
        context.fill();
      });
      frame = requestAnimationFrame(draw);
    };

    build();
    frame = requestAnimationFrame(draw);
    window.addEventListener('resize', build);

    return () => {
      window.removeEventListener('resize', build);
      cancelAnimationFrame(frame);
    };
  }, []);

  return <canvas ref={canvasRef} aria-hidden="true" className="h-full w-full" />;
}

export default function NotFound() {
  return (
    <>
      <Head>
        <title>404 | SmartAttend</title>
      </Head>
      <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-white px-5 text-center text-ink">
        <div className="absolute inset-0 opacity-70">
          <FaintSkull />
        </div>
        <section className="relative z-10">
          <p className="font-serif text-9xl font-semibold text-gold">404</p>
          <h1 className="mt-3 font-serif text-3xl font-semibold text-ink">Page not found.</h1>
          <p className="mt-3 text-muted">The page you&apos;re looking for doesn&apos;t exist.</p>
          <Link
            href="/"
            className="mt-8 inline-flex bg-ink px-7 py-3.5 text-sm font-semibold text-white shadow-sm transition duration-200 hover:scale-[1.02] hover:shadow-md"
          >
            Go Home
          </Link>
        </section>
      </main>
    </>
  );
}
