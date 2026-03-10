import { Bell, Check, AlertTriangle, Ban, Info, CheckCircle2, Star } from "lucide-react";
import GlassCard from "./GlassCard";
import GlassButton from "./GlassButton";
import { useNotifications } from "@/contexts/NotificationContext";
import PageSkeleton from "./PageSkeleton";

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
  const { notifications, unreadCount, loading, markAsRead, markAllRead } = useNotifications();

  if (loading) {
    return (
      <div className="max-w-md mx-auto px-4 py-8">
        <GlassCard className="p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-muted animate-pulse" />
            <div className="h-4 w-1/3 rounded-lg bg-muted animate-pulse" />
          </div>
          {[1, 2, 3].map(i => (
            <div key={i} className="h-16 w-full rounded-xl bg-muted animate-pulse" />
          ))}
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
            <h3 className="font-semibold text-foreground text-sm">Notifications</h3>
            {unreadCount > 0 && (
              <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">{unreadCount} new</span>
            )}
          </div>
          {unreadCount > 0 && (
            <GlassButton variant="outline" onClick={markAllRead} className="text-xs px-2 py-1">
              <Check className="w-3 h-3 mr-1" /> Mark all read
            </GlassButton>
          )}
        </div>

        {notifications.length === 0 ? (
          <div className="text-center py-8">
            <Bell className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No notifications yet</p>
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
                        <p className="text-sm font-semibold text-foreground">{n.title}</p>
                        {!n.is_read && <span className="w-2 h-2 rounded-full bg-primary shrink-0" />}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{n.message}</p>
                      <p className="text-xs text-muted-foreground mt-1.5 font-medium opacity-70">{new Date(n.created_at).toLocaleString()}</p>
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
