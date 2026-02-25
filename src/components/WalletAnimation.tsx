import { motion } from "framer-motion";

const WalletAnimation = () => {
  return (
    <motion.svg
      viewBox="0 0 160 160"
      className="w-full mx-auto"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6 }}
    >
      <defs>
        <linearGradient id="walletBody" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="hsl(48, 96%, 60%)" stopOpacity="0.9" />
          <stop offset="100%" stopColor="hsl(40, 90%, 42%)" stopOpacity="0.85" />
        </linearGradient>
        <linearGradient id="walletBack" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="hsl(40, 80%, 35%)" />
          <stop offset="100%" stopColor="hsl(38, 75%, 25%)" />
        </linearGradient>
        <linearGradient id="noteGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="hsl(140, 55%, 55%)" />
          <stop offset="100%" stopColor="hsl(140, 45%, 40%)" />
        </linearGradient>
        <linearGradient id="coinGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="hsl(48, 96%, 68%)" />
          <stop offset="100%" stopColor="hsl(45, 90%, 48%)" />
        </linearGradient>
        <filter id="softShadow">
          <feDropShadow dx="0" dy="3" stdDeviation="6" floodColor="hsl(48,96%,53%)" floodOpacity="0.25" />
        </filter>
        <filter id="noteShadow">
          <feDropShadow dx="0" dy="1" stdDeviation="2" floodColor="hsl(140,60%,50%)" floodOpacity="0.3" />
        </filter>
      </defs>

      {/* Background glow */}
      <motion.circle
        cx="80" cy="85" r="50"
        fill="hsl(48,96%,53%)" opacity="0.05"
        animate={{ r: [50, 56, 50], opacity: [0.05, 0.1, 0.05] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Wallet */}
      <motion.g filter="url(#softShadow)" animate={{ y: [0, -3, 0] }} transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}>
        <rect x="35" y="70" width="90" height="55" rx="10" fill="url(#walletBack)" />
        <rect x="30" y="65" width="100" height="55" rx="12" fill="url(#walletBody)" />
        <rect x="92" y="82" width="28" height="16" rx="4" fill="hsl(40,80%,48%)" opacity="0.45" />
        <circle cx="80" cy="65" r="4" fill="hsl(48,96%,72%)" stroke="hsl(40,80%,48%)" strokeWidth="1.2" />
      </motion.g>

      {/* Money note dropping */}
      <motion.g filter="url(#noteShadow)">
        <motion.rect
          x="62" y="15" width="36" height="18" rx="3"
          fill="url(#noteGrad)"
          animate={{ y: [15, 55, 55, 15], opacity: [1, 1, 0, 0], rotate: [0, -4, -4, 0], scale: [1, 0.9, 0.8, 1] }}
          transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut", times: [0, 0.4, 0.6, 1] }}
        />
        <motion.text
          x="80" y="28" textAnchor="middle" fontSize="11" fontWeight="bold" fill="hsl(140,60%,28%)"
          animate={{ y: [28, 68, 68, 28], opacity: [1, 1, 0, 0] }}
          transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut", times: [0, 0.4, 0.6, 1] }}
        >₦</motion.text>
      </motion.g>

      {/* Floating coins */}
      {[
        { cx: 22, cy: 58, r: 6, delay: 0 },
        { cx: 140, cy: 55, r: 5, delay: 0.6 },
        { cx: 18, cy: 105, r: 5.5, delay: 1.2 },
        { cx: 142, cy: 100, r: 4, delay: 0.3 },
      ].map((c, i) => (
        <motion.circle
          key={i} cx={c.cx} cy={c.cy} r={c.r}
          fill="url(#coinGrad)" stroke="hsl(40,80%,48%)" strokeWidth="0.8"
          animate={{ y: [-6, 6, -6], opacity: [0.5, 0.9, 0.5] }}
          transition={{ duration: 2.5 + i * 0.3, repeat: Infinity, ease: "easeInOut", delay: c.delay }}
        />
      ))}

      {/* Sparkles */}
      {[
        { x: 45, y: 48 }, { x: 115, y: 45 }, { x: 80, y: 130 },
      ].map((s, i) => (
        <motion.circle
          key={`s-${i}`} cx={s.x} cy={s.y} r="1.5"
          fill="hsl(48,96%,72%)"
          animate={{ opacity: [0, 1, 0], scale: [0, 1.3, 0] }}
          transition={{ duration: 1.8, repeat: Infinity, delay: i * 0.7, ease: "easeInOut" }}
        />
      ))}
    </motion.svg>
  );
};

export default WalletAnimation;
