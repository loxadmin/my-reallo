import { motion, useInView } from "framer-motion";
import { useRef, useState } from "react";
import {
  Calculator,
  Target,
  Users,
  Zap,
  CheckCircle,
  ArrowRight,
  Megaphone,
  Video,
  Gift,
  Wallet,
  TrendingUp,
  Share2,
} from "lucide-react";

/* ── Data ── */
const userSteps = [
  {
    icon: Calculator,
    title: "Calculate Your Spend",
    desc: "Enter your weekly data, electricity, transport and food costs. We compute your total annual utility spend — the money that silently leaves your account every year.",
    detail: "Our smart calculator breaks down each category so you see exactly where your naira goes.",
    color: "from-primary/20 to-primary/5",
  },
  {
    icon: Target,
    title: "Set a Savings Goal",
    desc: "Pick what matters: education, rent, vacation, business funding, or a custom goal. We match a target amount to your spend profile.",
    detail: "Goals keep you focused. The system tailors your journey based on what you choose.",
    color: "from-accent/20 to-accent/5",
  },
  {
    icon: Users,
    title: "Join the Queue",
    desc: "Enter the waitlist. Every day the system auto-advances 50 positions. Refer a friend and skip 20 spots instantly.",
    detail: "The queue is fair but rewards action — the more you share, the faster you move.",
    color: "from-primary/20 to-primary/5",
  },
  {
    icon: Zap,
    title: "Earn Points via Decisions",
    desc: "Complete quick decision tasks — rate apps, answer surveys, try new services. Each task earns points at ₦0.50 per point.",
    detail: "Tasks take under a minute. Points stack up fast and convert to real naira value.",
    color: "from-accent/20 to-accent/5",
  },
  {
    icon: CheckCircle,
    title: "Verify & Claim Your Voucher",
    desc: "Once off the queue, verify your spend with transaction IDs. After 6 months maturity, redeem your voucher toward your goal.",
    detail: "Verification keeps the ecosystem honest. Patience pays — literally.",
    color: "from-primary/20 to-primary/5",
  },
];

const influencerSteps = [
  {
    icon: Megaphone,
    title: "Apply as an Influencer",
    desc: "Submit your social media link and get approved. Influencers earn real money by promoting Reallo to their audience.",
    detail: "We verify your reach and approve genuine creators who can drive real signups.",
    color: "from-primary/20 to-primary/5",
  },
  {
    icon: Share2,
    title: "Share Your Referral Link",
    desc: "Get a unique referral link. Every user who signs up through you earns you ₦100 — tracked automatically.",
    detail: "No cap on earnings. The more signups you drive, the more you earn.",
    color: "from-accent/20 to-accent/5",
  },
  {
    icon: Video,
    title: "Complete Video Challenges",
    desc: "Record and post short videos about Reallo using the required hashtag. Each approved video pays a fixed reward.",
    detail: "Post on TikTok, Instagram, or YouTube. We review submissions and pay per approved clip.",
    color: "from-primary/20 to-primary/5",
  },
  {
    icon: Wallet,
    title: "Withdraw Your Earnings",
    desc: "Link your bank account and request withdrawals anytime your balance qualifies. Funds hit your account directly.",
    detail: "Transparent earnings dashboard. See pending, approved, and total payouts at a glance.",
    color: "from-accent/20 to-accent/5",
  },
];

/* ── 3D Floating Icon ── */
const FloatingIcon = ({ Icon, index }: { Icon: React.ElementType; index: number }) => (
  <motion.div
    className="relative w-14 h-14 flex items-center justify-center"
    animate={{
      y: [0, -6, 0],
      rotateY: [0, 8, 0, -8, 0],
    }}
    transition={{
      duration: 4,
      repeat: Infinity,
      ease: "easeInOut",
      delay: index * 0.3,
    }}
  >
    {/* Shadow */}
    <motion.div
      className="absolute bottom-0 left-1/2 -translate-x-1/2 w-10 h-2 rounded-full bg-primary/10 blur-sm"
      animate={{ scale: [1, 0.8, 1], opacity: [0.4, 0.2, 0.4] }}
      transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: index * 0.3 }}
    />
    {/* 3D card */}
    <div
      className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/15 to-primary/5 border border-primary/20 flex items-center justify-center"
      style={{
        boxShadow:
          "0 8px 24px hsl(160 60% 18% / 0.12), inset 0 2px 4px hsl(160 50% 60% / 0.15), inset 0 -2px 4px hsl(160 70% 10% / 0.1)",
        transform: "perspective(600px) rotateX(8deg)",
      }}
    >
      <Icon className="w-6 h-6 text-primary" />
    </div>
  </motion.div>
);

