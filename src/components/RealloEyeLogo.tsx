import { motion, type Easing } from "framer-motion";

const RealloEyeLogo = ({ size = 32 }: { size?: number }) => {
  const w = size;
  const h = size * 0.6;
  const cx = w / 2;
  const cy = h / 2;
  const irisR = h * 0.32;
  const pupilR = irisR * 0.45;

  // Blink animation: eyelids close and open
  const blinkVariants = {
    open: {
      d: `M ${w * 0.05} ${cy} Q ${cx} ${cy - h * 0.55} ${w * 0.95} ${cy} Q ${cx} ${cy + h * 0.55} ${w * 0.05} ${cy} Z`,
      transition: { duration: 0.15, ease: "easeOut" as Easing },
    },
    closed: {
      d: `M ${w * 0.05} ${cy} Q ${cx} ${cy} ${w * 0.95} ${cy} Q ${cx} ${cy} ${w * 0.05} ${cy} Z`,
      transition: { duration: 0.1, ease: "easeIn" as Easing },
    },
  };

  const upperLidVariants = {
    open: {
      d: `M ${w * 0.05} ${cy} Q ${cx} ${cy - h * 0.55} ${w * 0.95} ${cy}`,
      transition: { duration: 0.15, ease: "easeOut" as Easing },
    },
    closed: {
      d: `M ${w * 0.05} ${cy} Q ${cx} ${cy} ${w * 0.95} ${cy}`,
      transition: { duration: 0.1, ease: "easeIn" as Easing },
    },
  };

  return (
    <motion.svg
      width={w}
      height={h}
      viewBox={`0 0 ${w} ${h}`}
      className="inline-block mr-1.5"
      style={{ verticalAlign: "middle", marginBottom: 2 }}
    >
      {/* Glow filter */}
      <defs>
        <radialGradient id="irisGrad" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="hsl(48, 96%, 63%)" />
          <stop offset="60%" stopColor="hsl(48, 96%, 53%)" />
          <stop offset="100%" stopColor="hsl(40, 90%, 35%)" />
        </radialGradient>
        <radialGradient id="pupilGrad" cx="40%" cy="40%" r="50%">
          <stop offset="0%" stopColor="hsl(45, 10%, 15%)" />
          <stop offset="100%" stopColor="hsl(45, 10%, 6%)" />
        </radialGradient>
        <filter id="eyeGlow">
          <feGaussianBlur stdDeviation="1.5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <clipPath id="eyeClip">
          <motion.path
            initial="open"
            animate="open"
            variants={blinkVariants}
            transition={{
              repeat: Infinity,
              repeatType: "mirror",
              repeatDelay: 3,
              duration: 0.15,
            }}
          />
        </clipPath>
      </defs>

      {/* Eye shape outline */}
      <motion.path
        initial="open"
        animate={["open", "closed", "open"]}
        variants={blinkVariants}
        transition={{
          times: [0, 0.5, 1],
          duration: 0.3,
          repeat: Infinity,
          repeatDelay: 3.5,
        }}
        fill="none"
        stroke="hsl(48, 96%, 53%)"
        strokeWidth="1.5"
        filter="url(#eyeGlow)"
      />

      {/* Clipped contents (iris + pupil) */}
      <g clipPath="url(#eyeClip)">
        {/* Sclera */}
        <rect x="0" y="0" width={w} height={h} fill="hsl(45, 20%, 92%)" opacity="0.15" />

        {/* Iris */}
        <motion.circle
          cx={cx}
          cy={cy}
          r={irisR}
          fill="url(#irisGrad)"
          filter="url(#eyeGlow)"
          animate={{
            cx: [cx, cx + 1.5, cx - 1, cx],
          }}
          transition={{
            duration: 5,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />

        {/* Pupil */}
        <motion.circle
          cx={cx}
          cy={cy}
          r={pupilR}
          fill="url(#pupilGrad)"
          animate={{
            r: [pupilR, pupilR * 0.75, pupilR],
            cx: [cx, cx + 1.5, cx - 1, cx],
          }}
          transition={{
            duration: 5,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />

        {/* Specular highlight */}
        <circle
          cx={cx - irisR * 0.25}
          cy={cy - irisR * 0.25}
          r={pupilR * 0.3}
          fill="white"
          opacity="0.6"
        />
        <circle
          cx={cx + irisR * 0.35}
          cy={cy + irisR * 0.15}
          r={pupilR * 0.15}
          fill="white"
          opacity="0.3"
        />
      </g>

      {/* Upper eyelid line for depth */}
      <motion.path
        initial="open"
        animate={["open", "closed", "open"]}
        variants={upperLidVariants}
        transition={{
          times: [0, 0.5, 1],
          duration: 0.3,
          repeat: Infinity,
          repeatDelay: 3.5,
        }}
        fill="none"
        stroke="hsl(48, 96%, 53%)"
        strokeWidth="2"
        strokeLinecap="round"
        filter="url(#eyeGlow)"
      />
    </motion.svg>
  );
};

export default RealloEyeLogo;
