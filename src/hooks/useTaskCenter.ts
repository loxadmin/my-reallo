import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type EvidenceRule = { type: "photo" | "video" | "scan" | "receipt"; label?: string; count?: number };

export interface UserTask {
  id: string;
  title: string;
  description: string | null;
  instructions: string | null;
  task_type: string;
  mode: string;
  duration_days: number;
  evidence_config: EvidenceRule[];
  reward_points: number;
  switch_from_brand: string | null;
  switch_to_brand: string | null;
  category: string | null;
  is_active: boolean;
}

export interface TaskEnrollment {
  id: string;
  task_id: string;
  status: string;
  approved_days: number;
  started_at: string;
  completed_at: string | null;
}

export interface TaskSubmission {
  id: string;
  enrollment_id: string;
  day_index: number;
  status: string;
  reviewer_notes: string | null;
  created_at: string;
}

export const EVIDENCE_LABELS: Record<string, string> = {
  photo: "Photo / screenshot",
  video: "Video recording",
  scan: "Product code / barcode scan",
  receipt: "Receipt or transaction proof",
};

export function useTaskCenter() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<UserTask[]>([]);
  const [enrollments, setEnrollments] = useState<TaskEnrollment[]>([]);
  const [submissions, setSubmissions] = useState<TaskSubmission[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data: taskRows } = await supabase
        .from("user_tasks")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      const normalized = (taskRows ?? []).map((t: any) => ({
        ...t,
        evidence_config: Array.isArray(t.evidence_config) ? (t.evidence_config as EvidenceRule[]) : [],
      })) as UserTask[];
      setTasks(normalized);

      if (!user) {
        setEnrollments([]);
        setSubmissions([]);
        return;
      }

      const { data: enrRows } = await supabase
        .from("user_task_enrollments")
        .select("id, task_id, status, approved_days, started_at, completed_at")
        .eq("user_id", user.id);
      setEnrollments((enrRows ?? []) as TaskEnrollment[]);

      const ids = (enrRows ?? []).map((e: any) => e.id);
      if (ids.length) {
        const { data: subRows } = await supabase
          .from("user_task_submissions")
          .select("id, enrollment_id, day_index, status, reviewer_notes, created_at")
          .in("enrollment_id", ids)
          .order("day_index");
        setSubmissions((subRows ?? []) as TaskSubmission[]);
      } else {
        setSubmissions([]);
      }
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { void load(); }, [load]);

  const enroll = async (taskId: string) => {
    if (!user) throw new Error("Sign in required");
    const { error } = await supabase
      .from("user_task_enrollments")
      .insert({ user_id: user.id, task_id: taskId });
    if (error && !error.message.includes("duplicate")) throw error;
    await load();
  };

  return { tasks, enrollments, submissions, loading, reload: load, enroll };
}

export function taskProgress(task: UserTask, enrollment?: TaskEnrollment, submissions: TaskSubmission[] = []) {
  const days = Array.from({ length: Math.max(1, task.duration_days) }, (_, i) => i + 1);
  return days.map((day) => {
    const sub = submissions.find((s) => s.enrollment_id === enrollment?.id && s.day_index === day);
    return { day, status: (sub?.status ?? "locked") as "locked" | "pending" | "approved" | "rejected", submission: sub };
  });
}
