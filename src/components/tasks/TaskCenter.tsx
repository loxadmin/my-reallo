import { useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import {
  ArrowLeftRight, Check, Clock, Globe, Loader2, MapPin, MessageSquare,
  Upload, X, Video, ScanLine, Receipt, Camera,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  EVIDENCE_LABELS, taskProgress, useTaskCenter,
  type EvidenceRule, type UserTask,
} from "@/hooks/useTaskCenter";

const GROUPS = [
  { id: "switching", label: "Switching", icon: ArrowLeftRight, blurb: "Switch brands and prove it daily" },
  { id: "online", label: "Online", icon: Globe, blurb: "Complete tasks from your phone" },
  { id: "survey", label: "Surveys", icon: MessageSquare, blurb: "Share your opinion, earn points" },
] as const;

const evidenceIcon = (type: string) =>
  type === "video" ? Video : type === "scan" ? ScanLine : type === "receipt" ? Receipt : Camera;

const acceptFor = (type: string) => (type === "video" ? "video/*" : "image/*");

export default function TaskCenter({ onOpenSurveys }: { onOpenSurveys?: () => void }) {
  const { user } = useAuth();
  const { tasks, enrollments, submissions, loading, reload, enroll } = useTaskCenter();
  const [group, setGroup] = useState<(typeof GROUPS)[number]["id"]>("switching");
  const [openTask, setOpenTask] = useState<UserTask | null>(null);

  const grouped = useMemo(() => {
    return tasks.filter((t) => {
      if (group === "switching") return t.task_type === "switching";
      if (group === "online") return t.task_type === "online" || t.task_type === "offline";
      return t.task_type === "survey";
    });
  }, [tasks, group]);

  const enrollmentFor = (taskId: string) => enrollments.find((e) => e.task_id === taskId);

  if (loading) {
    return <div className="glass-card p-6 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2">
        {GROUPS.map((g) => {
          const Icon = g.icon;
          const active = group === g.id;
          return (
            <button
              key={g.id}
              onClick={() => setGroup(g.id)}
              className={cn(
                "rounded-2xl px-3 py-3 border text-left transition-all",
                active ? "border-primary/50 bg-primary/10" : "border-border/60 bg-card/60 hover:border-primary/30",
              )}
            >
              <Icon className={cn("w-4 h-4 mb-1.5", active ? "text-primary" : "text-muted-foreground")} />
              <div className="text-[12px] font-semibold text-foreground">{g.label}</div>
              <div className="text-[10px] text-muted-foreground leading-tight">{g.blurb}</div>
            </button>
          );
        })}
      </div>

      {group === "survey" ? (
        <button onClick={onOpenSurveys} className="w-full glass-card p-5 text-left hover:border-primary/40 transition-colors">
          <h3 className="text-[14px] font-semibold text-foreground">Open surveys</h3>
          <p className="text-[11px] text-muted-foreground mt-1">Answer available surveys and earn points instantly.</p>
        </button>
      ) : grouped.length === 0 ? (
        <div className="glass-card p-6 text-center">
          <p className="text-[12px] text-muted-foreground">No {group} tasks available right now. Check back soon.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {grouped.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              enrollment={enrollmentFor(task.id)}
              submissions={submissions}
              onEnroll={async () => {
                try { await enroll(task.id); toast.success("Task started"); }
                catch (e: any) { toast.error(e.message ?? "Could not start task"); }
              }}
              onOpen={() => setOpenTask(task)}
            />
          ))}
        </div>
      )}

      {openTask && (
        <TaskDayDrawer
          task={openTask}
          enrollmentId={enrollmentFor(openTask.id)?.id}
          submissions={submissions}
          userId={user?.id}
          onClose={() => setOpenTask(null)}
          onSubmitted={reload}
        />
      )}
    </div>
  );
}

