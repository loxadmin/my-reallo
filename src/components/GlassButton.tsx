import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { ButtonHTMLAttributes, ReactNode } from "react";

interface GlassButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: "primary" | "outline" | "secondary" | "ghost";
  className?: string;
  loading?: boolean;
}

const GlassButton = ({
  children,
  variant = "primary",
  className,
  loading,
  disabled,
  ...props
}: GlassButtonProps) => {
  const variants = {
    primary: "clay-primary",
    outline: "glass-button border-primary/20 text-primary hover:bg-primary/5",
    secondary: "glass-button border-white/20 text-foreground hover:bg-white/5",
    ghost: "bg-transparent hover:bg-muted text-muted-foreground",
  };

  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={cn(
        "px-6 py-3 rounded-2xl font-display font-semibold text-sm transition-all duration-300 disabled:opacity-50 disabled:pointer-events-none",
        variants[variant],
        className
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
      ) : (
        children
      )}
    </motion.button>
  );
};

export default GlassButton;
