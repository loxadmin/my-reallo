import { useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import DashboardHeader from "@/components/DashboardHeader";
import BottomNav from "@/components/BottomNav";
import { Target, Users, Gift, TrendingUp } from "lucide-react";

const formatNaira = (n: number) => "₦" + n.toLocaleString("en-NG");

const Dashboard = () => {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [loading, user, navigate]);

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground font-display text-sm">Loading...</p>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-background pb-32 overflow-x-hidden">
      {/* Background decoration */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-[120px]" />
        <div className="absolute top-[20%] -right-[10%] w-[30%] h-[30%] bg-primary/3 rounded-full blur-[100px]" />
      </div>

      <DashboardHeader />

      <main className="max-w-lg mx-auto px-6 space-y-6 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Main Balance Display */}
          <div className="py-8 text-center sm:text-left">
            <p className="text-4xl sm:text-5xl font-display font-bold text-foreground tracking-tight">
              {formatNaira(profile?.total_annual_spend || 0)}
            </p>
            <div className="flex items-center justify-center sm:justify-start gap-2 mt-2">
              <span className="w-5 h-5 rounded-md bg-primary/20 flex items-center justify-center">
                <TrendingUp className="w-3 h-3 text-primary" />
              </span>
              <span className="text-sm text-muted-foreground font-display font-medium">Annual Utility Spend</span>
            </div>
          </div>

          {/* Action Grid */}
          <div className="grid grid-cols-2 gap-4">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => navigate("/calculator")}
              className="layout-grid-item glass rounded-[2.5rem] p-6 text-left flex flex-col justify-between group bg-[#E5DEFF]/10 border border-white/5 shadow-2xl"
            >
              <TrendingUp className="w-8 h-8 text-primary group-hover:scale-110 transition-transform duration-300" />
              <div>
                <h3 className="font-display font-bold text-lg text-foreground leading-tight">Reclaim money</h3>
                <p className="text-xs text-muted-foreground mt-1">To wallet, bank or mobile number</p>
              </div>
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => navigate("/goals")}
              className="layout-grid-item glass rounded-[2.5rem] p-6 text-left flex flex-col justify-between group bg-[#F2FCE2]/10 border border-white/5 shadow-2xl"
            >
              <Target className="w-8 h-8 text-primary group-hover:scale-110 transition-transform duration-300" />
              <div>
                <h3 className="font-display font-bold text-lg text-foreground leading-tight">My Goals</h3>
                <p className="text-xs text-muted-foreground mt-1">Fund your life goals</p>
              </div>
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => navigate("/queue")}
              className="layout-grid-item glass rounded-[2.5rem] p-6 text-left flex flex-col justify-between group bg-[#FEF7CD]/10 border border-white/5 shadow-2xl"
            >
              <Users className="w-8 h-8 text-primary group-hover:scale-110 transition-transform duration-300" />
              <div>
                <h3 className="font-display font-bold text-lg text-foreground leading-tight">Refer & Earn</h3>
                <p className="text-xs text-muted-foreground mt-1">Skip the queue</p>
              </div>
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => navigate("/vouchers")}
              className="layout-grid-item glass rounded-[2.5rem] p-6 text-left flex flex-col justify-between group bg-[#FEC6A1]/10 border border-white/5 shadow-2xl"
            >
              <Gift className="w-8 h-8 text-primary group-hover:scale-110 transition-transform duration-300" />
              <div>
                <h3 className="font-display font-bold text-lg text-foreground leading-tight">Vouchers</h3>
                <p className="text-xs text-muted-foreground mt-1">Claim your rewards</p>
              </div>
            </motion.button>
          </div>

          {/* Activity Section */}
          <div className="space-y-4 pt-4">
            <div className="flex items-center justify-between">
              <h2 className="font-display font-bold text-lg text-foreground">Activity</h2>
              <button className="text-xs text-primary font-display font-medium">See all</button>
            </div>

            <div className="space-y-3">
              {profile?.selected_goal ? (
                <div className="glass rounded-2xl p-4 flex items-center justify-between border border-white/5">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <Target className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-display font-bold text-foreground">Goal Active</p>
                      <p className="text-xs text-muted-foreground">{profile.selected_goal.split(':')[0]}</p>
                    </div>
                  </div>
                  <p className="text-sm font-display font-bold text-primary">Active</p>
                </div>
              ) : (
                <div className="glass rounded-2xl p-6 text-center border border-white/5">
                  <p className="text-sm text-muted-foreground font-display">No recent activity. Start by reclaiming your spend!</p>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </main>

      <BottomNav />
    </div>
  );
};

export default Dashboard;
