import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import GlassCard from "./GlassCard";
import GlassButton from "./GlassButton";
import { Award, CheckSquare, ExternalLink, Clock, Upload, X, History, Zap, Users } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import InfluencerFlow from "./InfluencerFlow";

interface DecisionApp {
  id: string;
  app_name: string;
  app_logo_url: string | null;
  category: string; // yes_no, referral, robust
  points_select: number;
  points_switch_intent: number;
  points_switch_complete: number;
  switch_link: string | null;
  referral_message: string | null;
  referral_link: string | null;
  referral_points: number;
  is_active: boolean;
  switch_to_referral_app_ids: string[] | null;
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

const fromApps = () => supabase.from("decision_apps" as any);
const fromResponses = () => supabase.from("decision_responses" as any);

type EarnTab = "earn" | "ongoing" | "past" | "influencer";
type FlowStep = "checklist" | "sequential" | "done";

const DecisionFlow = () => {
  const { user, refreshProfile } = useAuth();
  const [apps, setApps] = useState<DecisionApp[]>([]);
  const [responses, setResponses] = useState<DecisionResponse[]>([]);
  const [selectedApps, setSelectedApps] = useState<Set<string>>(new Set());
  const [step, setStep] = useState<FlowStep>("checklist");
  const [submitting, setSubmitting] = useState(false);
  const [earnTab, setEarnTab] = useState<EarnTab>("earn");
  const [uploadingFor, setUploadingFor] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Sequential interaction state
  const [pendingInteractions, setPendingInteractions] = useState<DecisionApp[]>([]);
  const [currentInteraction, setCurrentInteraction] = useState<DecisionApp | null>(null);

  const unansweredApps = apps.filter(app => !responses.some(r => r.app_id === app.id));

  useEffect(() => {
    if (user) fetchData();
  }, [user]);

  const fetchData = async () => {
    if (!user) return;
    const [appsRes, respRes] = await Promise.all([
      fromApps().select("*").eq("is_active", true).order("app_name"),
      fromResponses().select("*").eq("user_id", user.id),
    ]);
    const allApps = (appsRes.data || []) as unknown as DecisionApp[];
    setApps(allApps);
    const resps = (respRes.data || []) as unknown as DecisionResponse[];
    setResponses(resps);
  };

  const toggleApp = (id: string) => {
    const next = new Set(selectedApps);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedApps(next);
  };

  const handleSubmitChecklist = async () => {
    if (!user || unansweredApps.length === 0) return;
    setSubmitting(true);

    const interactionsNeeded: DecisionApp[] = [];

    for (const app of unansweredApps) {
      const hasApp = selectedApps.has(app.id);

      if (app.category === "yes_no") {
        if (hasApp) {
          // User has the app -> award select points, queue switch interaction
          await fromResponses().insert({
            user_id: user.id, app_id: app.id, has_app: true,
            would_switch: null, points_awarded: app.points_select,
          });
          const { data: profile } = await supabase.from("profiles").select("points_balance").eq("id", user.id).single();
          await supabase.from("profiles").update({ points_balance: (profile?.points_balance || 0) + app.points_select }).eq("id", user.id);
          interactionsNeeded.push(app);
        } else {
          // Doesn't have app -> no points, done
          await fromResponses().insert({
            user_id: user.id, app_id: app.id, has_app: false, points_awarded: 0,
          });
        }
      } else if (app.category === "referral") {
        if (hasApp) {
          // User already has referral app -> done, no points
          await fromResponses().insert({
            user_id: user.id, app_id: app.id, has_app: true, points_awarded: 0,
          });
        } else {
          // Doesn't have it -> queue referral offer interaction
          await fromResponses().insert({
            user_id: user.id, app_id: app.id, has_app: false,
            referral_clicked: false, points_awarded: 0,
          });
          // Check if this referral app is used as a switch option in a robust category
          const isRobustSwitch = apps.some(a => 
            a.category === "robust" && 
            (a.switch_to_referral_app_ids || []).includes(app.id) &&
            selectedApps.has(a.id)
          );
          if (!isRobustSwitch) {
            interactionsNeeded.push(app);
          }
        }
      } else if (app.category === "robust") {
        if (hasApp) {
          // User has the robust app -> award select points
          await fromResponses().insert({
            user_id: user.id, app_id: app.id, has_app: true,
            would_switch: null, points_awarded: app.points_select,
          });
          const { data: profile } = await supabase.from("profiles").select("points_balance").eq("id", user.id).single();
          await supabase.from("profiles").update({ points_balance: (profile?.points_balance || 0) + app.points_select }).eq("id", user.id);
          
          // Check if user selected the linked referral apps
          const linkedReferralIds = app.switch_to_referral_app_ids || [];
          const userSelectedLinkedApps = linkedReferralIds.filter(id => selectedApps.has(id));
          
          if (userSelectedLinkedApps.length === linkedReferralIds.length && linkedReferralIds.length > 0) {
            // User already uses all linked referral apps -> no switch needed, done
          } else {
            // User doesn't use some linked referral apps -> queue switch interaction
            interactionsNeeded.push(app);
          }
        } else {
          await fromResponses().insert({
            user_id: user.id, app_id: app.id, has_app: false, points_awarded: 0,
          });
        }
      }
    }

    await fetchData();
    await refreshProfile();
    setSubmitting(false);

    if (interactionsNeeded.length > 0) {
      setPendingInteractions(interactionsNeeded.slice(1));
      setCurrentInteraction(interactionsNeeded[0]);
      setStep("sequential");
    } else {
      setStep("done");
      toast({ title: "Decision form completed!" });
    }
  };

  const advanceInteraction = () => {
    if (pendingInteractions.length > 0) {
      setCurrentInteraction(pendingInteractions[0]);
      setPendingInteractions(prev => prev.slice(1));
    } else {
      setCurrentInteraction(null);
      setStep("done");
      toast({ title: "All decisions completed!" });
    }
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
        would_switch: true, switch_available_at: switchDate.toISOString(), points_awarded: newPoints,
      }).eq("id", r.id);

