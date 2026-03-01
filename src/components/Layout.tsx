import { ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "react-router-dom";
import Navbar from "./Navbar";
import BottomNav from "./BottomNav";

interface LayoutProps {
  children: ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  const location = useLocation();
  const isAuthPage = location.pathname === "/auth";
  const isLandingPage = location.pathname === "/";

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-background">
      {/* Ambient background orbs */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-[800px] h-[600px] bg-primary/5 rounded-full blur-[100px] dark:blur-[180px]" />
        <div className="absolute bottom-0 right-0 w-full max-w-[400px] h-[400px] bg-primary/5 rounded-full blur-[80px] dark:blur-[140px]" />
      </div>

      {!isAuthPage && <Navbar />}

      <main className="relative z-10 flex flex-col min-h-screen">
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="flex-1 flex flex-col"
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </main>

      {!isAuthPage && !isLandingPage && <BottomNav />}
    </div>
  );
};

export default Layout;
