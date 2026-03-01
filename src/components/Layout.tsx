import { ReactNode } from "react";
import Navbar from "./Navbar";
import BottomNav from "./BottomNav";
import { useAuth } from "@/contexts/AuthContext";

interface LayoutProps {
  children: ReactNode;
  showNav?: boolean;
}

const Layout = ({ children, showNav = true }: LayoutProps) => {
  const { user } = useAuth();

  return (
    <div className="relative min-h-screen overflow-x-hidden">
      {/* Ambient background orbs */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-primary/5 rounded-full blur-[200px] dark:bg-primary/3" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[400px] h-[400px] bg-primary/8 rounded-full blur-[150px] dark:bg-primary/5" />
      </div>

      <Navbar />

      <main className="relative z-10 pt-20 pb-32">
        {children}
      </main>

      {user && showNav && <BottomNav />}
    </div>
  );
};

export default Layout;
