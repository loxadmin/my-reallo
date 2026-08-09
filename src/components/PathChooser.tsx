import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { Target, CalendarClock, Star, ArrowRight } from "lucide-react";

export type OnboardingPath = "dreams" | "monthly_earner" | "influencer" | "skipped";

const OPTIONS: { id: OnboardingPath; title: string; blurb: string; icon: typeof Target }[] = [
  {
    id: "dreams",
    title: "Get your dreams funded",
    blurb: "Tell Karbali what you want, and we build a Goal Account that funds it with tasks and offers.",
    icon: Target,
  },
  {
    id: "monthly_earner",
    title: "Become a monthly earner",
    blurb: "Bring 40+ people every 30 days and earn ₦500 each, withdrawable monthly, plus a 20% target bonus.",
    icon: CalendarClock,
  },
  {
    id: "influencer",
    title: "Become an influencer",
    blurb: "Have 1,000+ followers and 200+ views a post? Earn ₦500 per valid referral plus paid challenges.",
    icon: Star,
  },
];

export default function PathChooser({ onChosen }: { onChosen: (path: OnboardingPath) => void }) {
  const { user, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [busy, setBusy] = useState<OnboardingPath | null>(null);

  const choose = async (path: OnboardingPath) => {
    if (!user || busy) return;
    setBusy(path);
    try {
      await supabase.from("profiles").update({ onboarding_path: path } as any).eq("id", user.id);
      if (path === "monthly_earner") {
        const { data, error } = await supabase.rpc("join_monthly_earner_program" as any);
        if (error) throw error;
        const res = data as any;
        if (res && res.success === false) throw new Error(res.error ?? "Could not join");
      }
      await refreshProfile?.();
      onChosen(path);
      if (path === "monthly_earner") navigate("/dashboard/earn");
      if (path === "influencer") navigate("/dashboard/influencer");
    } catch (e: any) {
      toast({ title: "Something went wrong", description: e?.message ?? "Please try again", variant: "destructive" });
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-8">
      <h1 className="text-[20px] font-semibold text-foreground">What do you want from Karbali?</h1>
      <p className="text-[13px] text-muted-foreground mt-1">Pick one to get started. You can do the others later.</p>

      <div className="mt-5 space-y-3">
        {OPTIONS.map((opt) => {
          const Icon = opt.icon;
          return (
            <button
              key={opt.id}
              onClick={() => void choose(opt.id)}
              disabled={!!busy}
              className="w-full text-left rounded-2xl border border-border bg-card p-4 hover:border-primary/50 transition-colors disabled:opacity-60"
            >
              <div className="flex items-start gap-3">
                <span className="mt-0.5 w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <Icon className="w-4 h-4" />
                </span>
                <span className="flex-1">
                  <span className="block text-[14px] font-semibold text-foreground">{opt.title}</span>
                  <span className="block text-[12px] text-muted-foreground mt-0.5">{opt.blurb}</span>
                </span>
                <ArrowRight className="w-4 h-4 text-muted-foreground mt-1" />
              </div>
            </button>
          );
        })}
      </div>

      <button
        onClick={() => void choose("skipped")}
        disabled={!!busy}
        className="mt-5 w-full text-[12px] text-muted-foreground underline underline-offset-4"
      >
        Skip for now — take me to my dashboard
      </button>
      <p className="mt-3 text-[11px] text-muted-foreground text-center">
        Finish the quick setup and we'll add a ₦2,000 equivalent bonus in points to your balance.
      </p>
    </div>
  );
}