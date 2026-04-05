/**
 * Utility functions for Karbali event tracking.
 * These functions safely interface with the window.Karbali object
 * provided by the karbali-tracker.js loader.
 */

export const trackDownload = () => {
  if (typeof window !== "undefined" && window.Karbali) {
    window.Karbali.track("download", {});
  } else {
    console.warn("Karbali tracker not initialized for 'download' event.");
  }
};

export const trackSignup = (userId: string) => {
  if (typeof window !== "undefined" && window.Karbali) {
    window.Karbali.track("signup", { user_id: userId });
  } else {
    console.warn("Karbali tracker not initialized for 'signup' event.");
  }
};

export const trackPurchase = (userId: string, orderTotal: number) => {
  if (typeof window !== "undefined" && window.Karbali) {
    window.Karbali.track("purchase", { user_id: userId, amount: orderTotal });
  } else {
    console.warn("Karbali tracker not initialized for 'purchase' event.");
  }
};
