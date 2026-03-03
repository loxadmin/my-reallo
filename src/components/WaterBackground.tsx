import React from 'react';
import { motion } from 'framer-motion';

const WaterBackground: React.FC = () => {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none bg-background">
      {/* Base Gradient */}
      <div className="absolute inset-0 opacity-60 bg-gradient-to-br from-[#7000ff1a] via-background to-[#00d1ff1a]" />

      {/* Water Waves */}
      <svg className="absolute inset-0 w-full h-full opacity-40 mix-blend-soft-light" xmlns="http://www.w3.org/2000/svg">
        <filter id="waterFilter">
          <feTurbulence type="fractalNoise" baseFrequency="0.015 0.015" numOctaves="3" seed="1">
            <animate attributeName="baseFrequency" dur="25s" values="0.01 0.01;0.02 0.02;0.01 0.01" repeatCount="indefinite" />
          </feTurbulence>
          <feDisplacementMap in="SourceGraphic" scale="30" />
        </filter>

        <rect width="100%" height="100%" filter="url(#waterFilter)" fill="#7000ff" fillOpacity="0.05" />
      </svg>

      {/* Floating Orbs for depth */}
      <motion.div
        animate={{
          x: [0, 100, -50, 0],
          y: [0, -50, 50, 0],
          scale: [1, 1.2, 0.9, 1],
        }}
        transition={{
          duration: 20,
          repeat: Infinity,
          ease: "linear"
        }}
        className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] rounded-full bg-primary/10 blur-[100px]"
      />
      <motion.div
        animate={{
          x: [0, -80, 60, 0],
          y: [0, 100, -40, 0],
          scale: [1, 0.8, 1.1, 1],
        }}
        transition={{
          duration: 25,
          repeat: Infinity,
          ease: "linear"
        }}
        className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-accent/10 blur-[100px]"
      />

      {/* Glass Overlay Effect */}
      <div className="absolute inset-0 backdrop-blur-[2px] pointer-events-none" />
    </div>
  );
};

export default WaterBackground;
