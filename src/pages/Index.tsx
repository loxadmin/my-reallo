import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";

const Index = () => {
  const { user, loading } = useAuth();

  return (
    <div className="relative min-h-screen overflow-x-hidden">
      {/* Background gradients */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[20%] w-[70vw] h-[70vw] bg-primary/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-[0%] right-[10%] w-[50vw] h-[50vw] bg-primary/3 rounded-full blur-[100px]" />
      </div>

      <Navbar />

      <main>
        <HeroSection onGetStarted={() => {}} />
      </main>
    </div>
  );
};

export default Index;
