import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import GlassCard from "./GlassCard";
import GlassButton from "./GlassButton";
import GlassInput from "./GlassInput";
import { MessageSquare, ChevronRight, Clock, ExternalLink, Award, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

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
    toast.info("Survey submitted. No points were awarded for this response.");
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

    try {
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

      const { data: profile } = await supabase.from("profiles").select("points_balance").eq("id", user.id).single();
      const newBalance = (profile?.points_balance || 0) + activeQ.points_reward;
      await supabase.from("profiles").update({ points_balance: newBalance }).eq("id", user.id);

      toast.success(`You earned ${activeQ.points_reward.toLocaleString()} points!`);
      setActiveQ(null);
      setStep("bank");
      await fetchData();
      await refreshProfile();
    } catch (error: any) {
      toast.error(error.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
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

  if (activeQ) {
    const switchQ = activeQ.switch_question_template
      .replace("{current_bank}", currentBank)
      .replace("{preferred_bank}", activeQ.preferred_bank);

    return (
      <GlassCard className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-primary/10 rounded-xl">
            <MessageSquare className="w-6 h-6 text-primary" />
          </div>
          <h3 className="font-display font-bold text-foreground">{activeQ.title}</h3>
        </div>

        <AnimatePresence mode="wait">
          {step === "bank" && (
            <motion.div key="bank" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-4">
              <p className="text-sm text-muted-foreground leading-relaxed">{activeQ.current_bank_question}</p>
              <GlassInput
                value={currentBank}
                onChange={(e) => setCurrentBank(e.target.value)}
                placeholder="e.g. GTBank, Kuda..."
                label="Your Bank"
              />
              <GlassButton variant="primary" onClick={handleBankSubmit} className="w-full py-4 shadow-lg">
                Continue <ChevronRight className="w-4 h-4 ml-1" />
              </GlassButton>
            </motion.div>
          )}

          {step === "switch" && (
            <motion.div key="switch" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-5">
              <p className="text-sm text-foreground font-medium leading-relaxed">{switchQ}</p>
              <div className="flex flex-col gap-3">
                <GlassButton variant="primary" onClick={handleSwitchYes} className="w-full py-4 shadow-xl" loading={loading}>
                  Yes, I would
                </GlassButton>
                <GlassButton variant="outline" onClick={handleSwitchNo} className="w-full py-4" loading={loading}>
                  No, thanks
                </GlassButton>
              </div>
            </motion.div>
          )}

          {step === "why" && (
            <motion.div key="why" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-4">
              <p className="text-sm text-muted-foreground leading-relaxed">
                Tell us why you'd consider switching to {activeQ.preferred_bank}.
              </p>

              <div className="space-y-2">
                <select
                  value={selectedReason}
                  onChange={(e) => setSelectedReason(e.target.value)}
                  className="w-full bg-white/5 dark:bg-white/[0.03] border border-white/20 dark:border-white/10 rounded-2xl px-4 py-3.5 text-sm transition-all focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary appearance-none"
                >
                  <option value="" className="bg-background">Choose a reason...</option>
                  {(activeQ.why_switch_options || []).map((opt, i) => (
                    <option key={i} value={opt} className="bg-background">{opt}</option>
                  ))}
                  <option value="__freetext__" className="bg-background">Something else...</option>
                </select>

                {selectedReason === "__freetext__" && (
                  <textarea
                    value={freeText}
                    onChange={(e) => setFreeText(e.target.value)}
                    placeholder="Type your reason here..."
                    className="w-full bg-white/5 dark:bg-white/[0.03] border border-white/20 dark:border-white/10 rounded-2xl px-4 py-3.5 text-sm transition-all focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary min-h-[100px] resize-none"
                  />
                )}
              </div>

              <GlassButton
                variant="primary"
                onClick={handleWhySubmit}
                className="w-full py-4 shadow-xl"
                loading={loading}
                disabled={!selectedReason || (selectedReason === "__freetext__" && !freeText.trim())}
              >
                Earn {activeQ.points_reward.toLocaleString()} pts
              </GlassButton>
            </motion.div>
          )}
        </AnimatePresence>
      </GlassCard>
    );
  }

  const availableQs = questionnaires.filter((q) => !getResponse(q.id));
  const completedQs = questionnaires.filter((q) => getResponse(q.id));

  if (availableQs.length === 0 && completedQs.length === 0) {
    return (
      <GlassCard className="text-center p-8">
        <CheckCircle2 className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-20" />
        <p className="text-sm text-muted-foreground font-medium">All caught up! Check back later for more tasks.</p>
      </GlassCard>
    );
  }

  return (
    <div className="space-y-4">
      {availableQs.length > 0 && (
        <>
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest ml-1">Available Tasks</p>
          {availableQs.map((q) => (
            <motion.div
              key={q.id}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              onClick={() => handleStart(q)}
              className="glass-card p-5 flex items-center justify-between cursor-pointer group hover:border-primary/30 transition-all shadow-sm"
            >
              <div className="space-y-1">
                <p className="text-sm font-bold text-foreground group-hover:text-primary transition-colors">{q.title}</p>
                <div className="flex items-center gap-1.5">
                  <Award size={12} className="text-primary" />
                  <p className="text-[10px] font-bold text-primary uppercase tracking-wider">{q.points_reward.toLocaleString()} Reward</p>
                </div>
              </div>
              <div className="p-2 bg-primary/10 rounded-xl text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                <ChevronRight size={18} />
              </div>
            </motion.div>
          ))}
        </>
      )}

      {completedQs.length > 0 && (
        <>
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest ml-1 mt-6">Completed</p>
          {completedQs.map((q) => {
            const resp = getResponse(q.id)!;
            const daysLeft = resp.would_switch ? getSwitchTimerRemaining(resp, q) : null;

            return (
              <div key={q.id} className="glass-card p-5 border-white/5 opacity-70">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-sm font-bold text-foreground">{q.title}</p>
                    <p className="text-[10px] font-bold text-primary uppercase tracking-wider">Completed • +{resp.points_awarded.toLocaleString()} pts</p>
                  </div>
                  <div className="text-right">
                    {resp.would_switch && daysLeft !== null && daysLeft > 0 && (
                      <div className="flex items-center gap-1 text-[10px] font-bold text-muted-foreground bg-muted/50 px-2 py-1 rounded-full">
                        <Clock size={10} />
                        <span>{daysLeft}d</span>
                      </div>
                    )}
                    {resp.would_switch && daysLeft === 0 && q.switch_enabled && q.switch_link && (
                      <a href={q.switch_link} target="_blank" rel="noopener noreferrer">
                        <GlassButton variant="primary" className="px-3 py-1.5 text-[10px]">
                          <ExternalLink size={10} className="mr-1 inline" />
                          Switch Now
                        </GlassButton>
                      </a>
                    )}
                    {!resp.would_switch && (
                      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Declined</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </>
      )}
    </div>
  );
};

export default QuestionnaireFlow;
