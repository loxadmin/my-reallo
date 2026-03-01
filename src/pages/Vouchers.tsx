import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import GlassCard from "@/components/GlassCard";
import GlassButton from "@/components/GlassButton";
import { Gift, Wallet, Copy, Check, Lock, AlertCircle, Info, ArrowRight, Zap, TrendingUp, History } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import Layout from "@/components/Layout";

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
  };

  if (loading || !user) return null;

  return (
    <Layout>
      <section className="px-6 max-w-lg mx-auto space-y-6 pb-20">
        <header className="text-center space-y-2">
          <h1 className="font-display text-3xl font-bold gradient-text">Vouchers</h1>
          <p className="text-sm text-muted-foreground">Manage your reward vouchers</p>
        </header>

        {/* Balance Overview Card */}
        <GlassCard variant="glow" className="relative overflow-hidden group">
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-primary/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col items-center py-6">
            <div className="p-3 bg-primary/10 rounded-2xl mb-4">
              <Wallet className="w-8 h-8 text-primary" />
            </div>
            <p className="text-xs text-muted-foreground font-display uppercase tracking-widest mb-1 font-semibold">Points Balance</p>
            <motion.p key={pointsBalance} initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="font-display text-4xl font-bold gradient-text">
              {pointsBalance.toLocaleString()}
            </motion.p>

            <div className="grid grid-cols-2 gap-4 w-full mt-6 pt-6 border-t border-white/5">
              <div className="text-center border-r border-white/5 pr-4">
                <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider mb-1">Claimable</p>
                <p className="text-sm font-display font-semibold text-primary">{formatNaira(claimableAmount)}</p>
              </div>
              <div className="text-center pl-4">
                <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider mb-1">Already Claimed</p>
                <p className="text-sm font-display font-semibold text-foreground">{formatNaira(claimedTotal)}</p>
              </div>
            </div>
          </div>
        </GlassCard>

        {/* Lock Info / Constraints */}
        {!isOffQueue ? (
          <GlassCard className="flex items-start gap-4 p-5 border-white/5 bg-white/5">
            <div className="p-2 bg-muted/20 rounded-xl">
              <Lock className="w-5 h-5 text-muted-foreground" />
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">
                You must complete the queue before claiming vouchers.
              </p>
            </div>
          </GlassCard>
        ) : claimableAmount < 50000 ? (
          <GlassCard className="flex items-start gap-4 p-5 border-white/5 bg-white/5">
            <div className="p-2 bg-muted/20 rounded-xl">
              <AlertCircle className="w-5 h-5 text-muted-foreground" />
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">
                Minimum claimable amount is ₦50,000. Current: {formatNaira(claimableAmount)}
              </p>
            </div>
          </GlassCard>
        ) : null}

        {/* Redemption Creation */}
        {isOffQueue && claimableAmount >= 50000 && (
          <GlassCard variant="strong" className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-primary/10 rounded-xl">
                <Gift className="w-5 h-5 text-primary" />
              </div>
              <h3 className="font-display font-semibold text-foreground">Create Voucher</h3>
            </div>

            <div className="space-y-5">
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">
                  Minimum 100,000 points (₦50,000). Max claimable: {formatNaira(claimableAmount)}.
                </p>
                <input
                    type="number"
                    value={pointsToUse}
                    onChange={(e) => setPointsToUse(e.target.value)}
                    placeholder="Points to use (min 100,000)"
                    max={Math.min(pointsBalance, claimableAmount * 2)}
                    className="w-full glass-input rounded-xl px-4 py-3 text-foreground text-sm"
                  />
              </div>

              {Number(pointsToUse) > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-1"
                >
                  <p className="text-sm text-primary font-display font-semibold">
                    Voucher value: {formatNaira(nairaValue)}
                    {nairaValue > claimableAmount && <span className="text-destructive text-xs ml-2">(exceeds claimable)</span>}
                  </p>
                </motion.div>
              )}

              <GlassButton
                variant="primary"
                onClick={handleCreate}
                className="w-full"
                disabled={creating || !canCreate()}
              >
                {creating ? "Creating..." : "Generate Voucher"}
              </GlassButton>
            </div>
          </GlassCard>
        )}

        {/* History Section */}
        <div className="space-y-4">
          <h3 className="font-display font-semibold text-foreground">Your Vouchers</h3>

          {vouchers.length > 0 ? (
            <div className="space-y-3 pb-10">
              {vouchers.map((v) => (
                <GlassCard key={v.id} className="p-4 border-white/5 bg-white/[0.02]">
                  <div className="relative overflow-hidden rounded-xl p-4 mb-2"
                    style={{
                      background: "linear-gradient(135deg, hsl(48 96% 53% / 0.2), hsl(40 90% 30% / 0.3))",
                      border: "1px solid hsl(48 96% 53% / 0.2)",
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-widest">Reallo Voucher</p>
                        <p className="font-display text-2xl font-bold gradient-text">{formatNaira(v.amount_naira)}</p>
                      </div>
                      <Gift className="w-8 h-8 text-primary/30" />
                    </div>
                    <p className="font-mono text-xs text-primary mt-2 tracking-widest">{v.voucher_code}</p>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-muted-foreground">
                      {new Date(v.created_at).toLocaleDateString()} • {v.points_used.toLocaleString()} pts
                    </p>
                    <button onClick={() => handleCopy(v.voucher_code, v.id)} className="text-primary">
                      {copiedId === v.id ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                </GlassCard>
              ))}
            </div>
          ) : (
            <div className="py-12 text-center opacity-40">
               <p className="text-sm text-muted-foreground">No vouchers yet</p>
            </div>
          )}
        </div>
      </section>
    </Layout>
  );
};

export default Vouchers;
