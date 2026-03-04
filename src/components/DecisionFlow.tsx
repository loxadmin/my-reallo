import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import GlassCard from "./GlassCard";
import GlassButton from "./GlassButton";
import { Award, CheckSquare, ExternalLink, Clock, Upload, X } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface DecisionApp {
  id: string;
  app_name: string;
  app_logo_url: string | null;
  category: string;
  points_select: number;
  points_switch_intent: number;
  points_switch_complete: number;
  switch_link: string | null;
  referral_message: string | null;
  referral_link: string | null;
  referral_points: number;
  is_active: boolean;
}

interface DecisionResponse {
  id: string;
  app_id: string;
  has_app: boolean;
  would_switch: boolean | null;
  switch_available_at: string | null;
  switch_completed: boolean;
  referral_clicked: boolean;
  referral_screenshot_url: string | null;
  referral_approved: boolean;
  points_awarded: number;
}

// Use raw queries since types aren't regenerated yet
const fromApps = () => supabase.from("decision_apps" as any);
const fromResponses = () => supabase.from("decision_responses" as any);

const DecisionFlow = () => {
  const { user, refreshProfile } = useAuth();
  const [apps, setApps] = useState<DecisionApp[]>([]);
  const [responses, setResponses] = useState<DecisionResponse[]>([]);
  const [selectedApps, setSelectedApps] = useState<Set<string>>(new Set());
  const [step, setStep] = useState<"checklist" | "processing" | "done">("checklist");
  const [switchPrompt, setSwitchPrompt] = useState<DecisionApp | null>(null);
  const [referralOffer, setReferralOffer] = useState<DecisionApp | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);

  useEffect(() => {
    if (user) fetchData();
  }, [user]);

  const fetchData = async () => {
    if (!user) return;
    const [appsRes, respRes] = await Promise.all([
      fromApps().select("*").eq("is_active", true).order("app_name"),
      fromResponses().select("*").eq("user_id", user.id),
    ]);
    setApps((appsRes.data || []) as unknown as DecisionApp[]);
    const resps = (respRes.data || []) as unknown as DecisionResponse[];
    setResponses(resps);
    if (resps.length > 0) setHasSubmitted(true);
  };

  const toggleApp = (id: string) => {
    const next = new Set(selectedApps);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedApps(next);
  };

  const handleSubmitChecklist = async () => {
    if (!user || apps.length === 0) return;
    setSubmitting(true);
    setStep("processing");

    for (const app of apps) {
      const hasApp = selectedApps.has(app.id);

      if (app.category === "yes_no") {
        if (hasApp) {
          await fromResponses().insert({
            user_id: user.id,
            app_id: app.id,
            has_app: true,
            would_switch: null,
            points_awarded: app.points_select,
          });
          const { data: profile } = await supabase.from("profiles").select("points_balance").eq("id", user.id).single();
          await supabase.from("profiles").update({ points_balance: (profile?.points_balance || 0) + app.points_select }).eq("id", user.id);
        } else {
          await fromResponses().insert({
            user_id: user.id,
            app_id: app.id,
            has_app: false,
            points_awarded: 0,
          });
        }
      } else if (app.category === "referral") {
        if (hasApp) {
          await fromResponses().insert({
            user_id: user.id,
            app_id: app.id,
            has_app: true,
            points_awarded: 0,
          });
        } else {
          await fromResponses().insert({
            user_id: user.id,
            app_id: app.id,
            has_app: false,
            referral_clicked: false,
            points_awarded: 0,
          });
        }
      }
    }

    await fetchData();
    await refreshProfile();
    setStep("done");
    setSubmitting(false);
    toast({ title: "Decision form completed!", description: "Check your results below." });
  };

  const handleSwitchYes = async (app: DecisionApp) => {
    if (!user) return;
    const switchDate = new Date();
    switchDate.setDate(switchDate.getDate() + 30);

    const { data: resp } = await fromResponses()
      .select("*").eq("user_id", user.id).eq("app_id", app.id).single();
    
    if (resp) {
      const r = resp as any;
      const newPoints = r.points_awarded + app.points_switch_intent;
      await fromResponses().update({
        would_switch: true,
        switch_available_at: switchDate.toISOString(),
        points_awarded: newPoints,
      }).eq("id", r.id);
      
      const { data: profile } = await supabase.from("profiles").select("points_balance").eq("id", user.id).single();
      await supabase.from("profiles").update({ points_balance: (profile?.points_balance || 0) + app.points_switch_intent }).eq("id", user.id);
    }

    toast({ title: `+${app.points_switch_intent} points!`, description: `Switch button unlocks in 30 days for +${app.points_switch_complete} more points.` });
    setSwitchPrompt(null);
    await fetchData();
    await refreshProfile();
  };

  const handleSwitchNo = async (app: DecisionApp) => {
    if (!user) return;
    await fromResponses().update({ would_switch: false })
      .eq("user_id", user.id).eq("app_id", app.id);
    setSwitchPrompt(null);
    await fetchData();
  };

  const handleReferralClick = async (app: DecisionApp) => {
    if (!user || !app.referral_link) return;
    await fromResponses().update({ referral_clicked: true })
      .eq("user_id", user.id).eq("app_id", app.id);
    window.open(app.referral_link, "_blank");
    setReferralOffer(null);
    await fetchData();
    toast({ title: "Action recorded", description: "Submit a screenshot for admin approval to earn points." });
  };

  const handleScreenshotUpload = async (appId: string) => {
    if (!user) return;
    await fromResponses().update({ 
      referral_screenshot_url: "pending_review" 
    }).eq("user_id", user.id).eq("app_id", appId);
    toast({ title: "Screenshot submitted", description: "Admin will review and approve your points." });
    await fetchData();
  };

  const handleSwitchComplete = async (app: DecisionApp) => {
    if (!user || !app.switch_link) return;
    window.open(app.switch_link, "_blank");
    
    const { data: resp } = await fromResponses()
      .select("*").eq("user_id", user.id).eq("app_id", app.id).single();
    
    if (resp) {
      const r = resp as any;
      const newPoints = r.points_awarded + app.points_switch_complete;
      await fromResponses().update({
        switch_completed: true,
        points_awarded: newPoints,
      }).eq("id", r.id);
      
      const { data: profile } = await supabase.from("profiles").select("points_balance").eq("id", user.id).single();
      await supabase.from("profiles").update({ points_balance: (profile?.points_balance || 0) + app.points_switch_complete }).eq("id", user.id);
    }

    toast({ title: `+${app.points_switch_complete} points!`, description: "Switch completed!" });
    await fetchData();
    await refreshProfile();
  };

  if (!user) return null;

  // Switch prompt modal
  if (switchPrompt) {
    return (
      <GlassCard variant="glow" className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-foreground text-[13px]">Switch Offer</h3>
          <button onClick={() => setSwitchPrompt(null)}><X className="w-4 h-4 text-muted-foreground" /></button>
        </div>
        <p className="text-[12px] text-muted-foreground">
          Would you switch from {switchPrompt.app_name} to an alternative?
        </p>
        <div className="flex gap-3">
          <GlassButton variant="primary" onClick={() => handleSwitchYes(switchPrompt)} className="flex-1 text-[13px]">
            Yes (+{switchPrompt.points_switch_intent} pts)
          </GlassButton>
          <GlassButton variant="outline" onClick={() => handleSwitchNo(switchPrompt)} className="flex-1 text-[13px]">
            No, thanks
          </GlassButton>
        </div>
        <p className="text-[10px] text-muted-foreground">
          After 30 days, complete switch for +{switchPrompt.points_switch_complete} extra points
        </p>
      </GlassCard>
    );
  }

  // Referral offer modal
  if (referralOffer) {
    return (
      <GlassCard variant="glow" className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-foreground text-[13px]">Try This App</h3>
          <button onClick={() => setReferralOffer(null)}><X className="w-4 h-4 text-muted-foreground" /></button>
        </div>
        <p className="text-[12px] text-muted-foreground">
          {referralOffer.referral_message || `Since you don't use ${referralOffer.app_name}, would you like to try it out?`}
        </p>
        <GlassButton variant="primary" onClick={() => handleReferralClick(referralOffer)} className="w-full text-[13px]">
          <ExternalLink className="inline w-4 h-4 mr-2" /> Try It Out (+{referralOffer.referral_points} pts after approval)
        </GlassButton>
        <p className="text-[10px] text-muted-foreground">
          Submit a screenshot after completing the action. Admin will approve for points.
        </p>
      </GlassCard>
    );
  }

  // Already submitted - show results
  if (hasSubmitted && responses.length > 0) {
    return (
      <div className="space-y-3">
        <h3 className="font-semibold text-foreground text-[13px] flex items-center gap-2">
          <Award className="w-4 h-4 text-primary" />
          Earn Points
        </h3>

        {responses.map((resp) => {
          const app = apps.find(a => a.id === resp.app_id);
          if (!app) return null;

          const now = new Date();
          const switchAvailable = resp.switch_available_at ? new Date(resp.switch_available_at) : null;
          const canSwitch = switchAvailable && now >= switchAvailable && !resp.switch_completed;
          const daysUntilSwitch = switchAvailable && now < switchAvailable
            ? Math.ceil((switchAvailable.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
            : 0;

          return (
            <GlassCard key={resp.id} className="p-4" animate={false}>
              <div className="flex items-center gap-3">
                {app.app_logo_url ? (
                  <img src={app.app_logo_url} alt={app.app_name} className="w-8 h-8 rounded-lg object-cover" />
                ) : (
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-[11px] font-semibold text-primary">
                    {app.app_name.charAt(0)}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-semibold text-foreground">{app.app_name}</p>
                  <p className="text-[11px] text-muted-foreground capitalize">
                    {app.category === "yes_no" ? "Yes/No" : "Referral"} • {resp.has_app ? "Has app" : "Doesn't have"}
                  </p>
                </div>
                <div className="text-right">
                  {resp.points_awarded > 0 && (
                    <p className="text-[12px] text-primary font-semibold">+{resp.points_awarded} pts</p>
                  )}
                </div>
              </div>

              {app.category === "yes_no" && resp.has_app && resp.would_switch === null && (
                <div className="mt-3">
                  <GlassButton variant="outline" onClick={() => setSwitchPrompt(app)} className="w-full text-[12px]">
                    Switch Offer Available
                  </GlassButton>
                </div>
              )}

              {app.category === "yes_no" && resp.would_switch === true && !resp.switch_completed && (
                <div className="mt-3">
                  {canSwitch ? (
                    <GlassButton variant="primary" onClick={() => handleSwitchComplete(app)} className="w-full text-[12px]">
                      <ExternalLink className="inline w-3 h-3 mr-1" /> Switch Now (+{app.points_switch_complete} pts)
                    </GlassButton>
                  ) : (
                    <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                      <Clock className="w-3 h-3" />
                      <span>Switch available in {daysUntilSwitch} days</span>
                    </div>
                  )}
                </div>
              )}

              {app.category === "yes_no" && resp.switch_completed && (
                <p className="text-[11px] text-primary mt-2">✓ Switched</p>
              )}

              {app.category === "referral" && !resp.has_app && !resp.referral_clicked && (
                <div className="mt-3">
                  <GlassButton variant="primary" onClick={() => setReferralOffer(app)} className="w-full text-[12px]">
                    Try It Out Offer
                  </GlassButton>
                </div>
              )}

              {app.category === "referral" && resp.referral_clicked && !resp.referral_screenshot_url && (
                <div className="mt-3">
                  <GlassButton variant="outline" onClick={() => handleScreenshotUpload(resp.app_id)} className="w-full text-[12px]">
                    <Upload className="inline w-3 h-3 mr-1" /> Submit Screenshot
                  </GlassButton>
                </div>
              )}

              {app.category === "referral" && resp.referral_screenshot_url === "pending_review" && !resp.referral_approved && (
                <p className="text-[11px] text-muted-foreground mt-2">📋 Screenshot pending admin review</p>
              )}

              {app.category === "referral" && resp.referral_approved && (
                <p className="text-[11px] text-primary mt-2">✓ Approved — {app.referral_points} pts awarded</p>
              )}
            </GlassCard>
          );
        })}
      </div>
    );
  }

  // Checklist
  if (apps.length === 0) return null;

  return (
    <div className="space-y-4">
      <GlassCard variant="strong">
        <div className="flex items-center gap-2 mb-3">
          <CheckSquare className="w-4 h-4 text-primary" />
          <h3 className="font-semibold text-foreground text-[13px]">Which apps do you use?</h3>
        </div>
        <p className="text-[12px] text-muted-foreground mb-4">
          Select all apps you currently have on your phone. Earn points for each selection!
        </p>

        <div className="space-y-2 max-h-[400px] overflow-y-auto">
          {apps.map((app) => (
            <button
              key={app.id}
              onClick={() => toggleApp(app.id)}
              className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all duration-200 ${
                selectedApps.has(app.id)
                  ? "bg-primary/10 border border-primary/30"
                  : "glass border border-transparent hover:border-primary/10"
              }`}
            >
              {app.app_logo_url ? (
                <img src={app.app_logo_url} alt={app.app_name} className="w-8 h-8 rounded-lg object-cover" />
              ) : (
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-[11px] font-semibold text-primary">
                  {app.app_name.charAt(0)}
                </div>
              )}
              <span className="text-[13px] font-medium text-foreground flex-1 text-left">{app.app_name}</span>
              <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${
                selectedApps.has(app.id)
                  ? "bg-primary border-primary"
                  : "border-muted-foreground/30"
              }`}>
                {selectedApps.has(app.id) && <span className="text-primary-foreground text-[10px]">✓</span>}
              </div>
            </button>
          ))}
        </div>

        <GlassButton
          variant="primary"
          className="w-full mt-4 text-[13px]"
          onClick={handleSubmitChecklist}
          disabled={submitting}
        >
          {submitting ? "Processing..." : "Submit & Earn Points"}
        </GlassButton>
      </GlassCard>
    </div>
  );
};

export default DecisionFlow;
