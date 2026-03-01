import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import GlassCard from "@/components/GlassCard";
import GlassButton from "@/components/GlassButton";
import GlassInput from "@/components/GlassInput";
import { Gift, Wallet, Copy, Check, Lock, AlertCircle, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

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

    try {
      const { data: codeData } = await supabase.rpc("generate_voucher_code");
      const code = codeData || `RLO-${Math.random().toString(36).slice(2, 10).toUpperCase()}`;
      const claimNaira = Math.floor(pts * 0.5);

      const { error: insertError } = await supabase.from("vouchers").insert({
        user_id: user.id,
        voucher_code: code,
        amount_naira: claimNaira,
        points_used: pts,
      });

      if (insertError) throw insertError;

      const { error: updateError } = await supabase
        .from("profiles")
        .update({ points_balance: pointsBalance - pts })
        .eq("id", user.id);

      if (updateError) throw updateError;

      toast.success(`Voucher created: ${code}`);
      setPointsToUse("");
      await fetchVouchers();
      await refreshProfile();
    } catch (error: any) {
      toast.error(error.message || "Failed to create voucher");
    } finally {
      setCreating(false);
    }
  };

  const handleCopy = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    toast.success("Voucher code copied!");
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="container max-w-md mx-auto px-6 space-y-6 pb-12">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 glass-button rounded-xl">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-2xl font-display font-bold text-foreground">Vouchers</h1>
      </div>

      <GlassCard variant="blue" className="text-center">
        <div className="flex justify-center mb-4">
          <div className="p-3 bg-white/20 rounded-full">
            <Wallet className="w-8 h-8 text-white" />
          </div>
        </div>
        <p className="text-white/70 text-sm font-medium uppercase tracking-widest mb-1">Points Balance</p>
        <motion.p key={pointsBalance} initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="text-4xl font-bold text-white mb-6">
          {pointsBalance.toLocaleString()}
        </motion.p>
        <div className="grid grid-cols-2 gap-4 bg-white/10 rounded-2xl p-4">
          <div className="text-left">
            <p className="text-white/60 text-[10px] uppercase font-bold">Claimable</p>
            <p className="text-lg font-bold text-white">{formatNaira(claimableAmount)}</p>
          </div>
          <div className="text-right">
            <p className="text-white/60 text-[10px] uppercase font-bold">Claimed</p>
            <p className="text-lg font-bold text-white">{formatNaira(claimedTotal)}</p>
          </div>
        </div>
      </GlassCard>

      {!isOffQueue && (
        <GlassCard className="text-center p-8">
          <Lock className="w-10 h-10 text-muted-foreground mx-auto mb-4" />
          <p className="text-sm font-medium text-foreground">Queue Required</p>
          <p className="text-xs text-muted-foreground mt-1">You must complete the waitlist before you can create vouchers.</p>
        </GlassCard>
      )}

      {isOffQueue && claimableAmount < 50000 && (
        <GlassCard className="text-center p-8">
          <AlertCircle className="w-10 h-10 text-primary mx-auto mb-4" />
          <p className="text-sm font-medium text-foreground">Minimum Not Met</p>
          <p className="text-xs text-muted-foreground mt-1">Minimum claimable amount is ₦50,000. Keep earning points!</p>
        </GlassCard>
      )}

      {isOffQueue && claimableAmount >= 50000 && (
        <GlassCard className="p-6">
          <h3 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
            <Gift className="w-5 h-5 text-primary" />
            Create Voucher
          </h3>
          <p className="text-xs text-muted-foreground mb-6 leading-relaxed">
            Minimum 100,000 points (₦50,000). Enter the amount of points you'd like to convert.
          </p>

          <div className="space-y-4">
            <GlassInput
              type="number"
              label="Points to Convert"
              value={pointsToUse}
              onChange={(e) => setPointsToUse(e.target.value)}
              placeholder="Min 100,000"
            />

            {Number(pointsToUse) > 0 && (
              <div className="bg-primary/5 rounded-2xl p-4 border border-primary/10">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-medium text-muted-foreground">Estimated Value</span>
                  <span className="text-lg font-bold text-primary">{formatNaira(nairaValue)}</span>
                </div>
                {nairaValue > claimableAmount && (
                  <p className="text-[10px] text-destructive mt-1 font-bold">⚠️ Exceeds your claimable limit of {formatNaira(claimableAmount)}</p>
                )}
              </div>
            )}

            <GlassButton
              variant="primary"
              onClick={handleCreate}
              className="w-full py-4 mt-2"
              disabled={creating || !canCreate()}
              loading={creating}
            >
              Generate Voucher
            </GlassButton>
          </div>
        </GlassCard>
      )}

      {vouchers.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-foreground px-1">Recent Vouchers</h3>
          {vouchers.map((v) => (
            <motion.div
              key={v.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-card p-5 relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 p-4 opacity-[0.03]">
                <Gift size={80} />
              </div>
              <div className="flex justify-between items-start mb-4">
                <div>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Voucher Value</p>
                  <p className="text-2xl font-bold text-primary">{formatNaira(v.amount_naira)}</p>
                </div>
                <div className="bg-green-500/10 text-green-500 text-[10px] font-bold px-2 py-1 rounded-md uppercase tracking-wider">
                  Active
                </div>
              </div>

              <div className="flex items-center gap-2 bg-muted/50 rounded-xl px-4 py-3 mb-4">
                <code className="flex-1 text-sm font-mono font-bold tracking-widest text-foreground">{v.voucher_code}</code>
                <button
                  onClick={() => handleCopy(v.voucher_code, v.id)}
                  className="text-primary p-1 hover:scale-110 transition-transform"
                >
                  {copiedId === v.id ? <Check size={18} /> : <Copy size={18} />}
                </button>
              </div>

              <div className="flex justify-between items-center text-[10px] text-muted-foreground font-medium uppercase tracking-wide">
                <span>{new Date(v.created_at).toLocaleDateString()}</span>
                <span>{v.points_used.toLocaleString()} Points used</span>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Vouchers;
