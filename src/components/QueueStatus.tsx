import { motion } from "framer-motion";
import GlassCard from "./GlassCard";
import { Users, Check } from "lucide-react";

interface QueueStatusProps {
  position: number;
  isNext: boolean;
  isOffQueue: boolean;
}

const QueueStatus = ({ position, isNext, isOffQueue }: QueueStatusProps) => {
  return (
    <GlassCard variant="glow" className="text-center">
      <motion.div initial={{ scale: 0.8 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 200 }}>
        {isNext || isOffQueue ? (
          <>
            <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-4 pulse-glow">
              <Check className="w-8 h-8 text-primary" />
            </div>
            <h2 className="font-display text-2xl font-bold gradient-text mb-2">
              {isOffQueue ? "You're Off the Queue!" : "You're Next!"}
            </h2>
            <p className="text-sm text-muted-foreground">
              {isOffQueue ? "Earn points, verify spend & claim your money." : "Activate your reclaim now."}
            </p>
          </>
        ) : (
          <>
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Users className="w-7 h-7 text-primary" />
            </div>
            <p className="text-xs text-muted-foreground uppercase tracking-widest font-display mb-1">People ahead of you</p>
            <motion.h2 key={position} initial={{ y: -10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="font-display text-5xl font-bold gradient-text">
              {position}
            </motion.h2>
            <p className="text-sm text-muted-foreground mt-3">Skip the queue — refer a friend and move up 5 spots.</p>
          </>
        )}
      </motion.div>
    </GlassCard>
  );
};

export default QueueStatus;
