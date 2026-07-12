import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import GlassButton from "./GlassButton";
import CountUpAnimation from "./CountUpAnimation";
import { supabase } from "@/integrations/supabase/client";
import { MoveRight, TrendingUp, Users, Shield } from "lucide-react";
import { useCurrency, CurrencyCode } from "@/contexts/CurrencyContext";

const CURRENCIES: CurrencyCode[] = ["NGN", "USD", "EUR", "GBP"];
const SYMBOLS: Record<CurrencyCode, string> = { NGN: "₦", USD: "$", EUR: "€", GBP: "£", CAD: "C$", AUD: "A$", ZAR: "R", GHS: "₵", KES: "KSh" };

const CyclingFreeLabel = () => {
  const [index, setIndex] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setIndex((i) => (i + 1) % CURRENCIES.length), 2800);
    return () => clearInterval(id);
  }, []);
  const code = CURRENCIES[index];
  return (
    <AnimatePresence mode="wait">
      <motion.span
        key={index}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.3 }}
      >
        {SYMBOLS[code]}0
      </motion.span>
    </AnimatePresence>
  );
};

interface HeroSectionProps {
  onGetStarted: () => void;
}

const HeroSection = ({ onGetStarted }: HeroSectionProps) => {
  const [queueCount, setQueueCount] = useState(0);
  const [queueEnabled, setQueueEnabled] = useState(true);
  const [ghostEnabled, setGhostEnabled] = useState(true);
  const [titleNumber, setTitleNumber] = useState(0);

  const titles = useMemo(() => ["Business", "Education", "Rent", "Vacation", "Car", "Future"], []);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setTitleNumber(titleNumber === titles.length - 1 ? 0 : titleNumber + 1);
    }, 2500);
    return () => clearTimeout(timeoutId);
  }, [titleNumber, titles]);

  useEffect(() => {
    const fetchCount = async () => {
      const [profilesRes, ghostsRes, settingsRes] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("ghost_users").select("id", { count: "exact", head: true }),
        supabase.from("admin_settings").select("key,value").in("key", ["queue_enabled", "ghost_users_enabled"]),
      ]);
      const settings = (settingsRes.data || []) as { key: string; value: string }[];
      const qEnabled = settings.find(s => s.key === "queue_enabled")?.value !== "false";
      const gEnabled = settings.find(s => s.key === "ghost_users_enabled")?.value !== "false";
      setQueueEnabled(qEnabled);
      setGhostEnabled(gEnabled);
      setQueueCount((profilesRes.count || 0) + (gEnabled ? (ghostsRes.count || 0) : 0));
    };
    fetchCount();
  }, []);

  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center px-4 pt-24 pb-16 overflow-hidden">
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
        className="z-10 w-full max-w-2xl mx-auto text-center"
      >
        {/* Status pill */}
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="inline-flex items-center gap-2 mb-8"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-primary pulse-glow" />
          <span className="text-[10px] font-semibold text-primary/80 tracking-[0.32em] uppercase">
            Just Make a Wish
          </span>
          <span className="w-1.5 h-1.5 rounded-full bg-primary pulse-glow" />
        </motion.div>

        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.7 }}
          className="font-display text-[2.5rem] sm:text-5xl lg:text-[3.5rem] font-bold leading-[1.1] mb-5"
        >
          <span className="text-foreground">Just Make a Wish.</span>
          <br />
          <span className="text-foreground">We'll Fund Your </span>
          <span className="relative inline-block overflow-hidden align-top">
            <AnimatePresence mode="wait">
              {titles.map(
                (title, index) =>
                  index === titleNumber && (
                    <motion.span
                      key={title}
                      className="gradient-text block"
                      initial={{ opacity: 0, y: 40 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -40 }}
                      transition={{ duration: 0.4, ease: "easeInOut" }}
                    >
                      {title}
                    </motion.span>
                  )
              )}
            </AnimatePresence>
          </span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.7 }}
          className="text-muted-foreground text-sm sm:text-base max-w-md mx-auto mb-8 leading-relaxed"
        >
          Tell us your dream, set a goal, and let partner offers fully fund your biggest life ambitions.
        </motion.p>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7, duration: 0.5 }}
          className="flex flex-col sm:flex-row gap-3 justify-center max-w-sm mx-auto"
        >
          <GlassButton variant="primary" onClick={onGetStarted} className="text-[13px] px-8 py-3.5 flex-1">
            Make a Wish <MoveRight className="inline w-4 h-4 ml-2" />
          </GlassButton>
          <GlassButton variant="outline" className="text-[13px] px-8 py-3.5 flex-1" onClick={() => document.getElementById("how-it-works")?.scrollIntoView({ behavior: "smooth" })}>
            How It Works
          </GlassButton>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9, duration: 0.7 }}
          className="grid grid-cols-3 gap-3 sm:gap-4 mt-12 max-w-md mx-auto"
        >
          <div className="glass-stat rounded-2xl px-3 py-4 text-center">
            <Users className="w-4 h-4 text-primary mx-auto mb-1.5" />
            <p className="font-display text-lg sm:text-xl font-bold text-primary glow-text">
              {queueEnabled ? <CountUpAnimation end={queueCount} duration={2} suffix="+" /> : "Open"}
            </p>
            <p className="text-[10px] text-muted-foreground mt-0.5">{queueEnabled ? "In Queue" : "Instant Access"}</p>
          </div>
          <div className="glass-stat rounded-2xl px-3 py-4 text-center">
            <TrendingUp className="w-4 h-4 text-primary mx-auto mb-1.5" />
            <p className="font-display text-lg sm:text-xl font-bold text-primary"><CyclingFreeLabel /></p>
            <p className="text-[10px] text-muted-foreground mt-0.5">To Join</p>
          </div>
          <div className="glass-stat rounded-2xl px-3 py-4 text-center">
            <Shield className="w-4 h-4 text-primary mx-auto mb-1.5" />
            <p className="font-display text-lg sm:text-xl font-bold text-primary glow-text">20x</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">Skip / Referral</p>
          </div>
        </motion.div>
      </motion.div>

      {/* Feature cards below hero */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.1, duration: 0.7 }}
        className="z-10 w-full max-w-3xl mx-auto mt-16 grid grid-cols-1 sm:grid-cols-3 gap-4 px-4"
      >
        {[
          { title: "1. Make a Wish", desc: "Tell our friendly AI what you've been dreaming of — a new car, rent, travel, or starting a business." },
          { title: "2. Set Your Target", desc: "Set your funding amount and choose the AI-personalized roadmap that fits your lifestyle." },
          { title: "3. Unlock Your Fund", desc: "Earn points by trying offers from partner brands to fast-track and fully unlock your goal." },
        ].map((item, i) => (
          <div key={i} className="glass-card rounded-2xl p-5 text-center">
            <p className="text-[13px] font-semibold text-foreground mb-1">{item.title}</p>
            <p className="text-[12px] text-muted-foreground leading-relaxed">{item.desc}</p>
          </div>
        ))}
      </motion.div>
    </section>
  );
};

export default HeroSection;
