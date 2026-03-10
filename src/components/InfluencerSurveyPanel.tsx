import { useEffect, useMemo, useRef, useState } from "react";
import { Upload, ChevronRight, CheckCircle2, Clock, AlertCircle, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { formatNaira } from "@/lib/formatNaira";
import GlassCard from "@/components/GlassCard";
import GlassButton from "@/components/GlassButton";

type SurveyOption = { id: string; option_text: string; is_correct: boolean };
type SurveyQuestion = { id: string; question_text: string; influencer_survey_options?: SurveyOption[] };
type InfluencerSurvey = {
  id: string;
  title: string;
  description: string | null;
  reward_amount: number;
  completion_link: string | null;
  completion_instructions: string | null;
  influencer_survey_questions?: SurveyQuestion[];
};
type InfluencerSurveyResponse = {
  survey_id: string;
  status: "in_progress" | "pending" | "approved" | "rejected" | "failed_quiz";
  completion_expires_at: string | null;
  reward_amount: number;
};

export default function InfluencerSurveyPanel({ compact = false }: { compact?: boolean }) {
  const { user } = useAuth();
  const { toast } = useToast();

  const [surveys, setSurveys] = useState<InfluencerSurvey[]>([]);
  const [responses, setResponses] = useState<InfluencerSurveyResponse[]>([]);
  const [activeSurvey, setActiveSurvey] = useState<InfluencerSurvey | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [surveyStep, setSurveyStep] = useState<"quiz" | "completion">("quiz");
  const [uploading, setUploading] = useState(false);

  const fileRef = useRef<HTMLInputElement>(null);

  const fetchData = async () => {
    if (!user) return;

    const [surveysRes, responsesRes] = await Promise.all([
      supabase
        .from("influencer_surveys" as any)
        .select("*, influencer_survey_questions(*, influencer_survey_options(*))")
        .eq("is_active", true)
        .order("created_at", { ascending: false }),
      supabase
        .from("influencer_survey_responses" as any)
        .select("*")
        .eq("user_id", user.id),
    ]);

    if (surveysRes.error) {
      console.error("influencer surveys fetch error", surveysRes.error);
      toast({ title: "Error", description: surveysRes.error.message, variant: "destructive" });
    }

    if (responsesRes.error) {
      console.error("influencer survey responses fetch error", responsesRes.error);
      toast({ title: "Error", description: responsesRes.error.message, variant: "destructive" });
    }

    setSurveys((surveysRes.data || []) as InfluencerSurvey[]);
    setResponses((responsesRes.data || []) as InfluencerSurveyResponse[]);
  };

  useEffect(() => {
    fetchData();
  }, [user]);

  const getResponse = (surveyId: string) => responses.find((r) => r.survey_id === surveyId);

  const isExpired = (response?: InfluencerSurveyResponse) => {
    if (!response?.completion_expires_at) return false;
    return new Date(response.completion_expires_at).getTime() < Date.now();
  };

  const getTimeLeftLabel = (response?: InfluencerSurveyResponse) => {
    if (!response?.completion_expires_at) return "";
    const ms = new Date(response.completion_expires_at).getTime() - Date.now();
    if (ms <= 0) return "Expired";
    const totalHours = Math.floor(ms / (1000 * 60 * 60));
    const days = Math.floor(totalHours / 24);
    const hours = totalHours % 24;
    return days > 0 ? `${days}d ${hours}h left` : `${hours}h left`;
  };

  const closeSurveyView = () => {
    setActiveSurvey(null);
    setCurrentQuestionIndex(0);
    setSurveyStep("quiz");
  };

  const handleStartSurvey = async (survey: InfluencerSurvey) => {
    if (!user) return;
    const response = getResponse(survey.id);

    if (response?.status === "failed_quiz") return;

    if (response && (response.status === "in_progress" || response.status === "rejected") && !isExpired(response)) {
      setActiveSurvey(survey);
      setSurveyStep("completion");
      return;
    }

    if (response && (response.status === "in_progress" || response.status === "rejected") && isExpired(response)) {
      const { error } = await supabase
        .from("influencer_survey_responses" as any)
        .delete()
        .eq("user_id", user.id)
        .eq("survey_id", survey.id)
        .in("status", ["in_progress", "rejected"]);

      if (error) {
        console.error("expired survey reset error", error);
        toast({ title: "Error", description: error.message, variant: "destructive" });
        return;
      }

      toast({ title: "Survey restarted", description: "Your 20-day window expired, so this survey is starting over." });
      await fetchData();
    }

    setActiveSurvey(survey);
    setCurrentQuestionIndex(0);
    setSurveyStep("quiz");
  };

  const handleAnswerQuestion = async (option: SurveyOption) => {
    if (!user || !activeSurvey) return;

    const questions = activeSurvey.influencer_survey_questions || [];

    if (!option.is_correct) {
      const { error } = await supabase
        .from("influencer_survey_responses" as any)
        .upsert(
          {
            user_id: user.id,
            survey_id: activeSurvey.id,
            status: "failed_quiz",
            screenshot_url: null,
            reward_amount: activeSurvey.reward_amount,
          },
          { onConflict: "user_id,survey_id" }
        );

      if (error) {
        console.error("failed quiz upsert error", error);
        toast({ title: "Error", description: error.message, variant: "destructive" });
        return;
      }

      toast({
        title: "Oops! Nothing to see here",
        description: "This survey has been closed for your account.",
        variant: "destructive",
      });

      closeSurveyView();
      await fetchData();
      return;
    }

    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex((prev) => prev + 1);
      return;
    }

    const now = new Date();
    const expiresAt = new Date(now);
    expiresAt.setDate(expiresAt.getDate() + 20);

    const { error } = await supabase
      .from("influencer_survey_responses" as any)
      .upsert(
        {
          user_id: user.id,
          survey_id: activeSurvey.id,
          status: "in_progress",
          reward_amount: activeSurvey.reward_amount,
          quiz_completed_at: now.toISOString(),
          completion_expires_at: expiresAt.toISOString(),
        },
        { onConflict: "user_id,survey_id" }
      );

    if (error) {
      console.error("quiz pass upsert error", error);
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }

    toast({ title: "Quiz passed", description: "You have 20 days to finish the survey and upload proof." });
    setSurveyStep("completion");
    await fetchData();
  };

  const handleUpload = async (file: File) => {
    if (!user || !activeSurvey) return;

    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `${user.id}/${activeSurvey.id}-${Date.now()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("influencer_survey_screenshots")
      .upload(path, file, { upsert: true });

    if (uploadError) {
      console.error("screenshot upload error", uploadError);
      setUploading(false);
      toast({ title: "Upload failed", description: uploadError.message, variant: "destructive" });
      return;
    }

    const { error } = await supabase
      .from("influencer_survey_responses" as any)
      .upsert(
        {
          user_id: user.id,
          survey_id: activeSurvey.id,
          screenshot_url: path,
          status: "pending",
          reward_amount: activeSurvey.reward_amount,
        },
        { onConflict: "user_id,survey_id" }
      );

    setUploading(false);

    if (error) {
      console.error("response pending upsert error", error);
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }

    toast({ title: "Submitted", description: "Your proof has been submitted for review." });
    closeSurveyView();
    await fetchData();
  };

  const visibleSurveys = useMemo(
    () => surveys.filter((survey) => getResponse(survey.id)?.status !== "failed_quiz"),
    [surveys, responses]
  );

  if (activeSurvey) {
    const questions = activeSurvey.influencer_survey_questions || [];
    const question = questions[currentQuestionIndex];

    return (
      <div className="space-y-4">
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleUpload(file);
            e.target.value = "";
          }}
        />

        <GlassCard className="p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold">{activeSurvey.title}</h3>
              <p className="text-sm text-muted-foreground">Earn {formatNaira(Number(activeSurvey.reward_amount))}</p>
            </div>
            <button type="button" className="text-muted-foreground hover:text-foreground" onClick={closeSurveyView}>
              <X className="w-4 h-4" />
            </button>
          </div>

          {surveyStep === "quiz" && question && (
            <div className="space-y-4">
              <div className="text-xs text-muted-foreground">Question {currentQuestionIndex + 1} of {questions.length}</div>
              <div className="font-medium">{question.question_text}</div>
              <div className="space-y-2">
                {(question.influencer_survey_options || []).map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    className="w-full rounded-xl border px-4 py-3 text-left transition hover:bg-accent/30"
                    onClick={() => handleAnswerQuestion(option)}
                  >
                    {option.option_text}
                  </button>
                ))}
              </div>
            </div>
          )}

          {surveyStep === "completion" && (
            <div className="space-y-4">
              <div className="rounded-xl border p-3 bg-accent/10">
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="w-4 h-4" />
                  <span>Upload proof to complete this survey.</span>
                </div>
              </div>

              {activeSurvey.completion_link && (
                <a href={activeSurvey.completion_link} target="_blank" rel="noreferrer" className="block text-sm underline">
                  Open survey link
                </a>
              )}

              {activeSurvey.completion_instructions && (
                <p className="text-sm text-muted-foreground">{activeSurvey.completion_instructions}</p>
              )}

              <GlassButton type="button" onClick={() => fileRef.current?.click()} disabled={uploading} className="w-full">
                <Upload className="w-4 h-4 mr-2" />
                {uploading ? "Uploading..." : "Upload Screenshot"}
              </GlassButton>
            </div>
          )}
        </GlassCard>
      </div>
    );
  }

  const surveysToRender = compact ? visibleSurveys.slice(0, 1) : visibleSurveys;

  return (
    <div className="space-y-4">
      {visibleSurveys.length === 0 ? (
        <GlassCard className="p-4">
          <p className="text-sm text-muted-foreground">No influencer surveys available right now.</p>
        </GlassCard>
      ) : (
        surveysToRender.map((survey) => {
          const response = getResponse(survey.id);
          const expired = response && (response.status === "in_progress" || response.status === "rejected") && isExpired(response);
          const timeLeft = response ? getTimeLeftLabel(response) : "";

          return (
            <GlassCard key={survey.id} className="p-4 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h4 className="font-semibold">{survey.title}</h4>
                  {survey.description ? <p className="text-sm text-muted-foreground">{survey.description}</p> : null}
                </div>
                <div className="font-bold text-primary whitespace-nowrap">{formatNaira(Number(survey.reward_amount))}</div>
              </div>

              {!response && (
                <GlassButton className="w-full" onClick={() => handleStartSurvey(survey)}>
                  Complete survey to earn {formatNaira(Number(survey.reward_amount))}
                  <ChevronRight className="w-4 h-4 ml-1" />
                </GlassButton>
              )}

              {response?.status === "in_progress" && !expired && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm rounded-xl border p-3 bg-accent/10">
                    <Clock className="w-4 h-4" />
                    <span>Quiz passed. {timeLeft} to upload proof.</span>
                  </div>
                  <GlassButton className="w-full" onClick={() => handleStartSurvey(survey)}>Continue survey</GlassButton>
                </div>
              )}

              {response?.status === "pending" && (
                <div className="flex items-center gap-2 text-sm rounded-xl border p-3 bg-accent/10">
                  <AlertCircle className="w-4 h-4" />
                  <span>Proof submitted. Pending review.</span>
                </div>
              )}

              {response?.status === "approved" && (
                <div className="flex items-center gap-2 text-sm rounded-xl border p-3 bg-primary/10">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Earned {formatNaira(Number(response.reward_amount))}</span>
                </div>
              )}

              {response?.status === "rejected" && !expired && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm rounded-xl border p-3 bg-destructive/10">
                    <X className="w-4 h-4" />
                    <span>Proof rejected. {timeLeft} to upload again.</span>
                  </div>
                  <GlassButton className="w-full" onClick={() => handleStartSurvey(survey)}>Upload proof again</GlassButton>
                </div>
              )}

              {expired && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm rounded-xl border p-3 bg-destructive/10">
                    <Clock className="w-4 h-4" />
                    <span>Your 20-day window expired. You can restart this survey.</span>
                  </div>
                  <GlassButton className="w-full" onClick={() => handleStartSurvey(survey)}>Restart survey</GlassButton>
                </div>
              )}
            </GlassCard>
          );
        })
      )}
    </div>
  );
}
