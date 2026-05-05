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
    upload_type: "screenshot" as "screenshot" | "link",
    audience: "both" as "both" | "personal" | "business",
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
        upload_type: draft.upload_type,
        audience: draft.audience,
        is_active: draft.is_active,
      })
      .select("id")
      .maybeSingle();

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
        .insert({ survey_id: (created as any).id, question_text: question.question_text.trim(), order_index: qIndex })
        .select("id")
        .maybeSingle();

      if (qErr || !createdQuestion) {
        console.error("create influencer question error", qErr);
        continue;
      }

      const cleanedOptions = question.options.filter((o) => o.option_text.trim());
      if (cleanedOptions.length) {
        const { error: oErr } = await supabase.from("influencer_survey_options" as any).insert(
          cleanedOptions.map((opt) => ({ question_id: (createdQuestion as any).id, option_text: opt.option_text.trim(), is_correct: !!opt.is_correct }))
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
      upload_type: "screenshot",
      audience: "both",
      is_active: true,
      questions: [blankQuestion()],
    });
    await fetchData();
  };

  return (
    <div className="space-y-4">
      <GlassCard className="p-4 space-y-3">
        <h3 className="text-sm font-semibold">Create Influencer Survey</h3>
        <div className="grid md:grid-cols-2 gap-2">
          <input className="glass-input rounded-xl px-3 py-2 text-xs" placeholder="Title" value={draft.title} onChange={(e) => setDraft((p) => ({ ...p, title: e.target.value }))} />
          <input className="glass-input rounded-xl px-3 py-2 text-xs" placeholder="Reward amount" type="number" value={draft.reward_amount} onChange={(e) => setDraft((p) => ({ ...p, reward_amount: Number(e.target.value || 0) }))} />
          <input className="glass-input rounded-xl px-3 py-2 text-xs md:col-span-2" placeholder="Description" value={draft.description} onChange={(e) => setDraft((p) => ({ ...p, description: e.target.value }))} />
          <input className="glass-input rounded-xl px-3 py-2 text-xs" placeholder="Completion link" value={draft.completion_link} onChange={(e) => setDraft((p) => ({ ...p, completion_link: e.target.value }))} />
          <input className="glass-input rounded-xl px-3 py-2 text-xs" placeholder="Completion instructions" value={draft.completion_instructions} onChange={(e) => setDraft((p) => ({ ...p, completion_instructions: e.target.value }))} />
        </div>

        <label className="text-xs flex items-center gap-2">
          <input type="checkbox" checked={draft.is_active} onChange={(e) => setDraft((p) => ({ ...p, is_active: e.target.checked }))} /> Active
        </label>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Show to:</span>
          <select
            value={draft.audience}
            onChange={(e) => setDraft((p) => ({ ...p, audience: e.target.value as "both" | "personal" | "business" }))}
            className="glass-input rounded-xl px-2 py-1 text-xs"
          >
            <option value="both">Both</option>
            <option value="personal">Personal</option>
            <option value="business">Business</option>
          </select>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground">User upload type:</span>
          <label className="text-xs flex items-center gap-1.5 cursor-pointer">
            <input type="radio" name="upload_type" checked={draft.upload_type === "screenshot"} onChange={() => setDraft((p) => ({ ...p, upload_type: "screenshot" }))} />
            Screenshot
          </label>
          <label className="text-xs flex items-center gap-1.5 cursor-pointer">
            <input type="radio" name="upload_type" checked={draft.upload_type === "link"} onChange={() => setDraft((p) => ({ ...p, upload_type: "link" }))} />
            Link
          </label>
        </div>

        <div className="space-y-3">
          {draft.questions.map((question, qi) => (
            <div key={qi} className="border rounded-xl p-3 space-y-2">
              <input className="glass-input rounded-xl px-3 py-2 text-xs w-full" placeholder={`Question ${qi + 1}`} value={question.question_text} onChange={(e) => setDraft((p) => {
                const questionsDraft = [...p.questions];
                questionsDraft[qi] = { ...questionsDraft[qi], question_text: e.target.value };
                return { ...p, questions: questionsDraft };
              })} />
              {question.options.map((opt, oi) => (
                <div key={`${qi}-${oi}`} className="flex items-center gap-2">
                  <input className="glass-input rounded-xl px-3 py-2 text-xs flex-1" placeholder={`Option ${oi + 1}`} value={opt.option_text} onChange={(e) => setDraft((p) => {
                    const questionsDraft = [...p.questions];
                    const optionsDraft = [...questionsDraft[qi].options];
                    optionsDraft[oi] = { ...optionsDraft[oi], option_text: e.target.value };
                    questionsDraft[qi] = { ...questionsDraft[qi], options: optionsDraft };
                    return { ...p, questions: questionsDraft };
                  })} />
                  <label className="text-xs flex items-center gap-1">
                    <input type="checkbox" checked={opt.is_correct} onChange={(e) => setDraft((p) => {
                      const questionsDraft = [...p.questions];
                      const optionsDraft = [...questionsDraft[qi].options];
                      optionsDraft[oi] = { ...optionsDraft[oi], is_correct: e.target.checked };
                      questionsDraft[qi] = { ...questionsDraft[qi], options: optionsDraft };
                      return { ...p, questions: questionsDraft };
                    })} /> Correct
                  </label>
                </div>
              ))}
              <GlassButton className="text-xs" variant="outline" onClick={() => setDraft((p) => {
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
        {loading ? <p className="text-xs text-muted-foreground">Loading influencer surveys...</p> : surveys.map((survey) => {
          const sQuestions = questions.filter((q) => q.survey_id === survey.id);
          return (
            <GlassCard key={survey.id} className="p-4 space-y-2">
              <div className="flex justify-between items-start gap-2">
                <div>
                  <p className="font-semibold text-sm">{survey.title}</p>
                  <p className="text-xs text-muted-foreground">{formatNaira(Number(survey.reward_amount))} · {sQuestions.length} questions</p>
                </div>
                <div className="flex gap-2">
                  <GlassButton variant="outline" className="text-xs" onClick={async () => {
                    const { error: toggleError } = await supabase.from("influencer_surveys" as any).update({ is_active: !survey.is_active }).eq("id", survey.id);
                    if (toggleError) {
                      console.error("toggle influencer survey error", toggleError);
                      toast({ title: "Error", description: toggleError.message, variant: "destructive" });
                    }
                    await fetchData();
                  }}>{survey.is_active ? "Deactivate" : "Activate"}</GlassButton>
                  <button onClick={async () => {
                    const { error: deleteError } = await supabase.from("influencer_surveys" as any).delete().eq("id", survey.id);
                    if (deleteError) {
                      console.error("delete influencer survey error", deleteError);
                      toast({ title: "Error", description: deleteError.message, variant: "destructive" });
                    }
                    await fetchData();
                  }}><Trash2 className="w-4 h-4 text-destructive" /></button>
                </div>
              </div>

              {sQuestions.map((q) => {
                const qOpts = options.filter((o) => o.question_id === q.id);
                return (
                  <div key={q.id} className="border rounded-lg p-2">
                    <p className="text-xs font-medium">{q.question_text}</p>
                    <ul className="mt-1 text-xs text-muted-foreground space-y-1">
                      {qOpts.map((opt) => (
                        <li key={opt.id} className={opt.is_correct ? "text-primary" : ""}>• {opt.option_text}{opt.is_correct ? " (correct)" : ""}</li>
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
