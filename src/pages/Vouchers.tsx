import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import GlassCard from "@/components/GlassCard";
import GlassButton from "@/components/GlassButton";
import { Gift, Wallet, Copy, Check, Lock, AlertCircle, Award } from "lucide-react";
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
      <div className="space-y-6">
        <header className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 glass-pill px-3 py-1 rounded-full mx-auto">
            <Wallet className="w-4 h-4 text-primary" />
            <span className="text-xs font-display font-medium text-primary">My Wallet</span>
          </div>
          <h1 className="text-3xl font-display font-bold gradient-text">Vouchers</h1>
          <p className="text-sm text-muted-foreground max-w-xs mx-auto">
            Manage your redeemed vouchers and create new ones from your points.
          </p>
        </header>

        {/* Balance + Claimable */}
        <GlassCard variant="glow" className="text-center py-8">
          <p className="text-xs text-muted-foreground font-display uppercase tracking-widest mb-1">Available Points</p>
          <motion.p key={pointsBalance} initial={{ scale: 0.8 }} animate={{ scale: 1 }} className="font-display text-5xl font-bold gradient-text mb-4">
            {pointsBalance.toLocaleString()}
          </motion.p>
          <div className="grid grid-cols-2 gap-4">
            <div className="glass-pill p-3 rounded-2xl">
              <p className="text-[10px] text-muted-foreground font-display uppercase tracking-tighter mb-0.5">Claimable</p>
              <p className="text-sm font-display font-bold text-primary">{formatNaira(claimableAmount)}</p>
            </div>
            <div className="glass-pill p-3 rounded-2xl">
              <p className="text-[10px] text-muted-foreground font-display uppercase tracking-tighter mb-0.5">Claimed</p>
              <p className="text-sm font-display font-bold text-foreground">{formatNaira(claimedTotal)}</p>
            </div>
          </div>
        </GlassCard>

        {/* Restrictions info */}
        {!isOffQueue && (
          <GlassCard className="text-center py-6 border-destructive/20 bg-destructive/5">
            <Lock className="w-6 h-6 text-destructive mx-auto mb-2" />
            <p className="text-xs text-muted-foreground px-4">You must complete the queue before claiming vouchers.</p>
          </GlassCard>
        )}

        {claimableAmount < 50000 && isOffQueue && (
          <GlassCard className="text-center py-6 border-accent/20 bg-accent/5">
            <AlertCircle className="w-6 h-6 text-accent mx-auto mb-2" />
            <p className="text-xs text-muted-foreground px-4">Minimum claimable amount is ₦50,000. Currently {formatNaira(claimableAmount)} available.</p>
          </GlassCard>
        )}

        {/* Create voucher */}
        {isOffQueue && claimableAmount >= 50000 && (
          <GlassCard variant="strong" className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-display font-bold text-lg flex items-center gap-2">
                <Gift className="w-5 h-5 text-primary" />
                Redeem Points
              </h3>
              <Award className="w-5 h-5 text-primary/30" />
            </div>

            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Min 100,000 pts (₦50,000). Max available: <span className="text-foreground font-bold">{formatNaira(claimableAmount)}</span>.
            </p>

            <div className="space-y-3">
              <input
                type="number"
                value={pointsToUse}
                onChange={(e) => setPointsToUse(e.target.value)}
                placeholder="Points to use (min 100,000)"
                className="w-full glass-input rounded-xl px-4 py-3.5 text-foreground text-sm font-display"
              />

              {Number(pointsToUse) > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-primary/10 rounded-xl p-3 flex items-center justify-between"
                >
                  <p className="text-xs font-display font-bold text-primary">Value: {formatNaira(nairaValue)}</p>
                  {nairaValue > claimableAmount && <span className="text-[10px] font-bold text-destructive uppercase">Exceeds Limit</span>}
                </motion.div>
              )}

              <GlassButton
                variant="primary"
                onClick={handleCreate}
                className="w-full py-4 text-sm font-display font-bold"
                disabled={creating || !canCreate()}
              >
                {creating ? "Creating..." : "Generate Voucher"}
              </GlassButton>
            </div>
          </GlassCard>
        )}

        {/* Voucher list */}
        {vouchers.length > 0 && (
          <section className="space-y-4 pb-12">
            <h3 className="text-sm font-display font-bold uppercase tracking-wider text-muted-foreground px-1">Your Vouchers</h3>
            <div className="space-y-4">
              {vouchers.map((v) => (
                <GlassCard key={v.id} className="p-0 overflow-hidden border-primary/10">
                  <div className="p-5 space-y-4">
                    <div className="relative overflow-hidden rounded-2xl p-5"
                      style={{
                        background: "linear-gradient(135deg, hsl(48 96% 53% / 0.15), hsl(40 90% 30% / 0.2))",
                        border: "1px solid hsl(48 96% 53% / 0.1)",
                      }}
                    >
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <p className="text-[9px] text-primary/60 font-display font-bold uppercase tracking-[0.2em]">Reallo Digital Voucher</p>
                          <p className="font-display text-3xl font-bold gradient-text">{formatNaira(v.amount_naira)}</p>
                        </div>
                        <Wallet className="w-8 h-8 text-primary/20" />
                      </div>

                      <div className="mt-6 flex items-center justify-between gap-4">
                        <div className="bg-background/40 backdrop-blur-md px-4 py-2 rounded-xl border border-white/5 flex-1">
                          <p className="font-mono text-sm text-foreground tracking-[0.2em] font-bold">{v.voucher_code}</p>
                        </div>
                        <GlassButton
                          variant="outline"
                          onClick={() => handleCopy(v.voucher_code, v.id)}
                          className="px-3 py-2 h-auto rounded-xl border-primary/20"
                        >
                          {copiedId === v.id ? <Check className="w-4 h-4 text-primary" /> : <Copy className="w-4 h-4" />}
                        </GlassButton>
                      </div>
                    </div>

                    <div className="flex items-center justify-between px-1">
                      <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                        <p className="text-[10px] font-display font-bold text-muted-foreground uppercase tracking-widest">
                          {v.status || "Active"}
                        </p>
                      </div>
                      <p className="text-[10px] text-muted-foreground font-display font-medium">
                        {new Date(v.created_at).toLocaleDateString()} • {v.points_used.toLocaleString()} pts
                      </p>
                    </div>
                  </div>
                </GlassCard>
              ))}
            </div>
          </section>
        )}
      </div>
    </Layout>
  );
};

export default Vouchers;
