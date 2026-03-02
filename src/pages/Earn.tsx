import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import Navbar from "@/components/Navbar";
import BottomNav from "@/components/BottomNav";
import GlassCard from "@/components/GlassCard";
import QuestionnaireFlow from "@/components/QuestionnaireFlow";
import { Award } from "lucide-react";

const formatNaira = (n: number) => "₦" + n.toLocaleString("en-NG");

const Earn = () => {
  const { profile, loading } = useAuth();

  if (loading) return null;

  const pointsBalance = profile?.points_balance ?? 0;

  return (
    <div className="relative min-h-screen overflow-x-hidden">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-primary/5 rounded-full blur-[200px]" />
      </div>

      <Navbar />

      <section className="min-h-screen flex items-start justify-center px-4 pt-24 pb-32">
        <div className="w-full max-w-md space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="text-center space-y-2">
              <h1 className="font-display text-2xl font-bold">Earn Points</h1>
              <p className="text-sm text-muted-foreground">Complete tasks to increase your balance</p>
            </div>

            <GlassCard variant="glow" className="text-center py-8">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Award className="w-5 h-5 text-primary" />
                <p className="text-xs text-muted-foreground font-display uppercase tracking-[0.2em]">Current Balance</p>
              </div>
              <p className="font-display text-4xl font-bold gradient-text">{pointsBalance.toLocaleString()}</p>
              <p className="text-sm text-muted-foreground mt-2 font-medium">
                ≈ {formatNaira(Math.floor(pointsBalance * 0.5))} Value
              </p>
            </GlassCard>

            <div className="space-y-4">
              <h3 className="font-display font-semibold px-1">Available Tasks</h3>
              <QuestionnaireFlow />
            </div>
          </motion.div>
        </div>
      </section>

      <BottomNav active="earn" onChange={() => {}} showVerify={(profile?.queue_position ?? 1) <= 0} />
    </div>
  );
};

export default Earn;
