import { useTaskCenter, taskProgress } from "@/hooks/useTaskCenter";
import { ArrowLeftRight, Check } from "lucide-react";
import { cn } from "@/lib/utils";

/** Compact active-task progress summary, used across every dashboard design. */
export default function TaskProgressStrip({ onOpen, className }: { onOpen?: () => void; className?: string }) {
  const { tasks, enrollments, submissions, loading } = useTaskCenter();
  if (loading) return null;

  const active = enrollments
    .filter((e) => e.status !== "completed")
    .map((e) => ({ enrollment: e, task: tasks.find((t) => t.id === e.task_id) }))
    .filter((x) => x.task) as { enrollment: any; task: any }[];

  if (active.length === 0) {
    return (
      <button onClick={onOpen} className={cn("w-full glass-card p-4 text-left hover:border-primary/40 transition-colors", className)}>
        <div className="text-[13px] font-semibold text-foreground">Start a task</div>
        <p className="text-[11px] text-muted-foreground mt-0.5">Switching, online and survey tasks unlock your goal faster.</p>
      </button>
    );
  }

  return (
    <div className={cn("glass-card p-4 space-y-3", className)}>
      <div className="flex items-center justify-between">
        <div className="text-[13px] font-semibold text-foreground">Your tasks</div>
        <button onClick={onOpen} className="text-[11px] text-primary">View all</button>
      </div>
      {active.slice(0, 3).map(({ task, enrollment }) => {
        const days = taskProgress(task, enrollment, submissions);
        const approved = days.filter((d) => d.status === "approved").length;
        const pct = Math.round((approved / task.duration_days) * 100);
        return (
          <div key={enrollment.id} className="space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[12px] text-foreground truncate inline-flex items-center gap-1">
                {task.switch_from_brand && <ArrowLeftRight className="w-3 h-3 text-primary shrink-0" />}
                {task.title}
              </span>
              <span className="text-[10px] text-muted-foreground shrink-0">{approved}/{task.duration_days} days</span>
            </div>
            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
              <div className="h-full bg-primary transition-all" style={{ width: `${pct}%` }} />
            </div>
            {pct === 100 && <div className="text-[10px] text-primary inline-flex items-center gap-1"><Check className="w-3 h-3" />All days approved</div>}
          </div>
        );
      })}
    </div>
  );
}
