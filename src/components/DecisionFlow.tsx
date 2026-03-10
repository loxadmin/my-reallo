import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import GlassCard from "./GlassCard";
import GlassButton from "./GlassButton";
import { Award, CheckSquare, ExternalLink, Clock, Upload, X, History, Zap, MessageSquare, ChevronRight, CheckCircle2, AlertCircle } from "lucide-react";
import { toast } from "@/hooks/use-toast";

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

type EarnTab = "earn" | "ongoing" | "past";
type FlowStep = "checklist" | "sequential" | "done";
type EarnView = "tasks" | "surveys";

const DecisionFlow = ({ mode }: { mode?: EarnView }) => {
  const { user, refreshProfile } = useAuth();
  const [activeEarnView, setActiveEarnView] = useState<EarnView>(mode || "tasks");

  // Tasks state
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

  // Survey state
  const [surveys, setSurveys] = useState<any[]>([]);
  const [surveyResponses, setSurveyResponses] = useState<any[]>([]);
  const [activeSurvey, setActiveSurvey] = useState<any>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [surveyStep, setSurveyStep] = useState<"quiz" | "completion" | "done">("quiz");
  const [surveyUploading, setSurveyUploading] = useState(false);
  const surveyFileRef = useRef<HTMLInputElement>(null);

  const getSurveyResponse = (surveyId: string) =>
    surveyResponses.find((r: any) => r.survey_id === surveyId);

  const isSurveyExpired = (response: any) => {
    if (!response?.completion_expires_at) return false;
    return new Date(response.completion_expires_at).getTime() < Date.now();
  };

  const getTimeLeftLabel = (response: any) => {
    if (!response?.completion_expires_at) return "";
    const ms = new Date(response.completion_expires_at).getTime() - Date.now();
    if (ms <= 0) return "Expired";

    const totalHours = Math.floor(ms / (1000 * 60 * 60));
    const days = Math.floor(totalHours / 24);
    const hours = totalHours % 24;

    if (days > 0) return `${days}d ${hours}h left`;
    return `${hours}h left`;
  };

  const unansweredApps = apps.filter(app => !responses.some(r => r.app_id === app.id));

  useEffect(() => {
    if (user) fetchData();
  }, [user]);

  const fetchData = async () => {
    if (!user) return;
    const [appsRes, respRes, surveysRes, sRespRes] = await Promise.all([
      fromApps().select("*").eq("is_active", true).order("app_name"),
      fromResponses().select("*").eq("user_id", user.id),
      supabase.from("surveys").select("*, survey_questions(*, survey_options(*))").eq("is_active", true).order("created_at", { ascending: false }),
      supabase.from("survey_responses").select("*").eq("user_id", user.id),
    ]);

    if (surveysRes.error) {
      console.error("surveysRes.error", surveysRes.error);
    }

    if (sRespRes.error) {
      console.error("sRespRes.error", sRespRes.error);
    }

    const allApps = (appsRes.data || []) as unknown as DecisionApp[];
    setApps(allApps);
    const resps = (respRes.data || []) as unknown as DecisionResponse[];
    setResponses(resps);
    setSurveys(surveysRes.data || []);
    setSurveyResponses(sRespRes.data || []);
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

  const handleStartSurvey = async (survey: any) => {
    if (!user) return;
    const response = getSurveyResponse(survey.id);

    if (response?.status === "failed_quiz") {
      return;
    }

    if (
      response &&
      (response.status === "in_progress" || response.status === "rejected") &&
      !isSurveyExpired(response)
    ) {
      setActiveSurvey(survey);
      setCurrentQuestionIndex(0);
      setSurveyStep("completion");
      return;
    }

    if (
      response &&
      (response.status === "in_progress" || response.status === "rejected") &&
      isSurveyExpired(response)
    ) {
      const { error } = await supabase
        .from("survey_responses")
        .delete()
        .eq("user_id", user.id)
        .eq("survey_id", survey.id)
        .in("status", ["in_progress", "rejected"]);

      if (error) {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
        return;
      }

      await fetchData();

      toast({
        title: "Survey restarted",
        description: "Your 20-day window expired, so this survey is starting over.",
      });

      setActiveSurvey(survey);
      setCurrentQuestionIndex(0);
      setSurveyStep("quiz");
      return;
    }

    setActiveSurvey(survey);
    setCurrentQuestionIndex(0);
    setSurveyStep("quiz");
  };

  const handleAnswerQuestion = async (option: any) => {
    if (!user || !activeSurvey) return;

    if (!option.is_correct) {
      const { error } = await supabase.from("survey_responses").upsert(
        {
          user_id: user.id,
          survey_id: activeSurvey.id,
          status: "failed_quiz",
          screenshot_url: null,
          points_awarded: 0,
        },
        { onConflict: "user_id,survey_id" }
      );

      if (error) {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Oops! Nothing to see here",
        description: "This survey has been closed for your account.",
        variant: "destructive",
      });

      setActiveSurvey(null);
      setSurveyStep("quiz");
      setCurrentQuestionIndex(0);
      await fetchData();
      return;
    }

    if (currentQuestionIndex < activeSurvey.survey_questions.length - 1) {
      setCurrentQuestionIndex((prev) => prev + 1);
      return;
    }

    const now = new Date();
    const expiresAt = new Date(now);
    expiresAt.setDate(expiresAt.getDate() + 20);

    const { error } = await supabase.from("survey_responses").upsert(
      {
        user_id: user.id,
        survey_id: activeSurvey.id,
        status: "in_progress",
        quiz_completed_at: now.toISOString(),
        completion_expires_at: expiresAt.toISOString(),
        points_awarded: 0,
      },
      { onConflict: "user_id,survey_id" }
    );

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Quiz passed",
      description: "You have 20 days to finish the survey and upload proof.",
    });

    setSurveyStep("completion");
    await fetchData();
  };

  const handleSurveyScreenshotUpload = async (file: File) => {
    if (!user || !activeSurvey) return;
    setSurveyUploading(true);

    const fileExt = file.name.split(".").pop();
    const filePath = `${user.id}/${activeSurvey.id}-${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from("survey_screenshots")
      .upload(filePath, file);

    if (uploadError) {
      toast({ title: "Upload failed", description: uploadError.message });
      setSurveyUploading(false);
      return;
    }

    const { error: respError } = await supabase.from("survey_responses").upsert(
      {
        user_id: user.id,
        survey_id: activeSurvey.id,
        screenshot_url: filePath,
        status: "pending"
      },
      { onConflict: "user_id,survey_id" }
    );

    if (respError) {
      toast({ title: "Submission failed", description: respError.message });
    } else {
      toast({ title: "Survey submitted", description: "Admin will review your proof." });
      setSurveyStep("done");
      setActiveSurvey(null);
      await fetchData();
    }
    setSurveyUploading(false);
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

  const surveyFileInput = (
    <input
      ref={surveyFileRef}
      type="file"
      accept="image/*"
      className="hidden"
      onChange={(e) => {
        const file = e.target.files?.[0];
        if (file) handleSurveyScreenshotUpload(file);
        e.target.value = "";
      }}
    />
  );

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

  const renderTasks = () => {
    // ═══ SEQUENTIAL INTERACTION MODE ═══
    if (step === "sequential" && currentInteraction) {
      const app = currentInteraction;

      if (app.category === "yes_no") {
        return (
          <GlassCard variant="glow" className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-foreground text-sm">Switch Offer</h3>
              <p className="text-[13px] text-muted-foreground">{pendingInteractions.length + 1} remaining</p>
            </div>
            <div className="flex items-center gap-3">
              {app.app_logo_url ? (
                <img src={app.app_logo_url} alt={app.app_name} className="w-10 h-10 rounded-lg object-cover" />
              ) : (
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-sm font-semibold text-primary">
                  {app.app_name.charAt(0)}
                </div>
              )}
              <p className="text-sm text-muted-foreground">
                Would you switch from <span className="font-semibold text-foreground">{app.app_name}</span> to an alternative?
              </p>
            </div>
            <div className="flex gap-3">
              <GlassButton variant="primary" onClick={() => handleSwitchYes(app)} className="flex-1 text-sm">
                Yes (+{app.points_switch_intent} pts)
              </GlassButton>
              <GlassButton variant="outline" onClick={() => handleSwitchNo(app)} className="flex-1 text-sm">
                No, thanks
              </GlassButton>
            </div>
            <p className="text-[13px] text-muted-foreground">
              After 30 days, complete switch for +{app.points_switch_complete} extra points
            </p>
          </GlassCard>
        );
      }

      if (app.category === "referral") {
        return (
          <GlassCard variant="glow" className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-foreground text-sm">Try This App</h3>
              <p className="text-[13px] text-muted-foreground">{pendingInteractions.length + 1} remaining</p>
            </div>
            <div className="flex items-center gap-3">
              {app.app_logo_url ? (
                <img src={app.app_logo_url} alt={app.app_name} className="w-10 h-10 rounded-lg object-cover" />
              ) : (
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-sm font-semibold text-primary">
                  {app.app_name.charAt(0)}
                </div>
              )}
              <p className="text-sm text-muted-foreground">
                {app.referral_message || `Would you like to try ${app.app_name}?`}
              </p>
            </div>
            <GlassButton variant="primary" onClick={() => handleReferralClick(app)} className="w-full text-sm">
              <ExternalLink className="inline w-3 h-3 mr-1" /> Try It Out (+{app.referral_points} pts after approval)
            </GlassButton>
            <GlassButton variant="outline" onClick={() => handleReferralDismiss(app)} className="w-full text-sm">
              No, thanks
            </GlassButton>
            <p className="text-[13px] text-muted-foreground">
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
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-foreground text-sm">Switch Offer</h3>
                <p className="text-[13px] text-muted-foreground">{pendingInteractions.length + 1} remaining</p>
              </div>
              <p className="text-sm text-muted-foreground">
                Since you use <span className="font-semibold text-foreground">{app.app_name}</span>, would you like to try <span className="font-semibold text-foreground">{switchApp.app_name}</span>?
              </p>
              {switchApp.referral_message && (
                <p className="text-[13px] text-muted-foreground">{switchApp.referral_message}</p>
              )}
              <GlassButton variant="primary" onClick={() => handleRobustSwitchOffer(app, switchApp)} className="w-full text-sm">
                <ExternalLink className="inline w-3 h-3 mr-1" /> Try {switchApp.app_name} (+{switchApp.referral_points} pts after approval)
              </GlassButton>
              <GlassButton variant="outline" onClick={() => { handleSwitchNo(app); }} className="w-full text-sm">
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

    // ═══ RESULTS VIEW (with tabs) ═══
    if (responses.length > 0 && unansweredApps.length === 0 && step !== "sequential") {
      const earnResponses = responses.filter(r => getResponseStatus(r, apps.find(a => a.id === r.app_id)) === "earn");
      const ongoingResponses = responses.filter(r => getResponseStatus(r, apps.find(a => a.id === r.app_id)) === "ongoing");
      const pastResponses = responses.filter(r => getResponseStatus(r, apps.find(a => a.id === r.app_id)) === "past");

      const currentList = earnTab === "earn" ? earnResponses : earnTab === "ongoing" ? ongoingResponses : pastResponses;

      return (
        <div className="space-y-3">
          <div className="flex gap-1 p-1 rounded-xl glass-strong">
            {([
              { id: "earn" as EarnTab, label: "Earn", icon: Zap, count: earnResponses.length },
              { id: "ongoing" as EarnTab, label: "Ongoing", icon: Clock, count: ongoingResponses.length },
              { id: "past" as EarnTab, label: "Past", icon: History, count: pastResponses.length },
            ]).map(tab => (
              <button
                key={tab.id}
                onClick={() => setEarnTab(tab.id)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[13px] font-semibold transition-all ${
                  earnTab === tab.id ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <tab.icon className="w-3.5 h-3.5" />
                {tab.label} ({tab.count})
              </button>
            ))}
          </div>

          <AnimatePresence mode="wait">
            <motion.div key={earnTab} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-2">
              {currentList.length === 0 && (
                <GlassCard className="text-center py-8">
                  <p className="text-muted-foreground text-[13px]">No {earnTab === "earn" ? "available" : earnTab} earnings</p>
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
                        <img src={app.app_logo_url} alt={app.app_name} className="w-10 h-10 rounded-xl object-cover" />
                      ) : (
                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-[13px] font-semibold text-primary">
                          {app.app_name.charAt(0)}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-foreground leading-tight">{app.app_name}</p>
                        {resp.points_awarded > 0 && (
                          <p className="text-[13px] text-primary font-semibold mt-0.5">+{resp.points_awarded} pts earned</p>
                        )}
                      </div>
                    </div>

                    {/* Yes/No or Robust: switch offer available */}
                    {(app.category === "yes_no" || app.category === "robust") && resp.has_app && resp.would_switch === null && (
                      <div className="mt-3 flex gap-2">
                        <GlassButton variant="primary" onClick={() => {
                          setCurrentInteraction(app);
                          setStep("sequential");
                        }} className="flex-1 text-[13px]">
                          View Switch Offer
                        </GlassButton>
                      </div>
                    )}

                    {/* Yes/No: waiting for switch */}
                    {(app.category === "yes_no" || app.category === "robust") && resp.would_switch === true && !resp.switch_completed && (
                      <div className="mt-3">
                        {canSwitch ? (
                          <GlassButton variant="primary" onClick={() => handleSwitchComplete(app)} className="w-full text-[13px]">
                            <ExternalLink className="inline w-3 h-3 mr-1" /> Switch Now (+{app.points_switch_complete} pts)
                          </GlassButton>
                        ) : (
                          <div className="flex items-center gap-2 text-[13px] text-muted-foreground">
                            <Clock className="w-3 h-3" />
                            <span>Switch available in {daysUntilSwitch} days</span>
                          </div>
                        )}
                      </div>
                    )}

                    {(app.category === "yes_no" || app.category === "robust") && resp.switch_completed && (
                      <p className="text-[13px] text-primary mt-2">✓ Switched</p>
                    )}

                    {/* Referral: offer to try */}
                    {app.category === "referral" && !resp.has_app && !resp.referral_clicked && (
                      <div className="mt-3">
                        <GlassButton variant="primary" onClick={() => {
                          setCurrentInteraction(app);
                          setStep("sequential");
                        }} className="w-full text-[13px]">
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
                          className="w-full text-[13px]"
                        >
                          <Upload className="inline w-3 h-3 mr-1" /> Upload Screenshot
                        </GlassButton>
                      </div>
                    )}

                    {app.category === "referral" && resp.referral_screenshot_url && !resp.referral_approved && (
                      <p className="text-[13px] text-muted-foreground mt-2">📋 Screenshot pending admin review</p>
                    )}

                    {app.category === "referral" && resp.referral_approved && (
                      <p className="text-[13px] text-primary mt-2">✓ Approved — {app.referral_points} pts awarded</p>
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
      <GlassCard className="text-center py-8">
        <Award className="w-6 h-6 text-primary mx-auto mb-2" />
        <p className="text-muted-foreground text-[13px]">No new apps to review. Check back later!</p>
      </GlassCard>
    );

    const questionText = unansweredApps.length === 1
      ? "Have you used this app before?"
      : "Which of these apps have you used before?";

    return (
      <GlassCard variant="strong">
        <div className="flex items-center gap-2 mb-3">
          <CheckSquare className="w-4 h-4 text-primary" />
          <h3 className="font-semibold text-foreground text-sm">{questionText}</h3>
        </div>
        <p className="text-[13px] text-muted-foreground mb-4">
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
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-[13px] font-semibold text-primary">
                  {app.app_name.charAt(0)}
                </div>
              )}
              <span className="text-sm font-medium text-foreground flex-1 text-left">{app.app_name}</span>
              <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${
                selectedApps.has(app.id) ? "bg-primary border-primary" : "border-muted-foreground/30"
              }`}>
                {selectedApps.has(app.id) && <span className="text-primary-foreground text-[13px]">✓</span>}
              </div>
            </button>
          ))}
        </div>

        <GlassButton
          variant="primary"
          className="w-full mt-4 text-sm"
          onClick={handleSubmitChecklist}
          disabled={submitting}
        >
          {submitting ? "Processing..." : "Submit & Earn Points"}
        </GlassButton>
      </GlassCard>
    );
  };

  const renderSurveys = () => {
    // ═══ SURVEY QUIZ VIEW ═══
    if (activeSurvey) {
      const question = activeSurvey.survey_questions[currentQuestionIndex];
      const options = question?.survey_options || [];

      return (
        <div className="space-y-4">
          <GlassCard variant="glow" className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-foreground text-sm">{activeSurvey.title}</h3>
              <button onClick={() => setActiveSurvey(null)} className="text-muted-foreground hover:text-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>

            <AnimatePresence mode="wait">
              {surveyStep === "quiz" && question && (
                <motion.div key={question.id} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-[13px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-bold">
                      Question {currentQuestionIndex + 1} of {activeSurvey.survey_questions.length}
                    </span>
                  </div>
                  <p className="text-[14px] font-medium text-foreground leading-relaxed">
                    {question.question_text}
                  </p>
                  <div className="space-y-2">
                    {options.map((opt: any) => (
                      <button
                        key={opt.id}
                        onClick={() => handleAnswerQuestion(opt)}
                        className="w-full text-left p-3 rounded-xl border border-border/40 hover:border-primary/40 hover:bg-primary/5 transition-all text-sm font-medium"
                      >
                        {opt.option_text}
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}

              {surveyStep === "completion" && (
                <motion.div key="completion" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="space-y-4 text-center py-4">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-2">
                    <CheckCircle2 className="w-6 h-6 text-primary" />
                  </div>
                  <h4 className="font-bold text-foreground">Quiz Completed!</h4>
                  <p className="text-[13px] text-muted-foreground">
                    Follow the instructions below to complete the survey and earn <span className="text-primary font-bold">{activeSurvey.points_reward} points</span>.
                  </p>

                  <div className="p-4 rounded-xl bg-muted/20 border border-border/40 text-left space-y-3">
                    <p className="text-[13px] font-medium text-foreground">
                      {activeSurvey.completion_instructions}
                    </p>
                    {activeSurvey.completion_link && (
                      <a href={activeSurvey.completion_link} target="_blank" rel="noopener noreferrer">
                        <GlassButton variant="primary" className="w-full text-[13px]">
                          <ExternalLink className="w-3.5 h-3.5 mr-2" /> Open Link
                        </GlassButton>
                      </a>
                    )}
                  </div>

                  <div className="pt-4 space-y-3">
                    <p className="text-[13px] text-muted-foreground">
                      Upload a screenshot as proof of completion
                    </p>
                    <GlassButton
                      variant="outline"
                      onClick={() => surveyFileRef.current?.click()}
                      disabled={surveyUploading}
                      className="w-full text-[13px]"
                    >
                      <Upload className="w-3.5 h-3.5 mr-2" />
                      {surveyUploading ? "Uploading..." : "Upload Screenshot"}
                    </GlassButton>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </GlassCard>
        </div>
      );
    }

    return (
      <div className="space-y-3">
        {surveys.length === 0 && (
          <GlassCard className="text-center py-8">
            <p className="text-muted-foreground text-[13px]">No active surveys available.</p>
          </GlassCard>
        )}

        {surveys
          .filter((survey) => {
            const response = getSurveyResponse(survey.id);

            if (!response) return true;
            if (response.status === "failed_quiz") return false;

            return true;
          })
          .map(survey => {
          const response = getSurveyResponse(survey.id);
          const isExpiredRestartable =
            response &&
            (response.status === "in_progress" || response.status === "rejected") &&
            isSurveyExpired(response);
          const isInProgress = response?.status === "in_progress" && !isSurveyExpired(response);
          const isPending = response?.status === "pending";
          const isApproved = response?.status === "approved";
          const isRejected = response?.status === "rejected" && !isSurveyExpired(response);
          const timeLeft = getTimeLeftLabel(response);

          return (
            <GlassCard key={survey.id} className="p-4 overflow-hidden relative">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <MessageSquare className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="text-sm font-bold text-foreground truncate leading-tight">{survey.title}</h4>
                    <p className="text-[13px] text-primary font-bold shrink-0">+{survey.points_reward} pts</p>
                  </div>
                  <p className="text-[13px] text-muted-foreground line-clamp-1 mt-0.5">{survey.description}</p>
                </div>
              </div>

              {!response && (
                <div className="mt-3">
                  <GlassButton variant="primary" onClick={() => handleStartSurvey(survey)} className="w-full text-[13px]">
                    Start Survey <ChevronRight className="w-3 h-3 ml-1" />
                  </GlassButton>
                </div>
              )}

              {isInProgress && (
                <div className="mt-3 space-y-2">
                  <div className="flex items-center gap-2 text-[13px] text-accent bg-accent/10 p-2 rounded-lg border border-accent/20">
                    <Clock className="w-3.5 h-3.5" />
                    <span>Quiz passed. {timeLeft} to upload proof.</span>
                  </div>
                  <GlassButton variant="outline" onClick={() => handleStartSurvey(survey)} className="w-full text-[13px]">
                    Continue Survey
                  </GlassButton>
                </div>
              )}

              {isExpiredRestartable && (
                <div className="mt-3 space-y-2">
                  <div className="flex items-center gap-2 text-[13px] text-destructive bg-destructive/10 p-2 rounded-lg border border-destructive/20">
                    <Clock className="w-3.5 h-3.5" />
                    <span>Your 20-day window expired. You can restart this survey.</span>
                  </div>
                  <GlassButton
                    variant="outline"
                    onClick={() => handleStartSurvey(survey)}
                    className="w-full text-[13px]"
                  >
                    Restart Survey
                  </GlassButton>
                </div>
              )}

              {isPending && (
                <div className="mt-3 flex items-center gap-2 text-[13px] text-accent bg-accent/10 p-2 rounded-lg border border-accent/20">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>Proof submitted. Pending review.</span>
                </div>
              )}

              {isApproved && (
                <div className="mt-3 flex items-center gap-2 text-[13px] text-primary bg-primary/10 p-2 rounded-lg border border-primary/20">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Completed. {survey.points_reward} pts awarded!</span>
                </div>
              )}

              {isRejected && (
                <div className="mt-3 space-y-2">
                  <div className="flex items-center gap-2 text-[13px] text-destructive bg-destructive/10 p-2 rounded-lg border border-destructive/20">
                    <X className="w-3.5 h-3.5" />
                    <span>Proof rejected. {timeLeft} to upload again.</span>
                  </div>
                  <GlassButton variant="outline" onClick={() => handleStartSurvey(survey)} className="w-full text-[13px]">
                    Upload Again
                  </GlassButton>
                </div>
              )}
            </GlassCard>
          );
        })}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {fileInput}
      {surveyFileInput}

      {/* Top Level View Tabs - hidden when mode prop is passed */}
      {!mode && (
        <div className="flex gap-1 p-1 rounded-xl glass-strong">
          <button
            onClick={() => setActiveEarnView("tasks")}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-[13px] font-bold transition-all ${
              activeEarnView === "tasks" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            Tasks
          </button>
          <button
            onClick={() => setActiveEarnView("surveys")}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-[13px] font-bold transition-all ${
              activeEarnView === "surveys" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            Surveys
          </button>
        </div>
      )}

      <AnimatePresence mode="wait">
        <motion.div
          key={activeEarnView}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
        >
          {activeEarnView === "tasks" ? renderTasks() : renderSurveys()}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export default DecisionFlow;
