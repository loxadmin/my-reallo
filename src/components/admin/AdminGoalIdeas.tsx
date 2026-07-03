import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Trash2, Plus } from "lucide-react";

export default function AdminGoalIdeas() {
  const [items, setItems] = useState<any[]>([]);
  const [form, setForm] = useState({ title: "", description: "", typical_target_min: "", typical_target_max: "", tags: "" });
  const load = async () => { const { data } = await supabase.from("goal_ideas").select("*").order("title"); setItems(data ?? []); };
  useEffect(() => { void load(); }, []);
  const add = async () => {
    if (!form.title.trim()) return;
    const { error } = await supabase.from("goal_ideas").insert({
      title: form.title.trim(), description: form.description || null,
      typical_target_min: form.typical_target_min ? Number(form.typical_target_min) : null,
      typical_target_max: form.typical_target_max ? Number(form.typical_target_max) : null,
      tags: form.tags ? form.tags.split(",").map(s => s.trim()).filter(Boolean) : [],
    });
    if (error) return toast({ title: "Error", description: error.message, variant: "destructive" });
    setForm({ title: "", description: "", typical_target_min: "", typical_target_max: "", tags: "" }); void load();
  };
  const del = async (id: string) => { await supabase.from("goal_ideas").delete().eq("id", id); void load(); };
  return (
    <div className="space-y-4">
      <div className="bg-card rounded-xl border p-4 grid grid-cols-1 md:grid-cols-6 gap-2">
        <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Title" className="md:col-span-2 px-3 py-2 rounded-lg border bg-background" />
        <input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Description" className="md:col-span-2 px-3 py-2 rounded-lg border bg-background" />
        <input value={form.typical_target_min} onChange={e => setForm({ ...form, typical_target_min: e.target.value })} placeholder="Min ₦" className="px-3 py-2 rounded-lg border bg-background" />
        <input value={form.typical_target_max} onChange={e => setForm({ ...form, typical_target_max: e.target.value })} placeholder="Max ₦" className="px-3 py-2 rounded-lg border bg-background" />
        <input value={form.tags} onChange={e => setForm({ ...form, tags: e.target.value })} placeholder="tags,comma,separated" className="md:col-span-5 px-3 py-2 rounded-lg border bg-background" />
        <button onClick={add} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm inline-flex items-center justify-center gap-1"><Plus className="w-4 h-4" /> Add</button>
      </div>
      <div className="bg-card rounded-xl border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50"><tr><th className="text-left p-2">Title</th><th className="text-left p-2">Range</th><th className="text-left p-2">Tags</th><th></th></tr></thead>
          <tbody>
            {items.map(i => (
              <tr key={i.id} className="border-t">
                <td className="p-2"><div className="font-medium">{i.title}</div><div className="text-xs text-muted-foreground">{i.description}</div></td>
                <td className="p-2 text-xs">{i.typical_target_min?.toLocaleString() ?? "-"} – {i.typical_target_max?.toLocaleString() ?? "-"}</td>
                <td className="p-2 text-xs">{(i.tags ?? []).join(", ")}</td>
                <td className="p-2 text-right"><button onClick={() => del(i.id)} className="text-destructive"><Trash2 className="w-4 h-4" /></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}