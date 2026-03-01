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
    default: "glass-button text-foreground",
    primary: "clay-primary text-primary-foreground font-bold shadow-2xl",
    outline: "glass-outline text-primary",
  };

  return (
    <motion.button
      type={type}
      whileHover={!disabled ? { scale: 1.05, y: -2 } : {}}
      whileTap={!disabled ? { scale: 0.95, y: 1 } : {}}
      className={cn(
        "px-6 py-3.5 rounded-2xl font-display text-sm font-bold tracking-tight transition-all duration-500",
        variants[variant],
        disabled && "opacity-40 cursor-not-allowed",
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
