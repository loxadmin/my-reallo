import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { IdCard, Loader2, Check } from "lucide-react";

/**
 * Full legal name capture. Withdrawals are only approved to a bank account
 * whose name matches this, so Google signups and older accounts are prompted too.
 */
export default function LegalNameCard({ compact = false }: { compact?: boolean }) {
  const { profile, refreshProfile } = useAuth() as any;
  const existing = (profile as any)?.legal_name ?? "";
  const [name, setName] = useState(existing);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    const trimmed = name.trim();
    if (trimmed.split(/\s+/).length < 2 || trimmed.length < 5) {
      toast.error("Enter your full legal name as it appears on your bank account");
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ legal_name: trimmed, legal_name_updated_at: new Date().toISOString() } as any)
        .eq("id", profile.id);
      if (error) throw error;
      toast.success("Legal name saved");
      await refreshProfile?.();
    } catch (e: any) {
      toast.error(e?.message ?? "Could not save your name");
    } finally {
      setSaving(false);
    }
  };

  if (!profile) return null;

  return (
    <div className={`rounded-2xl border ${existing ? "border-border" : "border-primary/40 bg-primary/5"} p-4 space-y-2`}>
      <span className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
        <IdCard className="w-3 h-3 text-primary" /> Full legal name
      </span>
      {!compact && (
        <p className="text-[12px] text-muted-foreground">
          Withdrawals are only approved to a bank account in this exact name.
        </p>
      )}
      <div className="flex gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Chidi Emeka Okafor"
          className="flex-1 px-3 py-2.5 rounded-xl border border-border bg-background text-[14px]"
          style={{ fontSize: 16 }}
        />
        <button
          onClick={() => void save()}
          disabled={saving || name.trim() === existing.trim()}
          className="px-4 rounded-xl bg-primary text-primary-foreground text-[12px] font-medium disabled:opacity-50 inline-flex items-center gap-1.5"
        >
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />} Save
        </button>
      </div>
    </div>
  );
}
