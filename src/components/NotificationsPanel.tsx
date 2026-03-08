import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import GlassCard from "./GlassCard";
import GlassButton from "./GlassButton";
import { Bell, Check, AlertTriangle, Ban, Info, CheckCircle2, Star } from "lucide-react";

interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

const typeIcons: Record<string, typeof Bell> = {
  info: Info,
  warning: AlertTriangle,
  ban: Ban,
  success: CheckCircle2,
  earning: Star,
};

const typeColors: Record<string, string> = {
  info: "text-primary",
  warning: "text-yellow-600",
  ban: "text-destructive",
  success: "text-primary",
  earning: "text-primary",
};

const NotificationsPanel = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) fetchNotifications();
  }, [user]);

  const fetchNotifications = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("notifications" as any)
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50);
    setNotifications((data || []) as unknown as Notification[]);
    setLoading(false);
  };

  const markAsRead = async (id: string) => {
    await supabase.from("notifications" as any).update({ is_read: true } as any).eq("id", id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
  };

  const markAllRead = async () => {
    if (!user) return;
    await supabase.from("notifications" as any).update({ is_read: true } as any).eq("user_id", user.id).eq("is_read", false);
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  if (loading) {
    return (
      <div className="max-w-md mx-auto px-4 py-8">
        <GlassCard>
          <p className="text-center text-muted-foreground text-[13px]">Loading notifications...</p>
        </GlassCard>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto px-4 py-8 space-y-4">
      <GlassCard variant="strong">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-primary" />
            <h3 className="font-semibold text-foreground text-[13px]">Notifications</h3>
            {unreadCount > 0 && (
              <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full">{unreadCount} new</span>
            )}
          </div>
          {unreadCount > 0 && (
            <GlassButton variant="outline" onClick={markAllRead} className="text-[10px] px-2 py-1">
              <Check className="w-3 h-3 mr-1" /> Mark all read
            </GlassButton>
          )}
        </div>

        {notifications.length === 0 ? (
          <div className="text-center py-8">
            <Bell className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-[13px] text-muted-foreground">No notifications yet</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-[500px] overflow-y-auto">
            {notifications.map(n => {
              const Icon = typeIcons[n.type] || Bell;
              const color = typeColors[n.type] || "text-muted-foreground";
              return (
                <div
                  key={n.id}
                  className={`glass rounded-xl p-3 cursor-pointer transition-all ${!n.is_read ? 'border border-primary/20' : 'opacity-70'}`}
                  onClick={() => !n.is_read && markAsRead(n.id)}
                >
                  <div className="flex items-start gap-2">
                    <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${color}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-[12px] font-semibold text-foreground">{n.title}</p>
                        {!n.is_read && <span className="w-2 h-2 rounded-full bg-primary shrink-0" />}
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-0.5">{n.message}</p>
                      <p className="text-[9px] text-muted-foreground mt-1">{new Date(n.created_at).toLocaleString()}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </GlassCard>
    </div>
  );
};

export default NotificationsPanel;
