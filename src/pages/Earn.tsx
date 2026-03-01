import Navbar from "@/components/Navbar";
import QuestionnaireFlow from "@/components/QuestionnaireFlow";
import GlassCard from "@/components/GlassCard";
import { Award } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const formatNaira = (n: number) => "₦" + n.toLocaleString("en-NG");

const EarnPage = () => {
  const { profile } = useAuth();
  const pointsBalance = profile?.points_balance ?? 0;

  return (
    <div className="relative min-h-screen overflow-x-hidden">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-primary/3 rounded-full blur-[200px]" />
        <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-primary/5 rounded-full blur-[150px]" />
      </div>
      <Navbar />
      <div className="min-h-screen flex items-center justify-center px-6 py-20">
        <div className="w-full max-w-md space-y-4">
          <GlassCard variant="strong" className="text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <Award className="w-4 h-4 text-primary" />
              <p className="text-xs text-muted-foreground font-display uppercase tracking-widest">Points Balance</p>
            </div>
            <p className="font-display text-3xl font-bold gradient-text">{pointsBalance.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground mt-1">= {formatNaira(Math.floor(pointsBalance * 0.5))} value</p>
          </GlassCard>
          <QuestionnaireFlow />
        </div>
      </div>
    </div>
  );
};

export default EarnPage;
