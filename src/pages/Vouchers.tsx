import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import BottomNav from "@/components/BottomNav";
import GlassCard from "@/components/GlassCard";
import GlassButton from "@/components/GlassButton";
import { Gift, Wallet, Copy, Check, Lock, AlertCircle, History, PlusCircle } from "lucide-react";
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
    if (!pts || pts < 100000 || pts > pointsBalance) return false;
    if (!isOffQueue) return false;
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
    toast({ title: "Code copied" });
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (loading || !user || !profile) return null;

  return (
    <div className="relative min-h-screen overflow-x-hidden pb-32">
      <Navbar />

      <main className="max-w-md mx-auto px-6 pt-24 space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold font-display">Vouchers</h1>
          <p className="text-sm text-muted-foreground">Claim your reclaimed spend as vouchers</p>
        </div>

        {/* Balance Card */}
        <GlassCard variant="glow" className="relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <Wallet className="w-20 h-20" />
          </div>
          <div className="space-y-6">
            <div className="space-y-1 text-center">
              <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">Available Points</p>
              <h2 className="text-4xl font-bold font-display gradient-text">{pointsBalance.toLocaleString()}</h2>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border/50">
              <div className="space-y-1">
                <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">Claimable</p>
                <p className="text-lg font-bold text-primary">{formatNaira(claimableAmount)}</p>
              </div>
              <div className="space-y-1 text-right">
                <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">Claimed</p>
                <p className="text-lg font-bold">{formatNaira(claimedTotal)}</p>
              </div>
            </div>
          </div>
        </GlassCard>

        {/* Restrictions */}
        {!isOffQueue && (
          <div className="flex items-center gap-3 p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl">
            <Lock className="w-5 h-5 text-amber-500 shrink-0" />
            <p className="text-xs font-medium text-amber-500">You must complete the queue before you can create vouchers.</p>
          </div>
        )}

        {isOffQueue && claimableAmount < 50000 && (
          <div className="flex items-center gap-3 p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl">
            <AlertCircle className="w-5 h-5 text-amber-500 shrink-0" />
            <p className="text-xs font-medium text-amber-500">Minimum claimable amount is ₦50,000.</p>
          </div>
        )}

        {/* Create Form */}
        {isOffQueue && claimableAmount >= 50000 && (
          <GlassCard variant="strong" className="space-y-6">
            <div className="flex items-center gap-2">
              <PlusCircle className="w-5 h-5 text-primary" />
              <h3 className="font-bold font-display">Create New Voucher</h3>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest px-1">Points to convert</label>
                <input
                  type="number"
                  value={pointsToUse}
                  onChange={(e) => setPointsToUse(e.target.value)}
                  placeholder="Min 100,000 points"
                  className="w-full glass-input rounded-2xl px-5 py-4 text-foreground font-medium"
                />
              </div>

              {Number(pointsToUse) >= 100000 && (
                <div className="p-4 bg-primary/5 rounded-2xl border border-primary/10">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-muted-foreground">Voucher Value</span>
                    <span className="text-lg font-bold text-primary">{formatNaira(nairaValue)}</span>
                  </div>
                  {nairaValue > claimableAmount && (
                    <p className="text-[10px] text-destructive font-bold mt-2">Exceeds your claimable balance!</p>
                  )}
                </div>
              )}

              <GlassButton
                variant="primary"
                onClick={handleCreate}
                className="w-full py-4 font-bold shadow-lg shadow-primary/20"
                disabled={creating || !canCreate()}
              >
                {creating ? "Processing..." : "Generate Voucher"}
              </GlassButton>
            </div>
          </GlassCard>
        )}

        {/* List */}
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <h3 className="font-bold font-display flex items-center gap-2">
              <History className="w-5 h-5 text-muted-foreground" />
              History
            </h3>
            <span className="text-xs text-muted-foreground font-medium">{vouchers.length} total</span>
          </div>

          <div className="space-y-4">
            {vouchers.map((v) => (
              <GlassCard key={v.id} className="p-0 overflow-hidden group">
                <div className="p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">Voucher Amount</p>
                      <p className="text-2xl font-bold font-display">{formatNaira(v.amount_naira)}</p>
                    </div>
                    <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center">
                      <Gift className="w-6 h-6 text-primary" />
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-border/50">
                    <div className="font-mono text-sm font-bold tracking-widest bg-muted/50 px-3 py-1.5 rounded-lg border border-border/50">
                      {v.voucher_code}
                    </div>
                    <button
                      onClick={() => handleCopy(v.voucher_code, v.id)}
                      className="p-2.5 rounded-xl glass-button text-primary hover:scale-110 active:scale-95 transition-all"
                    >
                      {copiedId === v.id ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                    </button>
                  </div>
                </div>
                <div className="bg-muted/30 px-6 py-2 flex justify-between items-center">
                  <span className="text-[10px] text-muted-foreground font-medium">{new Date(v.created_at).toLocaleDateString()}</span>
                  <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-widest">{v.points_used.toLocaleString()} PTS used</span>
                </div>
              </GlassCard>
            ))}
            {vouchers.length === 0 && (
              <div className="text-center py-12 opacity-50">
                <Gift className="w-12 h-12 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm">No vouchers created yet.</p>
              </div>
            )}
          </div>
        </div>
      </main>

      <BottomNav active="home" onChange={() => {}} showVerify={isOffQueue} />
    </div>
  );
};

export default Vouchers;
