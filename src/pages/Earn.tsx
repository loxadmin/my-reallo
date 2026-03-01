import Layout from "@/components/Layout";
import GlassCard from "@/components/GlassCard";
import QuestionnaireFlow from "@/components/QuestionnaireFlow";
import { useAuth } from "@/contexts/AuthContext";
import { Award } from "lucide-react";

const Earn = () => {
  const { profile } = useAuth();
  const pointsBalance = profile?.points_balance ?? 0;
  const formatNaira = (n: number) => "₦" + n.toLocaleString("en-NG");

  return (
    <Layout>
      <div className="space-y-6">
        <header className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 glass-pill px-3 py-1 rounded-full mx-auto">
            <Award className="w-4 h-4 text-primary" />
            <span className="text-xs font-display font-medium text-primary">Rewards Hub</span>
          </div>
          <h1 className="text-3xl font-display font-bold gradient-text">Earn Points</h1>
          <p className="text-sm text-muted-foreground max-w-xs mx-auto">
            Complete surveys and refer friends to boost your points and reclaim faster.
          </p>
        </header>

        <GlassCard variant="strong" className="text-center py-8">
          <p className="text-xs text-muted-foreground font-display uppercase tracking-widest mb-1">Total Points</p>
          <p className="font-display text-5xl font-bold gradient-text mb-2">{pointsBalance.toLocaleString()}</p>
          <div className="glass-pill px-4 py-1 rounded-full inline-block">
            <p className="text-xs font-medium text-foreground">
              Est. Value: <span className="text-primary">{formatNaira(Math.floor(pointsBalance * 0.5))}</span>
            </p>
          </div>
        </GlassCard>

        <section className="space-y-4">
          <h2 className="text-sm font-display font-bold uppercase tracking-wider text-muted-foreground px-1">Available Tasks</h2>
          <QuestionnaireFlow />
        </section>
      </div>
    </Layout>
  );
};

export default Earn;