/* ── Connector line between steps ── */
const StepConnector = ({ index }: { index: number }) => (
  <motion.div
    className="hidden md:flex items-center justify-center w-full h-8 my-1"
    initial={{ scaleY: 0 }}
    whileInView={{ scaleY: 1 }}
    viewport={{ once: true }}
    transition={{ delay: index * 0.1 + 0.2, duration: 0.4 }}
    style={{ transformOrigin: "top" }}
  >
    <div className="w-px h-full bg-gradient-to-b from-primary/30 to-transparent" />
  </motion.div>
);

/* ── Step Card ── */
const StepCard = ({
  step,
  index,
  side,
}: {
  step: (typeof userSteps)[0];
  index: number;
  side: "left" | "right";
}) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-60px" });
  const [expanded, setExpanded] = useState(false);

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, x: side === "left" ? -40 : 40 }}
      animate={isInView ? { opacity: 1, x: 0 } : {}}
      transition={{ duration: 0.6, delay: index * 0.12, ease: [0.22, 1, 0.36, 1] }}
      className={`relative flex items-start gap-4 md:gap-6 group cursor-pointer ${
        side === "right" ? "md:flex-row-reverse md:text-right" : ""
      }`}
      onClick={() => setExpanded(!expanded)}
    >
      {/* Number badge + icon */}
      <div className="flex flex-col items-center gap-2 flex-shrink-0">
        <FloatingIcon Icon={step.icon} index={index} />
        <span className="text-[10px] font-bold text-primary/50 tracking-widest">
          0{index + 1}
        </span>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div
          className={`glass-card rounded-2xl p-5 transition-all duration-300 group-hover:shadow-lg group-hover:border-primary/20 ${
            expanded ? "border-primary/25" : ""
          }`}
          style={{
            transform: "perspective(800px) rotateX(1deg)",
            boxShadow: expanded
              ? "0 12px 40px hsl(160 60% 18% / 0.08), inset 0 1px 0 rgba(255,255,255,0.6)"
              : undefined,
          }}
        >
          <div className="flex items-center gap-2 mb-2">
            <h4 className="text-[14px] font-bold text-foreground">{step.title}</h4>
            <motion.div
              animate={{ rotate: expanded ? 90 : 0 }}
              transition={{ duration: 0.2 }}
            >
              <ArrowRight className="w-3.5 h-3.5 text-primary/50" />
            </motion.div>
          </div>
          <p className="text-[12px] text-muted-foreground leading-relaxed">{step.desc}</p>

          <motion.div
            initial={false}
            animate={{
              height: expanded ? "auto" : 0,
              opacity: expanded ? 1 : 0,
            }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="pt-3 mt-3 border-t border-border/50">
              <p className="text-[11px] text-primary/80 leading-relaxed font-medium">
                💡 {step.detail}
              </p>
            </div>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
};

