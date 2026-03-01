import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import GlassCard from "@/components/GlassCard";
import GlassButton from "@/components/GlassButton";
import { Gift, Wallet, Copy, Check, Lock, AlertCircle, Sparkles } from "lucide-react";
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

  // Actually calculate claimed total from the fetched vouchers
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
  };

  if (loading || !user) return null;

  return (
    <div className="relative min-h-screen overflow-x-hidden pb-24">
      {/* Background Orbs */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-primary/5 rounded-full blur-[150px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[400px] h-[400px] bg-primary/3 rounded-full blur-[120px]" />
      </div>

      <Navbar />

      <section className="relative z-10 min-h-screen flex flex-col items-center px-6 py-24">
        <div className="w-full max-w-md space-y-6">

          <div className="text-center mb-4">
            <h2 className="font-display text-3xl font-bold gradient-text">Wallet & Vouchers</h2>
            <p className="text-sm text-muted-foreground">Manage your reclaimed funds</p>
          </div>

          {/* Balance + Claimable with aggressive glassmorphism */}
          <GlassCard variant="glow" className="text-center p-8 backdrop-blur-3xl border-white/10 shadow-2xl">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Wallet className="w-8 h-8 text-primary" />
            </div>
            <p className="text-xs text-muted-foreground font-display uppercase tracking-widest font-bold">Available Points</p>
            <motion.p key={pointsBalance} initial={{ scale: 0.8 }} animate={{ scale: 1 }} className="font-display text-5xl font-bold gradient-text mb-6">
              {pointsBalance.toLocaleString()}
            </motion.p>

            <div className="grid grid-cols-2 gap-4">
              <div className="glass rounded-2xl p-4 border-white/5">
                <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-tighter">Claimable</p>
                <p className="text-lg font-display font-bold text-primary">{formatNaira(claimableAmount)}</p>
              </div>
              <div className="glass rounded-2xl p-4 border-white/5">
                <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-tighter">Claimed</p>
                <p className="text-lg font-display font-bold text-foreground">{formatNaira(claimedTotal)}</p>
              </div>
            </div>
          </GlassCard>

          {/* Restrictions info */}
          {!isOffQueue && (
            <GlassCard className="text-center border-dashed border-primary/30">
              <Lock className="w-8 h-8 text-muted-foreground mx-auto mb-2 opacity-50" />
              <p className="text-sm text-muted-foreground font-medium">Wait until you complete the queue to start claiming vouchers.</p>
            </GlassCard>
          )}

          {claimableAmount < 50000 && isOffQueue && (
            <GlassCard className="text-center border-dashed border-primary/30">
              <AlertCircle className="w-8 h-8 text-muted-foreground mx-auto mb-2 opacity-50" />
              <p className="text-sm text-muted-foreground font-medium">The minimum claimable threshold is ₦50,000.</p>
            </GlassCard>
          )}

          {/* Create voucher - modernized */}
          {isOffQueue && claimableAmount >= 50000 && (
            <GlassCard variant="strong" className="backdrop-blur-3xl border-white/10 shadow-2xl">
              <h3 className="font-display font-bold text-foreground mb-4 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" />
                Generate New Voucher
              </h3>
              <p className="text-xs text-muted-foreground mb-4 leading-relaxed font-medium">
                Deduct points to create a cashable voucher.
                <br />
                <span className="text-primary/80 font-bold">1 Point = ₦0.5</span>
              </p>

              <div className="space-y-4">
                <div className="relative">
                  <input
                    type="number"
                    value={pointsToUse}
                    onChange={(e) => setPointsToUse(e.target.value)}
                    placeholder="Points (min 100,000)"
                    max={Math.min(pointsBalance, claimableAmount * 2)}
                    className="w-full glass-input rounded-2xl px-6 py-4 text-foreground text-lg font-display placeholder:text-muted-foreground/30 focus:ring-2 ring-primary/20 transition-all"
                  />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-bold text-primary uppercase tracking-widest bg-primary/10 px-2 py-1 rounded-lg">
                    PTS
                  </div>
                </div>

                {Number(pointsToUse) > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 glass rounded-2xl border-primary/20 flex justify-between items-center"
                  >
                    <p className="text-xs text-muted-foreground font-bold uppercase">Estimated Value</p>
                    <p className="text-xl font-display font-bold text-primary">
                      {formatNaira(nairaValue)}
                      {nairaValue > claimableAmount && (
                        <span className="block text-[10px] text-destructive uppercase tracking-widest mt-1">Exceeds limit</span>
                      )}
                    </p>
                  </motion.div>
                )}

                <GlassButton
                  variant="primary"
                  onClick={handleCreate}
                  className="w-full py-4 text-base font-bold shadow-xl"
                  disabled={creating || !canCreate()}
                >
                  {creating ? "Processing..." : "Create Voucher"}
                </GlassButton>
              </div>
            </GlassCard>
          )}

          {/* Voucher list - overhauled look */}
          {vouchers.length > 0 && (
            <div className="space-y-4 pt-4">
              <h3 className="font-display text-xl font-bold text-foreground px-1 flex items-center gap-2">
                <Gift className="w-5 h-5 text-primary" />
                Your Reallo Vouchers
              </h3>
              <div className="space-y-4">
                {vouchers.map((v) => (
                  <motion.div
                    key={v.id}
                    layout
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="glass rounded-3xl p-1 border-white/5 shadow-xl overflow-hidden group hover:scale-[1.02] transition-transform duration-300"
                  >
                    <div className="relative overflow-hidden rounded-[22px] p-6"
                      style={{
                        background: "linear-gradient(135deg, hsla(var(--primary), 0.15), hsla(var(--primary), 0.05))",
                      }}
                    >
                      {/* Decorative elements */}
                      <div className="absolute -top-10 -right-10 w-32 h-32 bg-primary/10 rounded-full blur-3xl group-hover:bg-primary/20 transition-colors" />

                      <div className="flex items-center justify-between relative z-10">
                        <div>
                          <p className="text-[10px] text-primary/70 uppercase font-black tracking-[0.2em] mb-1">Reallo Reclaim</p>
                          <p className="font-display text-3xl font-bold gradient-text">{formatNaira(v.amount_naira)}</p>
                        </div>
                        <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center backdrop-blur-md border border-white/10">
                          <Gift className="w-6 h-6 text-primary" />
                        </div>
                      </div>

                      <div className="mt-8 flex items-end justify-between relative z-10">
                        <div>
                          <p className="text-[9px] text-muted-foreground uppercase font-bold tracking-widest mb-1">Voucher Code</p>
                          <p className="font-mono text-sm text-foreground font-black tracking-[0.3em]">{v.voucher_code}</p>
                        </div>
                        <GlassButton
                          variant="outline"
                          onClick={() => handleCopy(v.voucher_code, v.id)}
                          className="px-4 py-2 text-xs rounded-xl backdrop-blur-2xl border-white/10"
                        >
                          {copiedId === v.id ? (
                            <Check className="w-4 h-4" />
                          ) : (
                            <div className="flex items-center gap-2">
                              <Copy className="w-3.5 h-3.5" />
                              Copy
                            </div>
                          )}
                        </GlassButton>
                      </div>
                    </div>

                    <div className="px-6 py-3 flex items-center justify-between text-[10px] text-muted-foreground font-bold uppercase tracking-widest">
                      <span>{new Date(v.created_at).toLocaleDateString()}</span>
                      <span>{v.points_used.toLocaleString()} Points Redemed</span>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default Vouchers;
