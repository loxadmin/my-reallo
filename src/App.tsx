import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ThemeProvider } from "next-themes";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Admin from "./pages/Admin";
import Vouchers from "./pages/Vouchers";
import Earn from "./pages/Earn";
import Goals from "./pages/Goals";
import Verify from "./pages/Verify";
import SpendCalculator from "./components/SpendCalculator";
import GoalSelector from "./components/GoalSelector";
import NotFound from "./pages/NotFound";
import BottomNav from "./components/BottomNav";

const queryClient = new QueryClient();

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/auth" />;
  return <>{children}</>;
};

const NavigationWrapper = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();
  const location = useLocation();
  const showBottomNav = user && !["/", "/auth", "/calculator", "/goal-selection"].includes(location.pathname);

  return (
    <>
      {children}
      {showBottomNav && <BottomNav />}
    </>
  );
};

const CalculatorPage = () => {
  const navigate = useNavigate();
  return (
    <div className="pt-20 px-6">
      <SpendCalculator onComplete={() => navigate("/goal-selection")} />
    </div>
  );
};

const GoalSelectionPage = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();
  return (
    <div className="pt-20 px-6">
      <GoalSelector
        totalAnnualSpend={profile?.total_annual_spend || 0}
        onSelect={() => navigate("/dashboard")}
      />
    </div>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <NavigationWrapper>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/auth" element={<Auth />} />
                <Route
                  path="/dashboard"
                  element={
                    <ProtectedRoute>
                      <Dashboard />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/earn"
                  element={
                    <ProtectedRoute>
                      <Earn />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/goals"
                  element={
                    <ProtectedRoute>
                      <Goals />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/verify"
                  element={
                    <ProtectedRoute>
                      <Verify />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/vouchers"
                  element={
                    <ProtectedRoute>
                      <Vouchers />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/calculator"
                  element={
                    <ProtectedRoute>
                      <CalculatorPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/goal-selection"
                  element={
                    <ProtectedRoute>
                      <GoalSelectionPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin"
                  element={
                    <ProtectedRoute>
                      <Admin />
                    </ProtectedRoute>
                  }
                />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </NavigationWrapper>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
