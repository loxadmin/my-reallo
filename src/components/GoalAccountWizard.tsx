import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCurrency } from "@/contexts/CurrencyContext";
import CurrencySelect from "@/components/CurrencySelect";
import { toast } from "@/hooks/use-toast";
import { Loader2, Target, ArrowLeft, Check } from "lucide-react";

interface Option {
  id: string;
  label: string;
  deposit: number;
  deposit_percent: number;
  points_required: number;
  requirements: any;
}

/**
 * Goal Account creation. No duration: a goal unlocks the moment its points target is met.
 * Currency -> what you want and what it costs -> five funding plans (points + optional deposit).
 */
export default function GoalAccountWizard({
  onDone,
  onSkip,
}: {
  onDone: () => void;
  onSkip: () => void;
}) {
  const { user } = useAuth();
  const { formatCurrency, currency, toNaira } = useCurrency();
  const [step, setStep] = useState<"currency" | "details" | "options">("currency");
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [options, setOptions] = useState<Option[]>([]);

  const targetNaira = Math.round(toNaira(Number(amount || 0)));

  const generate = async () => {
    if (!title.trim()) return toast({ title: "What are you working towards?", variant: "destructive" });
    if (targetNaira <= 0) return toast({ title: "Tell us how much it costs", variant: "destructive" });
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("ai-open-goal", {
        body: { target_amount: targetNaira, title: title.trim() },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      setOptions(((data as any)?.options ?? []) as Option[]);
      setStep("options");
    } catch (e: any) {
      toast({ title: "Could not build your plans", description: e?.message ?? "Try again", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const choose = async (opt: Option) => {
    setLoading(true);
    try {
      const { error } = await supabase.rpc("open_goal_account", {
        p_title: title.trim(),
        p_target_amount: targetNaira,
        p_target_date: null as any,
        p_option_id: opt.id,
      });
      if (error) throw error;
      if (user) await supabase.from("profiles").update({ onboarding_path: "dreams" } as any).eq("id", user.id);
      toast({ title: "Your Goal Account is open", description: "Earn points and they fund this goal." });
      onDone();
    } catch (e: any) {
      toast({ title: "Could not open your Goal Account", description: e?.message ?? "Try again", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const skip = async () => {
    if (user) await supabase.from("profiles").update({ onboarding_path: "skipped" } as any).eq("id", user.id);
    onSkip();
  };

  return (
    <div className="max-w-md mx-auto w-full px-5 py-10 space-y-6">
      <div className="space-y-1">
        <span className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
          <Target className="w-3 h-3 text-primary" /> Goal Account
        </span>
        <h1 className="text-[22px] font-light text-foreground leading-tight">
          {step === "currency" ? "First, your currency" : step === "details" ? "What are you working towards?" : "Pick how you'll fund it"}
        </h1>
        <p className="text-[12px] text-muted-foreground">
          {step === "currency"
            ? "Everything in Karbali will be shown in this currency."
            : step === "details"
            ? "We'll show you five ways to unlock it. No deadlines."
            : "Reach the points target and your goal unlocks — whenever that happens."}
        </p>
      </div>

      {step === "currency" && (
        <div className="space-y-4">
          <CurrencySelect />
          <button onClick={() => setStep("details")} className="w-full py-3 rounded-xl bg-primary text-primary-foreground text-[13px] font-medium">
            Continue
          </button>
        </div>
      )}

      {step === "details" && (
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-[11px] uppercase tracking-widest text-muted-foreground">The thing you want</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Buy a car"
              className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-[14px]" style={{ fontSize: 16 }} />
          </div>
          <div className="space-y-1.5">
            <label className="text-[11px] uppercase tracking-widest text-muted-foreground">How much it costs ({currency.symbol})</label>
            <input value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^0-9]/g, ""))} inputMode="numeric" placeholder="2000000"
              className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-[14px]" style={{ fontSize: 16 }} />
            {targetNaira > 0 && <p className="text-[11px] text-muted-foreground">{formatCurrency(targetNaira)}</p>}
          </div>
          <div className="flex gap-2">
            <button onClick={() => setStep("currency")} className="px-3 py-3 rounded-xl border border-border text-[13px] text-muted-foreground">
              <ArrowLeft className="w-4 h-4" />
            </button>
            <button disabled={loading} onClick={() => void generate()}
              className="flex-1 py-3 rounded-xl bg-primary text-primary-foreground text-[13px] font-medium inline-flex items-center justify-center gap-2 disabled:opacity-60">
              {loading && <Loader2 className="w-4 h-4 animate-spin" />} Show my plans
            </button>
          </div>
        </div>
      )}

      {step === "options" && (
        <div className="space-y-3">
          {options.map((o) => (
            <div key={o.id} className="rounded-2xl border border-border bg-card p-4 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-[14px] font-semibold text-foreground">{o.label}</h3>
                <span className="text-[11px] text-primary shrink-0">No deadline</span>
              </div>
              <p className="text-[16px] font-light text-foreground">
                {Number(o.points_required).toLocaleString()} points
              </p>
              <p className="text-[12px] text-muted-foreground">
                {Number(o.deposit) > 0
                  ? `Plus a ${formatCurrency(Number(o.deposit))} deposit (${Math.round(Number(o.deposit_percent) * 100)}%) to unlock this goal.`
                  : "No deposit at all — earn every point."}
              </p>
              <button disabled={loading} onClick={() => void choose(o)}
                className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground text-[12px] font-medium inline-flex items-center justify-center gap-1.5 disabled:opacity-60">
                <Check className="w-3.5 h-3.5" /> Use this plan
              </button>
            </div>
          ))}
          <button onClick={() => setStep("details")} className="w-full text-[12px] text-muted-foreground underline underline-offset-4">
            Change my goal
          </button>
        </div>
      )}

      <button onClick={() => void skip()} className="w-full text-[12px] text-muted-foreground underline underline-offset-4">
        I'll do this later
      </button>
    </div>
  );
}
