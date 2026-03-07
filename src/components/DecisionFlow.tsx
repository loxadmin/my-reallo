import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import GlassCard from "./GlassCard";
import GlassButton from "./GlassButton";
import { Award, CheckSquare, ExternalLink, Clock, Upload, X, History, Zap, MessageSquare, ChevronRight, CheckCircle2 } from "lucide-react";
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

interface Survey {
  id: string; title: string; description: string | null; points_reward: number;
  completion_link: string | null; is_active: boolean;
}

interface SurveyQuestion {
  id: string; survey_id: string; question_text: string; options: string[];
  correct_answer: string; order_index: number;
}

interface SurveyResponse {
  id: string; user_id: string; survey_id: string; status: string;
  screenshot_url: string | null; points_awarded: number; created_at: string;
}

const fromApps = () => supabase.from("decision_apps" as any);
const fromDResponses = () => supabase.from("decision_responses" as any);
const fromSurveys = () => supabase.from("surveys" as any);
const fromQuestions = () => supabase.from("survey_questions" as any);
const fromSResponses = () => supabase.from("survey_responses" as any);

type EarnTab = "tasks" | "surveys" | "ongoing" | "past";
type FlowStep = "checklist" | "sequential" | "survey_quiz" | "done";

const DecisionFlow = () => {
  const { user, refreshProfile } = useAuth();
  const [apps, setApps] = useState<DecisionApp[]>([]);
  const [responses, setResponses] = useState<DecisionResponse[]>([]);
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [surveyQuestions, setSurveyQuestions] = useState<SurveyQuestion[]>([]);
  const [surveyResponses, setSurveyResponses] = useState<SurveyResponse[]>([]);
  const [selectedApps, setSelectedApps] = useState<Set<string>>(new Set());
  const [step, setStep] = useState<FlowStep>("checklist");
  const [submitting, setSubmitting] = useState(false);
  const [earnTab, setEarnTab] = useState<EarnTab>("tasks");
  const [uploadingFor, setUploadingFor] = useState<{ type: "decision" | "survey"; id: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Sequential interaction state
  const [pendingInteractions, setPendingInteractions] = useState<DecisionApp[]>([]);
  const [currentInteraction, setCurrentInteraction] = useState<DecisionApp | null>(null);

  // Survey quiz state
  const [activeSurvey, setActiveSurvey] = useState<Survey | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);

  const unansweredApps = apps.filter(app => !responses.some(r => r.app_id === app.id));

  useEffect(() => {
    if (user) fetchData();
  }, [user]);

  const fetchData = async () => {
    if (!user) return;
    const [appsRes, respRes, sRes, qRes, srRes] = await Promise.all([
      fromApps().select("*").eq("is_active", true).order("app_name"),
      fromDResponses().select("*").eq("user_id", user.id),
      fromSurveys().select("*").eq("is_active", true).order("created_at", { ascending: false }),
      fromQuestions().select("*").order("order_index", { ascending: true }),
      fromSResponses().select("*").eq("user_id", user.id),
    ]);
    const allApps = (appsRes.data || []) as unknown as DecisionApp[];
    setApps(allApps);
    const resps = (respRes.data || []) as unknown as DecisionResponse[];
    setResponses(resps);
    setSurveys((sRes.data || []) as Survey[]);
    setSurveyQuestions((qRes.data || []) as SurveyQuestion[]);
    setSurveyResponses((srRes.data || []) as SurveyResponse[]);
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
          await fromDResponses().insert({
            user_id: user.id, app_id: app.id, has_app: true,
            would_switch: null, points_awarded: app.points_select,
          });
          await supabase.rpc("recalculate_user_points", { target_user_id: user.id });
          interactionsNeeded.push(app);
        } else {
          // Doesn't have app -> no points, done
          await fromDResponses().insert({
            user_id: user.id, app_id: app.id, has_app: false, points_awarded: 0,
          });
        }
      } else if (app.category === "referral") {
        if (hasApp) {
          // User already has referral app -> done, no points
          await fromDResponses().insert({
            user_id: user.id, app_id: app.id, has_app: true, points_awarded: 0,
          });
        } else {
          // Doesn't have it -> queue referral offer interaction
          await fromDResponses().insert({
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
          await fromDResponses().insert({
            user_id: user.id, app_id: app.id, has_app: true,
            would_switch: null, points_awarded: app.points_select,
          });
          await supabase.rpc("recalculate_user_points", { target_user_id: user.id });
          
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
          await fromDResponses().insert({
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

    const { data: resp } = await fromDResponses()
      .select("*").eq("user_id", user.id).eq("app_id", app.id).single();

    if (resp) {
      const r = resp as any;
      const newPoints = r.points_awarded + app.points_switch_intent;
      await fromDResponses().update({
        would_switch: true, switch_available_at: switchDate.toISOString(), points_awarded: newPoints,
      }).eq("id", r.id);

      await supabase.rpc("recalculate_user_points", { target_user_id: user.id });
    }

    toast({ title: `+${app.points_switch_intent} points!`, description: `Switch button unlocks in 30 days for +${app.points_switch_complete} more points.` });
    await fetchData();
    await refreshProfile();
    advanceInteraction();
  };

  const handleSwitchNo = async (app: DecisionApp) => {
    if (!user) return;
    await fromDResponses().update({ would_switch: false })
      .eq("user_id", user.id).eq("app_id", app.id);
    await fetchData();
    advanceInteraction();
  };

  const handleReferralClick = async (app: DecisionApp) => {
    if (!user || !app.referral_link) return;
    await fromDResponses().update({ referral_clicked: true })
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
    await fromDResponses().update({ would_switch: true })
      .eq("user_id", user.id).eq("app_id", app.id);
    
    // Also trigger referral click for the linked app
    const { data: refResp } = await fromDResponses()
      .select("*").eq("user_id", user.id).eq("app_id", referralApp.id).single();
    if (refResp) {
      await fromDResponses().update({ referral_clicked: true })
        .eq("id", (refResp as any).id);
    }
    if (referralApp.referral_link) {
      window.open(referralApp.referral_link, "_blank");
    }
    toast({ title: "Action recorded", description: "Submit a screenshot for admin approval to earn points." });
    await fetchData();
    advanceInteraction();
  };

  const handleScreenshotUpload = async (type: "decision" | "survey", id: string, file: File) => {
    if (!user) return;

    const fileExt = file.name.split(".").pop();
    const filePath = `${user.id}/${type}-${id}-${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from("referral_screenshots")
      .upload(filePath, file);

    if (uploadError) {
      toast({ title: "Upload failed", description: uploadError.message });
      return;
    }

    if (type === "decision") {
      await fromDResponses().update({
        referral_screenshot_url: filePath,
      }).eq("user_id", user.id).eq("app_id", id);
    } else {
      await fromSResponses().update({
        screenshot_url: filePath,
        status: "screenshot_uploaded",
      }).eq("user_id", user.id).eq("survey_id", id);
    }

    toast({ title: "Screenshot submitted", description: "Admin will review and approve your points." });
    setUploadingFor(null);
    await fetchData();
  };

  const handleSwitchComplete = async (app: DecisionApp) => {
    if (!user || !app.switch_link) return;
    window.open(app.switch_link, "_blank");

    const { data: resp } = await fromDResponses()
      .select("*").eq("user_id", user.id).eq("app_id", app.id).single();

    if (resp) {
      const r = resp as any;
      const newPoints = r.points_awarded + app.points_switch_complete;
      await fromDResponses().update({
        switch_completed: true, points_awarded: newPoints,
      }).eq("id", r.id);

      await supabase.rpc("recalculate_user_points", { target_user_id: user.id });
    }

    toast({ title: `+${app.points_switch_complete} points!`, description: "Switch completed!" });
    await fetchData();
    await refreshProfile();
  };

  const handleStartSurvey = async (survey: Survey) => {
    if (!user) return;
    // Check if user already has a response
    let response = surveyResponses.find(r => r.survey_id === survey.id);
    if (!response) {
      const { data } = await fromSResponses().insert({
        user_id: user.id,
        survey_id: survey.id,
        status: "started",
      }).select().single();
      if (data) {
        response = data as unknown as SurveyResponse;
        await fetchData();
      }
    }

    if (response?.status === "approved") {
      toast({ title: "Already completed", description: "You've already earned points for this survey." });
      return;
    }

    setActiveSurvey(survey);
    setCurrentQuestionIndex(0);
    setStep("survey_quiz");
  };

  const handleSurveyAnswer = async (answer: string) => {
    if (!activeSurvey) return;
    const questions = surveyQuestions.filter(q => q.survey_id === activeSurvey.id);
    const currentQuestion = questions[currentQuestionIndex];

    if (answer === currentQuestion.correct_answer) {
      if (currentQuestionIndex < questions.length - 1) {
        setCurrentQuestionIndex(prev => prev + 1);
      } else {
        // All correct!
        await fromSResponses().update({
          status: "answered_correctly",
        }).eq("user_id", user!.id).eq("survey_id", activeSurvey.id);

        toast({ title: "Correct!", description: "You answered all questions correctly." });
        if (activeSurvey.completion_link) {
          window.open(activeSurvey.completion_link, "_blank");
        }
        await fetchData();
        setActiveSurvey(null);
        setStep("done");
        setEarnTab("ongoing");
      }
    } else {
      toast({ title: "Incorrect Answer", description: "Please try again.", variant: "destructive" });
      // Don't advance, let them try again as per the requirements
    }
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
          handleScreenshotUpload(uploadingFor.type, uploadingFor.id, file);
        }
        e.target.value = "";
      }}
    />
  );

  // ═══ SURVEY QUIZ MODE ═══
  if (step === "survey_quiz" && activeSurvey) {
    const questions = surveyQuestions.filter(q => q.survey_id === activeSurvey.id);
    const question = questions[currentQuestionIndex];

    return (
      <GlassCard variant="glow" className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-foreground text-[13px]">{activeSurvey.title}</h3>
          <p className="text-[10px] text-muted-foreground">Question {currentQuestionIndex + 1} of {questions.length}</p>
        </div>
        <p className="text-[14px] font-medium text-foreground">{question.question_text}</p>
        <div className="space-y-2">
          {question.options.map((opt, i) => (
            <button
              key={i}
              onClick={() => handleSurveyAnswer(opt)}
              className="w-full glass rounded-xl p-3 text-left text-[13px] hover:border-primary/50 transition-colors"
            >
              {opt}
            </button>
          ))}
        </div>
        <GlassButton variant="outline" onClick={() => { setActiveSurvey(null); setStep("done"); }} className="w-full text-[12px]">
          Cancel
        </GlassButton>
      </GlassCard>
    );
  }

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
  const getDecisionStatus = (resp: DecisionResponse, app: DecisionApp | undefined): EarnTab | "available" => {
    if (!app) return "past";
    if (app.category === "yes_no" || app.category === "robust") {
      if (resp.switch_completed) return "past";
      if (resp.would_switch === false) return "past";
      if (resp.has_app && resp.would_switch === null) return "available"; // available to interact
      if (resp.would_switch === true && !resp.switch_completed) return "ongoing"; // waiting 30 days
      return "past";
    }
    if (app.category === "referral") {
      if (resp.has_app) return "past";
      if (resp.referral_approved) return "past";
      if (resp.referral_screenshot_url) return "ongoing";
      return "available";
    }
    return "past";
  };

  const getSurveyStatus = (resp: SurveyResponse): EarnTab | "available" => {
    if (resp.status === "approved") return "past";
    if (resp.status === "screenshot_uploaded" || resp.status === "answered_correctly") return "ongoing";
    return "available";
  };

  // ═══ RESULTS VIEW (with tabs) ═══
  const earnDecisions = responses.filter(r => getDecisionStatus(r, apps.find(a => a.id === r.app_id)) === "available");
  const ongoingDecisions = responses.filter(r => getDecisionStatus(r, apps.find(a => a.id === r.app_id)) === "ongoing");
  const pastDecisions = responses.filter(r => getDecisionStatus(r, apps.find(a => a.id === r.app_id)) === "past");

  const availableSurveys = surveys.filter(s => {
    const resp = surveyResponses.find(r => r.survey_id === s.id);
    return !resp || getSurveyStatus(resp) === "available";
  });
  const ongoingSurveys = surveyResponses.filter(r => getSurveyStatus(r) === "ongoing");
  const pastSurveys = surveyResponses.filter(r => getSurveyStatus(r) === "past");

  const totalOngoingCount = ongoingDecisions.length + ongoingSurveys.length;
  const totalPastCount = pastDecisions.length + pastSurveys.length;

  if (step !== "sequential" && step !== "survey_quiz") {
    return (
      <div className="space-y-4">
        {fileInput}
        <div className="flex gap-1 p-1 rounded-xl glass overflow-x-auto no-scrollbar">
          {([
            { id: "tasks" as EarnTab, label: "Tasks", icon: Zap, count: unansweredApps.length + earnDecisions.length },
            { id: "surveys" as EarnTab, label: "Surveys", icon: MessageSquare, count: availableSurveys.length },
            { id: "ongoing" as EarnTab, label: "Ongoing", icon: Clock, count: totalOngoingCount },
            { id: "past" as EarnTab, label: "Past", icon: History, count: totalPastCount },
          ]).map(tab => (
            <button
              key={tab.id}
              onClick={() => setEarnTab(tab.id)}
              className={`flex-shrink-0 flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-[12px] font-medium transition-all ${
                earnTab === tab.id ? "clay-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <tab.icon className="w-3.5 h-3.5" />
              {tab.label} ({tab.count})
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div key={earnTab} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-3">
            {/* ═══ TASKS TAB ═══ */}
            {earnTab === "tasks" && (
              <>
                {unansweredApps.length > 0 && (
                  <GlassCard variant="strong">
                    <div className="flex items-center gap-2 mb-3">
                      <CheckSquare className="w-4 h-4 text-primary" />
                      <h3 className="font-semibold text-foreground text-[13px]">
                        {unansweredApps.length === 1 ? "Have you used this app?" : "Which apps have you used?"}
                      </h3>
                    </div>
                    <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                      {unansweredApps.map((app) => (
                        <button
                          key={app.id}
                          onClick={() => toggleApp(app.id)}
                          className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${
                            selectedApps.has(app.id) ? "bg-primary/10 border border-primary/30" : "glass border border-transparent"
                          }`}
                        >
                          <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center ${selectedApps.has(app.id) ? "bg-primary border-primary" : "border-muted-foreground/30"}`}>
                            {selectedApps.has(app.id) && <span className="text-primary-foreground text-[10px]">✓</span>}
                          </div>
                          <span className="text-[13px] font-medium text-foreground">{app.app_name}</span>
                        </button>
                      ))}
                    </div>
                    <GlassButton variant="primary" className="w-full mt-4 text-[13px]" onClick={handleSubmitChecklist} disabled={submitting}>
                      {submitting ? "Processing..." : "Submit & Earn Points"}
                    </GlassButton>
                  </GlassCard>
                )}
                {earnDecisions.map((resp) => {
                  const app = apps.find(a => a.id === resp.app_id);
                  if (!app) return null;
                  return (
                    <GlassCard key={resp.id} className="p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-[11px] font-semibold text-primary">{app.app_name.charAt(0)}</div>
                        <p className="text-[13px] font-semibold text-foreground">{app.app_name}</p>
                      </div>
                      <GlassButton variant="primary" onClick={() => { setCurrentInteraction(app); setStep("sequential"); }} className="px-3 py-1.5 text-[11px]">View Offer</GlassButton>
                    </GlassCard>
                  );
                })}
                {unansweredApps.length === 0 && earnDecisions.length === 0 && (
                  <GlassCard className="text-center py-8"><p className="text-muted-foreground text-[12px]">No new tasks available.</p></GlassCard>
                )}
              </>
            )}

            {/* ═══ SURVEYS TAB ═══ */}
            {earnTab === "surveys" && (
              <>
                {availableSurveys.map(s => (
                  <GlassCard key={s.id} variant="strong" className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-semibold text-foreground text-[14px]">{s.title}</h4>
                        <p className="text-[11px] text-muted-foreground mt-1">Earn {s.points_reward.toLocaleString()} points</p>
                      </div>
                      <GlassButton variant="primary" onClick={() => handleStartSurvey(s)} className="px-4 py-2 text-[12px]">Start</GlassButton>
                    </div>
                  </GlassCard>
                ))}
                {availableSurveys.length === 0 && (
                  <GlassCard className="text-center py-8"><p className="text-muted-foreground text-[12px]">No available surveys.</p></GlassCard>
                )}
              </>
            )}

            {/* ═══ ONGOING TAB ═══ */}
            {earnTab === "ongoing" && (
              <>
                {ongoingDecisions.map(resp => {
                  const app = apps.find(a => a.id === resp.app_id);
                  if (!app) return null;
                  const now = new Date();
                  const switchAvailable = resp.switch_available_at ? new Date(resp.switch_available_at) : null;
                  const canSwitch = switchAvailable && now >= switchAvailable && !resp.switch_completed;
                  const daysLeft = switchAvailable && now < switchAvailable ? Math.ceil((switchAvailable.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : 0;

                  return (
                    <GlassCard key={resp.id} className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-[13px] font-semibold text-foreground">{app.app_name}</p>
                        {resp.referral_screenshot_url && !resp.referral_approved ? (
                          <span className="text-[10px] text-primary flex items-center gap-1"><Clock className="w-2.5 h-2.5" /> Pending Review</span>
                        ) : null}
                      </div>
                      {app.category === "referral" && resp.referral_clicked && !resp.referral_screenshot_url && (
                        <GlassButton variant="outline" onClick={() => { setUploadingFor({ type: "decision", id: resp.app_id }); fileInputRef.current?.click(); }} className="w-full text-[12px]"><Upload className="w-3 h-3 mr-1" /> Upload Screenshot</GlassButton>
                      )}
                      {(app.category === "yes_no" || app.category === "robust") && resp.would_switch === true && (
                        canSwitch ? <GlassButton variant="primary" onClick={() => handleSwitchComplete(app)} className="w-full text-[12px]"><ExternalLink className="w-3 h-3 mr-1" /> Switch Now (+{app.points_switch_complete} pts)</GlassButton>
                        : <div className="flex items-center gap-2 text-[11px] text-muted-foreground"><Clock className="w-3 h-3" /> <span>Switch available in {daysLeft} days</span></div>
                      )}
                    </GlassCard>
                  );
                })}
                {ongoingSurveys.map(resp => {
                  const s = surveys.find(surv => surv.id === resp.survey_id);
                  if (!s) return null;
                  return (
                    <GlassCard key={resp.id} className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-[13px] font-semibold text-foreground">{s.title}</p>
                        {resp.status === "screenshot_uploaded" ? (
                          <span className="text-[10px] text-primary flex items-center gap-1"><Clock className="w-2.5 h-2.5" /> Pending Review</span>
                        ) : null}
                      </div>
                      {resp.status === "answered_correctly" && (
                        <div className="space-y-3">
                          <p className="text-[11px] text-muted-foreground">You've answered correctly! Complete the action and upload a screenshot.</p>
                          {s.completion_link && (
                            <GlassButton variant="primary" onClick={() => window.open(s.completion_link!, "_blank")} className="w-full text-[12px]"><ExternalLink className="w-3 h-3 mr-1" /> Open Link</GlassButton>
                          )}
                          <GlassButton variant="outline" onClick={() => { setUploadingFor({ type: "survey", id: s.id }); fileInputRef.current?.click(); }} className="w-full text-[12px]"><Upload className="w-3 h-3 mr-1" /> Upload Screenshot</GlassButton>
                        </div>
                      )}
                    </GlassCard>
                  );
                })}
                {totalOngoingCount === 0 && (
                  <GlassCard className="text-center py-8"><p className="text-muted-foreground text-[12px]">No ongoing tasks.</p></GlassCard>
                )}
              </>
            )}

            {/* ═══ PAST TAB ═══ */}
            {earnTab === "past" && (
              <>
                {pastDecisions.map(resp => {
                  const app = apps.find(a => a.id === resp.app_id);
                  if (!app) return null;
                  return (
                    <GlassCard key={resp.id} className="p-4 flex items-center justify-between opacity-80">
                      <div className="flex items-center gap-3">
                        <CheckCircle2 className="w-4 h-4 text-primary" />
                        <p className="text-[13px] font-medium text-foreground">{app.app_name}</p>
                      </div>
                      <p className="text-[12px] text-primary font-semibold">+{resp.points_awarded} pts</p>
                    </GlassCard>
                  );
                })}
                {pastSurveys.map(resp => {
                  const s = surveys.find(surv => surv.id === resp.survey_id);
                  if (!s) return null;
                  return (
                    <GlassCard key={resp.id} className="p-4 flex items-center justify-between opacity-80">
                      <div className="flex items-center gap-3">
                        <CheckCircle2 className="w-4 h-4 text-primary" />
                        <p className="text-[13px] font-medium text-foreground">{s.title}</p>
                      </div>
                      <p className="text-[12px] text-primary font-semibold">+{resp.points_awarded} pts</p>
                    </GlassCard>
                  );
                })}
                {totalPastCount === 0 && (
                  <GlassCard className="text-center py-8"><p className="text-muted-foreground text-[12px]">No history yet.</p></GlassCard>
                )}
              </>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    );
  }

  // ═══ CHECKLIST VIEW ═══
  if (unansweredApps.length === 0) return (
    <GlassCard className="text-center py-8">
      <Award className="w-6 h-6 text-primary mx-auto mb-2" />
      <p className="text-muted-foreground text-[12px]">No new apps to review. Check back later!</p>
    </GlassCard>
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
    </div>
  );
};

export default DecisionFlow;
