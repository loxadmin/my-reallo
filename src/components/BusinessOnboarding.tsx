import { useState } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import GlassCard from "@/components/GlassCard";
import GlassButton from "@/components/GlassButton";
import { toast } from "@/hooks/use-toast";
import { Trash2, Plus, Building2 } from "lucide-react";

type Category = "retailer" | "wholesaler" | "fuel_station" | "pharmacy" | "supermarket";
type Frequency = "daily" | "weekly" | "monthly";

const CATEGORIES: { id: Category; label: string; emoji: string; itemHint: string }[] = [
  { id: "retailer", label: "Retailer", emoji: "🛍️", itemHint: "e.g. Beverages, snacks, household items" },
  { id: "wholesaler", label: "Wholesaler", emoji: "📦", itemHint: "e.g. Bulk grain, packaged goods" },
  { id: "fuel_station", label: "Fuel Station", emoji: "⛽", itemHint: "e.g. PMS, AGO, kerosene" },
  { id: "pharmacy", label: "Pharmacy", emoji: "💊", itemHint: "e.g. OTC drugs, supplements" },
  { id: "supermarket", label: "Supermarket", emoji: "🛒", itemHint: "e.g. Groceries, beverages" },
];

interface ItemDraft {
  item_name: string;
  weekly_spend: string;
  verification_frequency: Frequency;
}

const emptyItem: ItemDraft = { item_name: "", weekly_spend: "", verification_frequency: "weekly" };

