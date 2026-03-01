import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "@/contexts/AuthContext";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Admin from "./pages/Admin";
import Vouchers from "./pages/Vouchers";
import Earn from "./pages/Earn";
import Goals from "./pages/Goals";
import Verify from "./pages/Verify";
import Calculator from "./pages/Calculator";
import GoalSelection from "./pages/GoalSelection";
import NotFound from "./pages/NotFound";
import DashboardLayout from "./components/DashboardLayout";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <Routes>
              <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/dashboard" element={<DashboardLayout><Dashboard /></DashboardLayout>} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/vouchers" element={<DashboardLayout><Vouchers /></DashboardLayout>} />
            <Route path="/earn" element={<DashboardLayout><Earn /></DashboardLayout>} />
            <Route path="/goals" element={<DashboardLayout><Goals /></DashboardLayout>} />
            <Route path="/verify" element={<DashboardLayout><Verify /></DashboardLayout>} />
            <Route path="/calculator" element={<Calculator />} />
            <Route path="/goal-selection" element={<GoalSelection />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
