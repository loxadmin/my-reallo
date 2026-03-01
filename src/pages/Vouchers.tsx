import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import GlassCard from "@/components/GlassCard";
import GlassButton from "@/components/GlassButton";
import { Gift, Wallet, Copy, Check, Lock, AlertCircle, Plus, History, CreditCard, ArrowRight } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface Voucher {
  id: string;
  voucher_code: string;
  amount_naira: number;
  points_used: number;
  status: string;
  created_at: string;
}

const formatNaira = (n: number) => "₦" + n.toLocaleString("en-NG");

const Vouchers = () => {
  const { user, profile, loading, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [pointsToUse, setPointsToUse] = useState("");
  const [creating, setCreating] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) navigate("/auth");
  }, [loading, user, navigate]);

  useEffect(() => {
    if (user) fetchVouchers();
  }, [user]);

  const fetchVouchers = async () => {
    const { data } = await supabase
      .from("vouchers")
      .select("*")
      .eq("user_id", user!.id)
      .order("created_at", { ascending: false });
    setVouchers((data || []) as Voucher[]);
  };

  const pointsBalance = profile?.points_balance ?? 0;
  const totalAnnualSpend = profile?.total_annual_spend ?? 0;
  const claimedTotal = vouchers.reduce((sum, v) => sum + Number(v.amount_naira || 0), 0);
  const claimableAmount = Math.max(0, totalAnnualSpend - claimedTotal);
  const isOffQueue = (profile?.queue_position ?? 999) <= 0;
  const nairaValue = Math.floor(Number(pointsToUse || 0) * 0.5);

  const canCreate = () => {
    const pts = parseInt(pointsToUse, 10);
    if (!pts || pts <= 0 || pts > pointsBalance) return false;
    if (!isOffQueue) return false;
    if (pts < 100000) return false; // min 100k points = 50k naira
    const claimNaira = Math.floor(pts * 0.5);
    if (claimNaira > claimableAmount) return false;
    return true;
  };

  const handleCreate = async () => {
    const pts = parseInt(pointsToUse, 10);
    if (!canCreate() || !user) return;
    setCreating(true);

    const { data: codeData } = await supabase.rpc("generate_voucher_code");
    const code = codeData || `RLO-${Math.random().toString(36).slice(2, 10).toUpperCase()}`;
    const claimNaira = Math.floor(pts * 0.5);

    await supabase.from("vouchers").insert({
      user_id: user.id,
      voucher_code: code,
      amount_naira: claimNaira,
      points_used: pts,
    });

    // Deduct points
    await supabase
      .from("profiles")
      .update({ points_balance: pointsBalance - pts })
      .eq("id", user.id);

    toast({ title: "Voucher created!", description: `${code} — ${formatNaira(claimNaira)}` });
    setPointsToUse("");
    await fetchVouchers();
    await refreshProfile();
    setCreating(false);
  };

  const handleCopy = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
    toast({ title: "Voucher code copied!" });
  };

  if (loading || !user) return null;

  return (
    <div className="relative min-h-screen pb-24 overflow-x-hidden">
      <Navbar />

      <main className="pt-24 px-6 max-w-lg mx-auto space-y-6">
        {/* Summary Card */}
        <GlassCard variant="glow" className="text-center relative overflow-hidden">
          <div className="absolute top-0 right-0 p-6 opacity-10">
            <CreditCard className="w-24 h-24" />
          </div>
          <div className="relative z-10 space-y-4">
            <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-4 pulse-glow">
              <Wallet className="w-8 h-8 text-primary" />
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground uppercase tracking-[0.2em] font-display">Points Balance</p>
              <h2 className="font-display text-4xl font-bold gradient-text">{pointsBalance.toLocaleString()}</h2>
            </div>
            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-primary/10">
              <div className="text-left">
                <p className="text-[10px] text-muted-foreground uppercase font-display font-bold tracking-widest">Claimable</p>
                <p className="font-display font-bold text-lg text-primary">{formatNaira(claimableAmount)}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-muted-foreground uppercase font-display font-bold tracking-widest">Claimed</p>
                <p className="font-display font-bold text-lg">{formatNaira(claimedTotal)}</p>
              </div>
            </div>
          </div>
        </GlassCard>

        {/* Action Panel */}
        <div className="space-y-4">
          <h3 className="font-display font-bold text-lg flex items-center gap-2">
            <Plus className="w-5 h-5 text-primary" />
            Create New Voucher
          </h3>

          {!isOffQueue ? (
            <GlassCard className="bg-primary/5 border-primary/20 text-center p-8 space-y-4">
              <Lock className="w-10 h-10 text-primary/60 mx-auto" />
              <div className="space-y-1">
                <h4 className="font-display font-bold">Vouchers Locked</h4>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Complete the queue to start generating vouchers.
                </p>
              </div>
              <GlassButton variant="outline" onClick={() => navigate("/dashboard")} className="w-full">
                View Queue Position
              </GlassButton>
            </GlassCard>
          ) : claimableAmount < 50000 ? (
            <GlassCard className="bg-primary/5 border-primary/20 text-center p-8 space-y-4">
              <AlertCircle className="w-10 h-10 text-primary/60 mx-auto" />
              <div className="space-y-1">
                <h4 className="font-display font-bold">Threshold Not Met</h4>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Minimum claimable amount is ₦50,000. You have {formatNaira(claimableAmount)}.
                </p>
              </div>
            </GlassCard>
          ) : (
            <GlassCard variant="strong" className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] text-muted-foreground uppercase font-display font-bold tracking-[0.2em] ml-1">
                    Points to Redeem
                  </label>
                  <input
                    type="number"
                    value={pointsToUse}
                    onChange={(e) => setPointsToUse(e.target.value)}
                    placeholder="Min 100,000 points"
                    className="w-full glass-input rounded-2xl px-6 py-4 text-foreground font-display font-bold text-lg"
                  />
                </div>

                <AnimatePresence>
                  {Number(pointsToUse) >= 100000 && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="p-4 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <Gift className="w-5 h-5 text-primary" />
                        <div>
                          <p className="text-[10px] text-muted-foreground uppercase font-display font-bold">You'll Receive</p>
                          <p className="font-display font-bold text-xl text-primary">{formatNaira(nairaValue)}</p>
                        </div>
                      </div>
                      <ArrowRight className="w-5 h-5 text-primary/60" />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <button
                onClick={handleCreate}
                disabled={creating || !canCreate()}
                className="clay-primary w-full py-5 rounded-2xl font-display font-bold text-base flex items-center justify-center gap-2 group"
              >
                {creating ? "Generating..." : "Generate Voucher Code"}
                <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform" />
              </button>
            </GlassCard>
          )}
        </div>

        {/* History Panel */}
        {vouchers.length > 0 && (
          <div className="space-y-4 pt-4">
            <h3 className="font-display font-bold text-lg flex items-center gap-2">
              <History className="w-5 h-5 text-primary" />
              Recent Vouchers
            </h3>
            <div className="space-y-4">
              {vouchers.map((v) => (
                <GlassCard key={v.id} className="p-0 overflow-hidden group">
                  <div
                    className="p-6 flex flex-col gap-4 bg-gradient-to-br from-primary/5 via-transparent to-transparent group-hover:from-primary/10 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <CreditCard className="w-4 h-4 text-primary" />
                          <span className="text-[10px] text-muted-foreground uppercase font-display font-bold tracking-widest">
                            Reallo Redeemable
                          </span>
                        </div>
                        <h4 className="text-2xl font-display font-bold text-foreground">{formatNaira(v.amount_naira)}</h4>
                      </div>
                      <div className="px-3 py-1 rounded-full glass border-primary/20 text-[10px] font-display font-bold text-primary uppercase">
                        {v.status}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="flex-1 glass px-4 py-3 rounded-xl font-mono text-sm text-primary tracking-widest bg-primary/5">
                        {v.voucher_code}
                      </div>
                      <button
                        onClick={() => handleCopy(v.voucher_code, v.id)}
                        className="p-3 rounded-xl glass hover:bg-primary/20 transition-colors"
                      >
                        {copiedId === v.id ? <Check className="w-5 h-5 text-green-500" /> : <Copy className="w-5 h-5 text-primary" />}
                      </button>
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-muted-foreground font-display font-bold uppercase tracking-widest pt-2 border-t border-primary/5">
                      <span>{new Date(v.created_at).toLocaleDateString()}</span>
                      <span>{v.points_used.toLocaleString()} pts used</span>
                    </div>
                  </div>
                </GlassCard>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default Vouchers;
