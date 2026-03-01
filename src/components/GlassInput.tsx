import { cn } from "@/lib/utils";
import { InputHTMLAttributes } from "react";

interface GlassInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  prefix?: string;
}

const GlassInput = ({ label, prefix, className, ...props }: GlassInputProps) => {
  return (
    <div className="space-y-1.5">
      {label && (
        <label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] ml-1">
          {label}
        </label>
      )}
      <div className="relative group">
        {prefix && (
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-primary font-display font-black text-lg">
            {prefix}
          </span>
        )}
        <input
          className={cn(
            "w-full glass-input rounded-2xl px-5 py-4 text-foreground font-bold placeholder:text-muted-foreground/30 transition-all focus:ring-2 focus:ring-primary/20",
            prefix && "pl-11",
            className
          )}
          {...props}
        />
        <div className="absolute inset-0 rounded-2xl pointer-events-none border border-white/5 group-hover:border-white/20 transition-colors" />
      </div>
    </div>
  );
};

export default GlassInput;
