/// <reference types="vite/client" />

interface Window {
  KarbaliConfig: {
    apiKey: string;
  };
  Karbali?: {
    identify: (userId: string) => void;
    trackDownload: (userId?: string) => void;
    trackSignup: (userId: string) => void;
    trackPurchase: (data: { user_id: string; amount: number }) => void;
  };
}
