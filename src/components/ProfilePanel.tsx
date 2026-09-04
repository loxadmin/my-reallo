import { useAuth } from "@/contexts/AuthContext";
import { useCurrency } from "@/contexts/CurrencyContext";
import GlassCard from "./GlassCard";
import GlassButton from "./GlassButton";
import { LogOut, User, Mail, Star, Hash, Calendar, Zap } from "lucide-react";
import { useNavigate } from "react-router-dom";
import CurrencySelect from "./CurrencySelect";

const ProfilePanel = () => {
  const { profile, signOut } = useAuth();
  const { formatCurrency } = useCurrency();
  const navigate = useNavigate();

  if (!profile) return null;

  const pointsNaira = Math.floor((profile.points_balance || 0) * 0.5);

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="text-center space-y-2">
        <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto border-2 border-primary/20 shadow-inner">
          <User className="w-10 h-10 text-primary" />
        </div>
        <h2 className="text-xl font-bold text-foreground">Your Profile</h2>
        <p className="text-[13px] text-muted-foreground">{profile.email}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <GlassCard className="p-5 flex flex-col items-center justify-center text-center space-y-2 group hover:border-primary/30 transition-all duration-300">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform">
            <Star className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest">Points Balance</p>
            <p className="text-xl font-bold text-foreground">{(profile.points_balance || 0).toLocaleString()}</p>
            <p className="text-[11px] text-primary font-medium mt-1">≈ {formatCurrency(pointsNaira)}</p>
          </div>
        </GlassCard>

        <GlassCard className="p-5 flex flex-col items-center justify-center text-center space-y-2 group hover:border-primary/30 transition-all duration-300">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform">
            <Zap className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest">Queue Position</p>
            <p className="text-xl font-bold text-foreground">#{profile.queue_position ?? "—"}</p>
            <p className="text-[11px] text-muted-foreground mt-1">
              {profile.queue_position && profile.queue_position <= 0 ? "You're off the queue!" : "Moving up daily"}
            </p>
          </div>
        </GlassCard>
      </div>

      <LegalNameCard />

      <GlassCard className="p-0 overflow-hidden divide-y divide-border/30">

        <div className="p-4 flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Currency</p>
            <p className="text-[12px] text-muted-foreground">Every amount in Karbali is shown in this currency.</p>
          </div>
          <CurrencySelect compact />
        </div>
        <div className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-muted/50 flex items-center justify-center">
              <Mail className="w-4 h-4 text-muted-foreground" />
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Email Address</p>
              <p className="text-[13px] text-foreground font-medium">{profile.email}</p>
            </div>
          </div>
        </div>

        <div className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-muted/50 flex items-center justify-center">
              <Hash className="w-4 h-4 text-muted-foreground" />
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Referral Code</p>
              <p className="text-[13px] text-foreground font-mono font-bold tracking-wider">{profile.referral_code || "—"}</p>
            </div>
          </div>
          <button
            onClick={() => {
              if (profile.referral_code) {
                navigator.clipboard.writeText(profile.referral_code);
                // Simple feedback would be nice, but keeping it minimal for now
              }
            }}
            className="text-[11px] text-primary font-semibold hover:underline"
          >
            Copy
          </button>
        </div>

        <div className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-muted/50 flex items-center justify-center">
              <Calendar className="w-4 h-4 text-muted-foreground" />
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Member Since</p>
              <p className="text-[13px] text-foreground font-medium">
                {profile.created_at ? new Date(profile.created_at).toLocaleDateString("en-NG", { day: "numeric", month: "long", year: "numeric" }) : "—"}
              </p>
            </div>
          </div>
        </div>
      </GlassCard>

      <div className="pt-4">
        <GlassButton
          variant="outline"
          onClick={handleSignOut}
          className="w-full h-12 rounded-2xl text-destructive hover:bg-destructive/10 hover:border-destructive/30 transition-all border-destructive/20"
        >
          <LogOut className="w-4 h-4 mr-2" />
          Sign Out
        </GlassButton>
      </div>

      <p className="text-center text-[10px] text-muted-foreground px-8 leading-relaxed">
        Karbali uses bank-grade security to protect your data. Your spend information is only used to verify your claims.
      </p>
    </div>
  );
};

export default ProfilePanel;
