import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import Navbar from "@/components/Navbar";
import SpendCalculator from "@/components/SpendCalculator";
import { supabase } from "@/integrations/supabase/client";

const Calculator = () => {
  const { user, profile, loading, refreshProfile } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) navigate("/auth");
  }, [loading, user, navigate]);

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
      navigate("/goals");
    }
  };

  if (loading || !user) return null;

  return (
    <div className="relative min-h-screen">
      <Navbar />
      <div className="pt-24">
        <SpendCalculator onComplete={handleSpendComplete} />
      </div>
    </div>
  );
};

export default Calculator;