/* ── Section Header ── */
const SectionHeader = ({
  badge,
  title,
  subtitle,
  delay = 0,
}: {
  badge: string;
  title: string;
  subtitle: string;
  delay?: number;
}) => (
  <motion.div
    initial={{ opacity: 0, y: 30 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    transition={{ duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] }}
    className="text-center mb-12"
  >
    <motion.span
      className="inline-flex items-center gap-2 glass-pill rounded-full px-4 py-1.5 mb-4"
      initial={{ scale: 0.9 }}
      whileInView={{ scale: 1 }}
      viewport={{ once: true }}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-primary" />
      <span className="text-[10px] font-semibold text-muted-foreground tracking-[0.15em] uppercase">
        {badge}
      </span>
    </motion.span>
    <h2 className="font-display text-2xl sm:text-3xl font-bold text-foreground mb-3">{title}</h2>
    <p className="text-[13px] text-muted-foreground max-w-lg mx-auto leading-relaxed">{subtitle}</p>
  </motion.div>
);

/* ── Animated stats bar ── */
const StatsBar = () => {
  const stats = [
    { label: "Queue advances daily", value: "50", suffix: " spots" },
    { label: "Per referral skip", value: "20", suffix: " spots" },
    { label: "Point value", value: "₦0.50", suffix: "/pt" },
    { label: "Influencer per signup", value: "₦100", suffix: "" },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6 }}
      className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-2xl mx-auto my-16"
    >
      {stats.map((s, i) => (
        <motion.div
          key={i}
          className="glass-stat rounded-2xl p-4 text-center"
          initial={{ scale: 0.9, opacity: 0 }}
          whileInView={{ scale: 1, opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: i * 0.1, duration: 0.4 }}
          whileHover={{ scale: 1.03, transition: { duration: 0.2 } }}
        >
          <p className="text-lg font-bold text-primary glow-text">
            {s.value}
            <span className="text-[11px] font-medium text-primary/60">{s.suffix}</span>
          </p>
          <p className="text-[10px] text-muted-foreground mt-1">{s.label}</p>
        </motion.div>
      ))}
    </motion.div>
  );
};

/* ── 3D Floating illustration ── */
const FloatingIllustration = ({ type }: { type: "user" | "influencer" }) => (
  <motion.div
    className="relative w-full max-w-[200px] mx-auto mb-8"
    animate={{ y: [0, -8, 0] }}
    transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
  >
    <motion.svg viewBox="0 0 200 200" className="w-full">
      <defs>
        <linearGradient id={`grad-${type}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="hsl(160, 60%, 55%)" stopOpacity="0.3" />
          <stop offset="100%" stopColor="hsl(160, 60%, 18%)" stopOpacity="0.15" />
        </linearGradient>
        <filter id={`shadow-${type}`}>
          <feDropShadow dx="0" dy="6" stdDeviation="10" floodColor="hsl(160,60%,30%)" floodOpacity="0.15" />
        </filter>
      </defs>

      {/* Background circle */}
      <motion.circle
        cx="100" cy="100" r="80"
        fill={`url(#grad-${type})`}
        filter={`url(#shadow-${type})`}
        animate={{ r: [80, 84, 80] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Inner decorative rings */}
      <motion.circle
        cx="100" cy="100" r="60"
        fill="none"
        stroke="hsl(160, 60%, 35%)"
        strokeWidth="0.5"
        strokeDasharray="4 6"
        opacity="0.3"
        animate={{ rotate: 360 }}
        transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
        style={{ transformOrigin: "100px 100px" }}
      />
      <motion.circle
        cx="100" cy="100" r="45"
        fill="none"
        stroke="hsl(160, 60%, 35%)"
        strokeWidth="0.5"
        strokeDasharray="2 8"
        opacity="0.2"
        animate={{ rotate: -360 }}
        transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
        style={{ transformOrigin: "100px 100px" }}
      />

      {/* Center icon */}
      {type === "user" ? (
        <g transform="translate(80, 80)">
          <motion.rect
            x="2" y="2" width="36" height="36" rx="8"
            fill="hsl(160, 60%, 18%)"
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ duration: 3, repeat: Infinity }}
            style={{ transformOrigin: "20px 20px" }}
          />
          <text x="20" y="26" textAnchor="middle" fontSize="18" fill="white" fontWeight="bold">₦</text>
        </g>
      ) : (
        <g transform="translate(80, 80)">
          <motion.rect
            x="2" y="2" width="36" height="36" rx="8"
            fill="hsl(160, 60%, 18%)"
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ duration: 3, repeat: Infinity }}
            style={{ transformOrigin: "20px 20px" }}
          />
          <text x="20" y="26" textAnchor="middle" fontSize="16" fill="white">📢</text>
        </g>
      )}

      {/* Orbiting dots */}
      {[0, 60, 120, 180, 240, 300].map((angle, i) => (
        <motion.circle
          key={i}
          cx={100 + 70 * Math.cos((angle * Math.PI) / 180)}
          cy={100 + 70 * Math.sin((angle * Math.PI) / 180)}
          r="3"
          fill="hsl(160, 60%, 40%)"
          opacity="0.5"
          animate={{
            opacity: [0.3, 0.7, 0.3],
            r: [2.5, 3.5, 2.5],
          }}
          transition={{ duration: 2, repeat: Infinity, delay: i * 0.3 }}
        />
      ))}
    </motion.svg>
  </motion.div>
);

