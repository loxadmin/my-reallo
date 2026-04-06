import { useEffect } from "react";
import { triggerTrap } from "@/lib/securityTraps";

const SecurityTrapRoute = () => {
  useEffect(() => {
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