function TaskCard({ task, enrollment, submissions, onEnroll, onOpen }: {
  task: UserTask;
  enrollment?: { id: string; status: string; approved_days: number };
  submissions: any[];
  onEnroll: () => void;
  onOpen: () => void;
}) {
  const days = taskProgress(task, enrollment as any, submissions);
  const approved = days.filter((d) => d.status === "approved").length;
  const pct = Math.round((approved / task.duration_days) * 100);

  return (
    <div className="glass-card p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-[14px] font-semibold text-foreground truncate">{task.title}</h3>
            <span className={cn(
              "text-[9px] uppercase tracking-wide px-1.5 py-0.5 rounded-full",
              task.mode === "offline" ? "bg-amber-500/15 text-amber-600" : "bg-primary/10 text-primary",
            )}>
              {task.mode === "offline" ? <span className="inline-flex items-center gap-1"><MapPin className="w-2.5 h-2.5" />Offline</span> : "Online"}
            </span>
          </div>
          {task.switch_from_brand && (
            <p className="text-[11px] text-muted-foreground mt-0.5 inline-flex items-center gap-1">
              {task.switch_from_brand} <ArrowLeftRight className="w-3 h-3" /> {task.switch_to_brand ?? "Karbali partner"}
            </p>
          )}
          {task.description && <p className="text-[11px] text-muted-foreground mt-1">{task.description}</p>}
        </div>
        <div className="text-right shrink-0">
          <div className="text-[13px] font-bold text-primary">{task.reward_points.toLocaleString()}</div>
          <div className="text-[9px] text-muted-foreground uppercase tracking-wide">points</div>
        </div>
      </div>

      <div className="flex flex-wrap gap-1">
        <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground inline-flex items-center gap-1">
          <Clock className="w-2.5 h-2.5" />{task.duration_days} day{task.duration_days > 1 ? "s" : ""}
        </span>
        {(task.evidence_config ?? []).map((rule: EvidenceRule, i: number) => {
          const Icon = evidenceIcon(rule.type);
          return (
            <span key={i} className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground inline-flex items-center gap-1">
              <Icon className="w-2.5 h-2.5" />{rule.label || EVIDENCE_LABELS[rule.type]}{rule.count && rule.count > 1 ? ` ×${rule.count}` : ""}
            </span>
          );
        })}
      </div>

      {enrollment ? (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-[10px] text-muted-foreground">
            <span>{approved} of {task.duration_days} days approved</span>
            <span>{pct}%</span>
          </div>
          <div className="h-1.5 rounded-full bg-muted overflow-hidden">
            <div className="h-full bg-primary transition-all" style={{ width: `${pct}%` }} />
          </div>
          <div className="flex flex-wrap gap-1.5">
            {days.map((d) => (
              <div
                key={d.day}
                title={`Day ${d.day} — ${d.status}`}
                className={cn(
                  "w-6 h-6 rounded-md text-[9px] font-semibold flex items-center justify-center border",
                  d.status === "approved" && "bg-primary text-primary-foreground border-primary",
                  d.status === "pending" && "bg-amber-500/15 text-amber-600 border-amber-500/40",
                  d.status === "rejected" && "bg-destructive/15 text-destructive border-destructive/40",
                  d.status === "locked" && "bg-muted/50 text-muted-foreground border-border",
                )}
              >
                {d.status === "approved" ? <Check className="w-3 h-3" /> : d.status === "rejected" ? <X className="w-3 h-3" /> : d.day}
              </div>
            ))}
          </div>
          {enrollment.status === "completed" ? (
            <div className="text-[11px] text-primary font-medium inline-flex items-center gap-1"><Check className="w-3.5 h-3.5" />Completed — reward credited</div>
          ) : (
            <button onClick={onOpen} className="w-full py-2 rounded-xl bg-primary text-primary-foreground text-[12px] font-medium inline-flex items-center justify-center gap-1.5">
              <Upload className="w-3.5 h-3.5" />Upload today's proof
            </button>
          )}
        </div>
      ) : (
        <button onClick={onEnroll} className="w-full py-2 rounded-xl bg-primary text-primary-foreground text-[12px] font-medium">
          Start this task
        </button>
      )}
    </div>
  );
}

