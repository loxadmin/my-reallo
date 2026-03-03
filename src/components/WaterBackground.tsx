import React from 'react';

import { motion } from "framer-motion";

const WaterBackground = () => {
  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden bg-background">
      {/* Liquid Layer - Moving Gradients */}
      <motion.div
        animate={{
          backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"],
        }}
        transition={{
          duration: 15,
          repeat: Infinity,
          ease: "linear",
        }}
        className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05]"
        style={{
          background: "linear-gradient(120deg, #7C3AED, #06B6D4, #3B82F6)",
          backgroundSize: "400% 400%",
        }}
      />

      <svg className="absolute w-full h-full opacity-40 dark:opacity-30" xmlns="http://www.w3.org/2000/svg">
        <filter id="water-filter">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.012 0.02"
            numOctaves="4"
            seed="5"
          >
            <animate
              attributeName="baseFrequency"
              dur="25s"
              values="0.012 0.02; 0.015 0.025; 0.012 0.02"
              repeatCount="indefinite"
            />
          </feTurbulence>
          <feDisplacementMap in="SourceGraphic" scale="30" />
        </filter>
        <rect width="100%" height="100%" filter="url(#water-filter)" fill="transparent" />
      </svg>

      {/* 3D Floating Liquid Blobs */}
      <div className="absolute inset-0">
        {[...Array(3)].map((_, i) => (
          <motion.div
            key={i}
            initial={{ x: i * 30 + "%", y: "110%", scale: 0.8 + i * 0.2 }}
            animate={{
              y: ["110%", "-10%"],
              x: [(i * 30) + "%", (i * 30 + (i % 2 === 0 ? 5 : -5)) + "%"],
              rotate: [0, 180, 360],
            }}
            transition={{
              duration: 20 + i * 5,
              repeat: Infinity,
              delay: i * 7,
              ease: "easeInOut",
            }}
            className="absolute w-64 h-64 rounded-full"
            style={{
              background: `radial-gradient(circle at 30% 30%, rgba(6, 182, 212, 0.08), transparent)`,
              filter: "blur(40px)",
              boxShadow: "inset 0 0 40px rgba(124, 58, 237, 0.05)",
            }}
          />
        ))}
      </div>

      {/* Glass Surface Highlights (Reflections) */}
      <div className="absolute inset-0">
        <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
        <div className="absolute top-0 left-0 w-[1px] h-full bg-gradient-to-b from-transparent via-white/5 to-transparent" />
        <div className="absolute top-10 right-10 w-32 h-32 bg-white/5 rounded-full blur-3xl" />
      </div>

      {/* Ambient glows */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[600px] bg-primary/5 rounded-full blur-[200px]" />
      <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-accent/10 rounded-full blur-[180px]" />
    </div>
  );
};

export default WaterBackground;
