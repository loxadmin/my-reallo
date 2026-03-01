import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import DashboardHeader from "@/components/DashboardHeader";
import HeroSection from "@/components/HeroSection";

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
    <div className="relative min-h-screen overflow-x-hidden bg-background">
      {/* Ambient background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full max-w-lg bg-primary/5 rounded-full blur-[120px]" />
      </div>

      {user && <DashboardHeader />}

      <main className={user ? "pt-10" : ""}>
        <HeroSection onGetStarted={handleGetStarted} />
      </main>

      {!user && (
        <div className="fixed top-0 left-0 right-0 p-6 flex justify-between items-center z-50">
          <h1 className="text-2xl font-display font-bold text-foreground">Reallo</h1>
          <button
            onClick={() => navigate("/auth")}
            className="text-sm font-bold text-primary px-5 py-2.5 glass-button rounded-2xl"
          >
            Login
          </button>
        </div>
      )}
    </div>
  );
};

export default Index;
