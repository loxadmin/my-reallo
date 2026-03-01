import { useAuth } from "@/contexts/AuthContext";
import GlassCard from "@/components/GlassCard";
import QuestionnaireFlow from "@/components/QuestionnaireFlow";
import { Award, Sparkles, TrendingUp, Info } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";

const formatNaira = (n: number) => "₦" + n.toLocaleString("en-NG");

const Earn = () => {
  const { profile } = useAuth();
  const pointsBalance = profile?.points_balance ?? 0;

  return (
    <DashboardLayout>
      <div className="max-w-md mx-auto space-y-6">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold font-display tracking-tight">Earn</h1>
          <p className="text-muted-foreground text-sm font-medium">Earn points & move up.</p>
        </div>

        {/* Balance Card */}
        <GlassCard variant="glow" className="relative overflow-hidden p-8 border-primary/20">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <Award className="w-24 h-24 text-primary" />
          </div>

          <div className="relative z-10 flex flex-col items-center text-center space-y-4">
             <div className="w-14 h-14 rounded-2xl bg-primary/15 flex items-center justify-center">
               <Sparkles className="w-7 h-7 text-primary" />
             </div>
             <div>
               <p className="text-xs text-muted-foreground font-bold uppercase tracking-[0.2em] font-display">Points Balance</p>
               <h2 className="text-5xl font-bold font-display mt-2 gradient-text tracking-tighter">
                 {pointsBalance.toLocaleString()}
               </h2>
               <div className="flex items-center justify-center gap-2 mt-3 text-sm font-bold text-foreground bg-muted/30 px-4 py-1.5 rounded-full w-fit mx-auto">
                 <TrendingUp className="w-4 h-4 text-emerald-500" />
                 ≈ {formatNaira(Math.floor(pointsBalance * 0.5))} Value
               </div>
             </div>
          </div>
        </GlassCard>

        {/* Info Box */}
        <GlassCard className="p-5 border-indigo-500/20 bg-indigo-500/5">
          <div className="flex gap-4">
            <div className="w-10 h-10 rounded-full bg-indigo-500/10 flex items-center justify-center flex-shrink-0">
              <Info className="w-5 h-5 text-indigo-500" />
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed font-medium">
              Every point you earn brings you closer to your goal. Complete questionnaires to help us understand your spending habits better.
            </p>
          </div>
        </GlassCard>

        {/* Tasks Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <h2 className="font-display font-bold text-lg">Questionnaires</h2>
            <span className="text-[10px] font-bold text-primary uppercase tracking-widest bg-primary/10 px-2 py-1 rounded-md">
              Live Tasks
            </span>
          </div>
          <QuestionnaireFlow />
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Earn;
