import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
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
    if (pts < 100000) return false;
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
    <div className="pt-24 pb-32 px-6 max-w-md mx-auto space-y-6">
      <div className="flex items-center gap-3 px-1 mb-2">
        <div className="p-2 rounded-xl bg-primary/10">
          <Wallet className="w-5 h-5 text-primary" />
        </div>
        <h1 className="font-display text-2xl font-bold">Vouchers</h1>
      </div>

      <GlassCard variant="glow" className="relative overflow-hidden">
        <div className="absolute top-0 right-0 p-6 opacity-5 pointer-events-none">
          <Wallet className="w-24 h-24" />
        </div>
        <div className="space-y-4">
          <p className="text-[10px] text-muted-foreground uppercase tracking-[0.2em] font-bold">Current Balance</p>
          <p className="font-display text-4xl font-black gradient-text">
            {pointsBalance.toLocaleString()} <span className="text-sm font-medium text-muted-foreground">PTS</span>
          </p>
          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border/50">
            <div>
              <p className="text-[9px] text-muted-foreground uppercase font-bold tracking-wider">Available</p>
              <p className="text-sm font-display font-bold text-primary">{formatNaira(claimableAmount)}</p>
            </div>
            <div>
              <p className="text-[9px] text-muted-foreground uppercase font-bold tracking-wider">Redeemed</p>
              <p className="text-sm font-display font-bold text-foreground">{formatNaira(claimedTotal)}</p>
            </div>
          </div>
        </div>
      </GlassCard>

      {!isOffQueue ? (
        <GlassCard className="text-center py-8 bg-muted/20">
          <Lock className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
          <h3 className="font-display font-bold text-foreground mb-1">Redemption Locked</h3>
          <p className="text-xs text-muted-foreground max-w-[200px] mx-auto leading-relaxed">
            Finish the waitlist queue to start converting points into vouchers.
          </p>
        </GlassCard>
      ) : claimableAmount < 50000 ? (
        <GlassCard className="text-center py-8 bg-muted/20">
          <AlertCircle className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
          <h3 className="font-display font-bold text-foreground mb-1">Insufficient Funds</h3>
          <p className="text-xs text-muted-foreground max-w-[200px] mx-auto leading-relaxed">
            A minimum of ₦50,000 is required to generate a voucher.
          </p>
        </GlassCard>
      ) : (
        <GlassCard variant="strong" className="space-y-5">
          <div className="flex items-center gap-2">
            <Gift className="w-5 h-5 text-primary" />
            <h3 className="font-display font-bold text-foreground">Create New Voucher</h3>
          </div>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest px-1">Amount in Points</label>
              <input
                type="number"
                value={pointsToUse}
                onChange={(e) => setPointsToUse(e.target.value)}
                placeholder="Min. 100,000 Points"
                className="w-full glass-input rounded-2xl px-5 py-4 text-foreground text-sm font-display font-bold"
              />
            </div>

            {Number(pointsToUse) > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 rounded-2xl bg-primary/5 border border-primary/20"
              >
                <div className="flex justify-between items-center">
                  <p className="text-xs font-bold text-muted-foreground">Voucher Value</p>
                  <p className="font-display text-lg font-black text-primary">{formatNaira(nairaValue)}</p>
                </div>
                {nairaValue > claimableAmount && (
                  <p className="text-[10px] text-destructive font-bold mt-2 uppercase tracking-tight">⚠️ Exceeds claimable balance</p>
                )}
              </motion.div>
            )}

            <GlassButton
              variant="primary"
              onClick={handleCreate}
              className="w-full py-4 text-sm font-black shadow-xl"
              disabled={creating || !canCreate()}
            >
              {creating ? "Processing..." : "Generate Voucher"}
            </GlassButton>
          </div>
        </GlassCard>
      )}

      {vouchers.length > 0 && (
        <div className="space-y-4">
          <h3 className="font-display font-bold text-foreground px-1">Your Redemption History</h3>
          <div className="space-y-4">
            {vouchers.map((v) => (
              <GlassCard key={v.id} className="p-0 overflow-hidden border-none group">
                <div className="relative p-6 bg-gradient-to-br from-primary/20 via-primary/5 to-transparent">
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <p className="text-[9px] font-bold text-primary uppercase tracking-[0.2em] mb-1">Official Voucher</p>
                      <p className="font-display text-3xl font-black text-foreground">{formatNaira(v.amount_naira)}</p>
                    </div>
                    <div className="p-3 rounded-2xl bg-background/50 backdrop-blur-md border border-white/10">
                       <RealloEyeLogo size={24} />
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-4 pt-4 border-t border-primary/10">
                    <p className="font-mono text-xs font-bold text-primary tracking-widest truncate">{v.voucher_code}</p>
                    <button
                      onClick={() => handleCopy(v.voucher_code, v.id)}
                      className="p-2 rounded-lg hover:bg-primary/10 transition-colors text-primary"
                    >
                      {copiedId === v.id ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div className="px-6 py-3 bg-muted/10 flex justify-between items-center">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase">{new Date(v.created_at).toLocaleDateString()}</p>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase">{v.points_used.toLocaleString()} PTS used</p>
                </div>
              </GlassCard>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default Vouchers;
