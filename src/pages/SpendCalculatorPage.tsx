import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import SpendCalculator from "@/components/SpendCalculator";

const SpendCalculatorPage = () => {
  const { user, refreshProfile } = useAuth();
  const navigate = useNavigate();

  const handleSpendComplete = async (result: any) => {
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

  return (
    <div className="pt-24 pb-32 flex items-center justify-center px-6">
      <SpendCalculator onComplete={handleSpendComplete} />
    </div>
  );
};

export default SpendCalculatorPage;
