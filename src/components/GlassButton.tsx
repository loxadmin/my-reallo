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
    primary: "clay-primary text-primary-foreground font-semibold",
    outline: "glass-outline text-primary",
  };

  return (
    <motion.button
      type={type}
      whileHover={{ scale: 1.01, y: -0.5 }}
      whileTap={{ scale: 0.99, y: 0.5 }}
      className={cn(
        "px-6 py-2.5 rounded-[16px] font-display tracking-wide transition-all duration-300",
        variants[variant],
        disabled && "opacity-50 cursor-not-allowed",
        className
      )}
      onClick={onClick}
      disabled={disabled}
      style={{ fontSize: '13px' }}
    >
      {children}
    </motion.button>
  );
};

export default GlassButton;
