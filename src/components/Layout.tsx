import { motion, AnimatePresence } from "framer-motion";
import Navbar from "./Navbar";
import BottomNav from "./BottomNav";
import { useLocation } from "react-router-dom";

interface LayoutProps {
  children: React.ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  const location = useLocation();
  const isAuthPage = location.pathname === "/auth";

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-background text-foreground transition-colors duration-500">
      {/* Ambient background visuals */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-primary/5 rounded-full blur-[120px] dark:bg-primary/3" />
        <div className="absolute bottom-[10%] right-[-10%] w-[500px] h-[500px] bg-primary/8 rounded-full blur-[100px] dark:bg-primary/5" />
        <div className="absolute top-[40%] left-[-10%] w-[400px] h-[400px] bg-accent/5 rounded-full blur-[100px]" />
      </div>

      <Navbar />

      <main className="relative z-10 pt-20 pb-24 md:pb-8 max-w-lg mx-auto min-h-screen">
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </main>

      {!isAuthPage && <BottomNav />}
    </div>
  );
};

export default Layout;
