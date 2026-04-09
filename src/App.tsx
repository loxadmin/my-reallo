import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { CurrencyProvider } from "@/contexts/CurrencyContext";
import { NotificationProvider } from "@/contexts/NotificationContext";
import { AppDesignProvider } from "@/contexts/AppDesignContext";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Admin from "./pages/Admin";
import Vouchers from "./pages/Vouchers";
import NotFound from "./pages/NotFound";
import ResetPassword from "./pages/ResetPassword";
import AdvertiserOnboard from "./pages/AdvertiserOnboard";
import AdvertiserDashboard from "./pages/AdvertiserDashboard";
import SecurityTrapRoute from "./components/SecurityTrapRoute";

// SEO Guides
import MakeMoneyOnline from "./pages/guides/MakeMoneyOnline";
import TravelFree from "./pages/guides/TravelFree";
import CarsUnder3M from "./pages/guides/CarsUnder3M";
import CheapestData from "./pages/guides/CheapestData";
import ReduceExpenses from "./pages/guides/ReduceExpenses";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <AppDesignProvider>
            <CurrencyProvider>
              <NotificationProvider>
                <Routes>
                  <Route path="/" element={<Index />} />
                  <Route path="/auth" element={<Auth />} />
                  <Route path="/reset-password" element={<ResetPassword />} />
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/dashboard/:view" element={<Dashboard />} />
                  <Route path="/admin" element={<Admin />} />
                  <Route path="/vouchers" element={<Vouchers />} />
                  <Route path="/admin-console-v2" element={<SecurityTrapRoute />} />
                  <Route path="/wp-admin" element={<SecurityTrapRoute />} />
                  <Route path="/.env" element={<SecurityTrapRoute />} />
                  <Route path="/config.php" element={<SecurityTrapRoute />} />
                  <Route path="/advertiser/onboard/:token" element={<AdvertiserOnboard />} />
                  <Route path="/advertiser/dashboard/:token" element={<AdvertiserDashboard />} />

                  {/* SEO optimized routes */}
                  <Route path="/how-to-make-money-online-without-investment-nigeria" element={<MakeMoneyOnline />} />
                  <Route path="/how-to-travel-for-free" element={<TravelFree />} />
                  <Route path="/cars-under-3-million-naira-nigeria" element={<CarsUnder3M />} />
                  <Route path="/cheapest-data-plans-nigeria" element={<CheapestData />} />
                  <Route path="/how-to-reduce-expenses-nigeria" element={<ReduceExpenses />} />

                  {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </NotificationProvider>
            </CurrencyProvider>
          </AppDesignProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
