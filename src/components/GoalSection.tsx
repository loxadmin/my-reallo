import { motion } from "framer-motion";
import GlassCard from "./GlassCard";
import { Target, TrendingUp, TrendingDown, Clock } from "lucide-react";

interface GoalSectionProps {
  goal: string;
  claimableAmount: number;
  targetAmount: number;
}

const formatNaira = (n: number) => "₦" + n.toLocaleString("en-NG");

const GoalSection = ({ goal, claimableAmount, targetAmount }: GoalSectionProps) => {
  const progress = Math.min((claimableAmount / targetAmount) * 100, 100);

  return (
    <GlassCard className="w-full py-24 px-12 flex flex-col md:flex-row items-center gap-24 rounded-[64px] border-black/5 dark:border-white/10 shadow-2xl shadow-black/5 bg-black/[0.01] dark:bg-white/[0.01]">
      <div className="flex flex-col flex-1 text-left w-full">
        <div className="flex items-center gap-5 mb-10 bg-primary/10 border border-primary/20 rounded-full px-8 py-3 mx-auto md:mx-0 w-fit">
          <Target className="w-6 h-6 text-primary" />
          <span className="text-[10px] uppercase tracking-[0.5em] font-black text-primary">Strategic Goal Index</span>
        </div>
        <h3 className="text-4xl md:text-7xl font-black mb-6 capitalize text-foreground tracking-tighter leading-none text-center md:text-left">{goal}</h3>
        <p className="text-[11px] md:text-sm text-muted-foreground mb-16 uppercase tracking-[0.4em] font-black leading-relaxed opacity-60 text-center md:text-left">
           Maintain your utility spend index to achieve your enterprise target sector.
        </p>

        <div className="grid grid-cols-2 gap-8 mb-16 max-w-lg mx-auto md:mx-0">
          <div className="flex flex-col p-8 bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/10 rounded-[40px] shadow-inner">
            <TrendingUp className="w-6 h-6 text-primary mb-4" />
            <span className="text-[9px] uppercase tracking-[0.5em] font-black text-muted-foreground mb-3 opacity-60">Growth Index</span>
            <span className="text-3xl font-black text-foreground tracking-tighter leading-none">+12.4%</span>
          </div>
          <div className="flex flex-col p-8 bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/10 rounded-[40px] shadow-inner">
            <Clock className="w-6 h-6 text-primary mb-4" />
            <span className="text-[9px] uppercase tracking-[0.5em] font-black text-muted-foreground mb-3 opacity-60">ETA Sector</span>
            <span className="text-3xl font-black text-foreground tracking-tighter leading-none">12 Months</span>
          </div>
        </div>
      </div>

      <div className="flex flex-col items-center justify-center w-full md:w-fit min-w-[340px] relative">
         <div className="absolute inset-0 bg-primary/10 blur-[120px] rounded-full" />
        <div className="relative w-80 h-80 flex items-center justify-center">
          <svg className="w-full h-full transform -rotate-90">
            <circle
              cx="160"
              cy="160"
              r="140"
              className="stroke-black/5 dark:stroke-white/10 fill-none"
              strokeWidth="32"
            />
            <motion.circle
              cx="160"
              cy="160"
              r="140"
              className="stroke-primary fill-none shadow-glow"
              strokeWidth="36"
              strokeLinecap="round"
              initial={{ strokeDasharray: "0 880" }}
              whileInView={{ strokeDasharray: `${(progress * 880) / 100} 880` }}
              viewport={{ once: true }}
              transition={{ duration: 2.0, ease: "circOut" }}
            />
          </svg>
          <div className="absolute flex flex-col items-center leading-none text-center">
            <span className="text-6xl font-black text-foreground tracking-tighter leading-none">{Math.round(progress)}%</span>
            <span className="text-[10px] uppercase tracking-[0.4em] text-muted-foreground font-black mt-4 opacity-60">Index Capacity</span>
          </div>
        </div>
        <div className="mt-16 text-center flex flex-col items-center gap-4">
          <p className="text-3xl font-black text-foreground tracking-tighter leading-none">
             {formatNaira(claimableAmount)}
             <span className="text-muted-foreground font-black text-[11px] ml-4 uppercase tracking-[0.4em] opacity-50">/ {formatNaira(targetAmount)}</span>
          </p>
          <span className="text-[10px] uppercase tracking-[0.5em] font-black text-primary bg-primary/10 px-8 py-3 rounded-full border border-primary/20 shadow-xl shadow-primary/5">Quota Validation Active</span>
        </div>
      </div>
    </GlassCard>
  );
};

export default GoalSection;
