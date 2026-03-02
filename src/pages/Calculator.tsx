import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import SpendCalculator from "@/components/SpendCalculator";
import { motion } from "framer-motion";

interface SpendResult {
  weeklyData: number;
  monthlyElectricity: number;
  annualData: number;
  annualElectricity: number;
  totalAnnual: number;
}

const Calculator = () => {
  const { user, refreshProfile, loading } = useAuth();
  const navigate = useNavigate();

  const handleSpendComplete = async (result: SpendResult) => {
    if (user) {
      await supabase
        .from("profiles")
        .update({
          annual_data_spend: result.annualData,
          annual_electricity_spend: result.annualElectricity,
          total_annual_spend: result.totalAnnual,
        })
        .eq("id", user.id);
      await refreshProfile();
      navigate("/goal-selection");
    }
  };

  if (loading) return null;

  return (
    <div className="relative min-h-screen overflow-x-hidden">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-primary/3 rounded-full blur-[200px]" />
      </div>

      <Navbar />

      <section className="min-h-screen flex items-center justify-center px-4 pt-24 pb-12">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-lg"
        >
          <div className="text-center mb-8 space-y-2">
            <h1 className="font-display text-3xl font-bold gradient-text">Annual Reclaim</h1>
            <p className="text-muted-foreground text-sm max-w-xs mx-auto">
              Calculate your annual data and electricity spend to determine your reclaim potential.
            </p>
          </div>
          <SpendCalculator onComplete={handleSpendComplete} />
        </motion.div>
      </section>
    </div>
  );
};

export default Calculator;
