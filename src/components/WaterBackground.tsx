import { motion } from "framer-motion";

const WaterBackground = () => {
  return (
    <div className="fixed inset-0 pointer-events-none z-[-1] overflow-hidden bg-background">
      {/* 3D Glass Effect Container */}
      <div className="absolute inset-4 md:inset-8 lg:inset-12 rounded-[40px] border border-white/20 shadow-[inset_0_0_100px_rgba(255,255,255,0.1)] overflow-hidden">

        {/* SVG Filters for Water Animation */}
        <svg className="absolute w-0 h-0">
          <filter id="water-filter">
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.012 0.02"
              numOctaves="3"
              result="noise"
              seed="2"
            >
              <animate
                attributeName="baseFrequency"
                values="0.012 0.02; 0.015 0.025; 0.012 0.02"
                dur="12s"
                repeatCount="indefinite"
              />
            </feTurbulence>
            <feDisplacementMap in="SourceGraphic" in2="noise" scale="30" />
          </filter>
        </svg>

        {/* Mint Green Water Layer */}
        <motion.div
          className="absolute inset-[-20%] opacity-[0.12] dark:opacity-[0.18]"
          style={{
            background: "radial-gradient(circle at 50% 50%, #98FFD9 0%, transparent 80%)",
            filter: "url(#water-filter)",
          }}
          animate={{
            rotate: [0, 5, -5, 0],
            scale: [1, 1.05, 1],
          }}
          transition={{
            duration: 15,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />

        {/* Secondary Flow Layer */}
        <motion.div
          className="absolute inset-[-10%] opacity-[0.08]"
          style={{
            background: "linear-gradient(45deg, transparent 0%, #B2FCE0 50%, transparent 100%)",
            filter: "url(#water-filter)",
          }}
          animate={{
            x: [-20, 20, -20],
            y: [-10, 10, -10],
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />

        {/* Reflection/Glass Shine */}
        <div className="absolute top-0 left-0 right-0 h-1/2 bg-gradient-to-b from-white/10 to-transparent pointer-events-none" />
      </div>

      {/* Subtle global blur to soften the edges of the "trapped" water */}
      <div
        className="absolute inset-0"
        style={{
          backdropFilter: "blur(20px)",
          background: "rgba(255, 255, 255, 0.01)",
        }}
      />
    </div>
  );
};

export default WaterBackground;
