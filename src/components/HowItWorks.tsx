import { motion } from "framer-motion";

const steps = [
  { step: "1", title: "Calculate", desc: "Enter your weekly data spend and monthly electricity bill. We calculate your total annual utility spend." },
  { step: "2", title: "Set a Goal", desc: "Choose what you want to save toward — education, vacation, rent, or business funding." },
  { step: "3", title: "Join the Queue", desc: "Get in line. Refer friends to skip 20 positions ahead. The system auto-advances 50 positions daily." },
  { step: "4", title: "Earn Points", desc: "Complete decision tasks to earn points. Points convert to Naira value at 1 point = ₦0.50." },
  { step: "5", title: "Verify & Claim", desc: "Once off queue, verify your spend with transaction IDs. After 6 months maturity, claim your voucher." },
];

const HowItWorks = () => {
  return (
    <section id="how-it-works" className="relative z-10 py-16 px-4">
      <div className="max-w-3xl mx-auto">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="font-display text-2xl font-bold text-foreground text-center mb-10"
        >
          How It Works
        </motion.h2>
        <div className="space-y-4">
          {steps.map((s, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="glass-card rounded-2xl p-5 flex items-start gap-4"
            >
              <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center text-[13px] font-bold text-primary flex-shrink-0">
                {s.step}
              </div>
              <div>
                <p className="text-[13px] font-semibold text-foreground mb-1">{s.title}</p>
                <p className="text-[12px] text-muted-foreground leading-relaxed">{s.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
