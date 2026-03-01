import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import GlassCard from "@/components/GlassCard";
import GlassButton from "@/components/GlassButton";
import QuestionnaireFlow from "@/components/QuestionnaireFlow";
import { Award, Zap, Sparkles, Target, Info } from "lucide-react";
import Layout from "@/components/Layout";

const formatNaira = (n: number) => "₦" + n.toLocaleString("en-NG");

const Earn = () => {
  const { profile } = useAuth();
  const pointsBalance = profile?.points_balance ?? 0;

  return (
    <Layout>
      <section className="px-6 max-w-lg mx-auto space-y-6 pb-24">
        <header className="text-center space-y-2">
          <h1 className="font-display text-3xl font-bold gradient-text">Earn Points</h1>
          <p className="text-sm text-muted-foreground">Complete tasks to increase your balance</p>
        </header>

        {/* Dynamic Points Display */}
        <GlassCard variant="glow" className="relative overflow-hidden group py-8">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 text-center space-y-2">
            <div className="flex items-center justify-center gap-2 mb-1">
               <Award className="w-5 h-5 text-primary" />
               <p className="text-xs text-muted-foreground font-display uppercase tracking-widest font-semibold">Current Balance</p>
            </div>

            <motion.p
               key={pointsBalance}
               initial={{ scale: 0.9, opacity: 0 }}
               animate={{ scale: 1, opacity: 1 }}
               className="font-display text-5xl font-bold gradient-text"
            >
               {pointsBalance.toLocaleString()}
            </motion.p>
            <p className="text-sm text-muted-foreground font-medium">
               ≈ {formatNaira(Math.floor(pointsBalance * 0.5))} Value
            </p>
          </div>
        </GlassCard>

        {/* Task Grid Header */}
        <div className="space-y-4">
          <h3 className="font-display font-semibold text-foreground px-1">Available Tasks</h3>
          <QuestionnaireFlow />
        </div>
      </section>
    </Layout>
  );
};

export default Earn;
