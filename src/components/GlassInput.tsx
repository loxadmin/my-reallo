import { InputHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

interface GlassInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  icon?: ReactNode;
}

const GlassInput = ({ label, icon, className, ...props }: GlassInputProps) => {
  return (
    <div className="space-y-1.5 group">
      {label && (
        <label className="text-[10px] font-display font-bold text-muted-foreground uppercase tracking-widest ml-1 transition-colors group-focus-within:text-primary">
          {label}
        </label>
      )}
      <div className="relative">
        {icon && (
          <div className="absolute left-4 top-1/2 -translate-y-1/2">
            {icon}
          </div>
        )}
        <input
          className={cn(
            "w-full glass-input rounded-2xl py-4 transition-all duration-300 text-foreground placeholder:text-muted-foreground/50 font-medium text-sm",
            icon ? "pl-11 pr-4" : "px-4",
            className
          )}
          {...props}
        />
      </div>
    </div>
  );
};

export default GlassInput;
