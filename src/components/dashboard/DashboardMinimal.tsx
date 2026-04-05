import { useAuth } from "@/contexts/AuthContext";
import { useCurrency } from "@/contexts/CurrencyContext";
import { useState, useCallback, useEffect } from "react";
import { Copy, Check, Share2, Sparkles, TrendingUp } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import useEmblaCarousel from "embla-carousel-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

const DashboardMinimal = () => {
  const { profile } = useAuth();
  const { formatCurrency } = useCurrency();
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true, align: "center" });
  const [selectedIndex, setSelectedIndex] = useState(0);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setSelectedIndex(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    onSelect();
    emblaApi.on("select", onSelect);
    return () => { emblaApi.off("select", onSelect); };
  }, [emblaApi, onSelect]);

  if (!profile) return null;

  const isOnQueue = (profile.queue_position ?? 0) > 0;
  const pointsNaira = (profile.points_balance ?? 0) * 0.5;

  const handleCopy = () => {
    navigator.clipboard.writeText(profile.referral_code || "");
    setCopied(true);
    toast({ title: "Copied!" });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = () => {
    const url = `${window.location.origin}/auth?ref=${profile.referral_code}`;
    if (navigator.share) {
      navigator.share({ title: "Join Karbali", url });
    } else {
      navigator.clipboard.writeText(url);
      toast({ title: "Link copied!" });
    }
  };

  return (
    <div className="p-5 lg:p-8 max-w-lg mx-auto space-y-8">
      {/* Balance - Ultra minimal */}
      <div className="text-center pt-8">
        <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-medium">Balance</p>
        <p className="text-5xl font-extralight text-foreground mt-2 tracking-tight">{formatCurrency(pointsNaira)}</p>
        <p className="text-xs text-muted-foreground mt-1">{(profile.points_balance ?? 0).toLocaleString()} pts</p>
      </div>

      {/* Action Slider */}
      <div className="relative">
        <div ref={emblaRef} className="overflow-hidden">
          <div className="flex">
            {/* Slide 1: Influencer */}
            <div className="min-w-0 shrink-0 grow-0 basis-full px-4">
              <div className="glass-card rounded-3xl p-6 text-center space-y-4 relative overflow-hidden">
                <div
                  className="absolute inset-0 opacity-10 pointer-events-none"
                  style={{
                    background: "radial-gradient(circle at 50% 50%, hsl(var(--primary)) 0%, transparent 70%)",
                    animation: "waterFlow 8s ease-in-out infinite",
                  }}
                />
                <div className="flex flex-col items-center gap-2">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-1">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <h3 className="text-sm font-semibold text-foreground leading-tight px-4">
                    Become an influencer and earn up to 100k weekly
                  </h3>
                </div>
                <button
                  onClick={() => navigate("/dashboard/influencer")}
                  className="relative group px-6 py-2.5 rounded-2xl font-semibold text-[13px] transition-all duration-500 overflow-hidden pulse-glow"
                >
                  <span className="absolute inset-0 bg-primary/20 backdrop-blur-md border border-primary/30" />
                  <span
                    className="absolute inset-0 opacity-40 transition-opacity duration-500 group-hover:opacity-60"
                    style={{
                      background: "linear-gradient(135deg, hsl(var(--primary)/0.4), hsl(var(--primary)/0.1))",
                      animation: "waterFlow 4s ease-in-out infinite",
                    }}
                  />
                  <span className="relative text-primary">Become an Influencer</span>
                </button>
              </div>
            </div>

            {/* Slide 2: Earn/Tasks */}
            <div className="min-w-0 shrink-0 grow-0 basis-full px-4">
              <div className="glass-card rounded-3xl p-6 text-center space-y-4 relative overflow-hidden">
                <div
                  className="absolute inset-0 opacity-10 pointer-events-none"
                  style={{
                    background: "radial-gradient(circle at 50% 50%, hsl(var(--primary)) 0%, transparent 70%)",
                    animation: "waterFlow2 8s ease-in-out infinite",
                  }}
                />
                <div className="flex flex-col items-center gap-2">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-1">
                    <TrendingUp className="w-5 h-5" />
                  </div>
                  <h3 className="text-sm font-semibold text-foreground leading-tight px-2">
                    Do tasks and use our partner brands to get up to 70% of all your expenses
                  </h3>
                </div>
                <button
                  onClick={() => navigate("/dashboard/earn")}
                  className="relative group px-6 py-2.5 rounded-2xl font-semibold text-[13px] transition-all duration-500 overflow-hidden pulse-glow"
                >
                  <span className="absolute inset-0 bg-primary/20 backdrop-blur-md border border-primary/30" />
                  <span
                    className="absolute inset-0 opacity-40 transition-opacity duration-500 group-hover:opacity-60"
                    style={{
                      background: "linear-gradient(135deg, hsl(var(--primary)/0.4), hsl(var(--primary)/0.1))",
                      animation: "waterFlow 4s ease-in-out infinite",
                    }}
                  />
                  <span className="relative text-primary">Start Earning</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Dots */}
        <div className="flex justify-center gap-1.5 mt-4">
          {[0, 1].map((idx) => (
            <button
              key={idx}
              onClick={() => emblaApi?.scrollTo(idx)}
              className={cn(
                "w-1.5 h-1.5 rounded-full transition-all duration-300",
                selectedIndex === idx ? "bg-primary w-4" : "bg-primary/20"
              )}
            />
          ))}
        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-border/30" />

      {/* Stats row */}
      <div className="grid grid-cols-3 text-center gap-4">
        <div>
          <p className="text-[9px] uppercase tracking-widest text-muted-foreground">Spend</p>
          <p className="text-sm font-medium text-foreground mt-1">{formatCurrency(profile.total_annual_spend ?? 0)}</p>
        </div>
        <div>
          <p className="text-[9px] uppercase tracking-widest text-muted-foreground">Queue</p>
          <p className="text-sm font-medium text-foreground mt-1">
            {isOnQueue ? `#${profile.queue_position}` : "Done ✓"}
          </p>
        </div>
        <div>
          <p className="text-[9px] uppercase tracking-widest text-muted-foreground">Goal</p>
          <p className="text-sm font-medium text-foreground mt-1 capitalize">{profile.selected_goal || "—"}</p>
        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-border/30" />

      {/* Referral - Clean */}
      <div className="text-center space-y-3">
        <p className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-medium">Referral Code</p>
        <p className="text-2xl font-light tracking-[0.3em] text-foreground">{profile.referral_code}</p>
        <p className="text-[11px] text-muted-foreground max-w-xs mx-auto">
          {isOnQueue ? "Skip 20 queue positions per referral" : "Earn ₦500 per friend who joins"}
        </p>
        <div className="flex items-center justify-center gap-3 pt-1">
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors px-3 py-2 rounded-lg border border-border/40 hover:border-border"
          >
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? "Copied" : "Copy"}
          </button>
          <button
            onClick={handleShare}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors px-3 py-2 rounded-lg border border-border/40 hover:border-border"
          >
            <Share2 className="w-3.5 h-3.5" />
            Share
          </button>
        </div>
      </div>
    </div>
  );
};

export default DashboardMinimal;
