import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import GlassCard from "@/components/GlassCard";
import GlassButton from "@/components/GlassButton";
import { Gift, Wallet, Download, Copy, Check } from "lucide-react";
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
  const nairaValue = Math.floor(Number(pointsToUse || 0) * 0.5);

  const handleCreate = async () => {
    const pts = parseInt(pointsToUse, 10);
    if (!pts || pts <= 0 || pts > pointsBalance || !user) return;
    setCreating(true);

    // Generate voucher code
    const { data: codeData } = await supabase.rpc("generate_voucher_code");
    const code = codeData || `RLO-${Math.random().toString(36).slice(2, 10).toUpperCase()}`;

    await supabase.from("vouchers").insert({
      user_id: user.id,
      voucher_code: code,
      amount_naira: Math.floor(pts * 0.5),
      points_used: pts,
    });

    // Deduct points
    await supabase
      .from("profiles")
      .update({ points_balance: pointsBalance - pts })
      .eq("id", user.id);

    toast({ title: "Voucher created!", description: `${code} — ${formatNaira(Math.floor(pts * 0.5))}` });
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
    <div className="relative min-h-screen overflow-x-hidden">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-primary/3 rounded-full blur-[200px]" />
      </div>
      <Navbar />

      <section className="min-h-screen flex items-start justify-center px-6 py-24">
        <div className="w-full max-w-md space-y-4">
          {/* Points balance */}
          <GlassCard variant="glow" className="text-center">
            <Wallet className="w-8 h-8 text-primary mx-auto mb-2" />
            <p className="text-xs text-muted-foreground font-display uppercase tracking-widest">Points Balance</p>
            <motion.p
              key={pointsBalance}
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              className="font-display text-4xl font-bold gradient-text"
            >
              {pointsBalance.toLocaleString()}
            </motion.p>
            <p className="text-sm text-muted-foreground mt-1">
              = {formatNaira(Math.floor(pointsBalance * 0.5))} claimable
            </p>
          </GlassCard>

          {/* Create voucher */}
          <GlassCard variant="strong">
            <h3 className="font-display font-semibold text-foreground mb-3 flex items-center gap-2">
              <Gift className="w-5 h-5 text-primary" />
              Create Voucher
            </h3>
            <p className="text-xs text-muted-foreground mb-3">
              1 point = ₦0.50. Enter points to convert into a redeemable voucher.
            </p>
            <input
              type="number"
              value={pointsToUse}
              onChange={(e) => setPointsToUse(e.target.value)}
              placeholder="Points to use"
              max={pointsBalance}
              className="w-full glass-input rounded-xl px-4 py-3 text-foreground text-sm mb-2"
            />
            {Number(pointsToUse) > 0 && (
              <p className="text-sm text-primary font-display font-semibold mb-3">
                Voucher value: {formatNaira(nairaValue)}
              </p>
            )}
            <GlassButton
              variant="primary"
              onClick={handleCreate}
              className="w-full"
              disabled={creating || !pointsToUse || Number(pointsToUse) <= 0 || Number(pointsToUse) > pointsBalance}
            >
              {creating ? "Creating..." : "Generate Voucher"}
            </GlassButton>
          </GlassCard>

          {/* Voucher list */}
          {vouchers.length > 0 && (
            <GlassCard>
              <h3 className="font-display font-semibold text-foreground mb-3">Your Vouchers</h3>
              <div className="space-y-3">
                {vouchers.map((v) => (
                  <div key={v.id} className="glass rounded-xl p-4">
                    {/* Visual giftcard */}
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
                        {new Date(v.created_at).toLocaleDateString()} • {v.points_used} pts
                      </p>
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
