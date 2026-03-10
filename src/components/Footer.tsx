import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import RealloLogo from "./RealloLogo";

const Footer = () => {
  const [content, setContent] = useState({
    contact_us: "",
    about_us: "",
    invest_with_us: "",
  });

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase.from("admin_settings").select("*");
      const settings = (data || []) as { key: string; value: string }[];
      setContent({
        contact_us: settings.find(s => s.key === "footer_contact_us")?.value || "",
        about_us: settings.find(s => s.key === "footer_about_us")?.value || "",
        invest_with_us: settings.find(s => s.key === "footer_invest_with_us")?.value || "",
      });
    };
    fetch();
  }, []);

  if (!content.contact_us && !content.about_us && !content.invest_with_us) return null;

  return (
    <footer className="relative z-10 mt-16 border-t border-border/30">
      <div className="max-w-5xl mx-auto px-4 py-10">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
          {content.about_us && (
            <div>
              <h4 className="text-sm font-semibold text-foreground mb-2">About Us</h4>
              <p className="text-[13px] text-muted-foreground leading-relaxed whitespace-pre-line"><RealloLogo size={12} className="inline-block align-middle mr-0.5" /> {content.about_us}</p>
            </div>
          )}
          {content.contact_us && (
            <div>
              <h4 className="text-sm font-semibold text-foreground mb-2">Contact Us</h4>
              <p className="text-[13px] text-muted-foreground leading-relaxed whitespace-pre-line">{content.contact_us}</p>
            </div>
          )}
          {content.invest_with_us && (
            <div>
              <h4 className="text-sm font-semibold text-foreground mb-2">Invest With Us</h4>
              <p className="text-[13px] text-muted-foreground leading-relaxed whitespace-pre-line">{content.invest_with_us}</p>
            </div>
          )}
        </div>
        <div className="mt-8 pt-4 border-t border-border/20 text-center">
          <p className="text-[12px] text-muted-foreground">© {new Date().getFullYear()} Reallo. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
