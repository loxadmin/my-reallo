import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import SpendCalculator from "@/components/SpendCalculator";

interface SpendResult {
  weeklyData: number;
  monthlyElectricity: number;
  annualData: number;
  annualElectricity: number;
  totalAnnual: number;
}

const Calculator = () => {
  const { user, refreshProfile } = useAuth();
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
    }
    navigate("/goal-selection");
  };

  return <SpendCalculator onComplete={handleSpendComplete} />;
};

export default Calculator;
