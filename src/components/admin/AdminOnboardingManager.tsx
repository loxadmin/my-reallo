import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Trash2, Plus, ChevronUp, ChevronDown } from "lucide-react";

interface Category { id: string; name: string; sort_order: number; active: boolean }
interface Question {
  id: string; category_id: string | null; prompt: string; question_type: string;
  options: any; tag_key: string; required: boolean; active: boolean; sort_order: number;
}

const QTYPES = ["text","choice","multi","yesno","numeric","date","file"];

export default function AdminOnboardingManager() {
  const [cats, setCats] = useState<Category[]>([]);
  const [qs, setQs] = useState<Question[]>([]);
  const [newCat, setNewCat] = useState("");
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const [{ data: c }, { data: q }] = await Promise.all([
      supabase.from("onboarding_question_categories").select("*").order("sort_order"),
      supabase.from("onboarding_questions").select("*").order("sort_order"),
    ]);
    setCats((c as any) ?? []);
    setQs((q as any) ?? []);
    setLoading(false);
  };
  useEffect(() => { void load(); }, []);

  const addCategory = async () => {
    if (!newCat.trim()) return;
    const { error } = await supabase.from("onboarding_question_categories").insert({ name: newCat.trim(), sort_order: cats.length });
    if (error) return toast({ title: "Error", description: error.message, variant: "destructive" });
    setNewCat(""); void load();
  };

  const addQuestion = async (categoryId: string) => {
    const { error } = await supabase.from("onboarding_questions").insert({
      category_id: categoryId, prompt: "New question", question_type: "text",
      tag_key: `tag_${Date.now()}`, sort_order: qs.filter(x => x.category_id === categoryId).length,
    });
    if (error) return toast({ title: "Error", description: error.message, variant: "destructive" });
    void load();
  };

  const updateQ = async (id: string, patch: Partial<Question>) => {
    const { error } = await supabase.from("onboarding_questions").update(patch).eq("id", id);
    if (error) return toast({ title: "Error", description: error.message, variant: "destructive" });
    void load();
  };
  const deleteQ = async (id: string) => {
    if (!confirm("Delete question?")) return;
    await supabase.from("onboarding_questions").delete().eq("id", id);
    void load();
  };
  const move = async (q: Question, dir: -1 | 1) => {
    await updateQ(q.id, { sort_order: q.sort_order + dir });
  };

  if (loading) return <div className="p-6 text-sm text-muted-foreground">Loading…</div>;

  return (
    <div className="space-y-6">
      <div className="bg-card rounded-xl border p-4">
        <div className="flex items-center gap-2">
          <input value={newCat} onChange={e => setNewCat(e.target.value)} placeholder="New category name" className="flex-1 px-3 py-2 rounded-lg border bg-background" />
          <button onClick={addCategory} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm inline-flex items-center gap-1"><Plus className="w-4 h-4" /> Add category</button>
        </div>
      </div>

      {cats.map(cat => (
        <div key={cat.id} className="bg-card rounded-xl border p-4">
          <div className="flex items-center justify-between mb-3">
            <input defaultValue={cat.name} onBlur={e => supabase.from("onboarding_question_categories").update({ name: e.target.value }).eq("id", cat.id).then(load)} className="text-base font-semibold bg-transparent outline-none" />
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-1 text-xs"><input type="checkbox" checked={cat.active} onChange={e => supabase.from("onboarding_question_categories").update({ active: e.target.checked }).eq("id", cat.id).then(load)} /> Active</label>
              <button onClick={() => addQuestion(cat.id)} className="text-xs px-3 py-1.5 rounded-md bg-primary/10 text-primary inline-flex items-center gap-1"><Plus className="w-3 h-3" /> Add question</button>
              <button onClick={() => { if (confirm("Delete category?")) supabase.from("onboarding_question_categories").delete().eq("id", cat.id).then(load); }} className="text-xs px-2 py-1.5 rounded-md text-destructive"><Trash2 className="w-3 h-3" /></button>
            </div>
          </div>
          <div className="space-y-2">
            {qs.filter(q => q.category_id === cat.id).sort((a, b) => a.sort_order - b.sort_order).map(q => (
              <div key={q.id} className="border rounded-lg p-3 space-y-2 bg-background">
                <div className="flex items-start gap-2">
                  <div className="flex flex-col gap-0.5">
                    <button onClick={() => move(q, -1)}><ChevronUp className="w-3 h-3" /></button>
                    <button onClick={() => move(q, 1)}><ChevronDown className="w-3 h-3" /></button>
                  </div>
                  <input defaultValue={q.prompt} onBlur={e => updateQ(q.id, { prompt: e.target.value })} className="flex-1 px-2 py-1 rounded border bg-background text-sm" />
                  <button onClick={() => deleteQ(q.id)} className="text-destructive"><Trash2 className="w-4 h-4" /></button>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                  <label className="flex flex-col gap-1">Type
                    <select defaultValue={q.question_type} onChange={e => updateQ(q.id, { question_type: e.target.value })} className="px-2 py-1 rounded border bg-background">
                      {QTYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </label>
                  <label className="flex flex-col gap-1">Tag key
                    <input defaultValue={q.tag_key} onBlur={e => updateQ(q.id, { tag_key: e.target.value })} className="px-2 py-1 rounded border bg-background" />
                  </label>
                  <label className="flex items-center gap-1 pt-4"><input type="checkbox" checked={q.required} onChange={e => updateQ(q.id, { required: e.target.checked })} /> Required</label>
                  <label className="flex items-center gap-1 pt-4"><input type="checkbox" checked={q.active} onChange={e => updateQ(q.id, { active: e.target.checked })} /> Active</label>
                </div>
                {(q.question_type === "choice" || q.question_type === "multi") && (
                  <input defaultValue={JSON.stringify(q.options ?? [])} onBlur={e => { try { updateQ(q.id, { options: JSON.parse(e.target.value) }); } catch { toast({ title: "Invalid JSON", variant: "destructive" }); } }} placeholder='["opt1","opt2"]' className="w-full px-2 py-1 rounded border bg-background text-xs font-mono" />
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}