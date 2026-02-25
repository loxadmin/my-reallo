import { motion } from "framer-motion";
import GlassButton from "./GlassButton";
import WalletAnimation from "./WalletAnimation";

interface HeroSectionProps {
  onGetStarted: () => void;
}

const HeroSection = ({ onGetStarted }: HeroSectionProps) => {
  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center px-4 pt-24 pb-12 overflow-hidden">
      {/* Soft ambient orbs */}
      <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[500px] h-[500px] rounded-full bg-primary/6 blur-[180px] pointer-events-none" />
      <div className="absolute bottom-[10%] right-[-5%] w-[300px] h-[300px] rounded-full bg-primary/4 blur-[140px] pointer-events-none" />
      <div className="absolute top-[40%] left-[-5%] w-[200px] h-[200px] rounded-full bg-accent/6 blur-[100px] pointer-events-none" />

      {/* Subtle dot grid */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage: `radial-gradient(hsl(48 96% 53% / 0.4) 1px, transparent 1px)`,
          backgroundSize: "32px 32px",
        }}
      />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        className="text-center max-w-md mx-auto z-10 flex flex-col items-center"
      >
        {/* Status pill */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="inline-flex items-center gap-2.5 glass-pill rounded-full px-4 py-1.5 mb-6"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-primary pulse-glow" />
          <span className="text-[11px] font-display text-primary/70 tracking-[0.2em] uppercase">
            Reclaim What's Yours
          </span>
        </motion.div>

        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.6 }}
          className="font-display text-3xl sm:text-5xl font-bold leading-[1.1] mb-3"
        >
          <span className="text-foreground">Stop </span>
          <span className="gradient-text">Losing</span>
          <br />
          <span className="text-foreground">Your Money</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.7 }}
          className="text-muted-foreground text-sm sm:text-base mb-6 leading-relaxed max-w-xs mx-auto"
        >
          Calculate your annual utility spend and claim it back toward your life goals.
        </motion.p>

        {/* Wallet Animation - contained size */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.6, duration: 0.7 }}
          className="mb-6 w-full max-w-[180px]"
        >
          <WalletAnimation />
        </motion.div>

        {/* CTA Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, duration: 0.5 }}
          className="flex flex-col sm:flex-row gap-3 justify-center w-full max-w-xs"
        >
          <GlassButton variant="primary" onClick={onGetStarted} className="text-sm px-6 py-3 flex-1">
            Calculate & Claim
          </GlassButton>
          <GlassButton variant="outline" className="text-sm px-6 py-3 flex-1">
            How It Works
          </GlassButton>
        </motion.div>

        {/* Stats row */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1, duration: 0.7 }}
          className="flex justify-center gap-3 mt-8"
        >
          {[
            { value: "2,000+", label: "In Queue" },
            { value: "₦0", label: "To Join" },
            { value: "5x", label: "Skip / Referral" },
          ].map((stat) => (
            <div key={stat.label} className="glass-stat rounded-2xl px-4 py-2.5 text-center min-w-[80px]">
              <p className="font-display text-base font-bold text-primary glow-text">{stat.value}</p>
              <p className="text-[9px] text-muted-foreground mt-0.5 tracking-wide">{stat.label}</p>
            </div>
          ))}
        </motion.div>
      </motion.div>
    </section>
  );
};

export default HeroSection;
