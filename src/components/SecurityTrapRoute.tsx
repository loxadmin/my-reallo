import { useEffect } from "react";
import { triggerTrap } from "@/lib/securityTraps";

const SecurityTrapRoute = () => {
  useEffect(() => {
    // Check if the request is from a legitimate crawler
    const userAgent = navigator.userAgent.toLowerCase();
    const isBot = /googlebot|bingbot|yandexbot|duckduckbot|slurp|baiduspider/i.test(userAgent);

    if (isBot) {
      console.log("Legitimate crawler detected on trap route. Ignoring.");
      return;
    }

    // This route is a trap. If someone navigates here, they are likely searching for vulnerabilities.
    const trigger = async () => {
      await triggerTrap("forced_navigation_attempt", {
        path: window.location.pathname,
        reason: "Accessed forbidden security trap route"
      }, "critical", true);
    };

    trigger();
  }, []);

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
    </div>
  );
};

export default SecurityTrapRoute;
