import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import GlassCard from "./GlassCard";
import GlassButton from "./GlassButton";
import { MessageSquare, ChevronRight, Clock, ExternalLink, Award } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface Questionnaire {
  id: string;
  title: string;
  points_reward: number;
  current_bank_question: string;
  switch_question_template: string;
  preferred_bank: string;
  switch_timer_days: number;
  switch_enabled: boolean;
  switch_link: string;
  why_switch_options: string[];
}

interface Response {
  id: string;
  questionnaire_id: string;
  would_switch: boolean;
  switch_timer_start: string | null;
  switch_completed: boolean;
  points_awarded: number;
  completed_at: string;
}

const QuestionnaireFlow = () => {
  const { user, refreshProfile } = useAuth();
  const [questionnaires, setQuestionnaires] = useState<Questionnaire[]>([]);
  const [responses, setResponses] = useState<Response[]>([]);
  const [activeQ, setActiveQ] = useState<Questionnaire | null>(null);
  const [step, setStep] = useState<"bank" | "switch" | "why" | "done">("bank");
  const [currentBank, setCurrentBank] = useState("");
  const [selectedReason, setSelectedReason] = useState("");
  const [freeText, setFreeText] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchData();
  }, [user]);

  const fetchData = async () => {
    if (!user) return;
    const [qRes, rRes] = await Promise.all([
      supabase.from("questionnaires").select("*").eq("is_active", true),
      supabase.from("questionnaire_responses").select("*").eq("user_id", user.id),
    ]);
    setQuestionnaires((qRes.data || []) as Questionnaire[]);
    setResponses((rRes.data || []) as Response[]);
  };

  const getResponse = (qId: string) => responses.find((r) => r.questionnaire_id === qId);

  const handleStart = (q: Questionnaire) => {
    setActiveQ(q);
    setStep("bank");
    setCurrentBank("");
    setSelectedReason("");
    setFreeText("");
  };

  const handleBankSubmit = () => {
    if (!currentBank.trim()) return;
    setStep("switch");
  };

  const handleSwitchNo = async () => {
    if (!activeQ || !user) return;
    setLoading(true);
    await supabase.from("questionnaire_responses").insert({
      user_id: user.id,
      questionnaire_id: activeQ.id,
      current_bank: currentBank,
      would_switch: false,
      points_awarded: 0,
    });
    toast({ title: "Questionnaire closed", description: "No points awarded." });
    setActiveQ(null);
    setStep("bank");
    await fetchData();
    setLoading(false);
  };

  const handleSwitchYes = () => {
    setStep("why");
  };

  const handleWhySubmit = async () => {
    if (!activeQ || !user) return;
    const reason = selectedReason === "__freetext__" ? freeText : selectedReason;
    if (!reason.trim()) return;
    setLoading(true);

    await supabase.from("questionnaire_responses").insert({
      user_id: user.id,
      questionnaire_id: activeQ.id,
      current_bank: currentBank,
      would_switch: true,
      switch_reason: selectedReason === "__freetext__" ? null : selectedReason,
      switch_reason_freetext: selectedReason === "__freetext__" ? freeText : null,
      points_awarded: activeQ.points_reward,
      switch_timer_start: new Date().toISOString(),
    });

    // Award points
    await supabase.rpc("generate_referral_code"); // just to use rpc pattern
    const { data: profile } = await supabase.from("profiles").select("points_balance").eq("id", user.id).single();
    const newBalance = (profile?.points_balance || 0) + activeQ.points_reward;
    await supabase.from("profiles").update({ points_balance: newBalance }).eq("id", user.id);

    toast({
      title: "Questionnaire completed!",
      description: `You earned ${activeQ.points_reward} points!`,
    });
    setActiveQ(null);
    setStep("bank");
    await fetchData();
    await refreshProfile();
    setLoading(false);
  };

  const getSwitchTimerRemaining = (response: Response, q: Questionnaire) => {
    if (!response.switch_timer_start) return null;
    const start = new Date(response.switch_timer_start).getTime();
    const end = start + q.switch_timer_days * 24 * 60 * 60 * 1000;
    const now = Date.now();
    if (now >= end) return 0;
    return Math.ceil((end - now) / (1000 * 60 * 60 * 24));
  };

  if (!user) return null;

  // If actively doing a questionnaire
  if (activeQ) {
    const switchQ = activeQ.switch_question_template
      .replace("{current_bank}", currentBank)
      .replace("{preferred_bank}", activeQ.preferred_bank);

    return (
      <GlassCard variant="glow" className="space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <MessageSquare className="w-5 h-5 text-primary" />
          <h3 className="font-display font-semibold text-foreground">{activeQ.title}</h3>
        </div>

        <AnimatePresence mode="wait">
          {step === "bank" && (
            <motion.div key="bank" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <p className="text-sm text-muted-foreground mb-3">{activeQ.current_bank_question}</p>
              <input
                value={currentBank}
                onChange={(e) => setCurrentBank(e.target.value)}
                placeholder="e.g. GTBank, Access Bank..."
                className="w-full glass-input rounded-xl px-4 py-3 text-foreground text-sm mb-3"
              />
              <GlassButton variant="primary" onClick={handleBankSubmit} className="w-full">
                Next <ChevronRight className="inline w-4 h-4 ml-1" />
              </GlassButton>
            </motion.div>
          )}

          {step === "switch" && (
            <motion.div key="switch" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <p className="text-sm text-foreground mb-4">{switchQ}</p>
              <div className="flex gap-3">
                <GlassButton variant="primary" onClick={handleSwitchYes} className="flex-1" disabled={loading}>
                  Yes, I would
                </GlassButton>
                <GlassButton variant="outline" onClick={handleSwitchNo} className="flex-1" disabled={loading}>
                  No, thanks
                </GlassButton>
              </div>
            </motion.div>
          )}

          {step === "why" && (
            <motion.div key="why" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <p className="text-sm text-muted-foreground mb-3">
                Why would you switch to {activeQ.preferred_bank}?
              </p>
              <select
                value={selectedReason}
                onChange={(e) => setSelectedReason(e.target.value)}
                className="w-full glass-input rounded-xl px-4 py-3 text-foreground text-sm mb-3 bg-transparent"
              >
                <option value="" className="bg-background">Select a reason...</option>
                {(activeQ.why_switch_options || []).map((opt, i) => (
                  <option key={i} value={opt} className="bg-background">{opt}</option>
                ))}
                <option value="__freetext__" className="bg-background">Other (type your own)</option>
              </select>

              {selectedReason === "__freetext__" && (
                <textarea
                  value={freeText}
                  onChange={(e) => setFreeText(e.target.value)}
                  placeholder="Tell us why..."
                  className="w-full glass-input rounded-xl px-4 py-3 text-foreground text-sm mb-3 min-h-[80px] resize-none"
                />
              )}

              <GlassButton
                variant="primary"
                onClick={handleWhySubmit}
                className="w-full"
                disabled={loading || (!selectedReason || (selectedReason === "__freetext__" && !freeText.trim()))}
              >
                {loading ? "Submitting..." : `Submit & Earn ${activeQ.points_reward} pts`}
              </GlassButton>
            </motion.div>
          )}
        </AnimatePresence>
      </GlassCard>
    );
  }

  // List available questionnaires
  const availableQs = questionnaires.filter((q) => !getResponse(q.id));
  const completedQs = questionnaires.filter((q) => getResponse(q.id));

  if (availableQs.length === 0 && completedQs.length === 0) return null;

  return (
    <div className="space-y-4">
      <h3 className="font-display font-semibold text-foreground flex items-center gap-2">
        <Award className="w-5 h-5 text-primary" />
        Earn Points
      </h3>

      {availableQs.map((q) => (
        <GlassCard key={q.id} className="cursor-pointer" variant="strong">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-display font-semibold text-foreground text-sm">{q.title}</p>
              <p className="text-xs text-muted-foreground mt-1">Earn {q.points_reward} points</p>
            </div>
            <GlassButton variant="primary" onClick={() => handleStart(q)} className="px-4 py-2 text-xs">
              Start
            </GlassButton>
          </div>
        </GlassCard>
      ))}

      {completedQs.map((q) => {
        const resp = getResponse(q.id)!;
        const daysLeft = resp.would_switch ? getSwitchTimerRemaining(resp, q) : null;

        return (
          <GlassCard key={q.id}>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-display font-semibold text-foreground text-sm">{q.title}</p>
                <p className="text-xs text-primary mt-1">+{resp.points_awarded} pts earned</p>
              </div>
              <div className="text-right">
                {resp.would_switch && daysLeft !== null && daysLeft > 0 && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="w-3 h-3" />
                    <span>{daysLeft}d to switch</span>
                  </div>
                )}
                {resp.would_switch && daysLeft === 0 && q.switch_enabled && q.switch_link && (
                  <a href={q.switch_link} target="_blank" rel="noopener noreferrer">
                    <GlassButton variant="primary" className="px-3 py-1.5 text-xs">
                      <ExternalLink className="w-3 h-3 mr-1 inline" />
                      Switch Now
                    </GlassButton>
                  </a>
                )}
                {!resp.would_switch && (
                  <span className="text-xs text-muted-foreground">Declined</span>
                )}
              </div>
            </div>
          </GlassCard>
        );
      })}
    </div>
  );
};

export default QuestionnaireFlow;
