import { useAuth } from "@/contexts/AuthContext";
import Layout from "@/components/Layout";
import GlassCard from "@/components/GlassCard";
import { Award } from "lucide-react";
import QuestionnaireFlow from "@/components/QuestionnaireFlow";

const formatNaira = (n: number) => "₦" + n.toLocaleString("en-NG");

const Earn = () => {
  const { profile } = useAuth();
  const pointsBalance = profile?.points_balance ?? 0;

  return (
    <Layout>
      <div className="space-y-6 pb-20">
        <header className="mb-8">
          <h1 className="font-display text-3xl font-bold tracking-tight">Earn</h1>
        </header>

        <div className="space-y-4">
          {/* Points balance */}
          <GlassCard variant="strong" className="text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <Award className="w-4 h-4 text-primary" />
              <p className="text-xs text-muted-foreground font-display uppercase tracking-widest">Points Balance</p>
            </div>
            <p className="font-display text-3xl font-bold gradient-text">{pointsBalance.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground mt-1">= {formatNaira(Math.floor(pointsBalance * 0.5))} value</p>
          </GlassCard>

          {/* Questionnaires */}
          <QuestionnaireFlow />
        </div>
      </div>
    </Layout>
  );
};

export default Earn;
