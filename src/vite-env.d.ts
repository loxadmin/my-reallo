/// <reference types="vite/client" />

interface Window {
  KarbaliConfig?: {
    apiKey: string;
    campaignId: string;
  };
  Karbali?: {
    identify: (userId: string) => void;
    trackDownload: (userId: string) => void;
    trackSignup: (userId: string) => void;
    trackPurchase: (params: { user_id: string; amount: number }) => void;
  };
}
