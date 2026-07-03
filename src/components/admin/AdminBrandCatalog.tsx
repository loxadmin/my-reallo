import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Trash2, Plus } from "lucide-react";

const CATS = ["bank","ride","shopping","telecom","food","streaming","other"];

export default function AdminBrandCatalog() {
  const [brands, setBrands] = useState<any[]>([]);
  const [name, setName] = useState(""); const [cat, setCat] = useState("bank");
  const load = async () => { const { data } = await supabase.from("brand_catalog").select("*").order("category").order("name"); setBrands(data ?? []); };
  useEffect(() => { void load(); }, []);

  const add = async () => {
    if (!name.trim()) return;
    const { error } = await supabase.from("brand_catalog").insert({ name: name.trim(), category: cat });
    if (error) return toast({ title: "Error", description: error.message, variant: "destructive" });
    setName(""); void load();
  };
  const del = async (id: string) => { await supabase.from("brand_catalog").delete().eq("id", id); void load(); };
  const toggle = async (id: string, active: boolean) => { await supabase.from("brand_catalog").update({ active }).eq("id", id); void load(); };

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
    </div>
  );
}