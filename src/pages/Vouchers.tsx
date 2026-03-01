import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import DashboardHeader from "@/components/DashboardHeader";
import BottomNav from "@/components/BottomNav";
import GlassCard from "@/components/GlassCard";
import GlassButton from "@/components/GlassButton";
import { Gift, Wallet, Copy, Check, Lock, AlertCircle, ArrowLeft } from "lucide-react";
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
  };

  if (loading || !user) return null;

  return (
    <div className="relative min-h-screen bg-background pb-32 overflow-x-hidden">
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-primary/5 rounded-full blur-[200px]" />
      </div>

      <DashboardHeader />

      <main className="max-w-lg mx-auto px-6 space-y-6 relative z-10">
        <button
          onClick={() => navigate("/dashboard")}
          className="text-sm text-muted-foreground font-display flex items-center gap-1 hover:text-primary transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </button>

        {/* Balance + Claimable */}
        <GlassCard variant="glow" className="text-center p-8 sm:p-10">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <Wallet className="w-6 h-6 text-primary" />
          </div>
          <p className="text-[10px] text-muted-foreground font-display uppercase tracking-widest font-bold">Points Balance</p>
          <motion.p
            key={pointsBalance}
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="font-display text-4xl font-bold text-foreground mt-1"
          >
            {pointsBalance.toLocaleString()}
          </motion.p>
          <div className="grid grid-cols-2 gap-4 mt-8 pt-6 border-t border-white/5">
            <div>
              <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Claimable</p>
              <p className="text-lg font-display font-bold text-primary mt-0.5">{formatNaira(claimableAmount)}</p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Claimed</p>
              <p className="text-lg font-display font-bold text-foreground mt-0.5">{formatNaira(claimedTotal)}</p>
            </div>
          </div>
        </GlassCard>

        {/* Restrictions info */}
        {!isOffQueue && (
          <GlassCard className="text-center py-6 bg-destructive/5 border-destructive/10">
            <Lock className="w-6 h-6 text-destructive/60 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground font-display">Complete the queue to unlock vouchers.</p>
          </GlassCard>
        )}

        {claimableAmount < 50000 && isOffQueue && (
          <GlassCard className="text-center py-6 bg-primary/5 border-primary/10">
            <AlertCircle className="w-6 h-6 text-primary/60 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground font-display">Minimum claim is ₦50,000. Current: {formatNaira(claimableAmount)}</p>
          </GlassCard>
        )}

        {/* Create voucher */}
        {isOffQueue && claimableAmount >= 50000 && (
          <GlassCard variant="strong" className="p-8">
            <h3 className="font-display font-bold text-xl text-foreground mb-4 flex items-center gap-2">
              <Gift className="w-6 h-6 text-primary" />
              Generate Voucher
            </h3>
            <p className="text-xs text-muted-foreground mb-6 leading-relaxed">
              Min 100,000 points (₦50,000). Max: {formatNaira(claimableAmount)}.
            </p>
            <div className="space-y-4">
              <input
                type="number"
                value={pointsToUse}
                onChange={(e) => setPointsToUse(e.target.value)}
                placeholder="Enter points (min 100,000)"
                className="w-full glass-input rounded-2xl px-5 py-4 text-foreground text-sm"
              />
              {Number(pointsToUse) > 0 && (
                <div className="bg-primary/5 rounded-2xl p-4 border border-primary/10">
                  <p className="text-sm text-primary font-display font-bold">
                    Voucher value: {formatNaira(nairaValue)}
                    {nairaValue > claimableAmount && (
                      <span className="text-destructive text-xs ml-2 block sm:inline mt-1 sm:mt-0 font-medium">(Exceeds claimable limit)</span>
                    )}
                  </p>
                </div>
              )}
              <GlassButton
                variant="primary"
                onClick={handleCreate}
                className="w-full py-4 text-base"
                disabled={creating || !canCreate()}
              >
                {creating ? "Creating..." : "Create Now"}
              </GlassButton>
            </div>
          </GlassCard>
        )}

        {/* Voucher list */}
        {vouchers.length > 0 && (
          <div className="space-y-4 pt-4">
            <h3 className="font-display font-bold text-xl text-foreground">Your Vouchers</h3>
            <div className="space-y-4">
              {vouchers.map((v) => (
                <GlassCard key={v.id} className="p-0 overflow-hidden group">
                  <div className="p-6 relative">
                    <div className="flex items-center justify-between mb-6">
                      <div>
                        <p className="text-[10px] text-primary font-bold uppercase tracking-[0.2em] mb-1">Reallo Rewards</p>
                        <p className="font-display text-3xl font-bold text-foreground">{formatNaira(v.amount_naira)}</p>
                      </div>
                      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                        <Gift className="w-6 h-6 text-primary" />
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5">
                      <p className="font-mono text-sm text-muted-foreground tracking-widest">{v.voucher_code}</p>
                      <button
                        onClick={() => handleCopy(v.voucher_code, v.id)}
                        className="p-2 hover:bg-white/10 rounded-xl transition-colors"
                      >
                        {copiedId === v.id ? <Check className="w-4 h-4 text-primary" /> : <Copy className="w-4 h-4 text-muted-foreground" />}
                      </button>
                    </div>

                    <div className="mt-4 flex items-center gap-2 text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
                      <span>{new Date(v.created_at).toLocaleDateString()}</span>
                      <span>•</span>
                      <span>{v.points_used.toLocaleString()} points redeemed</span>
                    </div>
                  </div>
                </GlassCard>
              ))}
            </div>
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  );
};

export default Vouchers;
