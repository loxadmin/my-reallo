import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Plus, Trash2, Power } from "lucide-react";

type EvidenceRule = { type: string; label?: string; count?: number };

const EVIDENCE_TYPES = [
  { value: "photo", label: "Photo / screenshot" },
  { value: "video", label: "Video recording" },
  { value: "scan", label: "Product code / barcode scan" },
  { value: "receipt", label: "Receipt or transaction proof" },
];

const emptyForm = {
  title: "",
  description: "",
  instructions: "",
  task_type: "switching",
  mode: "online",
  duration_days: 30,
  reward_points: 0,
  switch_from_brand: "",
  switch_to_brand: "",
  category: "",
};

export default function AdminUserTasks() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ ...emptyForm });
  const [rules, setRules] = useState<EvidenceRule[]>([{ type: "photo", count: 1, label: "" }]);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("user_tasks").select("*").order("created_at", { ascending: false });
    setTasks(data ?? []);
    setLoading(false);
  };
  useEffect(() => { void load(); }, []);

  const create = async () => {
    if (!form.title.trim()) return toast.error("Title is required");
    setSaving(true);
    try {
      const { error } = await supabase.from("user_tasks").insert({
        ...form,
        description: form.description || null,
        instructions: form.instructions || null,
        switch_from_brand: form.switch_from_brand || null,
        switch_to_brand: form.switch_to_brand || null,
        category: form.category || null,
        duration_days: Math.max(1, Number(form.duration_days) || 1),
        reward_points: Math.max(0, Number(form.reward_points) || 0),
        evidence_config: rules.filter((r) => r.type).map((r) => ({ type: r.type, label: r.label || undefined, count: Math.max(1, Number(r.count) || 1) })) as any,
      });
      if (error) throw error;
      toast.success("Task created");
      setForm({ ...emptyForm });
      setRules([{ type: "photo", count: 1, label: "" }]);
      await load();
    } catch (e: any) {
      toast.error(e.message ?? "Could not create task");
    } finally { setSaving(false); }
  };

  const toggle = async (task: any) => {
    await supabase.from("user_tasks").update({ is_active: !task.is_active }).eq("id", task.id);
    await load();
  };
  const remove = async (task: any) => {
    if (!confirm(`Delete "${task.title}"? All enrollments and submissions are removed.`)) return;
    await supabase.from("user_tasks").delete().eq("id", task.id);
    await load();
  };

  const input = "w-full px-3 py-2 rounded-lg border bg-background text-[12px]";

  const Field = ({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) => (
    <div className="space-y-1">
      <p className="text-[11px] font-medium text-foreground">{label}</p>
      {children}
      {hint && <p className="text-[10px] text-muted-foreground leading-snug">{hint}</p>}
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="glass-card p-4 space-y-3">
        <h3 className="text-[14px] font-semibold flex items-center gap-2"><Plus className="w-4 h-4 text-primary" />Create user task</h3>
        <p className="text-[11px] text-muted-foreground">Tasks users complete day by day. Each day's evidence must be approved by an admin before the reward is paid.</p>
        <div className="grid sm:grid-cols-2 gap-3">
          <Field label="Task title" hint="The headline users see on the task card.">
            <input className={input} placeholder="Switch from Uber to Bolt" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </Field>
          <Field label="Category (optional)" hint="Used for grouping and reports, e.g. Transport, Milk, Data.">
            <input className={input} placeholder="Transport" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
          </Field>
          <Field label="Type of task" hint="Switching = move from one brand to another. Online = done on a phone/app. Offline = done in a shop or on the street.">
            <select className={input} value={form.task_type} onChange={(e) => setForm({ ...form, task_type: e.target.value })}>
              <option value="switching">Switching task</option>
              <option value="online">Online task</option>
              <option value="offline">Offline task</option>
            </select>
          </Field>
          <Field label="Where it happens" hint="Online tasks are proven with app screenshots; offline tasks usually need receipts, photos or video.">
            <select className={input} value={form.mode} onChange={(e) => setForm({ ...form, mode: e.target.value })}>
              <option value="online">Online</option>
              <option value="offline">Offline</option>
            </select>
          </Field>
          <Field label="Brand they leave (optional)" hint="Only shown to users who told us they use this brand.">
            <input className={input} placeholder="Peak Milk" value={form.switch_from_brand} onChange={(e) => setForm({ ...form, switch_from_brand: e.target.value })} />
          </Field>
          <Field label="Brand they switch to (optional)" hint="The partner brand you want them to use instead.">
            <input className={input} placeholder="Loya Milk" value={form.switch_to_brand} onChange={(e) => setForm({ ...form, switch_to_brand: e.target.value })} />
          </Field>
          <Field label="How many days it runs" hint="Users must upload evidence on each of these days, e.g. 30 = one upload a day for 30 days.">
            <input className={input} type="number" min={1} value={form.duration_days} onChange={(e) => setForm({ ...form, duration_days: Number(e.target.value) })} />
          </Field>
          <Field label="Reward in points" hint="Paid once every day is approved. 1 point = ₦0.5, so 4,000 points = ₦2,000.">
            <input className={input} type="number" min={0} value={form.reward_points} onChange={(e) => setForm({ ...form, reward_points: Number(e.target.value) })} />
          </Field>
        </div>
        <Field label="Short description" hint="One line on the task card telling users what this is.">
          <textarea className={input} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </Field>
        <Field label="Full instructions" hint="Exactly what to do each day and what evidence to send.">
          <textarea className={input} placeholder="Buy the product, photograph the receipt, open it, record a short video" value={form.instructions} onChange={(e) => setForm({ ...form, instructions: e.target.value })} />
        </Field>

        <div className="space-y-2">
          <div className="text-[12px] font-medium">Evidence required each day</div>
          <p className="text-[10px] text-muted-foreground">Choose what the user must upload every day. Add more rows if you need several kinds of proof. The number is how many files of that kind.</p>
          {rules.map((rule, i) => (
            <div key={i} className="grid grid-cols-[1fr_1fr_70px_36px] gap-2 items-center">
              <select className={input} value={rule.type} onChange={(e) => setRules(rules.map((r, j) => j === i ? { ...r, type: e.target.value } : r))}>
                {EVIDENCE_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
              <input className={input} placeholder="What to capture, e.g. receipt" value={rule.label ?? ""} onChange={(e) => setRules(rules.map((r, j) => j === i ? { ...r, label: e.target.value } : r))} />
              <input className={input} type="number" min={1} title="How many files" value={rule.count ?? 1} onChange={(e) => setRules(rules.map((r, j) => j === i ? { ...r, count: Number(e.target.value) } : r))} />
              <button onClick={() => setRules(rules.filter((_, j) => j !== i))} className="p-2 text-muted-foreground hover:text-destructive"><Trash2 className="w-4 h-4" /></button>
            </div>
          ))}
          <button onClick={() => setRules([...rules, { type: "photo", count: 1, label: "" }])} className="text-[11px] text-primary">+ Add evidence requirement</button>
        </div>

        <button onClick={create} disabled={saving} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-[12px] font-medium inline-flex items-center gap-2 disabled:opacity-50">
          {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}Create task
        </button>
      </div>

      <div className="space-y-2">
        {loading ? <div className="flex justify-center p-6"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div> :
          tasks.length === 0 ? <p className="text-[12px] text-muted-foreground">No tasks yet.</p> :
          tasks.map((t) => (
            <div key={t.id} className="glass-card p-3 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-[13px] font-semibold">{t.title}</div>
                <div className="text-[11px] text-muted-foreground">
                  {t.task_type} · {t.mode} · {t.duration_days} days · {t.reward_points} pts
                  {t.switch_from_brand ? ` · ${t.switch_from_brand} → ${t.switch_to_brand ?? "partner"}` : ""}
                </div>
                <div className="text-[10px] text-muted-foreground mt-0.5">
                  Evidence: {(t.evidence_config ?? []).map((r: any) => `${r.label || r.type}${r.count > 1 ? ` ×${r.count}` : ""}`).join(", ") || "photo"}
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button onClick={() => toggle(t)} title={t.is_active ? "Deactivate" : "Activate"} className={`p-2 rounded-lg ${t.is_active ? "text-primary" : "text-muted-foreground"}`}><Power className="w-4 h-4" /></button>
                <button onClick={() => remove(t)} className="p-2 rounded-lg text-muted-foreground hover:text-destructive"><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}
