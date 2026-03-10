import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useCurrency } from "@/contexts/CurrencyContext";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import GlassCard from "@/components/GlassCard";
import GlassButton from "@/components/GlassButton";
import WaterBackground from "@/components/WaterBackground";
import PageSkeleton from "@/components/PageSkeleton";
import { Gift, Wallet, Copy, Check, Lock, AlertCircle } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface Voucher {
  id: string;
  voucher_code: string;
  amount_naira: number;
  points_used: number;
  status: string;
  created_at: string;
}



const Vouchers = () => {
  const { user, profile, loading, refreshProfile } = useAuth();
  const { formatCurrency: formatNaira } = useCurrency();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [pointsToUse, setPointsToUse] = useState("");
  const [creating, setCreating] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [walletVerified, setWalletVerified] = useState(false);
  const [categoryToggles, setCategoryToggles] = useState<Record<string, boolean>>({
    data: true, electricity: true, food: true, transport: true,
  });

  // Read wallet context from URL params
  const walletType = searchParams.get("wallet") || "utility";
  const showTotal = searchParams.get("total") === "true";
  const walletSpendParam = Number(searchParams.get("spend") || 0);
  const walletLabel = searchParams.get("label") || "Utility";

  useEffect(() => { if (!loading && !user) navigate("/auth"); }, [loading, user, navigate]);
  useEffect(() => { if (user) fetchData(); }, [user]);

  const fetchData = async () => {
    const [vRes, verifyRes, settingsRes] = await Promise.all([
      supabase.from("vouchers").select("*").eq("user_id", user!.id).order("created_at", { ascending: false }),
      supabase.from("spend_verifications").select("status, spend_type").eq("user_id", user!.id),
      supabase.from("admin_settings").select("*"),
    ]);
    setVouchers((vRes.data || []) as Voucher[]);

    const verifs = (verifyRes.data || []) as { status: string; spend_type: string }[];
    const settings = (settingsRes.data || []) as { key: string; value: string }[];

    const toggles: Record<string, boolean> = {
      data: settings.find(s => s.key === "verify_data_active")?.value !== "false",
      electricity: settings.find(s => s.key === "verify_electricity_active")?.value !== "false",
      food: settings.find(s => s.key === "verify_food_active")?.value !== "false",
      transport: settings.find(s => s.key === "verify_transport_active")?.value !== "false",
    };
    setCategoryToggles(toggles);

    const isDone = (type: string) => {
      if (!toggles[type]) return true;
      const v = verifs.find(v => v.spend_type === type);
      return v?.status === "verified" || v?.status === "completed";
    };

    if (showTotal) {
      // All must be verified
      setWalletVerified(isDone("data") && isDone("electricity") && isDone("food") && isDone("transport"));
    } else {
      // Per-wallet
      switch (walletType) {
        case "utility":
          setWalletVerified(isDone("data") && isDone("electricity"));
          break;
        case "food":
          setWalletVerified(isDone("food"));
          break;
        case "transport":
          setWalletVerified(isDone("transport"));
          break;
        default:
          setWalletVerified(false);
      }
    }
  };

  const pointsBalance = profile?.points_balance ?? 0;

  // Use wallet-specific spend as cap
  const walletSpend = walletSpendParam > 0
    ? walletSpendParam
    : (profile?.total_annual_spend ?? 0);

  const claimedTotal = vouchers.reduce((sum, v) => sum + Number(v.amount_naira || 0), 0);
  const claimableAmount = Math.max(0, walletSpend - claimedTotal);
  const isOffQueue = (profile?.queue_position ?? 999) <= 0;
  const nairaValue = Math.floor(Number(pointsToUse || 0) * 0.5);

  const getClaimBlockMessage = (): string | null => {
    if (!isOffQueue) return "You must complete the queue before claiming vouchers.";
    if (pointsBalance <= 0) return "You need to earn points before you can claim. Go to the Earn page.";
    if (!walletVerified) return `Your ${walletLabel} spend is not verified yet. Go to the Verify page.`;
    if (Math.floor(pointsBalance * 0.5) < 50000) return `You need at least 100,000 points (₦50,000). You have ${pointsBalance.toLocaleString()} points.`;
    const offQueueAt = (profile as any)?.off_queue_at;
    if (offQueueAt) {
      const offDate = new Date(offQueueAt);
      const sixMonthsLater = new Date(offDate);
      sixMonthsLater.setMonth(sixMonthsLater.getMonth() + 6);
      if (new Date() < sixMonthsLater) {
        const monthsLeft = Math.ceil((sixMonthsLater.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24 * 30));
        return `Your goal savings has not reached maturity. ${monthsLeft} month(s) remaining.`;
      }
    } else if (isOffQueue) {
      supabase.from("profiles").update({ off_queue_at: new Date().toISOString() }).eq("id", user!.id);
      return "Your goal savings is less than 6 months and has not reached maturity.";
    }
    return null;
  };

  const blockMessage = getClaimBlockMessage();

  const canCreate = () => {
    if (blockMessage) return false;
    const pts = parseInt(pointsToUse, 10);
    if (!pts || pts <= 0 || pts > pointsBalance) return false;
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
    await supabase.from("vouchers").insert({ user_id: user.id, voucher_code: code, amount_naira: claimNaira, points_used: pts });
    await supabase.from("profiles").update({ points_balance: pointsBalance - pts }).eq("id", user.id);
    toast({ title: "Voucher created!", description: `${code} — ${formatNaira(claimNaira)}` });
    setPointsToUse("");
    await fetchData();
    await refreshProfile();
    setCreating(false);
  };

  const handleCopy = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (loading || !user) return <PageSkeleton />;

  return (
    <div className="relative min-h-screen overflow-x-hidden">
      <WaterBackground />
      <Navbar />

      <section className="min-h-screen flex items-start justify-center px-4 pt-20 pb-8">
        <div className="w-full max-w-md space-y-4">
          <GlassCard variant="glow" className="text-center">
            <Wallet className="w-7 h-7 text-primary mx-auto mb-2" />
            <p className="text-[12px] text-muted-foreground uppercase tracking-[0.2em]">
              {showTotal ? "Total" : walletLabel} Wallet
            </p>
            <motion.p key={pointsBalance} initial={{ scale: 0.8 }} animate={{ scale: 1 }} className="font-display text-3xl font-bold gradient-text">
              {pointsBalance.toLocaleString()}
            </motion.p>
            <p className="text-[12px] text-muted-foreground mt-1">points</p>
            <div className="flex items-center justify-center gap-6 mt-3">
              <div>
                <p className="text-[12px] text-muted-foreground">Claimable</p>
                <p className="text-sm font-semibold text-primary">{formatNaira(claimableAmount)}</p>
              </div>
              <div>
                <p className="text-[12px] text-muted-foreground">Already Claimed</p>
                <p className="text-sm font-semibold text-foreground">{formatNaira(claimedTotal)}</p>
              </div>
            </div>
            <p className="text-[12px] text-muted-foreground mt-2">
              Wallet spend cap: {formatNaira(walletSpend)}
            </p>
          </GlassCard>

          {blockMessage && (
            <GlassCard className="text-center">
              <AlertCircle className="w-5 h-5 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">{blockMessage}</p>
            </GlassCard>
          )}

          {!blockMessage && (
            <GlassCard variant="strong">
              <h3 className="font-semibold text-foreground text-sm mb-3 flex items-center gap-2">
                <Gift className="w-4 h-4 text-primary" /> Create Voucher
              </h3>
              <p className="text-[12px] text-muted-foreground mb-3">Minimum 100,000 points (₦50,000). Max claimable: {formatNaira(claimableAmount)}.</p>
              <input type="number" value={pointsToUse} onChange={(e) => setPointsToUse(e.target.value)} placeholder="Points to use (min 100,000)" max={Math.min(pointsBalance, claimableAmount * 2)} className="w-full glass-input rounded-xl px-4 py-3 text-foreground text-sm mb-2" />
              {Number(pointsToUse) > 0 && (
                <p className="text-sm text-primary font-semibold mb-3">
                  Voucher value: {formatNaira(nairaValue)}
                  {nairaValue > claimableAmount && <span className="text-destructive text-[12px] ml-2">(exceeds claimable)</span>}
                </p>
              )}
              <GlassButton variant="primary" onClick={handleCreate} className="w-full text-sm" disabled={creating || !canCreate()}>
                {creating ? "Creating..." : "Generate Voucher"}
              </GlassButton>
            </GlassCard>
          )}

          {vouchers.length > 0 && (
            <GlassCard>
              <h3 className="font-semibold text-foreground text-sm mb-3">Your Vouchers</h3>
              <div className="space-y-3">
                {vouchers.map((v) => (
                  <div key={v.id} className="glass rounded-xl p-3">
                    <div className="relative overflow-hidden rounded-xl p-4 mb-2" style={{ background: "linear-gradient(135deg, hsl(160 60% 18% / 0.15), hsl(160 50% 25% / 0.1))", border: "1px solid hsl(160 60% 18% / 0.15)" }}>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-[12px] text-muted-foreground uppercase tracking-widest">Reallo Voucher</p>
                          <p className="font-display text-xl font-bold gradient-text">{formatNaira(v.amount_naira)}</p>
                        </div>
                        <Gift className="w-7 h-7 text-primary/20" />
                      </div>
                      <p className="font-mono text-[12px] text-primary mt-2 tracking-widest">{v.voucher_code}</p>
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-[12px] text-muted-foreground">{new Date(v.created_at).toLocaleDateString()} • {v.points_used.toLocaleString()} pts</p>
                      <button onClick={() => handleCopy(v.voucher_code, v.id)} className="text-primary">
                        {copiedId === v.id ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </GlassCard>
          )}
        </div>
      </section>
    </div>
  );
};

export default Vouchers;
