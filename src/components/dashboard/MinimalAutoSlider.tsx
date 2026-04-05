import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

const slides = [
  {
    text: "Earn up to 100k weekly as an influencer",
    buttonLabel: "Join",
    path: "/dashboard/influencer",
  },
  {
    text: "Get up to 70% cashback on your expenses",
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
    }, 8000);
    return () => clearInterval(timer);
  }, []);

  const current = slides[index];

  return (
    <div className="w-full min-h-[4.5rem] sm:min-h-[3rem] relative flex items-center justify-center px-4">
      <AnimatePresence mode="wait">
        <motion.div
          key={index}
          initial={{ x: 20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: -20, opacity: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4 py-2 w-full mx-auto text-center sm:text-left"
        >
          <span className="text-[11px] text-muted-foreground font-semibold whitespace-nowrap text-3d">
            {current.text}
          </span>
          <button
            onClick={() => navigate(current.path)}
            className={cn(
              "glass-button pulse-glow px-4 py-1 sm:py-0.5 rounded-full text-[10px] font-semibold text-foreground relative overflow-hidden transition-all duration-300 active:scale-95 border border-primary/20 flex-shrink-0"
            )}
          >
            {/* Real Liquid Simulation (Gooey Filtered Blobs) */}
            <div className="absolute inset-0 z-0 pointer-events-none opacity-50 overflow-hidden rounded-full" style={{ filter: "url(#goo)" }}>
              <svg className="absolute inset-0 w-full h-full">
                <defs>
                  <filter id="goo">
                    <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur" />
                    <feColorMatrix in="blur" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 18 -8" result="goo" />
                    <feComposite in="SourceGraphic" in2="goo" operator="atop" />
                  </filter>
                </defs>
              </svg>

              {/* Animated blobs that merge together */}
              <div className="absolute -bottom-1 left-0 right-0 h-full bg-primary/30 animate-liquid-rise" />
              <div className="absolute -bottom-2 -left-2 w-8 h-8 rounded-full bg-primary/40 animate-liquid-blob" style={{ animationDelay: "0s" }} />
              <div className="absolute -bottom-1 left-1/4 w-10 h-10 rounded-full bg-primary/30 animate-liquid-blob" style={{ animationDelay: "1.2s" }} />
              <div className="absolute -bottom-3 left-1/2 w-7 h-7 rounded-full bg-primary/50 animate-liquid-blob" style={{ animationDelay: "0.5s" }} />
              <div className="absolute -bottom-2 left-3/4 w-9 h-9 rounded-full bg-primary/35 animate-liquid-blob" style={{ animationDelay: "2.1s" }} />
              <div className="absolute -bottom-1 -right-2 w-6 h-6 rounded-full bg-primary/45 animate-liquid-blob" style={{ animationDelay: "0.8s" }} />
            </div>

            <span className="relative z-10">{current.buttonLabel}</span>
          </button>
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export default MinimalAutoSlider;
