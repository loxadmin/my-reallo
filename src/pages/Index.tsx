import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import HeroSection from "@/components/HeroSection";
import Layout from "@/components/Layout";

const Index = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleGetStarted = () => {
    if (user) {
      navigate("/dashboard");
    } else {
      navigate("/auth");
    }
  };

  return (
    <Layout>
      <HeroSection onGetStarted={handleGetStarted} />
    </Layout>
  );
};

export default Index;