/* ── Main Component ── */
const HowItWorks = () => {
  return (
    <section id="how-it-works" className="relative z-10 py-20 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Main heading */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="text-center mb-6"
        >
          <h2 className="font-display text-3xl sm:text-4xl font-bold text-foreground">
            How <span className="gradient-text">Reallo</span> Works
          </h2>
          <p className="text-[13px] text-muted-foreground mt-3 max-w-md mx-auto">
            Two paths. One ecosystem. Whether you're saving or earning, here's your journey.
          </p>
        </motion.div>

        <StatsBar />

        {/* ── USER PATH ── */}
        <div className="mb-24">
          <FloatingIllustration type="user" />
          <SectionHeader
            badge="For Users"
            title="Reclaim Your Utility Spend"
            subtitle="Stop watching your money disappear on data, electricity, transport & food. Turn those expenses into savings toward real life goals."
          />

          <div className="space-y-4 md:space-y-6">
            {userSteps.map((step, i) => (
              <div key={i}>
                <StepCard step={step} index={i} side={i % 2 === 0 ? "left" : "right"} />
                {i < userSteps.length - 1 && <StepConnector index={i} />}
              </div>
            ))}
          </div>
        </div>

        {/* ── Divider ── */}
        <motion.div
          className="flex items-center gap-4 my-16"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
        >
          <div className="flex-1 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
          <motion.div
            className="glass-pill rounded-full px-5 py-2 flex items-center gap-2"
            animate={{ scale: [1, 1.02, 1] }}
            transition={{ duration: 3, repeat: Infinity }}
          >
            <TrendingUp className="w-4 h-4 text-primary" />
            <span className="text-[11px] font-bold text-primary tracking-wider">EARN MORE</span>
          </motion.div>
          <div className="flex-1 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
        </motion.div>

        {/* ── INFLUENCER PATH ── */}
        <div>
          <FloatingIllustration type="influencer" />
          <SectionHeader
            badge="For Influencers"
            title="Earn Real Money Promoting Reallo"
            subtitle="Join our influencer program. Share your link, complete video challenges, and withdraw cash directly to your bank account."
          />

          <div className="space-y-4 md:space-y-6">
            {influencerSteps.map((step, i) => (
              <div key={i}>
                <StepCard step={step} index={i} side={i % 2 === 0 ? "left" : "right"} />
                {i < influencerSteps.length - 1 && <StepConnector index={i} />}
              </div>
            ))}
          </div>
        </div>

        {/* ── CTA ── */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="text-center mt-20"
        >
          <div className="glass-card rounded-3xl p-8 sm:p-12 max-w-lg mx-auto">
            <motion.div
              animate={{ y: [0, -5, 0] }}
              transition={{ duration: 3, repeat: Infinity }}
            >
              <Gift className="w-10 h-10 text-primary mx-auto mb-4" />
            </motion.div>
            <h3 className="font-display text-xl font-bold text-foreground mb-2">
              Ready to Start?
            </h3>
            <p className="text-[12px] text-muted-foreground mb-6 leading-relaxed">
              Join thousands of Nigerians already reclaiming their utility spend. It costs ₦0 to join.
            </p>
            <button
              onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
              className="clay-primary rounded-xl px-8 py-3 text-[13px] font-semibold"
            >
              Get Started Now <ArrowRight className="inline w-4 h-4 ml-1.5" />
            </button>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default HowItWorks;
