import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import GlassCard from "@/components/GlassCard";
import GlassButton from "@/components/GlassButton";
import { formatNaira } from "@/lib/formatNaira";

type NewQuestion = {
  question_text: string;
  options: { option_text: string; is_correct: boolean }[];
};

const blankQuestion = (): NewQuestion => ({
  question_text: "",
  options: [
    { option_text: "", is_correct: false },
    { option_text: "", is_correct: false },
  ],
});

export default function AdminInfluencerSurveys() {
  const [surveys, setSurveys] = useState<any[]>([]);
  const [questions, setQuestions] = useState<any[]>([]);
  const [options, setOptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [draft, setDraft] = useState({
    title: "",
    description: "",
    reward_amount: 5000,
    completion_link: "",
    completion_instructions: "",
    is_active: true,
    questions: [blankQuestion()],
  });

  const fetchData = async () => {
    setLoading(true);
    const [sRes, qRes, oRes] = await Promise.all([
      supabase.from("influencer_surveys" as any).select("*").order("created_at", { ascending: false }),
      supabase.from("influencer_survey_questions" as any).select("*").order("order_index", { ascending: true }),
      supabase.from("influencer_survey_options" as any).select("*").order("created_at", { ascending: true }),
    ]);
    if (sRes.error) console.error("influencer survey fetch error", sRes.error);
    if (qRes.error) console.error("influencer survey question fetch error", qRes.error);
    if (oRes.error) console.error("influencer survey option fetch error", oRes.error);
    setSurveys(sRes.data || []);
    setQuestions(qRes.data || []);
    setOptions(oRes.data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const createSurvey = async () => {
    if (!draft.title.trim()) return;

    const { data: created, error } = await supabase
      .from("influencer_surveys" as any)
      .insert({
        title: draft.title.trim(),
        description: draft.description.trim() || null,
        reward_amount: Number(draft.reward_amount),
        completion_link: draft.completion_link.trim() || null,
        completion_instructions: draft.completion_instructions.trim() || null,
        is_active: draft.is_active,
      })
      .select("id")
      .single();

    if (error || !created) {
      console.error("create influencer survey error", error);
      toast({ title: "Error", description: error?.message || "Failed to create survey", variant: "destructive" });
      return;
    }

    for (let qIndex = 0; qIndex < draft.questions.length; qIndex += 1) {
      const question = draft.questions[qIndex];
      if (!question.question_text.trim()) continue;

      const { data: createdQuestion, error: qErr } = await supabase
        .from("influencer_survey_questions" as any)
        .insert({ survey_id: created.id, question_text: question.question_text.trim(), order_index: qIndex })
        .select("id")
        .single();

      if (qErr || !createdQuestion) {
        console.error("create influencer question error", qErr);
        continue;
      }

      const cleanedOptions = question.options.filter((o) => o.option_text.trim());
      if (cleanedOptions.length) {
        const { error: oErr } = await supabase.from("influencer_survey_options" as any).insert(
          cleanedOptions.map((opt) => ({ question_id: createdQuestion.id, option_text: opt.option_text.trim(), is_correct: !!opt.is_correct }))
        );
        if (oErr) console.error("create influencer options error", oErr);
      }
    }

    toast({ title: "Survey created", description: "Influencer survey has been created." });
    setDraft({
      title: "",
      description: "",
      reward_amount: 5000,
      completion_link: "",
      completion_instructions: "",
      is_active: true,
      questions: [blankQuestion()],
    });
    await fetchData();
  };

  return (
    <div className="space-y-4">
      <GlassCard className="p-4 space-y-3">
        <h3 className="text-sm font-semibold text-foreground">Create Influencer Survey</h3>
        <div className="grid md:grid-cols-2 gap-2">
          <input className="glass-input rounded-xl px-3 py-2 text-sm" placeholder="Title" value={draft.title} onChange={(e) => setDraft((p) => ({ ...p, title: e.target.value }))} />
          <input className="glass-input rounded-xl px-3 py-2 text-sm" placeholder="Reward amount" type="number" value={draft.reward_amount} onChange={(e) => setDraft((p) => ({ ...p, reward_amount: Number(e.target.value || 0) }))} />
          <input className="glass-input rounded-xl px-3 py-2 text-sm md:col-span-2" placeholder="Description" value={draft.description} onChange={(e) => setDraft((p) => ({ ...p, description: e.target.value }))} />
          <input className="glass-input rounded-xl px-3 py-2 text-sm" placeholder="Completion link" value={draft.completion_link} onChange={(e) => setDraft((p) => ({ ...p, completion_link: e.target.value }))} />
          <input className="glass-input rounded-xl px-3 py-2 text-sm" placeholder="Completion instructions" value={draft.completion_instructions} onChange={(e) => setDraft((p) => ({ ...p, completion_instructions: e.target.value }))} />
        </div>

        <label className="text-sm flex items-center gap-2 text-muted-foreground cursor-pointer">
          <input type="checkbox" checked={draft.is_active} onChange={(e) => setDraft((p) => ({ ...p, is_active: e.target.checked }))} className="rounded border-border text-primary focus:ring-primary/20" /> Active
        </label>

        <div className="space-y-3">
          {draft.questions.map((question, qi) => (
            <div key={qi} className="border border-border/40 rounded-xl p-3 space-y-2">
              <input className="glass-input rounded-xl px-3 py-2 text-sm w-full" placeholder={`Question ${qi + 1}`} value={question.question_text} onChange={(e) => setDraft((p) => {
                const questionsDraft = [...p.questions];
                questionsDraft[qi] = { ...questionsDraft[qi], question_text: e.target.value };
                return { ...p, questions: questionsDraft };
              })} />
              {question.options.map((opt, oi) => (
                <div key={`${qi}-${oi}`} className="flex items-center gap-2">
                  <input className="glass-input rounded-xl px-3 py-2 text-sm flex-1" placeholder={`Option ${oi + 1}`} value={opt.option_text} onChange={(e) => setDraft((p) => {
                    const questionsDraft = [...p.questions];
                    const optionsDraft = [...questionsDraft[qi].options];
                    optionsDraft[oi] = { ...optionsDraft[oi], option_text: e.target.value };
                    questionsDraft[qi] = { ...questionsDraft[qi], options: optionsDraft };
                    return { ...p, questions: questionsDraft };
                  })} />
                  <label className="text-xs flex items-center gap-1 text-muted-foreground cursor-pointer">
                    <input type="checkbox" checked={opt.is_correct} onChange={(e) => setDraft((p) => {
                      const questionsDraft = [...p.questions];
                      const optionsDraft = [...questionsDraft[qi].options];
                      optionsDraft[oi] = { ...optionsDraft[oi], is_correct: e.target.checked };
                      questionsDraft[qi] = { ...questionsDraft[qi], options: optionsDraft };
                      return { ...p, questions: questionsDraft };
                    })} className="rounded border-border text-primary focus:ring-primary/20" /> Correct
                  </label>
                </div>
              ))}
              <GlassButton variant="outline" onClick={() => setDraft((p) => {
                const questionsDraft = [...p.questions];
                questionsDraft[qi] = {
                  ...questionsDraft[qi],
                  options: [...questionsDraft[qi].options, { option_text: "", is_correct: false }],
                };
                return { ...p, questions: questionsDraft };
              })}>+ Add Option</GlassButton>
            </div>
          ))}
        </div>

        <div className="flex gap-2">
          <GlassButton variant="outline" onClick={() => setDraft((p) => ({ ...p, questions: [...p.questions, blankQuestion()] }))}><Plus className="w-4 h-4 mr-1" /> Add Question</GlassButton>
          <GlassButton onClick={createSurvey}>Create Survey</GlassButton>
        </div>
      </GlassCard>

      <div className="space-y-3">
        {loading ? <p className="text-sm text-muted-foreground text-center py-4">Loading influencer surveys...</p> : surveys.map((survey) => {
          const sQuestions = questions.filter((q) => q.survey_id === survey.id);
          return (
            <GlassCard key={survey.id} className="p-4 space-y-3">
              <div className="flex justify-between items-start gap-4">
                <div>
                  <p className="font-semibold text-sm text-foreground">{survey.title}</p>
                  <p className="text-xs text-muted-foreground mt-1">{formatNaira(Number(survey.reward_amount))} · {sQuestions.length} questions</p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <GlassButton variant="outline" onClick={async () => {
                    const { error: toggleError } = await supabase.from("influencer_surveys" as any).update({ is_active: !survey.is_active }).eq("id", survey.id);
                    if (toggleError) {
                      console.error("toggle influencer survey error", toggleError);
                      toast({ title: "Error", description: toggleError.message, variant: "destructive" });
                    }
                    await fetchData();
                  }}>{survey.is_active ? "Deactivate" : "Activate"}</GlassButton>
                  <button className="p-2 text-muted-foreground hover:text-destructive transition-colors" onClick={async () => {
                    const { error: deleteError } = await supabase.from("influencer_surveys" as any).delete().eq("id", survey.id);
                    if (deleteError) {
                      console.error("delete influencer survey error", deleteError);
                      toast({ title: "Error", description: deleteError.message, variant: "destructive" });
                    }
                    await fetchData();
                  }}><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>

              {sQuestions.map((q) => {
                const qOpts = options.filter((o) => o.question_id === q.id);
                return (
                  <div key={q.id} className="border border-border/30 rounded-lg p-3 bg-muted/5">
                    <p className="text-sm font-medium text-foreground">{q.question_text}</p>
                    <ul className="mt-2 text-xs text-muted-foreground space-y-1">
                      {qOpts.map((opt) => (
                        <li key={opt.id} className={`flex items-center gap-1.5 ${opt.is_correct ? "text-primary font-medium" : ""}`}>
                          <span className="w-1 h-1 rounded-full bg-current shrink-0" />
                          {opt.option_text}{opt.is_correct ? " (correct)" : ""}
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </GlassCard>
          );
        })}
      </div>
    </div>
  );
}
