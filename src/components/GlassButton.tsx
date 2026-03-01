import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { ReactNode } from "react";

interface GlassButtonProps {
  children: ReactNode;
  className?: string;
  variant?: "default" | "primary" | "outline";
  onClick?: () => void;
  disabled?: boolean;
  type?: "button" | "submit";
}

const GlassButton = ({
  children,
  className,
  variant = "default",
  onClick,
  disabled,
  type = "button",
}: GlassButtonProps) => {
  const variants = {
    default: "glass-button text-foreground font-bold",
    primary: "clay-primary text-primary-foreground font-black uppercase tracking-[0.1em]",
    outline: "glass-outline text-primary font-black uppercase tracking-[0.1em]",
  };

  return (
    <motion.button
      type={type}
      whileHover={disabled ? {} : { scale: 1.02, y: -2 }}
      whileTap={disabled ? {} : { scale: 0.98, y: 1 }}
      className={cn(
        "px-6 py-4 rounded-2xl font-display text-xs transition-all duration-500",
        variants[variant],
        disabled && "opacity-40 cursor-not-allowed grayscale",
        className
      )}
      onClick={onClick}
      disabled={disabled}
    >
      <span className="relative z-10 flex items-center justify-center gap-2">
         {children}
      </span>
    </motion.button>
  );
};

export default GlassButton;
