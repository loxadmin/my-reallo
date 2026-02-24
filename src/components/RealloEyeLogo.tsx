import { motion, type Easing } from "framer-motion";

const RealloEyeLogo = ({ size = 32 }: { size?: number }) => {
  const w = size;
  const h = size * 0.6;
  const cx = w / 2;
  const cy = h / 2;
  const irisR = h * 0.4;
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

  const eyelashVariants = {
    open: {
      opacity: 1,
      y: 0,
      rotate: 0,
      transition: { duration: 0.15, ease: "easeOut" },
    },
    closed: {
      opacity: 0,
      y: h * 0.1,
      rotate: 5,
      transition: { duration: 0.1, ease: "easeIn" },
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
          <stop offset="0%" stopColor="hsl(50, 100%, 60%)" />
          <stop offset="70%" stopColor="hsl(45, 100%, 50%)" />
          <stop offset="100%" stopColor="hsl(40, 100%, 30%)" />
        </radialGradient>
        <radialGradient id="pupilGrad" cx="40%" cy="40%" r="50%">
          <stop offset="0%" stopColor="hsl(0, 0%, 15%)" />
          <stop offset="100%" stopColor="hsl(0, 0%, 0%)" />
        </radialGradient>
        <filter id="eyeGlow">
          <feGaussianBlur stdDeviation="1.5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id="innerShadow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur in="SourceAlpha" stdDeviation="2" result="blur" />
          <feOffset dy="2" dx="2" />
          <feComposite in2="SourceAlpha" operator="arithmetic" k2="-1" k3="1" result="shadowDiff" />
          <feFlood floodColor="black" floodOpacity="0.6" />
          <feComposite in2="shadowDiff" operator="in" />
          <feComposite in2="SourceGraphic" operator="over" />
        </filter>
        <clipPath id="eyeClip">
          <motion.path
            initial="open"
            animate={["open", "closed", "open"]}
            variants={blinkVariants}
            transition={{
              times: [0, 0.4, 1],
              duration: 0.25,
              repeat: Infinity,
              repeatDelay: 3,
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
          times: [0, 0.4, 1],
          duration: 0.25,
          repeat: Infinity,
          repeatDelay: 3,
        }}
        fill="none"
        stroke="hsl(45, 100%, 50%)"
        strokeWidth="2"
        filter="url(#eyeGlow)"
      />

      {/* Clipped contents (iris + pupil) */}
      <g clipPath="url(#eyeClip)" filter="url(#innerShadow)">
        {/* Sclera */}
        <rect x="0" y="0" width={w} height={h} fill="hsl(45, 20%, 92%)" opacity="0.2" />

        {/* Iris shadow for depth */}
        <motion.circle
          cx={cx + 1}
          cy={cy + 1}
          r={irisR}
          fill="black"
          opacity="0.2"
          animate={{
            cx: [cx + 1, cx + 2.5, cx, cx + 1],
          }}
          transition={{
            duration: 5,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />

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
        <motion.circle
          cx={cx - irisR * 0.25}
          cy={cy - irisR * 0.25}
          r={pupilR * 0.3}
          fill="white"
          opacity="0.8"
          animate={{
            cx: [cx - irisR * 0.25, cx - irisR * 0.25 + 1, cx - irisR * 0.25 - 0.5, cx - irisR * 0.25],
          }}
          transition={{
            duration: 5,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
        <motion.circle
          cx={cx + irisR * 0.35}
          cy={cy + irisR * 0.15}
          r={pupilR * 0.15}
          fill="white"
          opacity="0.4"
          animate={{
            cx: [cx + irisR * 0.35, cx + irisR * 0.35 + 1, cx + irisR * 0.35 - 0.5, cx + irisR * 0.35],
          }}
          transition={{
            duration: 5,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      </g>

      {/* Eyelashes */}
      <motion.g
        initial="open"
        animate={["open", "closed", "open"]}
        variants={eyelashVariants}
        transition={{
          times: [0, 0.4, 1],
          duration: 0.25,
          repeat: Infinity,
          repeatDelay: 3,
        }}
      >
        <path
          d={`M ${w * 0.25} ${cy - h * 0.25} L ${w * 0.2} ${cy - h * 0.45}
             M ${w * 0.38} ${cy - h * 0.38} L ${w * 0.35} ${cy - h * 0.6}
             M ${w * 0.5} ${cy - h * 0.42} L ${w * 0.5} ${cy - h * 0.65}
             M ${w * 0.62} ${cy - h * 0.38} L ${w * 0.65} ${cy - h * 0.6}
             M ${w * 0.75} ${cy - h * 0.25} L ${w * 0.8} ${cy - h * 0.45}`}
          fill="none"
          stroke="black"
          strokeWidth="1.2"
          strokeLinecap="round"
        />
      </motion.g>

      {/* Upper eyelid line for depth */}
      <motion.path
        initial="open"
        animate={["open", "closed", "open"]}
        variants={upperLidVariants}
        transition={{
          times: [0, 0.4, 1],
          duration: 0.25,
          repeat: Infinity,
          repeatDelay: 3,
        }}
        fill="none"
        stroke="hsl(45, 100%, 50%)"
        strokeWidth="2.5"
        strokeLinecap="round"
        filter="url(#eyeGlow)"
      />
    </motion.svg>
  );
};

export default RealloEyeLogo;
