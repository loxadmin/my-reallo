import { motion } from "framer-motion";

const Navbar = () => {
  return (
    <motion.nav
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6 }}
      className="fixed top-0 left-0 right-0 z-50 px-6 py-4"
    >
      <div className="max-w-lg mx-auto glass rounded-2xl px-5 py-3 flex items-center justify-between">
        <span className="font-display text-lg font-bold gradient-text tracking-tight">
          Reallo
        </span>
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-primary pulse-glow" />
          <span className="text-xs text-muted-foreground font-display">Live</span>
        </div>
      </div>
    </motion.nav>
  );
};

export default Navbar;