      const { data: profile } = await supabase.from("profiles").select("points_balance").eq("id", user.id).single();
      await supabase.from("profiles").update({ points_balance: (profile?.points_balance || 0) + app.points_switch_intent }).eq("id", user.id);
    }

    toast({ title: `+${app.points_switch_intent} points!`, description: `Switch button unlocks in 30 days for +${app.points_switch_complete} more points.` });
    await fetchData();
    await refreshProfile();
    advanceInteraction();
  };

  const handleSwitchNo = async (app: DecisionApp) => {
    if (!user) return;
    await fromResponses().update({ would_switch: false })
      .eq("user_id", user.id).eq("app_id", app.id);
    await fetchData();
    advanceInteraction();
  };

  const handleReferralClick = async (app: DecisionApp) => {
    if (!user || !app.referral_link) return;
    await fromResponses().update({ referral_clicked: true })
      .eq("user_id", user.id).eq("app_id", app.id);
    window.open(app.referral_link, "_blank");
    await fetchData();
    toast({ title: "Action recorded", description: "Submit a screenshot for admin approval to earn points." });
    advanceInteraction();
  };

  const handleReferralDismiss = async (app: DecisionApp) => {
    if (!user) return;
    // User doesn't want to try - just move on
    await fetchData();
    advanceInteraction();
  };

  const handleRobustSwitchOffer = async (app: DecisionApp, referralApp: DecisionApp) => {
    if (!user) return;
    // User wants to try the referral app linked to robust app
    // Update the robust app response with switch info
    await fromResponses().update({ would_switch: true })
      .eq("user_id", user.id).eq("app_id", app.id);
    
    // Also trigger referral click for the linked app
    const { data: refResp } = await fromResponses()
      .select("*").eq("user_id", user.id).eq("app_id", referralApp.id).single();
    if (refResp) {
      await fromResponses().update({ referral_clicked: true })
        .eq("id", (refResp as any).id);
    }
    if (referralApp.referral_link) {
      window.open(referralApp.referral_link, "_blank");
    }
    toast({ title: "Action recorded", description: "Submit a screenshot for admin approval to earn points." });
    await fetchData();
    advanceInteraction();
  };

  const handleScreenshotUpload = async (appId: string, file: File) => {
    if (!user) return;

    const fileExt = file.name.split(".").pop();
    const filePath = `${user.id}/${appId}-${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from("referral_screenshots")
      .upload(filePath, file);

    if (uploadError) {
      toast({ title: "Upload failed", description: uploadError.message });
      return;
    }

    await fromResponses().update({
      referral_screenshot_url: filePath,
    }).eq("user_id", user.id).eq("app_id", appId);

    toast({ title: "Screenshot submitted", description: "Admin will review and approve your points." });
    setUploadingFor(null);
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
        switch_completed: true, points_awarded: newPoints,
      }).eq("id", r.id);

      const { data: profile } = await supabase.from("profiles").select("points_balance").eq("id", user.id).single();
      await supabase.from("profiles").update({ points_balance: (profile?.points_balance || 0) + app.points_switch_complete }).eq("id", user.id);
    }

    toast({ title: `+${app.points_switch_complete} points!`, description: "Switch completed!" });
    await fetchData();
    await refreshProfile();
  };

  if (!user) return null;

  const fileInput = (
    <input
      ref={fileInputRef}
      type="file"
      accept="image/*"
      className="hidden"
      onChange={(e) => {
        const file = e.target.files?.[0];
        if (file && uploadingFor) {
          handleScreenshotUpload(uploadingFor, file);
        }
        e.target.value = "";
      }}
    />
  );

  // ═══ SEQUENTIAL INTERACTION MODE ═══
  if (step === "sequential" && currentInteraction) {
    const app = currentInteraction;
    
    if (app.category === "yes_no") {
      return (
        <GlassCard variant="glow" className="space-y-4">
          {fileInput}
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-foreground text-[13px]">Switch Offer</h3>
            <p className="text-[10px] text-muted-foreground">{pendingInteractions.length + 1} remaining</p>
          </div>
          <div className="flex items-center gap-3">
            {app.app_logo_url ? (
              <img src={app.app_logo_url} alt={app.app_name} className="w-10 h-10 rounded-lg object-cover" />
            ) : (
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-[13px] font-semibold text-primary">
                {app.app_name.charAt(0)}
              </div>
            )}
            <p className="text-[12px] text-muted-foreground">
              Would you switch from <span className="font-semibold text-foreground">{app.app_name}</span> to an alternative?
            </p>
          </div>
          <div className="flex gap-3">
            <GlassButton variant="primary" onClick={() => handleSwitchYes(app)} className="flex-1 text-[12px]">
              Yes (+{app.points_switch_intent} pts)
            </GlassButton>
            <GlassButton variant="outline" onClick={() => handleSwitchNo(app)} className="flex-1 text-[12px]">
              No, thanks
            </GlassButton>
          </div>
          <p className="text-[10px] text-muted-foreground">
            After 30 days, complete switch for +{app.points_switch_complete} extra points
          </p>
        </GlassCard>
      );
    }

    if (app.category === "referral") {
      return (
        <GlassCard variant="glow" className="space-y-4">
          {fileInput}
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-foreground text-[13px]">Try This App</h3>
            <p className="text-[10px] text-muted-foreground">{pendingInteractions.length + 1} remaining</p>
          </div>
          <div className="flex items-center gap-3">
            {app.app_logo_url ? (
              <img src={app.app_logo_url} alt={app.app_name} className="w-10 h-10 rounded-lg object-cover" />
            ) : (
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-[13px] font-semibold text-primary">
                {app.app_name.charAt(0)}
              </div>
            )}
            <p className="text-[12px] text-muted-foreground">
              {app.referral_message || `Would you like to try ${app.app_name}?`}
            </p>
          </div>
          <GlassButton variant="primary" onClick={() => handleReferralClick(app)} className="w-full text-[12px]">
            <ExternalLink className="inline w-3 h-3 mr-1" /> Try It Out (+{app.referral_points} pts after approval)
          </GlassButton>
          <GlassButton variant="outline" onClick={() => handleReferralDismiss(app)} className="w-full text-[12px]">
            No, thanks
          </GlassButton>
          <p className="text-[10px] text-muted-foreground">
            Submit a screenshot after completing the action. Admin will approve for points.
          </p>
        </GlassCard>
      );
    }

    if (app.category === "robust") {
      // Find the linked referral apps that user doesn't have
      const linkedIds = app.switch_to_referral_app_ids || [];
      const unselectedLinked = linkedIds
        .map(id => apps.find(a => a.id === id))
        .filter((a): a is DecisionApp => !!a && !selectedApps.has(a.id));
      
      const switchApp = unselectedLinked[0]; // offer first unselected linked referral app
      
      if (switchApp) {
        return (
          <GlassCard variant="glow" className="space-y-4">
            {fileInput}
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-foreground text-[13px]">Switch Offer</h3>
              <p className="text-[10px] text-muted-foreground">{pendingInteractions.length + 1} remaining</p>
            </div>
            <p className="text-[12px] text-muted-foreground">
              Since you use <span className="font-semibold text-foreground">{app.app_name}</span>, would you like to try <span className="font-semibold text-foreground">{switchApp.app_name}</span>?
            </p>
            {switchApp.referral_message && (
              <p className="text-[11px] text-muted-foreground">{switchApp.referral_message}</p>
            )}
            <GlassButton variant="primary" onClick={() => handleRobustSwitchOffer(app, switchApp)} className="w-full text-[12px]">
              <ExternalLink className="inline w-3 h-3 mr-1" /> Try {switchApp.app_name} (+{switchApp.referral_points} pts after approval)
            </GlassButton>
            <GlassButton variant="outline" onClick={() => { handleSwitchNo(app); }} className="w-full text-[12px]">
              No, thanks
            </GlassButton>
          </GlassCard>
        );
      } else {
        // No unselected linked apps, skip
        advanceInteraction();
        return null;
      }
    }

    return null;
  }

  // ═══ CLASSIFY RESPONSES ═══
  const getResponseStatus = (resp: DecisionResponse, app: DecisionApp | undefined): EarnTab => {
    if (!app) return "past";
    if (app.category === "yes_no" || app.category === "robust") {
      if (resp.switch_completed) return "past";
      if (resp.would_switch === false) return "past";
      if (resp.has_app && resp.would_switch === null) return "earn"; // switch offer pending
      if (resp.would_switch === true && !resp.switch_completed) return "ongoing"; // waiting 30 days
      if (!resp.has_app) return "past";
      return "past";
    }
    if (app.category === "referral") {
      if (resp.has_app) return "past";
      if (resp.referral_approved) return "past";
      if (resp.referral_screenshot_url) return "ongoing";
      if (resp.referral_clicked) return "earn"; // clicked but no screenshot
      if (!resp.has_app && !resp.referral_clicked) return "earn"; // offer available
      return "past";
    }
    return "past";
  };

  // ═══ RESULTS VIEW (with tabs) ═══
  if (responses.length > 0 && unansweredApps.length === 0 && step !== "sequential") {
    const earnResponses = responses.filter(r => getResponseStatus(r, apps.find(a => a.id === r.app_id)) === "earn");
    const ongoingResponses = responses.filter(r => getResponseStatus(r, apps.find(a => a.id === r.app_id)) === "ongoing");
    const pastResponses = responses.filter(r => getResponseStatus(r, apps.find(a => a.id === r.app_id)) === "past");

    const currentList = earnTab === "earn" ? earnResponses : earnTab === "ongoing" ? ongoingResponses : pastResponses;

    return (
      <div className="space-y-3">
        {fileInput}
        <div className="flex gap-1 p-1 rounded-xl glass overflow-x-auto">
          {([
            { id: "earn" as EarnTab, label: "Earn", icon: Zap, count: earnResponses.length },
            { id: "ongoing" as EarnTab, label: "Ongoing", icon: Clock, count: ongoingResponses.length },
            { id: "past" as EarnTab, label: "Past", icon: History, count: pastResponses.length },
            { id: "influencer" as EarnTab, label: "Influencer", icon: Users, count: 0 },
          ]).map(tab => (
            <button
              key={tab.id}
              onClick={() => setEarnTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[12px] font-medium transition-all ${
                earnTab === tab.id ? "clay-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <tab.icon className="w-3.5 h-3.5" />
              {tab.label} ({tab.count})
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div key={earnTab} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-2">
            {earnTab === "influencer" && <InfluencerFlow />}

            {earnTab !== "influencer" && currentList.length === 0 && (
              <GlassCard className="text-center py-8">
                <p className="text-muted-foreground text-[12px]">No {earnTab === "earn" ? "available" : earnTab} earnings</p>
              </GlassCard>
            )}

            {currentList.map((resp) => {
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
                    </div>
                    <div className="text-right">
                      {resp.points_awarded > 0 && (
                        <p className="text-[12px] text-primary font-semibold">+{resp.points_awarded} pts</p>
                      )}
                    </div>
                  </div>

                  {/* Yes/No or Robust: switch offer available */}
                  {(app.category === "yes_no" || app.category === "robust") && resp.has_app && resp.would_switch === null && (
                    <div className="mt-3 flex gap-2">
                      <GlassButton variant="primary" onClick={() => {
                        setCurrentInteraction(app);
                        setStep("sequential");
                      }} className="flex-1 text-[12px]">
                        View Switch Offer
                      </GlassButton>
                    </div>
                  )}

                  {/* Yes/No: waiting for switch */}
                  {(app.category === "yes_no" || app.category === "robust") && resp.would_switch === true && !resp.switch_completed && (
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

                  {(app.category === "yes_no" || app.category === "robust") && resp.switch_completed && (
                    <p className="text-[11px] text-primary mt-2">✓ Switched</p>
                  )}

                  {/* Referral: offer to try */}
                  {app.category === "referral" && !resp.has_app && !resp.referral_clicked && (
                    <div className="mt-3">
                      <GlassButton variant="primary" onClick={() => {
                        setCurrentInteraction(app);
                        setStep("sequential");
                      }} className="w-full text-[12px]">
                        Try It Out Offer
                      </GlassButton>
                    </div>
                  )}

                  {/* Referral: clicked but no screenshot - show upload */}
                  {app.category === "referral" && resp.referral_clicked && !resp.referral_screenshot_url && (
                    <div className="mt-3">
                      <GlassButton
                        variant="outline"
                        onClick={() => {
                          setUploadingFor(resp.app_id);
                          fileInputRef.current?.click();
                        }}
                        className="w-full text-[12px]"
                      >
                        <Upload className="inline w-3 h-3 mr-1" /> Upload Screenshot
                      </GlassButton>
                    </div>
                  )}

                  {app.category === "referral" && resp.referral_screenshot_url && !resp.referral_approved && (
                    <p className="text-[11px] text-muted-foreground mt-2">📋 Screenshot pending admin review</p>
                  )}

                  {app.category === "referral" && resp.referral_approved && (
                    <p className="text-[11px] text-primary mt-2">✓ Approved — {app.referral_points} pts awarded</p>
                  )}
                </GlassCard>
              );
            })}
          </motion.div>
        </AnimatePresence>
      </div>
    );
  }

  // ═══ CHECKLIST VIEW ═══
  if (unansweredApps.length === 0) return (
    <div className="space-y-4">
      <GlassCard className="text-center py-8">
        <Award className="w-6 h-6 text-primary mx-auto mb-2" />
        <p className="text-muted-foreground text-[12px]">No new apps to review. Check back later!</p>
      </GlassCard>
      <InfluencerFlow />
    </div>
  );

  const questionText = unansweredApps.length === 1
    ? "Have you used this app before?"
    : "Which of these apps have you used before?";

  return (
    <div className="space-y-4">
      {fileInput}
      <GlassCard variant="strong">
        <div className="flex items-center gap-2 mb-3">
          <CheckSquare className="w-4 h-4 text-primary" />
          <h3 className="font-semibold text-foreground text-[13px]">{questionText}</h3>
        </div>
        <p className="text-[12px] text-muted-foreground mb-4">
          Select all apps you currently have on your phone.
        </p>

        <div className="space-y-2 max-h-[400px] overflow-y-auto">
          {unansweredApps.map((app) => (
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
                selectedApps.has(app.id) ? "bg-primary border-primary" : "border-muted-foreground/30"
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

      <div className="pt-2">
        <InfluencerFlow />
      </div>
    </div>
  );
};

export default DecisionFlow;
