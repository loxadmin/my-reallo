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
    primary: "clay-primary text-primary-foreground font-semibold",
    outline: "glass-outline text-primary",
  };

  return (
    <motion.button
      type={type}
      whileHover={{ scale: 1.03, y: -2 }}
      whileTap={{ scale: 0.97, y: 1 }}
      className={cn(
        "px-6 py-3 rounded-2xl font-display text-sm tracking-wide transition-all duration-300",
        variants[variant],
        disabled && "opacity-50 cursor-not-allowed",
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
