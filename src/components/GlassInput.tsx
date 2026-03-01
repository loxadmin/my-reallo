import { cn } from "@/lib/utils";
import { InputHTMLAttributes } from "react";

interface GlassInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  prefix?: string;
}

const GlassInput = ({ label, prefix, className, ...props }: GlassInputProps) => {
  return (
    <div className="space-y-2.5">
      {label && (
        <label className="text-xs font-display font-bold text-muted-foreground uppercase tracking-widest px-1">
          {label}
        </label>
      )}
      <div className="relative group">
        {prefix && (
          <span className="absolute left-5 top-1/2 -translate-y-1/2 text-primary font-display font-bold">
            {prefix}
          </span>
        )}
        <input
          className={cn(
            "w-full glass-input rounded-2xl px-5 py-4 text-foreground font-body font-medium placeholder:text-muted-foreground/30 focus:ring-2 ring-primary/20",
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
