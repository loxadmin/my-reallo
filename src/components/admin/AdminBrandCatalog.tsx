import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Trash2, Plus, ArrowUp } from "lucide-react";

const CATS = ["bank","ride","shopping","telecom","food","streaming","other"];

export default function AdminBrandCatalog() {
  const [brands, setBrands] = useState<any[]>([]);
  const [suggested, setSuggested] = useState<any[]>([]);
  const [name, setName] = useState(""); const [cat, setCat] = useState("bank");
  const load = async () => {
    const [{ data: bc }, { data: sg }] = await Promise.all([
      supabase.from("brand_catalog").select("*").order("category").order("name"),
      supabase.from("user_custom_brands").select("*").eq("promoted", false).order("created_at", { ascending: false }).limit(200),
    ]);
    setBrands(bc ?? []);
    setSuggested(sg ?? []);
  };
  useEffect(() => { void load(); }, []);

  const add = async () => {
    if (!name.trim()) return;
    const { error } = await supabase.from("brand_catalog").insert({ name: name.trim(), category: cat });
    if (error) return toast({ title: "Error", description: error.message, variant: "destructive" });
    setName(""); void load();
  };
  const del = async (id: string) => { await supabase.from("brand_catalog").delete().eq("id", id); void load(); };
  const toggle = async (id: string, active: boolean) => { await supabase.from("brand_catalog").update({ active }).eq("id", id); void load(); };

  const promote = async (row: any) => {
    const category = row.category || "other";
    const existing = brands.find(b => b.name.toLowerCase() === row.name.toLowerCase());
    if (!existing) {
      const { error } = await supabase.from("brand_catalog").insert({ name: row.name.trim(), category });
      if (error) return toast({ title: "Error", description: error.message, variant: "destructive" });
    }
    await supabase.from("user_custom_brands").update({ promoted: true }).eq("id", row.id);
    void load();
  };
  const dismiss = async (id: string) => {
    await supabase.from("user_custom_brands").delete().eq("id", id);
    void load();
  };

  return (
    <div className="space-y-4">
      <div className="bg-card rounded-xl border p-4 flex gap-2 items-center">
        <input value={name} onChange={e => setName(e.target.value)} placeholder="Brand name" className="flex-1 px-3 py-2 rounded-lg border bg-background" />
        <select value={cat} onChange={e => setCat(e.target.value)} className="px-3 py-2 rounded-lg border bg-background">
          {CATS.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <button onClick={add} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm inline-flex items-center gap-1"><Plus className="w-4 h-4" /> Add</button>
      </div>
      <div className="bg-card rounded-xl border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50"><tr><th className="text-left p-2">Name</th><th className="text-left p-2">Category</th><th className="text-left p-2">Active</th><th></th></tr></thead>
          <tbody>
            {brands.map(b => (
              <tr key={b.id} className="border-t">
                <td className="p-2">{b.name}</td>
                <td className="p-2">{b.category}</td>
                <td className="p-2"><input type="checkbox" checked={b.active} onChange={e => toggle(b.id, e.target.checked)} /></td>
                <td className="p-2 text-right"><button onClick={() => del(b.id)} className="text-destructive"><Trash2 className="w-4 h-4" /></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="bg-card rounded-xl border p-4">
        <div className="text-sm font-semibold mb-2">Suggested by users ({suggested.length})</div>
        {suggested.length === 0 ? (
          <div className="text-xs text-muted-foreground">No pending suggestions.</div>
        ) : (
          <div className="space-y-1 text-sm">
            {suggested.map(s => (
              <div key={s.id} className="flex items-center justify-between border-t pt-1">
                <div>{s.name} <span className="text-xs text-muted-foreground">({s.category ?? "—"})</span></div>
                <div className="flex gap-2">
                  <button onClick={() => promote(s)} className="text-xs inline-flex items-center gap-1 px-2 py-1 rounded bg-primary/10 text-primary">
                    <ArrowUp className="w-3 h-3" /> Promote
                  </button>
                  <button onClick={() => dismiss(s.id)} className="text-xs text-destructive"><Trash2 className="w-3 h-3" /></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}