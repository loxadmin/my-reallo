import { motion } from "framer-motion";
import GlassCard from "./GlassCard";
import { Share2, Users, Copy, Check, ShieldCheck, PieChart, Activity, User, Settings, ArrowUpRight } from "lucide-react";
import GlassButton from "./GlassButton";
import { useState } from "react";

interface ReferralSectionProps {
  referralCode: string;
  isOffQueue: boolean;
}

const ReferralSection = ({ referralCode, isOffQueue }: ReferralSectionProps) => {
  const [copied, setCopied] = useState(false);
  const referralLink = `${window.location.origin}/auth?ref=${referralCode}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    if (navigator.share) {
      await navigator.share({ title: "Join Reallo", text: "Reclaim your utility spend!", url: referralLink });
    } else {
      handleCopy();
    }
  };

  return (
    <div className="w-full flex flex-col items-center">
      <div className="flex flex-col mb-24 text-center md:text-left w-full max-w-7xl">
        <div className="flex items-center justify-center md:justify-start gap-5 mb-10 bg-primary/10 border border-primary/20 rounded-full px-8 py-3 mx-auto md:mx-0 w-fit">
          <Share2 className="w-6 h-6 text-primary" />
          <span className="text-[10px] uppercase tracking-[0.5em] font-black text-primary">Colleague Rewards Index Sector</span>
        </div>
        <h3 className="text-4xl md:text-8xl font-black mb-6 text-foreground tracking-tighter leading-none text-center md:text-left">Referral System</h3>
        <p className="text-[11px] md:text-sm text-muted-foreground uppercase tracking-[0.4em] font-black leading-relaxed opacity-60 text-center md:text-left">Expand your network and gain exclusive financial benefits across sectors.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-24 items-center w-full max-w-7xl">
        <GlassCard className="p-20 bg-black/[0.01] dark:bg-white/[0.01] rounded-[80px] border-black/5 dark:border-white/10 shadow-2xl shadow-black/10 flex flex-col items-center text-center">
          <h4 className="text-3xl md:text-5xl font-black mb-12 text-foreground tracking-tighter leading-tight">Invite <br /> Colleagues</h4>
          <p className="text-[10px] md:text-[11px] text-muted-foreground leading-relaxed mb-20 uppercase tracking-[0.4em] font-black opacity-60 max-w-sm">
            {isOffQueue ? "Each colleague you invite earns you 1,000 enterprise points (₦500). Build your network for higher reclaim limits." : "For every colleague you refer, you skip 5 positions in the queue instantly."}
          </p>

          <div className="flex flex-col gap-12 w-full">
            <div className="p-12 bg-black/[0.03] dark:bg-white/[0.03] border border-black/5 dark:border-white/10 rounded-[48px] text-center group transition-all hover:bg-primary/5 shadow-inner">
              <span className="text-[10px] uppercase tracking-[0.5em] font-black text-muted-foreground mb-8 block opacity-60">Your Enterprise Code</span>
              <span className="text-6xl md:text-9xl font-black text-primary tracking-tighter group-hover:scale-110 transition-transform block leading-none">{referralCode}</span>
            </div>

            <div className="flex gap-8">
              <div className="flex-1 p-10 bg-black/[0.02] dark:bg-white/[0.02] border border-black/5 dark:border-white/10 rounded-[40px] text-[10px] text-muted-foreground truncate flex items-center font-black tracking-[0.3em] uppercase opacity-60">
                {referralLink}
              </div>
              <GlassButton variant="outline" onClick={handleCopy} className="p-10 h-auto rounded-[40px] border-black/10 dark:border-white/10 bg-white/10 dark:bg-white/5 hover:bg-primary/10 transition-all group">
                {copied ? <Check className="w-8 h-8 text-primary" /> : <Copy className="w-8 h-8 text-foreground group-hover:text-primary" />}
              </GlassButton>
            </div>

            <GlassButton variant="primary" className="w-full h-24 text-[12px] font-black uppercase tracking-[0.5em] rounded-[64px] shadow-2xl shadow-primary/40 hover:scale-[1.02] active:scale-95 transition-all" onClick={handleShare}>
              {isOffQueue ? "Share & Build Network" : "Execute Referral Launch"}
            </GlassButton>
          </div>
        </GlassCard>

        <div className="flex flex-col gap-24">
          <div className="flex gap-12 group">
            <div className="bg-primary/10 p-8 rounded-3xl h-fit border border-primary/20 group-hover:bg-primary group-hover:scale-110 group-hover:rotate-6 transition-all duration-500 shadow-2xl shadow-primary/10">
              <Users className="w-12 h-12 text-primary group-hover:text-white" />
            </div>
            <div>
              <h5 className="text-3xl font-black mb-6 text-foreground tracking-tighter leading-none">Verified Referral</h5>
              <p className="text-[10px] md:text-[11px] text-muted-foreground leading-relaxed uppercase tracking-[0.4em] font-black opacity-60">Instant skipping of queue positions upon successful colleague registration.</p>
            </div>
          </div>
          <div className="flex gap-12 group">
             <div className="bg-primary/10 p-8 rounded-3xl h-fit border border-primary/20 group-hover:bg-primary group-hover:scale-110 group-hover:rotate-6 transition-all duration-500 shadow-2xl shadow-primary/10">
              <ShieldCheck className="w-12 h-12 text-primary group-hover:text-white" />
            </div>
            <div>
              <h5 className="text-3xl font-black mb-6 text-foreground tracking-tighter leading-none">Security Cleared</h5>
              <p className="text-[10px] md:text-[11px] text-muted-foreground leading-relaxed uppercase tracking-[0.4em] font-black opacity-60">All referrals are securely validated by our enterprise-grade infrastructure sector.</p>
            </div>
          </div>
          <div className="flex gap-12 group">
             <div className="bg-primary/10 p-8 rounded-3xl h-fit border border-primary/20 group-hover:bg-primary group-hover:scale-110 group-hover:rotate-6 transition-all duration-500 shadow-2xl shadow-primary/10">
              <ArrowUpRight className="w-12 h-12 text-primary group-hover:text-white" />
            </div>
            <div>
              <h5 className="text-3xl font-black mb-6 text-foreground tracking-tighter leading-none">Higher Limits</h5>
              <p className="text-[10px] md:text-[11px] text-muted-foreground leading-relaxed uppercase tracking-[0.4em] font-black opacity-60">Referrals contribute directly to increasing your annual reclaim thresholds hub.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReferralSection;
