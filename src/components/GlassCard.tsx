import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { ReactNode } from "react";

interface GlassCardProps {
  children: ReactNode;
  className?: string;
  variant?: "default" | "strong" | "glow" | "blue";
  animate?: boolean;
}

const GlassCard = ({ children, className, variant = "default", animate = true }: GlassCardProps) => {
  const variantClasses = {
    default: "glass-card",
    strong: "glass-card bg-white/10 dark:bg-white/5 border-white/30 dark:border-white/20",
    glow: "glass-card border-primary/30 shadow-[0_0_20px_rgba(42,172,196,0.1)]",
    blue: "bg-blue-600 text-white rounded-[2.5rem] p-8 shadow-xl border-none",
  };

  const Wrapper = animate ? motion.div : "div";
  const animateProps = animate
    ? {
        initial: { opacity: 0, y: 20 },
        whileInView: { opacity: 1, y: 0 },
        viewport: { once: true },
        transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] },
      }
    : {};

  return (
    <Wrapper
      className={cn("rounded-[2rem] p-6 transition-all duration-300", variantClasses[variant], className)}
      {...animateProps}
    >
      {children}
    </Wrapper>
  );
};

export default GlassCard;
