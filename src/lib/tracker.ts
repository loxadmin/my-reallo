/**
 * Utility functions for Karbali event tracking.
 * These functions safely interface with the window.Karbali object
 * provided by the karbali-tracker.js loader.
 */

export const identifyUser = (userId: string) => {
  if (typeof window !== "undefined" && window.Karbali) {
    window.Karbali.identify(userId);
  }
};

export const trackDownload = (userId?: string) => {
  if (typeof window !== "undefined" && window.Karbali) {
    window.Karbali.trackDownload(userId);
  } else {
    console.warn("Karbali tracker not initialized for 'download' event.");
  }
};

export const trackSignup = (userId: string) => {
  if (typeof window !== "undefined" && window.Karbali) {
    window.Karbali.trackSignup(userId);
  } else {
    console.warn("Karbali tracker not initialized for 'signup' event.");
  }
};

export const trackPurchase = (userId: string, amount: number) => {
  if (typeof window !== "undefined" && window.Karbali) {
    window.Karbali.trackPurchase({ user_id: userId, amount });
  } else {
    console.warn("Karbali tracker not initialized for 'purchase' event.");
  }
};
