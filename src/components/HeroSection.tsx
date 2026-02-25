import { motion } from "framer-motion";
import GlassButton from "./GlassButton";
import RealloEyeLogo from "./RealloEyeLogo";
import WalletAnimation from "./WalletAnimation";

interface HeroSectionProps {
  onGetStarted: () => void;
}

const HeroSection = ({ onGetStarted }: HeroSectionProps) => {
  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center px-6 overflow-hidden">
      {/* Layered ambient glow */}
      <div className="absolute top-10 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-primary/8 blur-[150px] pointer-events-none" />
      <div className="absolute bottom-20 right-10 w-[400px] h-[400px] rounded-full bg-primary/5 blur-[120px] pointer-events-none" />
      <div className="absolute top-1/3 left-10 w-[200px] h-[200px] rounded-full bg-accent/10 blur-[80px] pointer-events-none" />

      {/* Floating particles */}
      {[...Array(8)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-1 h-1 rounded-full bg-primary/30"
          style={{
            top: `${15 + i * 10}%`,
            left: `${8 + i * 12}%`,
          }}
          animate={{
            y: [-25, 25, -25],
            x: [-5, 5, -5],
            opacity: [0.1, 0.5, 0.1],
          }}
          transition={{
            duration: 5 + i * 0.5,
            repeat: Infinity,
            ease: "easeInOut",
            delay: i * 0.4,
          }}
        />
      ))}

      {/* Grid overlay for depth */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.02]"
        style={{
          backgroundImage: `linear-gradient(hsl(48 96% 53% / 0.3) 1px, transparent 1px), linear-gradient(90deg, hsl(48 96% 53% / 0.3) 1px, transparent 1px)`,
          backgroundSize: "60px 60px",
        }}
      />

      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
        className="text-center max-w-lg mx-auto z-10"
      >
        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3, duration: 0.6 }}
          className="inline-flex items-center gap-2 glass-card rounded-full px-5 py-2 mb-8"
        >
          <span className="w-2 h-2 rounded-full bg-primary pulse-glow" />
          <span className="text-xs font-display text-primary/80 tracking-widest uppercase">
            Reclaim What's Yours
          </span>
        </motion.div>

        {/* Logo + Title */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.7 }}
          className="flex items-center justify-center gap-3 mb-6"
        >
          <RealloEyeLogo size={56} />
          <span className="font-display text-5xl font-bold gradient-text">Reallo</span>
        </motion.div>

        <h1 className="font-display text-4xl sm:text-6xl font-bold leading-[1.08] mb-4">
          <span className="text-foreground">Stop </span>
          <span className="gradient-text">Losing</span>
          <br />
          <span className="text-foreground">Your Money</span>
        </h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6, duration: 0.8 }}
          className="text-muted-foreground text-base sm:text-lg mb-8 leading-relaxed max-w-sm mx-auto"
        >
          Calculate how much you spend on utilities yearly and claim it back toward your life goals.
        </motion.p>

        {/* Wallet Animation */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7, duration: 0.8 }}
          className="mb-8"
        >
          <WalletAnimation />
        </motion.div>

        {/* CTA Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9, duration: 0.6 }}
          className="flex flex-col sm:flex-row gap-4 justify-center"
        >
          <GlassButton variant="primary" onClick={onGetStarted} className="text-base px-8 py-4">
            Calculate & Claim Now
          </GlassButton>
          <GlassButton variant="outline" className="text-base px-8 py-4">
            How It Works
          </GlassButton>
        </motion.div>

        {/* Stats row */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.1, duration: 0.8 }}
          className="flex justify-center gap-6 mt-10"
        >
          {[
            { value: "2,000+", label: "In Queue" },
            { value: "₦0", label: "To Join" },
            { value: "5x", label: "Skip Per Referral" },
          ].map((stat) => (
            <div key={stat.label} className="glass-card rounded-xl px-4 py-3 text-center">
              <p className="font-display text-lg font-bold text-primary glow-text">{stat.value}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">{stat.label}</p>
            </div>
          ))}
        </motion.div>
      </motion.div>
    </section>
  );
};

export default HeroSection;
