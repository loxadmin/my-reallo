import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import GlassCard from "@/components/GlassCard";
import GlassButton from "@/components/GlassButton";
import { ShieldCheck, CheckCircle2, Clock, ExternalLink } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface BusinessItem {
  id: string;
  item_name: string;
  weekly_spend: number;
  verification_frequency: "daily" | "weekly" | "monthly";
  is_verified: boolean;
  last_verified_at: string | null;
}

const BusinessVerifyFlow = () => {
  const { user, profile, refreshProfile } = useAuth();
  const [items, setItems] = useState<BusinessItem[]>([]);
  const [txInputs, setTxInputs] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [submittingId, setSubmittingId] = useState<string | null>(null);

  const fetchItems = async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase.from("business_items").select("*").eq("user_id", user.id).order("created_at");
    setItems((data || []) as BusinessItem[]);
    setLoading(false);
  };

  useEffect(() => { void fetchItems(); }, [user?.id]);

  const handleSubmit = async (item: BusinessItem) => {
    const tx = (txInputs[item.id] || "").trim();
    if (!tx) {
      toast({ title: "Enter a transaction reference" });
      return;
    }
    setSubmittingId(item.id);
    try {
      await supabase.from("business_items").update({
        is_verified: true,
        last_verified_at: new Date().toISOString(),
      } as any).eq("id", item.id);

      // If all items verified, mark credit_line_verified
      const { data: all } = await supabase.from("business_items").select("is_verified").eq("user_id", user!.id);
      const allVerified = (all || []).every((r: any) => r.is_verified);
      if (allVerified) {
        await supabase.from("profiles").update({ credit_line_verified: true } as any).eq("id", user!.id);
        await refreshProfile();
      }

      toast({ title: "Submitted for verification", description: `Reference: ${tx}` });
      setTxInputs(prev => ({ ...prev, [item.id]: "" }));
      await fetchItems();
    } catch (e: any) {
      toast({ title: "Submission failed", description: e?.message || String(e), variant: "destructive" });
    } finally {
      setSubmittingId(null);
    }
  };

  if (loading) return <div className="p-6 text-center text-muted-foreground text-[12px]">Loading…</div>;

  if (!items.length) {
    return (
      <div className="px-4 py-8 max-w-xl mx-auto">
        <GlassCard className="p-5 text-center">
          <p className="text-[13px] text-muted-foreground">No business items to verify yet.</p>
        </GlassCard>
      </div>
    );
  }

  return (
    <div className="px-4 py-6 max-w-2xl mx-auto space-y-4">
      <div>
        <h1 className="font-display text-xl font-bold">Verify business expenses</h1>
        <p className="text-[12px] text-muted-foreground mt-1">
          Submit a transaction reference for each item per your chosen frequency. Verified items unlock your credit line.
        </p>
      </div>

      {profile?.credit_line_verified && (
        <GlassCard className="p-4 border border-primary/30 bg-primary/5">
          <p className="text-[13px] flex items-center gap-2 text-primary">
            <ShieldCheck className="w-4 h-4" /> Credit line verified — head to your dashboard to claim financing.
          </p>
        </GlassCard>
      )}

      {items.map(item => (
        <GlassCard key={item.id} className="p-4">
          <div className="flex items-start justify-between mb-3">
            <div>
              <h3 className="text-[14px] font-semibold">{item.item_name}</h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                ₦{item.weekly_spend.toLocaleString()}/week · Verify {item.verification_frequency}
              </p>
            </div>
            {item.is_verified ? (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/15 text-primary flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Verified
              </span>
            ) : (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground flex items-center gap-1">
                <Clock className="w-3 h-3" /> Pending
              </span>
            )}
          </div>

          <div className="flex gap-2">
            <input
              value={txInputs[item.id] || ""}
              onChange={e => setTxInputs(prev => ({ ...prev, [item.id]: e.target.value }))}
              placeholder="Transaction reference / receipt no."
              className="flex-1 bg-transparent border border-border/40 rounded-xl px-3 py-2 text-[13px] focus:outline-none focus:border-primary"
            />
            <GlassButton
              variant="primary"
              onClick={() => handleSubmit(item)}
              disabled={submittingId === item.id}
              className="text-[12px]"
            >
              {submittingId === item.id ? "…" : "Submit"}
            </GlassButton>
          </div>
        </GlassCard>
      ))}

      <p className="text-[10px] text-muted-foreground text-center">
        <ExternalLink className="w-3 h-3 inline mr-1" />
        Provide receipts or POS transaction IDs from your bank statement.
      </p>
    </div>
  );
};

export default BusinessVerifyFlow;