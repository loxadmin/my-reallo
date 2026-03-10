import { motion, useInView, AnimatePresence } from "framer-motion";
import { useRef, useState, useEffect } from "react";
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
import { useCurrency, CurrencyCode } from "@/contexts/CurrencyContext";

/* ── Currency cycling hook ── */
const CURRENCIES: CurrencyCode[] = ["NGN", "USD", "EUR", "GBP"];
const SYMBOLS: Record<CurrencyCode, string> = { NGN: "₦", USD: "$", EUR: "€", GBP: "£" };

const useCurrencyCycle = (intervalMs = 3000) => {
  const [index, setIndex] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setIndex((i) => (i + 1) % CURRENCIES.length), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return { code: CURRENCIES[index], symbol: SYMBOLS[CURRENCIES[index]], index };
};

/** Format a naira amount in a specific currency */
const formatInCurrency = (
  nairAmount: number,
  code: CurrencyCode,
  rates: Record<CurrencyCode, number>,
  compact = false
) => {
  const sym = SYMBOLS[code];
  if (code === "NGN") {
    if (compact && nairAmount >= 1000) return sym + (nairAmount / 1000).toFixed(nairAmount % 1000 === 0 ? 0 : 1) + "K";
    return sym + nairAmount.toLocaleString("en-NG");
  }
  const val = nairAmount / rates[code];
  if (compact && val >= 1000) return sym + (val / 1000).toFixed(1) + "K";
  return sym + val.toFixed(2);
};

/* ── Animated currency text ── */
const CyclingAmount = ({
  naira,
  compact = false,
  className = "",
}: {
  naira: number;
  compact?: boolean;
  className?: string;
}) => {
  const { rates } = useCurrency();
  const { code, index } = useCurrencyCycle(2800);

  return (
    <span className={`inline-flex items-center ${className}`}>
      <AnimatePresence mode="wait">
        <motion.span
          key={index}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.3 }}
        >
          {formatInCurrency(naira, code, rates, compact)}
        </motion.span>
      </AnimatePresence>
    </span>
  );
};

/* ── Cycling currency symbol for SVG ── */
const CyclingSymbol = () => {
  const { symbol, index } = useCurrencyCycle(2800);
  return (
    <AnimatePresence mode="wait">
      <motion.text
        key={index}
        x="20"
        y="26"
        textAnchor="middle"
        fontSize="18"
        fill="white"
        fontWeight="bold"
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -4 }}
        transition={{ duration: 0.3 }}
      >
        {symbol}
      </motion.text>
    </AnimatePresence>
  );
};

/* ── Point value cycling display ── */
const CyclingPointValue = () => {
  const { rates } = useCurrency();
  const { code, index } = useCurrencyCycle(2800);
  const sym = SYMBOLS[code];
  const pointVal = code === "NGN" ? 0.5 : 0.5 / rates[code];

  return (
    <AnimatePresence mode="wait">
      <motion.span
        key={index}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.3 }}
        className="text-lg font-bold text-primary glow-text"
      >
        {sym}{code === "NGN" ? "0.50" : pointVal.toFixed(4)}
        <span className="text-xs font-medium text-primary/60">/pt</span>
      </motion.span>
    </AnimatePresence>
  );
};

/* ── Data ── */
const userSteps = [
  {
    icon: Calculator,
    title: "Calculate Your Spend",
    desc: "Enter your weekly data, electricity, transport and food costs. We compute your total annual utility spend — the money that silently leaves your account every year.",
    detail: "Our smart calculator breaks down each category so you see exactly where your money goes.",
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
    desc: "Enter the waitlist. Every day the system auto-advances 50 positions. Refer a friend and jump 20 positions closer to the front.",
    detail: "The queue is fair but rewards action — the more friends you invite, the faster you advance.",
    color: "from-primary/20 to-primary/5",
  },
  {
    icon: Zap,
    title: "Earn Points via Decisions",
    descKey: "points" as const,
    detail: "Tasks take under a minute. Points stack up fast and convert to real money.",
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
    descKey: "influencer_referral" as const,
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

type StepData = {
  icon: React.ElementType;
  title: string;
  desc?: string;
  descKey?: "points" | "influencer_referral";
  detail: string;
  color: string;
};

/* ── 3D Floating Icon ── */
const FloatingIcon = ({ Icon, index }: { Icon: React.ElementType; index: number }) => (
  <motion.div
    className="relative w-14 h-14 flex items-center justify-center"
    animate={{ y: [0, -6, 0], rotateY: [0, 8, 0, -8, 0] }}
    transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: index * 0.3 }}
  >
    <motion.div
      className="absolute bottom-0 left-1/2 -translate-x-1/2 w-10 h-2 rounded-full bg-primary/10 blur-sm"
      animate={{ scale: [1, 0.8, 1], opacity: [0.4, 0.2, 0.4] }}
      transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: index * 0.3 }}
    />
    <div
      className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/15 to-primary/5 border border-primary/20 flex items-center justify-center"
      style={{
        boxShadow: "0 8px 24px hsl(var(--primary) / 0.12), inset 0 2px 4px hsl(var(--primary) / 0.15)",
        transform: "perspective(600px) rotateX(8deg)",
      }}
    >
      <Icon className="w-6 h-6 text-primary" />
    </div>
  </motion.div>
);

