import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { ReactNode } from "react";

interface GlassCardProps {
  children: ReactNode;
  className?: string;
  variant?: "default" | "strong" | "glow";
  animate?: boolean;
}

const GlassCard = ({ children, className, variant = "default", animate = true }: GlassCardProps) => {
  const variantClasses = {
    default: "glass-card",
    strong: "glass-strong",
    glow: "glass-card glow-border",
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
      className={cn("rounded-2xl p-6", variantClasses[variant], className)}
      {...animateProps}
    >
      {children}
    </Wrapper>
  );
};

export default GlassCard;
