import { InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface GlassInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  prefix?: string;
  error?: string;
}

const GlassInput = ({ label, prefix, error, className, ...props }: GlassInputProps) => {
  return (
    <div className="w-full space-y-1.5">
      {label && (
        <label className="text-xs font-medium text-muted-foreground ml-1">
          {label}
        </label>
      )}
      <div className="relative group">
        {prefix && (
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-medium group-focus-within:text-primary transition-colors">
            {prefix}
          </span>
        )}
        <input
          className={cn(
            "w-full bg-white/5 dark:bg-white/[0.03] border border-white/20 dark:border-white/10 rounded-2xl px-4 py-3.5 text-sm transition-all focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary",
            prefix && "pl-10",
            error && "border-destructive focus:ring-destructive/20",
            className
          )}
          {...props}
        />
      </div>
      {error && <p className="text-[10px] text-destructive ml-1">{error}</p>}
    </div>
  );
};

export default GlassInput;