function TaskDayDrawer({ task, enrollmentId, submissions, userId, onClose, onSubmitted }: {
  task: UserTask;
  enrollmentId?: string;
  submissions: any[];
  userId?: string;
  onClose: () => void;
  onSubmitted: () => void;
}) {
  const days = taskProgress(task, { id: enrollmentId } as any, submissions);
  const nextDay = days.find((d) => d.status === "locked" || d.status === "rejected")?.day ?? task.duration_days;
  const rules: EvidenceRule[] = (task.evidence_config ?? []).length ? task.evidence_config : [{ type: "photo", count: 1 }];
  const [files, setFiles] = useState<Record<number, File[]>>({});
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const inputs = useRef<Record<number, HTMLInputElement | null>>({});

  const submit = async () => {
    if (!enrollmentId || !userId) return;
    const missing = rules.some((r, i) => (files[i]?.length ?? 0) < (r.count ?? 1));
    if (missing) return toast.error("Please attach every required piece of evidence");
    setBusy(true);
    try {
      const evidence: { type: string; path: string }[] = [];
      for (let i = 0; i < rules.length; i++) {
        for (const file of files[i] ?? []) {
          const path = `${userId}/${enrollmentId}/day-${nextDay}-${crypto.randomUUID()}-${file.name.replace(/[^\w.-]/g, "_")}`;
          const { error } = await supabase.storage.from("task-evidence").upload(path, file, { upsert: false });
          if (error) throw error;
          evidence.push({ type: rules[i].type, path });
        }
      }
      const { error } = await supabase.from("user_task_submissions").insert({
        enrollment_id: enrollmentId,
        user_id: userId,
        day_index: nextDay,
        evidence: evidence as any,
        note: note.trim() || null,
        status: "pending",
      });
      if (error) throw error;
      toast.success(`Day ${nextDay} submitted for review`);
      onSubmitted();
      onClose();
    } catch (e: any) {
      toast.error(e.message ?? "Upload failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] bg-background/90 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="w-full sm:max-w-md max-h-[92vh] overflow-y-auto bg-card border rounded-t-2xl sm:rounded-2xl">
        <div className="flex items-center justify-between px-4 py-3 border-b sticky top-0 bg-card">
          <div>
            <div className="text-[13px] font-semibold">{task.title}</div>
            <div className="text-[11px] text-muted-foreground">Day {nextDay} of {task.duration_days}</div>
          </div>
          <button onClick={onClose} aria-label="Close" className="p-1 text-muted-foreground"><X className="w-4 h-4" /></button>
        </div>

        <div className="p-4 space-y-4">
          {task.instructions && (
            <div className="rounded-xl bg-muted/60 p-3 text-[11px] text-muted-foreground whitespace-pre-line">{task.instructions}</div>
          )}

          {rules.map((rule, i) => {
            const Icon = evidenceIcon(rule.type);
            const count = rule.count ?? 1;
            const chosen = files[i]?.length ?? 0;
            return (
              <div key={i} className="space-y-1.5">
                <div className="text-[12px] font-medium text-foreground inline-flex items-center gap-1.5">
                  <Icon className="w-3.5 h-3.5 text-primary" />
                  {rule.label || EVIDENCE_LABELS[rule.type]} {count > 1 ? `(${count} required)` : ""}
                </div>
                <input
                  ref={(el) => { inputs.current[i] = el; }}
                  type="file"
                  accept={acceptFor(rule.type)}
                  multiple={count > 1}
                  capture={rule.type === "scan" || rule.type === "video" ? "environment" : undefined}
                  onChange={(e) => setFiles((f) => ({ ...f, [i]: Array.from(e.target.files ?? []).slice(0, count) }))}
                  className="w-full text-[11px] file:mr-3 file:px-3 file:py-1.5 file:rounded-lg file:border-0 file:bg-primary file:text-primary-foreground"
                />
                <div className="text-[10px] text-muted-foreground">{chosen}/{count} attached</div>
              </div>
            );
          })}

          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Add a note for the reviewer (optional)"
            className="w-full px-3 py-2 rounded-xl border bg-background text-[12px] min-h-[70px]"
            style={{ fontSize: 16 }}
          />

          <button
            onClick={submit}
            disabled={busy}
            className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground text-[13px] font-medium inline-flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            Submit day {nextDay}
          </button>
          <p className="text-[10px] text-muted-foreground text-center">An admin reviews every day's proof. Your reward is credited once all {task.duration_days} days are approved.</p>
        </div>
      </div>
    </div>
  );
}
