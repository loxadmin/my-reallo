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
    primary:
      "bg-primary text-primary-foreground border border-primary/30 hover:shadow-[0_0_40px_hsl(48_96%_53%/0.3)] transition-all duration-300",
    outline:
      "glass-button border-primary/30 text-primary hover:bg-primary/10",
  };

  return (
    <motion.button
      type={type}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={cn(
        "px-6 py-3 rounded-xl font-display font-medium text-sm tracking-wide",
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
