import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";

const AnimatedWaterLayer = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start end", "end start"]
  });

  // Dark Green / White palette for the fluid effect.
  // Using specific dark green hexes: #0F3D2E, #145A41, #1F6F54
  const primaryWater = "rgba(15, 61, 46, 0.08)";
  const secondaryWater = "rgba(20, 90, 65, 0.05)";
  const highlightWater = "rgba(255, 255, 255, 0.04)";

  // Fluid motion reactive to scroll
  const waveX1 = useTransform(scrollYProgress, [0, 1], ["-3%", "3%"]);
  const waveX2 = useTransform(scrollYProgress, [0, 1], ["3%", "-3%"]);
  const waveY = useTransform(scrollYProgress, [0, 1], ["0%", "8%"]);

  return (
    <div ref={containerRef} className="absolute inset-0 pointer-events-none overflow-hidden rounded-[inherit] bg-transparent -z-0">
      {/* Liquid Displacement Map (SVG) */}
      <svg className="hidden">
        <filter id="fluid-liquid-filter">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.012"
            numOctaves="2"
            seed="1"
            result="turbulence"
          >
            <animate
              attributeName="baseFrequency"
              values="0.012;0.018;0.012"
              dur="15s"
              repeatCount="indefinite"
            />
          </feTurbulence>
          <feDisplacementMap in="SourceGraphic" in2="turbulence" scale="18" />
        </filter>
      </svg>

      {/* Trapped Water - Base Layer */}
      <motion.div
        className="absolute inset-[-20%] opacity-50 blur-lg"
        style={{
          background: `linear-gradient(180deg, ${secondaryWater} 0%, ${primaryWater} 50%, ${secondaryWater} 100%)`,
          filter: "url(#fluid-liquid-filter)",
          x: waveX1,
          y: waveY
        }}
        animate={{
          rotate: [0, 1, -1, 0],
        }}
        transition={{
          duration: 15,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />

      {/* Surface Highlights (Fluid motion) */}
      <motion.div
        className="absolute inset-[-25%] opacity-40"
        style={{
          background: `radial-gradient(circle at 50% 100%, ${highlightWater} 0%, transparent 80%)`,
          filter: "url(#fluid-liquid-filter)",
          x: waveX2
        }}
        animate={{
          scale: [1, 1.05, 1],
        }}
        transition={{
          duration: 12,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />

      {/* Glass Internal Shine */}
      <div className="absolute inset-0 bg-gradient-to-tr from-white/10 via-transparent to-white/5 mix-blend-overlay" />
    </div>
  );
};

export default AnimatedWaterLayer;
