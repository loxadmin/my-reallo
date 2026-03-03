import { cn } from "@/lib/utils";
import { InputHTMLAttributes } from "react";

interface GlassInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  prefix?: string;
}

const GlassInput = ({ label, prefix, className, ...props }: GlassInputProps) => {
  return (
    <div className="space-y-2">
      {label && (
        <label className="text-sm font-display text-muted-foreground tracking-wide">
          {label}
        </label>
      )}
      <div className="relative">
        {prefix && (
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-primary font-display font-semibold">
            {prefix}
          </span>
        )}
        <input
          className={cn(
            "w-full glass-input rounded-xl px-4 py-3.5 text-foreground font-body placeholder:text-muted-foreground/50",
            prefix && "pl-10",
            className
          )}
          {...props}
        />
      </div>
    </div>
  );
};

export default GlassInput;
