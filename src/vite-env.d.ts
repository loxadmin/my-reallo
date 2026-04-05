/// <reference types="vite/client" />

interface Window {
  KarbaliConfig: {
    apiKey: string;
  };
  Karbali?: {
    sync: () => void;
    track: (eventType: string, data: Record<string, any>) => void;
  };
}
