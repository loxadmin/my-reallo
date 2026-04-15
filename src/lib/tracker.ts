
/**
 * Utility for Karbali Advertising events
 */

export const identifyUser = (userId: string) => {
  if (typeof window !== "undefined" && window.Karbali?.identify) {
    try {
      window.Karbali.identify(userId);
      console.log(`[KarbaliAds] User identified: ${userId}`);
    } catch (error) {
      console.error("[KarbaliAds] Error identifying user:", error);
    }
  }
};

export const trackDownload = (userId: string) => {
  if (typeof window !== "undefined" && window.Karbali?.trackDownload) {
    try {
      window.Karbali.trackDownload(userId);
      console.log(`[KarbaliAds] Download tracked for: ${userId}`);
    } catch (error) {
      console.error("[KarbaliAds] Error tracking download:", error);
    }
  }
};

export const trackSignup = (userId: string) => {
  if (typeof window !== "undefined" && window.Karbali?.trackSignup) {
    try {
      window.Karbali.trackSignup(userId);
      console.log(`[KarbaliAds] Signup tracked for: ${userId}`);
    } catch (error) {
      console.error("[KarbaliAds] Error tracking signup:", error);
    }
  }
};

export const trackPurchase = (userId: string, amount: number) => {
  if (typeof window !== "undefined" && window.Karbali?.trackPurchase) {
    try {
      window.Karbali.trackPurchase({ user_id: userId, amount });
      console.log(`[KarbaliAds] Purchase tracked for: ${userId}, amount: ${amount}`);
    } catch (error) {
      console.error("[KarbaliAds] Error tracking purchase:", error);
    }
  }
};
