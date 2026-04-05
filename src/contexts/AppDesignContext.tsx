import { createContext, useContext, useState, useEffect, ReactNode, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";

export type AppDesign = "default" | "bold" | "minimal" | "neon" | "cards";

interface AppDesignContextType {
  activeDesign: AppDesign;
  loading: boolean;
}

const AppDesignContext = createContext<AppDesignContextType>({ activeDesign: "default", loading: true });

export const AppDesignProvider = ({ children }: { children: ReactNode }) => {
  const [activeDesign, setActiveDesign] = useState<AppDesign>("default");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const { data } = await supabase
          .from("admin_settings")
          .select("value")
          .eq("key", "active_app_design")
          .maybeSingle();
        if (!cancelled && data?.value) {
          const v = data.value as string;
          if (["default", "bold", "minimal", "neon", "cards"].includes(v)) {
            setActiveDesign(v as AppDesign);
          }
        }
      } catch {
        // fallback to default
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => { cancelled = true; };
  }, []);

  const value = useMemo(() => ({ activeDesign, loading }), [activeDesign, loading]);

  return <AppDesignContext.Provider value={value}>{children}</AppDesignContext.Provider>;
};

export const useAppDesign = () => useContext(AppDesignContext);
