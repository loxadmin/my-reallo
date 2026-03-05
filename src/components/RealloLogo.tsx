import { motion } from "framer-motion";

const RealloLogo = ({ size = 32 }: { size?: number }) => {
  return (
    <motion.svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="inline-block"
      style={{ verticalAlign: "middle" }}
      whileHover={{ rotate: 5, scale: 1.05 }}
    >
      <defs>
        <linearGradient id="leafGradLogo" x1="20%" y1="0%" x2="80%" y2="100%">
          <stop offset="0%" stopColor="hsl(160, 60%, 55%)" />
          <stop offset="50%" stopColor="hsl(160, 60%, 35%)" />
          <stop offset="100%" stopColor="hsl(160, 60%, 15%)" />
        </linearGradient>
        <filter id="leaf3DLogo">
          <feDropShadow dx="1" dy="1" stdDeviation="0.8" floodOpacity="0.5" />
        </filter>
      </defs>
      <motion.path
        d="M16 2C16 2 4 10 4 20C4 28 16 30 16 30C16 30 28 28 28 20C28 10 16 2 16 2Z"
        fill="url(#leafGradLogo)"
        filter="url(#leaf3DLogo)"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ duration: 1.5, ease: "easeInOut" }}
      />
      <motion.path
        d="M16 2V30"
        stroke="hsl(160, 60%, 10%)"
        strokeWidth="0.5"
        opacity="0.4"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ delay: 0.5, duration: 1 }}
      />
      <motion.path
        d="M15 4C9 10 7 18 10 26"
        stroke="white"
        strokeWidth="1.5"
        strokeLinecap="round"
        opacity="0.1"
        animate={{ opacity: [0.1, 0.2, 0.1] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
      />
      <g stroke="hsl(160, 60%, 10%)" strokeWidth="0.4" opacity="0.3">
        <path d="M16 8L22 12M16 15L25 20M16 22L22 26" />
        <path d="M16 8L10 12M16 15L7 20M16 22L10 26" />
      </g>
    </motion.svg>
  );
};

export default RealloLogo;
