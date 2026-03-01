import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout";
import SpendCalculator from "@/components/SpendCalculator";

const Calculator = () => {
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
    <Layout>
      <div className="flex flex-col items-center justify-center py-6 min-h-[80vh]">
        <div className="w-full">
          <SpendCalculator onComplete={handleSpendComplete} />
        </div>
      </div>
    </Layout>
  );
};

export default Calculator;
