import { motion } from "framer-motion";
import GlassCard from "./GlassCard";
import { Check, Users, Wallet, ArrowUpRight } from "lucide-react";
import GlassButton from "./GlassButton";

interface WalletHeroProps {
  position: number;
  totalAnnualSpend: number;
  isOffQueue: boolean;
}

const WalletHero = ({ position, totalAnnualSpend, isOffQueue }: WalletHeroProps) => {
  const isNext = position <= 1;

  return (
    <GlassCard variant="strong" className="w-full py-24 px-12 relative overflow-hidden flex flex-col items-center justify-center text-center rounded-[64px] border-black/5 dark:border-white/10 shadow-2xl shadow-black/10 bg-white/5 dark:bg-black/20">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        whileInView={{ scale: 1, opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8, ease: "circOut" }}
        className="w-full"
      >
        <div className="flex items-center justify-center gap-5 mb-12 bg-primary/10 border border-primary/20 rounded-full px-10 py-3 mx-auto w-fit">
          <Wallet className="w-6 h-6 text-primary" />
          <span className="text-[11px] uppercase tracking-[0.6em] font-black text-primary">Total Balance Index</span>
        </div>

        <h2 className="text-6xl md:text-[120px] font-black mb-12 tracking-tighter text-foreground selection:bg-primary/20 leading-none">
          ₦{totalAnnualSpend.toLocaleString()}
        </h2>

        {isOffQueue || isNext ? (
          <div className="flex flex-col items-center gap-10 mb-20">
            <div className="flex items-center justify-center gap-6 bg-primary text-white rounded-[32px] px-12 py-6 mx-auto w-fit shadow-2xl shadow-primary/40">
              <Check className="w-7 h-7" />
              <span className="text-[13px] font-black uppercase tracking-[0.5em]">
                {isOffQueue ? "You're Off the Queue!" : "You're Next!"}
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground max-w-lg leading-relaxed uppercase tracking-[0.5em] font-black opacity-60">
              Earn points, verify spend & reclaim your money instantly.
            </p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-10 mb-20">
            <div className="flex items-center justify-center gap-8 bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/10 rounded-[48px] px-16 py-10 mx-auto w-fit shadow-inner">
              <Users className="w-10 h-10 text-primary" />
              <div className="flex flex-col items-start leading-none gap-3">
                 <span className="text-[11px] uppercase tracking-[0.6em] font-black text-muted-foreground opacity-60">Queue Index</span>
                 <span className="text-6xl font-black text-foreground tracking-tighter leading-none">{position}</span>
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground max-w-lg leading-relaxed uppercase tracking-[0.5em] font-black opacity-60">
               Skip the queue sector — refer a friend and move up 5 spots instantly.
            </p>
          </div>
        )}

        <div className="flex flex-col sm:flex-row justify-center gap-8 w-full max-w-xl mx-auto">
          <GlassButton variant="primary" className="flex-1 h-24 rounded-[40px] text-[12px] font-black uppercase tracking-[0.5em] shadow-[0_0_50px_rgba(15,61,46,0.3)] hover:scale-105 active:scale-95 transition-all">
            Withdraw <ArrowUpRight className="ml-4 w-6 h-6" />
          </GlassButton>
          <GlassButton variant="default" className="flex-1 h-24 rounded-[40px] text-[12px] font-black uppercase tracking-[0.5em] border border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5 hover:bg-primary/10 transition-all">
            Deposit
          </GlassButton>
        </div>
      </motion.div>
    </GlassCard>
  );
};

export default WalletHero;
