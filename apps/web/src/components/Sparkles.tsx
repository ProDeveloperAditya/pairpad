import { useCallback, useEffect, useRef } from 'react';

interface SparklesProps {
  background?: string;
  minSize?: number;
  maxSize?: number;
  particleDensity?: number;
  particleColor?: string;
  speed?: number;
  className?: string;
  id?: string;
}

interface Particle {
  x: number;
  y: number;
  size: number;
  speedX: number;
  speedY: number;
  opacity: number;
  opacityDirection: number;
  pulseSpeed: number;
}

export function SparklesCore({
  background = 'transparent',
  minSize = 0.4,
  maxSize = 1.4,
  particleDensity = 100,
  particleColor = '#FFFFFF',
  speed = 1,
  className = '',
  id,
}: SparklesProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animationFrameRef = useRef<number>(0);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);

  const createParticles = useCallback(
    (width: number, height: number) => {
      const area = width * height;
      const count = Math.floor((area / 10000) * (particleDensity / 10));
      const particles: Particle[] = [];

      for (let i = 0; i < count; i++) {
        particles.push({
          x: Math.random() * width,
          y: Math.random() * height,
          size: Math.random() * (maxSize - minSize) + minSize,
          speedX: (Math.random() - 0.5) * speed * 0.3,
          speedY: (Math.random() - 0.5) * speed * 0.3,
          opacity: Math.random(),
          opacityDirection: Math.random() > 0.5 ? 1 : -1,
          pulseSpeed: Math.random() * 0.02 + 0.005,
        });
      }

      particlesRef.current = particles;
    },
    [minSize, maxSize, particleDensity, speed]
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext('2d');
    if (!context) return;

    const setupCanvas = () => {
      const parent = canvas.parentElement;
      if (!parent) return;

      const rect = parent.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
      context.scale(dpr, dpr);

      createParticles(rect.width, rect.height);
    };

    setupCanvas();

    resizeObserverRef.current = new ResizeObserver(() => {
      setupCanvas();
    });

    if (canvas.parentElement) {
      resizeObserverRef.current.observe(canvas.parentElement);
    }

    const animate = () => {
      const parent = canvas.parentElement;
      if (!parent) return;

      const rect = parent.getBoundingClientRect();
      context.clearRect(0, 0, rect.width, rect.height);

      for (const particle of particlesRef.current) {
        particle.x += particle.speedX;
        particle.y += particle.speedY;
        particle.opacity += particle.opacityDirection * particle.pulseSpeed;

        if (particle.opacity >= 1) {
          particle.opacity = 1;
          particle.opacityDirection = -1;
        } else if (particle.opacity <= 0) {
          particle.opacity = 0;
          particle.opacityDirection = 1;
        }

        if (particle.x < 0) particle.x = rect.width;
        if (particle.x > rect.width) particle.x = 0;
        if (particle.y < 0) particle.y = rect.height;
        if (particle.y > rect.height) particle.y = 0;

        context.beginPath();
        context.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        context.fillStyle = particleColor;
        context.globalAlpha = particle.opacity;
        context.fill();
      }

      context.globalAlpha = 1;
      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animationFrameRef.current);
      resizeObserverRef.current?.disconnect();
    };
  }, [particleColor, createParticles]);

  return (
    <canvas
      ref={canvasRef}
      id={id}
      className={className}
      style={{ background }}
    />
  );
}
