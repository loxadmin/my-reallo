import { useAuth } from "@/contexts/AuthContext";
import GlassCard from "@/components/GlassCard";
import QuestionnaireFlow from "@/components/QuestionnaireFlow";
import { Award } from "lucide-react";

const formatNaira = (n: number) => "₦" + n.toLocaleString("en-NG");

const Earn = () => {
  const { profile } = useAuth();
  const pointsBalance = profile?.points_balance ?? 0;

  return (
    <div className="pt-24 pb-32 px-6 max-w-md mx-auto space-y-6">
      <GlassCard variant="glow" className="text-center">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Award className="w-5 h-5 text-primary" />
          <p className="text-xs text-muted-foreground font-display uppercase tracking-widest">Points Balance</p>
        </div>
        <p className="font-display text-4xl font-bold gradient-text">{pointsBalance.toLocaleString()}</p>
        <p className="text-sm text-muted-foreground mt-2 font-medium">
          ≈ {formatNaira(Math.floor(pointsBalance * 0.5))} Value
        </p>
      </GlassCard>

      <div className="space-y-4">
        <h2 className="font-display text-xl font-bold px-1">Available Missions</h2>
        <QuestionnaireFlow />
      </div>
    </div>
  );
};

export default Earn;
