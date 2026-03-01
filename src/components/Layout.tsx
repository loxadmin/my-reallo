import { ReactNode } from "react";
import Navbar from "./Navbar";
import BottomNav from "./BottomNav";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation } from "react-router-dom";

interface LayoutProps {
  children: ReactNode;
  showNav?: boolean;
}

const Layout = ({ children, showNav = true }: LayoutProps) => {
  const { user } = useAuth();
  const location = useLocation();
  const isAuthPage = location.pathname === "/auth";
  const isHomePage = location.pathname === "/";

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-background">
      {/* Ambient background visuals */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-primary/5 rounded-full blur-[200px] dark:bg-primary/3" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[400px] h-[400px] bg-primary/8 rounded-full blur-[150px] dark:bg-primary/5" />
      </div>

      {showNav && <Navbar />}

      <main className="relative z-10 pt-24 pb-32 px-6">
        <div className="max-w-md mx-auto">
          {children}
        </div>
      </main>

      {user && !isAuthPage && !isHomePage && <BottomNav />}
    </div>
  );
};

export default Layout;
