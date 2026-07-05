import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { Upload, CheckCircle2, Clock, XCircle } from "lucide-react";

interface Props {
  campaignId: string;
  campaignTitle?: string;
  durationDays: number;
  eligibilityId?: string | null;
}

type Proof = { id: string; day_index: number; status: "pending" | "approved" | "rejected"; screenshot_url: string; admin_note: string | null; created_at: string };
type Enroll = { id: string; expected_days: number; status: string; started_at: string };

export default function OfferEnrollmentCard({ campaignId, campaignTitle, durationDays, eligibilityId }: Props) {
  const { user } = useAuth();
  const [enroll, setEnroll] = useState<Enroll | null>(null);
  const [proofs, setProofs] = useState<Proof[]>([]);
  const [uploading, setUploading] = useState(false);

  const load = async () => {
    if (!user) return;
    const { data: e } = await supabase.from("offer_enrollments").select("*")
      .eq("user_id", user.id).eq("campaign_id", campaignId).order("started_at", { ascending: false }).limit(1).maybeSingle();
    setEnroll(e as any);
    if (e) {
      const { data: p } = await supabase.from("offer_daily_proofs").select("*")
        .eq("enrollment_id", (e as any).id).order("day_index");
      setProofs((p as any) ?? []);
    }
  };
  useEffect(() => { void load(); }, [user?.id, campaignId]);

  const currentDay = useMemo(() => {
    if (!enroll) return 0;
    const start = new Date(enroll.started_at).getTime();
    const diffDays = Math.floor((Date.now() - start) / 86_400_000) + 1;
    return Math.min(diffDays, enroll.expected_days);
  }, [enroll]);

  const todayUploaded = proofs.some(p => p.day_index === currentDay);
  const approved = proofs.filter(p => p.status === "approved").length;

  const startEnrollment = async () => {
    if (!user) return;
    const { data, error } = await supabase.from("offer_enrollments").insert({
      user_id: user.id, campaign_id: campaignId, eligibility_id: eligibilityId ?? null, expected_days: durationDays,
    }).select().single();
    if (error) return toast({ title: "Error", description: error.message, variant: "destructive" });
    setEnroll(data as any);
  };

  const uploadToday = async (file: File) => {
    if (!user || !enroll) return;
    if (todayUploaded) return toast({ title: "Already uploaded", description: "Come back tomorrow for the next day." });
    setUploading(true);
    try {
      const path = `offers/${user.id}/${enroll.id}/day-${currentDay}-${Date.now()}.${file.name.split(".").pop() ?? "jpg"}`;
      const { error: upErr } = await supabase.storage.from("survey_screenshots").upload(path, file, { upsert: false });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from("survey_screenshots").getPublicUrl(path);
      const { error: insErr } = await supabase.from("offer_daily_proofs").insert({
        enrollment_id: enroll.id, user_id: user.id, day_index: currentDay,
        screenshot_url: pub.publicUrl, status: "pending",
      });
      if (insErr) throw insErr;
      toast({ title: "Uploaded", description: `Day ${currentDay} of ${enroll.expected_days} submitted for admin review.` });
      await load();
    } catch (e: any) {
      toast({ title: "Upload failed", description: e?.message ?? "", variant: "destructive" });
    } finally { setUploading(false); }
  };

  if (!enroll) {
    return (
      <div className="border border-border/40 rounded-lg p-3 text-xs space-y-2">
        <div className="font-medium text-sm">{campaignTitle ?? campaignId}</div>
        <div className="text-muted-foreground">Requires {durationDays} daily screenshot{durationDays > 1 ? "s" : ""} — one per day.</div>
        <button onClick={startEnrollment} className="px-3 py-1.5 rounded-md bg-primary text-primary-foreground">Accept offer</button>
      </div>
    );
  }

  return (
    <div className="border border-border/40 rounded-lg p-3 text-xs space-y-2">
      <div className="flex justify-between items-center">
        <div className="font-medium text-sm">{campaignTitle ?? campaignId}</div>
        <div className="text-[10px] text-muted-foreground">{approved}/{enroll.expected_days} approved</div>
      </div>
      <div className="grid grid-cols-5 gap-1">
        {Array.from({ length: enroll.expected_days }, (_, i) => {
          const d = i + 1;
          const p = proofs.find(x => x.day_index === d);
          return (
            <div key={d} className={`aspect-square rounded flex items-center justify-center text-[10px] border ${
              p?.status === "approved" ? "bg-emerald-500/20 border-emerald-500/40" :
              p?.status === "rejected" ? "bg-destructive/10 border-destructive/40" :
              p ? "bg-amber-500/10 border-amber-500/40" :
              d === currentDay ? "border-primary" : "opacity-40"
            }`}>
              {p?.status === "approved" ? <CheckCircle2 className="w-3 h-3" /> :
               p?.status === "rejected" ? <XCircle className="w-3 h-3" /> :
               p ? <Clock className="w-3 h-3" /> : d}
            </div>
          );
        })}
      </div>
      {enroll.status === "completed" ? (
        <div className="text-emerald-500 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Offer completed!</div>
      ) : todayUploaded ? (
        <div className="text-muted-foreground">Today's screenshot submitted — awaiting review.</div>
      ) : (
        <label className="flex items-center gap-2 cursor-pointer text-primary">
          <Upload className="w-3 h-3" />
          <span>Upload day {currentDay} screenshot</span>
          <input type="file" accept="image/*" className="hidden" disabled={uploading}
            onChange={e => { const f = e.target.files?.[0]; if (f) void uploadToday(f); }} />
        </label>
      )}
      {proofs.filter(p => p.status === "rejected" && p.admin_note).slice(-1).map(p => (
        <div key={p.id} className="text-destructive">Day {p.day_index} rejected: {p.admin_note}</div>
      ))}
    </div>
  );
}