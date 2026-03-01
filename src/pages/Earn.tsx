import Navbar from "@/components/Navbar";
import GlassCard from "@/components/GlassCard";
import QuestionnaireFlow from "@/components/QuestionnaireFlow";
import { Award, TrendingUp, Wallet } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { motion } from "framer-motion";

const Earn = () => {
  const { profile } = useAuth();
  const pointsBalance = profile?.points_balance ?? 0;

  return (
    <div className="relative min-h-screen pb-24">
      <Navbar />
      <div className="pt-24 px-6 max-w-lg mx-auto space-y-6">
        <GlassCard variant="glow" className="text-center">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-4 pulse-glow">
              <Award className="w-8 h-8 text-primary" />
            </div>
            <p className="text-xs text-muted-foreground uppercase tracking-[0.2em] font-display mb-1">
              Points Balance
            </p>
            <h2 className="font-display text-4xl font-bold gradient-text">
              {pointsBalance.toLocaleString()}
            </h2>
            <div className="flex items-center justify-center gap-2 mt-2 text-sm text-muted-foreground">
              <Wallet className="w-4 h-4" />
              <span>≈ ₦{(pointsBalance * 0.5).toLocaleString()} value</span>
            </div>
          </motion.div>
        </GlassCard>

        <div className="grid grid-cols-2 gap-4">
          <GlassCard className="p-4 flex flex-col items-center text-center">
            <TrendingUp className="w-5 h-5 text-primary mb-2" />
            <p className="text-[10px] text-muted-foreground uppercase font-display">Status</p>
            <p className="font-display font-bold">Active Earner</p>
          </GlassCard>
          <GlassCard className="p-4 flex flex-col items-center text-center">
            <Award className="w-5 h-5 text-primary mb-2" />
            <p className="text-[10px] text-muted-foreground uppercase font-display">Daily Cap</p>
            <p className="font-display font-bold">Unlimited</p>
          </GlassCard>
        </div>

        <QuestionnaireFlow />
      </div>
    </div>
  );
};

export default Earn;
