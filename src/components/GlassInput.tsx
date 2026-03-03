import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Label } from "./ui/label";

interface GlassInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  prefix?: string;
}

const GlassInput = ({ className, label, prefix, ...props }: GlassInputProps) => {
  return (
    <div className="space-y-2 w-full">
      {label && <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider ml-1">{label}</Label>}
      <div className="relative flex items-center">
        {prefix && (
          <span className="absolute left-4 font-bold text-muted-foreground pointer-events-none">
            {prefix}
          </span>
        )}
        <motion.input
          whileFocus={{ scale: 1.005 }}
          className={cn(
            "w-full px-5 py-3 rounded-[18px] glass-input text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/30 transition-all",
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
