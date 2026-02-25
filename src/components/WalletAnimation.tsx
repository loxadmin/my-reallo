import { motion } from "framer-motion";

const WalletAnimation = () => {
  return (
    <motion.svg
      viewBox="0 0 200 200"
      className="w-full max-w-[280px] mx-auto"
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.8, ease: "easeOut" }}
    >
      <defs>
        <linearGradient id="walletGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="hsl(48, 96%, 53%)" />
          <stop offset="100%" stopColor="hsl(40, 90%, 40%)" />
        </linearGradient>
        <linearGradient id="walletDark" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="hsl(40, 80%, 35%)" />
          <stop offset="100%" stopColor="hsl(38, 75%, 25%)" />
        </linearGradient>
        <linearGradient id="moneyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="hsl(140, 60%, 55%)" />
          <stop offset="100%" stopColor="hsl(140, 50%, 40%)" />
        </linearGradient>
        <linearGradient id="coinGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="hsl(48, 96%, 65%)" />
          <stop offset="100%" stopColor="hsl(45, 90%, 45%)" />
        </linearGradient>
        <filter id="walletShadow">
          <feDropShadow dx="0" dy="4" stdDeviation="8" floodColor="hsl(48, 96%, 53%)" floodOpacity="0.3" />
        </filter>
        <filter id="moneyShadow">
          <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="hsl(140, 60%, 50%)" floodOpacity="0.4" />
        </filter>
      </defs>

      {/* Glow circle behind wallet */}
      <motion.circle
        cx="100"
        cy="110"
        r="70"
        fill="hsl(48, 96%, 53%)"
        opacity="0.06"
        animate={{ r: [70, 78, 70], opacity: [0.06, 0.12, 0.06] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Wallet body */}
      <motion.g filter="url(#walletShadow)">
        {/* Wallet back */}
        <motion.rect
          x="45"
          y="85"
          width="110"
          height="70"
          rx="12"
          fill="url(#walletDark)"
          animate={{ y: [85, 82, 85] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        />
        {/* Wallet front */}
        <motion.rect
          x="40"
          y="80"
          width="120"
          height="70"
          rx="14"
          fill="url(#walletGrad)"
          animate={{ y: [80, 77, 80] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        />
        {/* Wallet flap */}
        <motion.path
          d="M 40 100 Q 40 80 60 80 L 140 80 Q 160 80 160 100"
          fill="none"
          stroke="hsl(40, 85%, 50%)"
          strokeWidth="2"
          opacity="0.5"
          animate={{ y: [0, -3, 0] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        />
        {/* Wallet clasp */}
        <motion.circle
          cx="100"
          cy="80"
          r="5"
          fill="hsl(48, 96%, 70%)"
          stroke="hsl(40, 80%, 45%)"
          strokeWidth="1.5"
          animate={{ cy: [80, 77, 80] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        />
        {/* Card slot line */}
        <motion.rect
          x="120"
          y="105"
          width="30"
          height="20"
          rx="4"
          fill="hsl(40, 80%, 45%)"
          opacity="0.5"
          animate={{ y: [105, 102, 105] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        />
      </motion.g>

      {/* Money note 1 - dropping into wallet */}
      <motion.g filter="url(#moneyShadow)">
        <motion.rect
          x="75"
          y="20"
          width="50"
          height="25"
          rx="4"
          fill="url(#moneyGrad)"
          animate={{
            y: [20, 70, 70, 20],
            opacity: [1, 1, 0, 0],
            rotate: [0, -5, -5, 0],
            scale: [1, 0.9, 0.8, 1],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: "easeInOut",
            times: [0, 0.4, 0.6, 1],
          }}
        />
        {/* Dollar sign on note */}
        <motion.text
          x="100"
          y="37"
          textAnchor="middle"
          fontSize="14"
          fontWeight="bold"
          fill="hsl(140, 60%, 30%)"
          animate={{
            y: [37, 87, 87, 37],
            opacity: [1, 1, 0, 0],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: "easeInOut",
            times: [0, 0.4, 0.6, 1],
          }}
        >
          ₦
        </motion.text>
      </motion.g>

      {/* Money note 2 - offset timing */}
      <motion.rect
        x="85"
        y="10"
        width="45"
        height="22"
        rx="4"
        fill="hsl(140, 55%, 50%)"
        filter="url(#moneyShadow)"
        animate={{
          y: [10, 68, 68, 10],
          opacity: [0, 1, 0, 0],
          rotate: [5, 0, 0, 5],
          scale: [0.8, 0.9, 0.7, 0.8],
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: "easeInOut",
          times: [0, 0.4, 0.6, 1],
          delay: 1.5,
        }}
      />

      {/* Floating coins */}
      {[
        { cx: 35, cy: 70, delay: 0, size: 8 },
        { cx: 170, cy: 65, delay: 0.8, size: 6 },
        { cx: 25, cy: 130, delay: 1.6, size: 7 },
        { cx: 175, cy: 125, delay: 0.4, size: 5 },
      ].map((coin, i) => (
        <motion.circle
          key={i}
          cx={coin.cx}
          cy={coin.cy}
          r={coin.size}
          fill="url(#coinGrad)"
          stroke="hsl(40, 80%, 45%)"
          strokeWidth="1"
          animate={{
            y: [-8, 8, -8],
            opacity: [0.6, 1, 0.6],
          }}
          transition={{
            duration: 2.5 + i * 0.3,
            repeat: Infinity,
            ease: "easeInOut",
            delay: coin.delay,
          }}
        />
      ))}

      {/* Sparkles */}
      {[
        { x: 55, y: 60 },
        { x: 145, y: 55 },
        { x: 100, y: 160 },
        { x: 30, y: 100 },
        { x: 170, y: 95 },
      ].map((s, i) => (
        <motion.circle
          key={`sparkle-${i}`}
          cx={s.x}
          cy={s.y}
          r="2"
          fill="hsl(48, 96%, 70%)"
          animate={{
            opacity: [0, 1, 0],
            scale: [0, 1.5, 0],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            delay: i * 0.6,
            ease: "easeInOut",
          }}
        />
      ))}
    </motion.svg>
  );
};

export default WalletAnimation;
