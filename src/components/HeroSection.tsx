import { motion } from "framer-motion";
import GlassButton from "./GlassButton";
import RealloEyeLogo from "./RealloEyeLogo";

interface HeroSectionProps {
  onGetStarted: () => void;
}

const HeroSection = ({ onGetStarted }: HeroSectionProps) => {
  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center px-6 overflow-hidden">
      {/* Ambient glow orbs */}
      <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[500px] h-[500px] rounded-full bg-primary/5 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-20 right-10 w-[300px] h-[300px] rounded-full bg-primary/8 blur-[100px] pointer-events-none" />

      {/* Floating particles */}
      {[...Array(6)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-1 h-1 rounded-full bg-primary/40"
          style={{
            top: `${20 + i * 12}%`,
            left: `${10 + i * 15}%`,
          }}
          animate={{
            y: [-20, 20, -20],
            opacity: [0.2, 0.6, 0.2],
          }}
          transition={{
            duration: 4 + i,
            repeat: Infinity,
            ease: "easeInOut",
            delay: i * 0.5,
          }}
        />
      ))}

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
          className="inline-flex items-center gap-2 glass-button rounded-full px-4 py-1.5 mb-8"
        >
          <span className="w-2 h-2 rounded-full bg-primary pulse-glow" />
          <span className="text-xs font-display text-primary/80 tracking-widest uppercase">
            Reclaim What's Yours
          </span>
        </motion.div>

        <div className="flex items-center justify-center gap-3 mb-4">
          <RealloEyeLogo size={48} />
          <span className="font-display text-4xl font-bold gradient-text">Reallo</span>
        </div>
        <h1 className="font-display text-5xl sm:text-6xl font-bold leading-[1.1] mb-6">
          <span className="text-foreground">Stop </span>
          <span className="gradient-text">Losing</span>
          <br />
          <span className="text-foreground">Your Money</span>
        </h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.8 }}
          className="text-muted-foreground text-base sm:text-lg mb-10 leading-relaxed max-w-sm mx-auto"
        >
          Calculate how much you spend on utilities yearly and claim it back toward your life goals.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7, duration: 0.6 }}
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
          transition={{ delay: 1, duration: 0.8 }}
          className="flex justify-center gap-8 mt-12"
        >
          {[
            { value: "2,000+", label: "In Queue" },
            { value: "₦0", label: "To Join" },
            { value: "5x", label: "Skip Per Referral" },
          ].map((stat) => (
            <div key={stat.label} className="text-center">
              <p className="font-display text-xl font-bold text-primary glow-text">{stat.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{stat.label}</p>
            </div>
          ))}
        </motion.div>
      </motion.div>

      {/* iPhone frame decoration */}
      <motion.div
        initial={{ opacity: 0, y: 60 }}
        animate={{ opacity: 0.06, y: 0 }}
        transition={{ delay: 1.2, duration: 1 }}
        className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[280px] h-[500px] rounded-[3rem] border-2 border-foreground/20 pointer-events-none"
      />
    </section>
  );
};

export default HeroSection;
