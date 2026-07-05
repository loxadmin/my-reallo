import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Trash2, Plus } from "lucide-react";

const PROOF = ["screenshot","screen_recording","photo","video","receipt","image"];

export default function AdminCampaignEligibility() {
  const [rows, setRows] = useState<any[]>([]);
  const [form, setForm] = useState<any>({ campaign_id: "", campaign_type: "online", eligible_segments: "", eligible_brands: "", eligible_goals: "", eligible_locations: "", deposit_required: 0, referral_required: 0, weight: 1, priority: 0, proof_types: [] as string[], proof_instructions: "", task_mode: "either", goal_contribution_value: 0, ai_weight: 1, competes_with_brands: "", exclusive_to_switchers: false, duration_days: 1, category: "" });
  const load = async () => { const { data } = await supabase.from("campaign_eligibility").select("*").order("created_at", { ascending: false }); setRows(data ?? []); };
  useEffect(() => { void load(); }, []);
  const list = (s: string) => s.split(",").map(x => x.trim()).filter(Boolean);
  const add = async () => {
    if (!form.campaign_id.trim()) return toast({ title: "Campaign id required", variant: "destructive" });
    const { error } = await supabase.from("campaign_eligibility").insert({
      campaign_id: form.campaign_id.trim(), campaign_type: form.campaign_type,
      eligible_segments: list(form.eligible_segments), eligible_brands: list(form.eligible_brands),
      eligible_goals: list(form.eligible_goals), eligible_locations: list(form.eligible_locations),
      deposit_required: Number(form.deposit_required) || 0, referral_required: Number(form.referral_required) || 0,
      weight: Number(form.weight) || 1, priority: Number(form.priority) || 0,
      proof_types: form.proof_types, proof_instructions: form.proof_instructions || null,
      task_mode: form.task_mode, goal_contribution_value: Number(form.goal_contribution_value) || 0,
      ai_weight: Number(form.ai_weight) || 1,
      competes_with_brands: list(form.competes_with_brands),
      exclusive_to_switchers: !!form.exclusive_to_switchers,
      duration_days: Math.max(1, Number(form.duration_days) || 1),
      category: form.category || null,
    });
    if (error) return toast({ title: "Error", description: error.message, variant: "destructive" });
    void load();
  };
  return (
    <div className="space-y-4">
      <div className="bg-card rounded-xl border p-4 grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
        <input placeholder="Campaign ID (matches campaign source)" value={form.campaign_id} onChange={e => setForm({ ...form, campaign_id: e.target.value })} className="px-2 py-1.5 rounded border bg-background md:col-span-2" />
        <select value={form.campaign_type} onChange={e => setForm({ ...form, campaign_type: e.target.value })} className="px-2 py-1.5 rounded border bg-background"><option value="online">online</option><option value="offline">offline</option></select>
        <input placeholder="segments (student,parent,...)" value={form.eligible_segments} onChange={e => setForm({ ...form, eligible_segments: e.target.value })} className="px-2 py-1.5 rounded border bg-background md:col-span-2" />
        <input placeholder="brands (Opay,Uber,...)" value={form.eligible_brands} onChange={e => setForm({ ...form, eligible_brands: e.target.value })} className="px-2 py-1.5 rounded border bg-background md:col-span-2" />
        <input placeholder="goals (japa,car,...)" value={form.eligible_goals} onChange={e => setForm({ ...form, eligible_goals: e.target.value })} className="px-2 py-1.5 rounded border bg-background md:col-span-2" />
        <input placeholder="locations (Lagos,NG,...)" value={form.eligible_locations} onChange={e => setForm({ ...form, eligible_locations: e.target.value })} className="px-2 py-1.5 rounded border bg-background md:col-span-2" />
        <input placeholder="competes with brands (Opay,Uber,...)" value={form.competes_with_brands} onChange={e => setForm({ ...form, competes_with_brands: e.target.value })} className="px-2 py-1.5 rounded border bg-background md:col-span-2" />
        <input placeholder="category (bank/ride/telecom/...)" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} className="px-2 py-1.5 rounded border bg-background md:col-span-2" />
        <input type="number" placeholder="duration days" value={form.duration_days} onChange={e => setForm({ ...form, duration_days: e.target.value })} className="px-2 py-1.5 rounded border bg-background" />
        <label className="flex items-center gap-1 col-span-2 md:col-span-2 text-xs">
          <input type="checkbox" checked={form.exclusive_to_switchers} onChange={e => setForm({ ...form, exclusive_to_switchers: e.target.checked })} />
          Exclusive to willing switchers
        </label>
        <input type="number" placeholder="deposit ₦" value={form.deposit_required} onChange={e => setForm({ ...form, deposit_required: e.target.value })} className="px-2 py-1.5 rounded border bg-background" />
        <input type="number" placeholder="referrals" value={form.referral_required} onChange={e => setForm({ ...form, referral_required: e.target.value })} className="px-2 py-1.5 rounded border bg-background" />
        <input type="number" placeholder="weight" value={form.weight} onChange={e => setForm({ ...form, weight: e.target.value })} className="px-2 py-1.5 rounded border bg-background" />
        <input type="number" placeholder="priority" value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })} className="px-2 py-1.5 rounded border bg-background" />
        <select value={form.task_mode} onChange={e => setForm({ ...form, task_mode: e.target.value })} className="px-2 py-1.5 rounded border bg-background">
          <option value="either">either</option><option value="online">online</option><option value="offline">offline</option>
        </select>
        <input type="number" placeholder="goal contribution ₦" value={form.goal_contribution_value} onChange={e => setForm({ ...form, goal_contribution_value: e.target.value })} className="px-2 py-1.5 rounded border bg-background" />
        <input type="number" step="0.1" placeholder="AI weight" value={form.ai_weight} onChange={e => setForm({ ...form, ai_weight: e.target.value })} className="px-2 py-1.5 rounded border bg-background" />
        <div className="md:col-span-4 flex flex-wrap gap-2 items-center">
          <span>Proof:</span>
          {PROOF.map(p => (
            <label key={p} className="flex items-center gap-1"><input type="checkbox" checked={form.proof_types.includes(p)} onChange={e => setForm({ ...form, proof_types: e.target.checked ? [...form.proof_types, p] : form.proof_types.filter((x: string) => x !== p) })} /> {p}</label>
          ))}
        </div>
        <input placeholder="Proof instructions" value={form.proof_instructions} onChange={e => setForm({ ...form, proof_instructions: e.target.value })} className="px-2 py-1.5 rounded border bg-background md:col-span-3" />
        <button onClick={add} className="px-3 py-2 rounded-md bg-primary text-primary-foreground inline-flex items-center justify-center gap-1"><Plus className="w-3 h-3" /> Add</button>
      </div>
      <div className="bg-card rounded-xl border overflow-auto">
        <table className="w-full text-xs">
          <thead className="bg-muted/50"><tr><th className="text-left p-2">Campaign</th><th className="p-2">Type</th><th className="p-2">Segments</th><th className="p-2">Brands</th><th className="p-2">Competes w/</th><th className="p-2">Excl. switchers</th><th className="p-2">Days</th><th className="p-2">Weight/Prio</th><th></th></tr></thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.id} className="border-t align-top">
                <td className="p-2 font-mono">{r.campaign_id}</td>
                <td className="p-2">{r.campaign_type}</td>
                <td className="p-2">{(r.eligible_segments ?? []).join(", ")}</td>
                <td className="p-2">{(r.eligible_brands ?? []).join(", ")}</td>
                <td className="p-2">{(r.competes_with_brands ?? []).join(", ")}</td>
                <td className="p-2">{r.exclusive_to_switchers ? "yes" : "no"}</td>
                <td className="p-2">{r.duration_days ?? 1}</td>
                <td className="p-2">{r.weight}/{r.priority}</td>
                <td className="p-2 text-right"><button onClick={() => supabase.from("campaign_eligibility").delete().eq("id", r.id).then(load)} className="text-destructive"><Trash2 className="w-4 h-4" /></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}