/* ── Connector line ── */
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

/* ── Step description with dynamic currency ── */
const StepDescription = ({ step }: { step: StepData }) => {
  if (step.descKey === "points") {
    return (
      <p className="text-sm text-muted-foreground leading-relaxed">
        Complete quick decision tasks — rate apps, answer surveys, try new services. Each task earns points at{" "}
        <CyclingAmount naira={0.5} className="font-semibold text-primary" /> per point.
      </p>
    );
  }
  if (step.descKey === "influencer_referral") {
    return (
      <p className="text-sm text-muted-foreground leading-relaxed">
        Get a unique referral link. Every user who signs up through you earns you{" "}
        <CyclingAmount naira={500} className="font-semibold text-primary" /> — tracked automatically.
      </p>
    );
  }
  return <p className="text-sm text-muted-foreground leading-relaxed">{step.desc}</p>;
};

/* ── Step Card ── */
const StepCard = ({ step, index, side }: { step: StepData; index: number; side: "left" | "right" }) => {
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
      <div className="flex flex-col items-center gap-2 flex-shrink-0">
        <FloatingIcon Icon={step.icon} index={index} />
        <span className="text-xs font-bold text-primary/50 tracking-widest">0{index + 1}</span>
      </div>

      <div className="flex-1 min-w-0">
        <div
          className={`glass-card rounded-2xl p-5 transition-all duration-300 group-hover:shadow-lg group-hover:border-primary/20 ${
            expanded ? "border-primary/25" : ""
          }`}
          style={{
            transform: "perspective(800px) rotateX(1deg)",
            boxShadow: expanded
              ? "0 12px 40px hsl(var(--primary) / 0.08), inset 0 1px 0 rgba(255,255,255,0.6)"
              : undefined,
          }}
        >
          <div className="flex items-center gap-2 mb-2">
            <h4 className="text-sm font-bold text-foreground">{step.title}</h4>
            <motion.div animate={{ rotate: expanded ? 90 : 0 }} transition={{ duration: 0.2 }}>
              <ArrowRight className="w-3.5 h-3.5 text-primary/50" />
            </motion.div>
          </div>
          <StepDescription step={step} />

          <motion.div
            initial={false}
            animate={{ height: expanded ? "auto" : 0, opacity: expanded ? 1 : 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="pt-3 mt-3 border-t border-border/50">
              <p className="text-xs text-primary/80 leading-relaxed font-medium">💡 {step.detail}</p>
            </div>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
};

/* ── Section Header ── */
const SectionHeader = ({ badge, title, subtitle, delay = 0 }: { badge: string; title: string; subtitle: string; delay?: number }) => (
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
      <span className="text-xs font-semibold text-muted-foreground tracking-[0.15em] uppercase">{badge}</span>
    </motion.span>
    <h2 className="font-display text-2xl sm:text-3xl font-bold text-foreground mb-3">{title}</h2>
    <p className="text-sm text-muted-foreground max-w-lg mx-auto leading-relaxed">{subtitle}</p>
  </motion.div>
);

/* ── Stats bar with cycling currencies ── */
const StatsBar = () => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6 }}
      className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-2xl mx-auto my-16"
    >
      {/* Stat 1: Queue advance */}
      <motion.div
        className="glass-stat rounded-2xl p-4 text-center"
        initial={{ scale: 0.9, opacity: 0 }}
        whileInView={{ scale: 1, opacity: 1 }}
        viewport={{ once: true }}
        transition={{ delay: 0, duration: 0.4 }}
        whileHover={{ scale: 1.03, transition: { duration: 0.2 } }}
      >
        <p className="text-lg font-bold text-primary glow-text">
          50<span className="text-xs font-medium text-primary/60"> spots</span>
        </p>
        <p className="text-xs text-muted-foreground font-medium uppercase tracking-tight mt-1 opacity-80">Queue advances daily</p>
      </motion.div>

      {/* Stat 2: Referral queue skip */}
      <motion.div
        className="glass-stat rounded-2xl p-4 text-center"
        initial={{ scale: 0.9, opacity: 0 }}
        whileInView={{ scale: 1, opacity: 1 }}
        viewport={{ once: true }}
        transition={{ delay: 0.1, duration: 0.4 }}
        whileHover={{ scale: 1.03, transition: { duration: 0.2 } }}
      >
        <p className="text-lg font-bold text-primary glow-text">
          +20<span className="text-xs font-medium text-primary/60"> spots</span>
        </p>
        <p className="text-xs text-muted-foreground font-medium uppercase tracking-tight mt-1 opacity-80">Jump per friend invited</p>
      </motion.div>

      {/* Stat 3: Point value — cycles through currencies */}
      <motion.div
        className="glass-stat rounded-2xl p-4 text-center"
        initial={{ scale: 0.9, opacity: 0 }}
        whileInView={{ scale: 1, opacity: 1 }}
        viewport={{ once: true }}
        transition={{ delay: 0.2, duration: 0.4 }}
        whileHover={{ scale: 1.03, transition: { duration: 0.2 } }}
      >
        <CyclingPointValue />
        <p className="text-xs text-muted-foreground font-medium uppercase tracking-tight mt-1 opacity-80">Point value</p>
      </motion.div>

      {/* Stat 4: Influencer earnings — cycles through currencies */}
      <motion.div
        className="glass-stat rounded-2xl p-4 text-center"
        initial={{ scale: 0.9, opacity: 0 }}
        whileInView={{ scale: 1, opacity: 1 }}
        viewport={{ once: true }}
        transition={{ delay: 0.3, duration: 0.4 }}
        whileHover={{ scale: 1.03, transition: { duration: 0.2 } }}
      >
        <p className="text-lg font-bold text-primary glow-text">
          <CyclingAmount naira={500} />
        </p>
        <p className="text-xs text-muted-foreground font-medium uppercase tracking-tight mt-1 opacity-80">Influencer per referral</p>
      </motion.div>
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

      <motion.circle
        cx="100" cy="100" r="80"
        fill={`url(#grad-${type})`}
        filter={`url(#shadow-${type})`}
        animate={{ r: [80, 84, 80] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
      />

      <motion.circle
        cx="100" cy="100" r="60" fill="none" stroke="hsl(160, 60%, 35%)"
        strokeWidth="0.5" strokeDasharray="4 6" opacity="0.3"
        animate={{ rotate: 360 }}
        transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
        style={{ transformOrigin: "100px 100px" }}
      />
      <motion.circle
        cx="100" cy="100" r="45" fill="none" stroke="hsl(160, 60%, 35%)"
        strokeWidth="0.5" strokeDasharray="2 8" opacity="0.2"
        animate={{ rotate: -360 }}
        transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
        style={{ transformOrigin: "100px 100px" }}
      />

      {type === "user" ? (
        <g transform="translate(80, 80)">
          <motion.rect
            x="2" y="2" width="36" height="36" rx="8" fill="hsl(160, 60%, 18%)"
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ duration: 3, repeat: Infinity }}
            style={{ transformOrigin: "20px 20px" }}
          />
          <CyclingSymbol />
        </g>
      ) : (
        <g transform="translate(80, 80)">
          <motion.rect
            x="2" y="2" width="36" height="36" rx="8" fill="hsl(160, 60%, 18%)"
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ duration: 3, repeat: Infinity }}
            style={{ transformOrigin: "20px 20px" }}
          />
          <text x="20" y="26" textAnchor="middle" fontSize="16" fill="white">📢</text>
        </g>
      )}

      {[0, 60, 120, 180, 240, 300].map((angle, i) => (
        <motion.circle
          key={i}
          cx={100 + 70 * Math.cos((angle * Math.PI) / 180)}
          cy={100 + 70 * Math.sin((angle * Math.PI) / 180)}
          r="3" fill="hsl(160, 60%, 40%)" opacity="0.5"
          animate={{ opacity: [0.3, 0.7, 0.3], r: [2.5, 3.5, 2.5] }}
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
          <p className="text-sm text-muted-foreground mt-3 max-w-md mx-auto">
            Two paths. One ecosystem. Whether you're saving or earning, here's your journey.
          </p>
        </motion.div>

        <StatsBar />

        {/* USER PATH */}
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

        {/* Divider */}
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
            <span className="text-xs font-bold text-primary tracking-wider">EARN MORE</span>
          </motion.div>
          <div className="flex-1 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
        </motion.div>

        {/* INFLUENCER PATH */}
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

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="text-center mt-20"
        >
          <div className="glass-card rounded-3xl p-8 sm:p-12 max-w-lg mx-auto">
            <motion.div animate={{ y: [0, -5, 0] }} transition={{ duration: 3, repeat: Infinity }}>
              <Gift className="w-10 h-10 text-primary mx-auto mb-4" />
            </motion.div>
            <h3 className="font-display text-xl font-bold text-foreground mb-2">Ready to Start?</h3>
            <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
              Join thousands already reclaiming their utility spend. It costs nothing to join.
            </p>
            <button
              onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
              className="clay-primary rounded-xl px-8 py-3 text-sm font-semibold"
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
