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
  children, className, variant = "default", onClick, disabled, type = "button",
}: GlassButtonProps) => {
  const variants = {
    default: "glass-button text-foreground",
    primary: "clay-primary text-white",
    outline: "glass-outline text-primary",
  };

  return (
    <motion.button
      type={type}
      whileHover={!disabled ? { scale: 1.02, y: -2 } : {}}
      whileTap={!disabled ? { scale: 0.98, y: 1 } : {}}
      className={cn(
        "px-8 py-4 rounded-[18px] font-display text-sm font-bold tracking-tight transition-all duration-300 flex items-center justify-center gap-2",
        variants[variant],
        disabled && "opacity-50 cursor-not-allowed grayscale",
        className
      )}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </motion.button>
  );
};

export default GlassButton;
