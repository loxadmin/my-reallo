import { useEffect, useRef } from "react";

const WaterBackground = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationId: number;
    let time = 0;
    let scrollY = 0;

    const handleScroll = () => {
      scrollY = window.scrollY;
    };
    window.addEventListener("scroll", handleScroll, { passive: true });

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    const drawWater = () => {
      time += 0.008;
      const w = canvas.width;
      const h = canvas.height;

      ctx.clearRect(0, 0, w, h);

      // Mint green water color
      const baseHue = 160;
      const scrollOffset = scrollY * 0.15;

      // Draw multiple fluid layers
      for (let layer = 0; layer < 4; layer++) {
        const layerOffset = layer * 0.7;
        const alpha = 0.04 - layer * 0.008;
        
        ctx.beginPath();
        ctx.moveTo(0, h);

        for (let x = 0; x <= w; x += 4) {
          const normalX = x / w;
          const y =
            h * 0.3 +
            Math.sin(normalX * 3 + time * 1.2 + layerOffset + scrollOffset * 0.01) * 60 +
            Math.sin(normalX * 5 + time * 0.8 + layerOffset * 2) * 30 +
            Math.cos(normalX * 2 + time * 0.5 + scrollOffset * 0.005) * 40 +
            layer * 80;
          ctx.lineTo(x, y);
        }

        ctx.lineTo(w, h);
        ctx.closePath();

        const gradient = ctx.createLinearGradient(0, 0, 0, h);
        gradient.addColorStop(0, `hsla(${baseHue}, 50%, 45%, ${alpha})`);
        gradient.addColorStop(0.5, `hsla(${baseHue}, 45%, 38%, ${alpha * 1.5})`);
        gradient.addColorStop(1, `hsla(${baseHue}, 40%, 30%, ${alpha * 0.5})`);
        ctx.fillStyle = gradient;
        ctx.fill();
      }

      // Draw flowing highlights (3D effect)
      for (let i = 0; i < 6; i++) {
        const cx = w * (0.15 + i * 0.15) + Math.sin(time * 0.6 + i) * 80 + scrollOffset * 0.1;
        const cy = h * 0.4 + Math.cos(time * 0.4 + i * 1.5) * 100 + i * 40;
        const radius = 120 + Math.sin(time + i) * 40;

        const radGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
        radGrad.addColorStop(0, `hsla(${baseHue}, 55%, 55%, 0.06)`);
        radGrad.addColorStop(0.5, `hsla(${baseHue}, 50%, 45%, 0.03)`);
        radGrad.addColorStop(1, `hsla(${baseHue}, 45%, 40%, 0)`);
        ctx.fillStyle = radGrad;
        ctx.fillRect(cx - radius, cy - radius, radius * 2, radius * 2);
      }

      // Caustic light patterns
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        const startX = Math.sin(time * 0.3 + i * 2) * w * 0.3 + w * 0.5;
        const startY = Math.cos(time * 0.4 + i) * h * 0.2 + h * 0.3;

        for (let j = 0; j < 8; j++) {
          const angle = (j / 8) * Math.PI * 2 + time * 0.5;
          const dist = 50 + Math.sin(time + j + i) * 30;
          ctx.lineTo(
            startX + Math.cos(angle) * dist,
            startY + Math.sin(angle) * dist
          );
        }
        ctx.closePath();
        ctx.fillStyle = `hsla(${baseHue}, 50%, 60%, 0.02)`;
        ctx.fill();
      }

      animationId = requestAnimationFrame(drawWater);
    };

    drawWater();

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none z-0">
      <div className="absolute inset-0 bg-background" />
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
        style={{ opacity: 0.8 }}
      />
      {/* Glass overlay for the "trapped in glass" effect */}
      <div
        className="absolute inset-0"
        style={{
          background: "linear-gradient(180deg, rgba(255,255,255,0.15) 0%, rgba(255,255,255,0.05) 50%, rgba(255,255,255,0.1) 100%)",
          backdropFilter: "blur(1px)",
        }}
      />
    </div>
  );
};

export default WaterBackground;
