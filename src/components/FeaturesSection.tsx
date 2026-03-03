import { motion } from "framer-motion";
import { Zap, Shield, Target, Users, TrendingUp, ArrowRight } from "lucide-react";
import GlassCard from "./GlassCard";

const FeaturesSection = () => {
  const features = [
    {
      title: "Smart Calculation",
      description: "Our advanced algorithm calculates your annual utility spend on data and electricity with precision.",
      icon: Zap,
      color: "text-accent",
    },
    {
      title: "Secure Verification",
      description: "Enterprise-grade verification of your expenses ensuring transparency and security for all users.",
      icon: Shield,
      color: "text-primary",
    },
    {
      title: "Goal-Driven Reclaims",
      description: "Turn your everyday spending into life-changing milestones. Whether it's rent, education, or business.",
      icon: Target,
      color: "text-accent",
    },
  ];

  return (
    <section className="py-24 px-4 relative z-10">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-3xl md:text-5xl font-bold mb-4"
          >
            Built for the <span className="gradient-text">Future of Finance</span>
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-muted-foreground text-lg max-w-2xl mx-auto"
          >
            Experience a seamless bridge between your daily utility expenses and your long-term financial aspirations.
          </motion.p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
            >
              <GlassCard className="h-full group hover:border-primary/30 transition-all duration-500">
                <div className={`w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-500`}>
                  <feature.icon className={`w-6 h-6 ${feature.color}`} />
                </div>
                <h3 className="text-xl font-bold mb-3 text-foreground">{feature.title}</h3>
                <p className="text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>
              </GlassCard>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
