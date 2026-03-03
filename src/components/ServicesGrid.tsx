import { motion } from "framer-motion";
import GlassCard from "./GlassCard";
import { Zap, Globe, Coins, ShieldCheck, Activity, ArrowUpRight } from "lucide-react";

const ServicesGrid = () => {
  const services = [
    { icon: <Zap className="w-8 h-8" />, title: "Calculate Spend", desc: "Update your utility records and track reclaim index value sector." },
    { icon: <Globe className="w-8 h-8" />, title: "Enterprise Hub", desc: "Send your reclaimed funds to any bank account instantly." },
    { icon: <Coins className="w-8 h-8" />, title: "Point Exchange", desc: "Trade your earned points for valuable utility vouchers." },
    { icon: <ShieldCheck className="w-8 h-8" />, title: "Secure Verify", desc: "Submit your spending proof for validation engine hub." },
  ];

  return (
    <div className="w-full flex flex-col items-center">
      <div className="flex flex-col mb-24 text-center md:text-left w-full max-w-7xl">
        <div className="flex items-center justify-center md:justify-start gap-5 mb-10 bg-primary/10 border border-primary/20 rounded-full px-8 py-3 mx-auto md:mx-0 w-fit">
          <Activity className="w-6 h-6 text-primary" />
          <span className="text-[10px] uppercase tracking-[0.5em] font-black text-primary">Service Infrastructure Hub</span>
        </div>
        <h3 className="text-4xl md:text-8xl font-black mb-6 text-foreground tracking-tighter leading-none">Your Services</h3>
        <p className="text-[11px] md:text-sm text-muted-foreground uppercase tracking-[0.4em] font-black leading-relaxed opacity-60">Comprehensive financial tools designed for your enterprise control sector.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8 md:gap-12 w-full max-w-7xl">
        {services.map((s, i) => (
          <GlassCard
            key={i}
            className="flex flex-col items-start p-8 md:p-12 group hover:border-primary/40 transition-all cursor-pointer bg-white/5 dark:bg-black/20 rounded-[48px] md:rounded-[64px] border-black/5 dark:border-white/10 h-full shadow-2xl shadow-black/5 active:scale-95"
          >
            <div className="bg-primary/10 p-6 md:p-8 rounded-2xl md:rounded-3xl mb-12 md:mb-16 group-hover:bg-primary group-hover:scale-110 group-hover:rotate-6 transition-all duration-500 shadow-xl shadow-primary/5">
              <div className="text-primary group-hover:text-white transition-colors">
                {s.icon}
              </div>
            </div>
            <h4 className="text-xl md:text-3xl font-black mb-6 md:mb-8 group-hover:text-primary transition-colors tracking-tighter leading-none">{s.title}</h4>
            <p className="text-[9px] md:text-[10px] text-muted-foreground leading-relaxed mb-8 md:mb-12 flex-1 uppercase tracking-[0.4em] font-black opacity-60">{s.desc}</p>
            <div className="flex items-center gap-3 md:gap-4 text-primary text-[9px] md:text-[10px] font-black uppercase tracking-[0.5em] mt-auto group-hover:translate-x-3 md:group-hover:translate-x-5 transition-transform">
              Access Module <ArrowUpRight className="w-5 h-5 md:w-6 md:h-6" />
            </div>
          </GlassCard>
        ))}
      </div>
    </div>
  );
};

export default ServicesGrid;