const BusinessOnboarding = ({ onComplete }: { onComplete: () => void }) => {
  const { user, refreshProfile } = useAuth();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [category, setCategory] = useState<Category | null>(null);
  const [items, setItems] = useState<ItemDraft[]>([{ ...emptyItem }]);
  const [saving, setSaving] = useState(false);

  const totalWeekly = items.reduce((s, i) => s + (parseInt(i.weekly_spend) || 0), 0);
  const totalMonthly = totalWeekly * 4;
  const creditLine = Math.round(totalMonthly * 0.5);

  const updateItem = (idx: number, patch: Partial<ItemDraft>) => {
    setItems(prev => prev.map((it, i) => i === idx ? { ...it, ...patch } : it));
  };

  const handleSubmit = async () => {
    if (!user || !category) return;
    const valid = items.filter(i => i.item_name.trim() && parseInt(i.weekly_spend) > 0);
    if (valid.length === 0) {
      toast({ title: "Add at least one item with weekly spend", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const { error: profileErr } = await supabase.from("profiles").update({
        business_category: category,
        weekly_business_spend: totalWeekly,
        monthly_business_spend: totalMonthly,
        credit_line: creditLine,
      } as any).eq("id", user.id);
      if (profileErr) throw profileErr;

      // Replace any existing items
      await supabase.from("business_items").delete().eq("user_id", user.id);
      const rows = valid.map(i => ({
        user_id: user.id,
        item_name: i.item_name.trim(),
        weekly_spend: parseInt(i.weekly_spend) || 0,
        verification_frequency: i.verification_frequency,
      }));
      const { error: itemsErr } = await supabase.from("business_items").insert(rows);
      if (itemsErr) throw itemsErr;

      await refreshProfile();
      toast({ title: "Business profile saved" });
      onComplete();
    } catch (e: any) {
      toast({ title: "Couldn't save", description: e?.message || String(e), variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const selectedCat = CATEGORIES.find(c => c.id === category);

  return (
    <div className="min-h-screen px-4 py-8 max-w-xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-2 mb-6">
          <Building2 className="w-6 h-6 text-primary" />
          <h1 className="font-display text-xl font-bold gradient-text">Set up your business</h1>
        </div>
        <div className="flex gap-2 mb-6">
          {[1, 2, 3].map(n => (
            <div key={n} className={`h-1.5 flex-1 rounded-full ${step >= n ? "bg-primary" : "bg-muted"}`} />
          ))}
        </div>

        {step === 1 && (
          <GlassCard className="p-5 space-y-4">
            <h2 className="text-[15px] font-semibold">Choose a category</h2>
            <div className="grid grid-cols-2 gap-3">
              {CATEGORIES.map(c => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setCategory(c.id)}
                  className={`p-4 rounded-2xl border text-left transition-all ${
                    category === c.id ? "border-primary bg-primary/10" : "border-border/40 hover:border-border"
                  }`}
                >
                  <div className="text-2xl mb-1">{c.emoji}</div>
                  <div className="text-[13px] font-medium">{c.label}</div>
                </button>
              ))}
            </div>
            <GlassButton variant="primary" disabled={!category} onClick={() => setStep(2)} className="w-full">
              Continue
            </GlassButton>
          </GlassCard>
        )}

        {step === 2 && selectedCat && (
          <GlassCard className="p-5 space-y-4">
            <div>
              <h2 className="text-[15px] font-semibold">What do you spend on weekly?</h2>
              <p className="text-[12px] text-muted-foreground mt-1">{selectedCat.itemHint}</p>
            </div>
            <div className="space-y-3">
              {items.map((it, idx) => (
                <div key={idx} className="rounded-xl border border-border/40 p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <input
                      value={it.item_name}
                      onChange={e => updateItem(idx, { item_name: e.target.value })}
                      placeholder="Item / product"
                      className="flex-1 bg-transparent border-b border-border/40 px-1 py-1.5 text-[13px] focus:outline-none focus:border-primary"
                    />
                    {items.length > 1 && (
                      <button onClick={() => setItems(prev => prev.filter((_, i) => i !== idx))} className="text-destructive/70 hover:text-destructive">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] text-muted-foreground">Weekly spend (₦)</label>
                      <input
                        type="number"
                        value={it.weekly_spend}
                        onChange={e => updateItem(idx, { weekly_spend: e.target.value })}
                        placeholder="0"
                        className="w-full bg-transparent border-b border-border/40 px-1 py-1 text-[13px] focus:outline-none focus:border-primary"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-muted-foreground">Verify how often?</label>
                      <select
                        value={it.verification_frequency}
                        onChange={e => updateItem(idx, { verification_frequency: e.target.value as Frequency })}
                        className="w-full bg-transparent border-b border-border/40 px-1 py-1 text-[13px] focus:outline-none focus:border-primary"
                      >
                        <option value="daily">Daily</option>
                        <option value="weekly">Weekly</option>
                        <option value="monthly">Monthly</option>
                      </select>
                    </div>
                  </div>
                </div>
              ))}
              <button
                onClick={() => setItems(prev => [...prev, { ...emptyItem }])}
                className="w-full py-2 rounded-xl border border-dashed border-border/50 text-[12px] text-muted-foreground hover:text-foreground hover:border-primary/50 flex items-center justify-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> Add item
              </button>
            </div>
            <div className="flex gap-2">
              <GlassButton variant="outline" onClick={() => setStep(1)} className="flex-1">Back</GlassButton>
              <GlassButton variant="primary" disabled={totalWeekly <= 0} onClick={() => setStep(3)} className="flex-1">
                Continue
              </GlassButton>
            </div>
          </GlassCard>
        )}

        {step === 3 && selectedCat && (
          <GlassCard className="p-5 space-y-4">
            <h2 className="text-[15px] font-semibold">Review</h2>
            <div className="space-y-2 text-[13px]">
              <div className="flex justify-between"><span className="text-muted-foreground">Category</span><span className="font-medium">{selectedCat.emoji} {selectedCat.label}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Weekly spend</span><span className="font-medium">₦{totalWeekly.toLocaleString()}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Monthly spend</span><span className="font-medium">₦{totalMonthly.toLocaleString()}</span></div>
              <div className="flex justify-between border-t border-border/30 pt-2 mt-2"><span className="text-muted-foreground">Estimated credit line</span><span className="font-bold text-primary">₦{creditLine.toLocaleString()}</span></div>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Verify your expenses to unlock your credit line. Loan terms: 1.8% over 14 days from a partner microfinance bank.
            </p>
            <div className="flex gap-2">
              <GlassButton variant="outline" onClick={() => setStep(2)} className="flex-1">Back</GlassButton>
              <GlassButton variant="primary" onClick={handleSubmit} disabled={saving} className="flex-1">
                {saving ? "Saving…" : "Finish setup"}
              </GlassButton>
            </div>
          </GlassCard>
        )}
      </motion.div>
    </div>
  );
};

export default BusinessOnboarding;