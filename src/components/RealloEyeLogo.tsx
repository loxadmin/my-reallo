import { motion, type Easing } from "framer-motion";

const RealloEyeLogo = ({ size = 32 }: { size?: number }) => {
  const w = size;
  const h = size * 0.6;
  const cx = w / 2;
  const cy = h / 2;
  const irisR = h * 0.4;
  const pupilR = irisR * 0.45;

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
      opacity: 1, y: 0, rotate: 0,
      transition: { duration: 0.15, ease: "easeOut" as const },
    },
    closed: {
      opacity: 0, y: h * 0.1, rotate: 5,
      transition: { duration: 0.1, ease: "easeIn" as const },
    },
  };

  const primaryColor = "hsl(161, 61%, 15%)";
  const darkColor = "hsl(161, 61%, 10%)";

  return (
    <motion.svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="inline-block mr-1.5" style={{ verticalAlign: "middle", marginBottom: 2 }}>
      <defs>
        <radialGradient id="irisGrad" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="hsl(161, 61%, 40%)" />
          <stop offset="70%" stopColor={primaryColor} />
          <stop offset="100%" stopColor={darkColor} />
        </radialGradient>
        <radialGradient id="pupilGrad" cx="40%" cy="40%" r="50%">
          <stop offset="0%" stopColor="black" />
          <stop offset="100%" stopColor="#000" />
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
            animate={["open", "closed", "open"]}
            variants={blinkVariants}
            transition={{ times: [0, 0.4, 1], duration: 0.25, repeat: Infinity, repeatDelay: 3 }}
          />
        </clipPath>
      </defs>

      <motion.path
        initial="open" animate={["open", "closed", "open"]} variants={blinkVariants}
        transition={{ times: [0, 0.4, 1], duration: 0.25, repeat: Infinity, repeatDelay: 3 }}
        fill="none" stroke={primaryColor} strokeWidth="2" filter="url(#eyeGlow)"
      />

      <g clipPath="url(#eyeClip)">
        <rect x="0" y="0" width={w} height={h} fill="white" opacity="0.1" />
        <motion.circle cx={cx} cy={cy} r={irisR} fill="url(#irisGrad)" filter="url(#eyeGlow)"
          animate={{ cx: [cx, cx + 1.5, cx - 1, cx] }}
          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.circle cx={cx} cy={cy} r={pupilR} fill="url(#pupilGrad)"
          animate={{ r: [pupilR, pupilR * 0.75, pupilR], cx: [cx, cx + 1.5, cx - 1, cx] }}
          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.circle cx={cx - irisR * 0.25} cy={cy - irisR * 0.25} r={pupilR * 0.3} fill="white" opacity="0.8"
          animate={{ cx: [cx - irisR * 0.25, cx - irisR * 0.25 + 1, cx - irisR * 0.25 - 0.5, cx - irisR * 0.25] }}
          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
        />
      </g>

      <motion.g
        initial="open" animate={["open", "closed", "open"]} variants={eyelashVariants}
        transition={{ times: [0, 0.4, 1], duration: 0.25, repeat: Infinity, repeatDelay: 3 }}
      >
        <path
          d={`M ${w * 0.25} ${cy - h * 0.25} L ${w * 0.2} ${cy - h * 0.45}
             M ${w * 0.38} ${cy - h * 0.38} L ${w * 0.35} ${cy - h * 0.6}
             M ${w * 0.5} ${cy - h * 0.42} L ${w * 0.5} ${cy - h * 0.65}
             M ${w * 0.62} ${cy - h * 0.38} L ${w * 0.65} ${cy - h * 0.6}
             M ${w * 0.75} ${cy - h * 0.25} L ${w * 0.8} ${cy - h * 0.45}`}
          fill="none" stroke={primaryColor} strokeWidth="1.2" strokeLinecap="round"
        />
      </motion.g>

      <motion.path
        initial="open" animate={["open", "closed", "open"]} variants={upperLidVariants}
        transition={{ times: [0, 0.4, 1], duration: 0.25, repeat: Infinity, repeatDelay: 3 }}
        fill="none" stroke={primaryColor} strokeWidth="2.5" strokeLinecap="round" filter="url(#eyeGlow)"
      />
    </motion.svg>
  );
};

export default RealloEyeLogo;
