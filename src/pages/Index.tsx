import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import HeroSection from "@/components/HeroSection";
import Navbar from "@/components/Navbar";

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
    <div className="relative min-h-screen bg-background overflow-x-hidden">
      {/* Dynamic background effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-[20%] w-[600px] h-[600px] bg-primary/10 rounded-full blur-[140px] opacity-60" />
        <div className="absolute bottom-0 right-[10%] w-[500px] h-[500px] bg-primary/15 rounded-full blur-[160px] opacity-40" />
      </div>

      <Navbar />

      <main className="relative z-10">
        <HeroSection onGetStarted={handleGetStarted} />
      </main>
    </div>
  );
};

export default Index;
