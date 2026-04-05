import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

const slides = [
  {
    text: "Become an influencer and earn up to 100k weekly",
    buttonLabel: "Join",
    path: "/dashboard/influencer",
  },
  {
    text: "Do tasks and use our partner brands to get up to 70% of all your expenses",
    buttonLabel: "Earn",
    path: "/dashboard/earn",
  },
];

const MinimalAutoSlider = () => {
  const [index, setIndex] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % slides.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const current = slides[index];

  return (
    <div className="w-full h-8 overflow-hidden relative flex items-center justify-center">
      <AnimatePresence mode="wait">
        <motion.div
          key={index}
          initial={{ y: 15, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -15, opacity: 0 }}
          transition={{ duration: 0.5, ease: "easeInOut" }}
          className="flex items-center gap-2.5 whitespace-nowrap"
        >
          <span className="text-[11px] text-muted-foreground font-medium">
            {current.text}
          </span>
          <button
            onClick={() => navigate(current.path)}
            className={cn(
              "glass-button pulse-glow px-3 py-0.5 rounded-full text-[10px] font-semibold text-primary relative overflow-hidden transition-all duration-300 active:scale-95 border border-primary/20"
            )}
            style={{
               boxShadow: "0 0 12px hsl(160 60% 18% / 0.15)",
            }}
          >
            {/* Liquid effect layer */}
            <span
              className="absolute inset-0 opacity-25"
              style={{
                background: "linear-gradient(135deg, hsl(160 60% 40%), hsl(160 45% 55%))",
                animation: "waterFlow 4s ease-in-out infinite",
              }}
            />
            <span className="relative z-10">{current.buttonLabel}</span>
          </button>
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export default MinimalAutoSlider;
