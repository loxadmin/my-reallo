import { useState } from "react";
import GlassCard from "./GlassCard";
import GlassButton from "./GlassButton";
import { Share2, Copy, Check } from "lucide-react";

interface ReferralSectionProps {
  referralCode: string;
  referralLink: string;
  isOffQueue: boolean;
}

const ReferralSection = ({ referralCode, referralLink, isOffQueue }: ReferralSectionProps) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    if (navigator.share) {
      await navigator.share({ title: "Join Reallo", text: "Reclaim your utility spend!", url: referralLink });
    } else {
      handleCopy();
    }
  };

  return (
    <GlassCard variant="strong">
      <h3 className="font-display font-semibold text-foreground mb-3">
        {isOffQueue ? "Refer & Earn Points" : "Refer & Skip the Queue"}
      </h3>
      <p className="text-sm text-muted-foreground mb-4">
        {isOffQueue
          ? "Each referral earns you 1,000 points (₦500). Share your link!"
          : "For every friend you refer, skip 5 positions."}
      </p>
      {referralCode && (
        <>
          <p className="text-xs text-muted-foreground mb-1 font-display">Your referral code</p>
          <p className="font-display font-bold text-primary text-lg mb-3">{referralCode}</p>
          <div className="flex gap-2">
            <div className="flex-1 glass-input rounded-xl px-3 py-2.5 text-xs text-muted-foreground truncate">{referralLink}</div>
            <GlassButton variant="outline" onClick={handleCopy} className="px-3">
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            </GlassButton>
          </div>
          <GlassButton variant="primary" className="w-full mt-4" onClick={handleShare}>
            <Share2 className="inline w-4 h-4 mr-2" /> {isOffQueue ? "Share & Earn" : "Share Referral Link"}
          </GlassButton>
        </>
      )}
    </GlassCard>
  );
};

export default ReferralSection;
