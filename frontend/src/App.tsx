import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "@/components/theme-provider";
import { LanguageProvider } from "@/contexts/LanguageContext";

// Page Components
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import GroundwaterDashboard from "./components/GroundwaterDashboard";
import ForecastPage from "./pages/ForecastPage";
import HistoryPage from "./pages/HistoryPage";
import DistrictsMap from "./districts/district";
import DistrictsDataPage from "./pages/DistrictsDataPage";
import States from "./states/state";
import HomePage from "./components/home";
import AlertSubscription from "./components/AlertSubscription";
import LoginPage from "./components/ui/loginPage";
import SignupPage from "./components/ui/signupPage";
import ForgotPasswordPage from "./components/ui/forgotPasswordPage";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider defaultTheme="system" storageKey="groundwater-theme">
      <LanguageProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              {/* Home */}
              <Route path="/" element={<Index />} />
              <Route path="/about" element={<HomePage />} />

              {/* Core Groundwater Monitoring Routes */}
              <Route path="/dashboard" element={<GroundwaterDashboard />} />
              <Route path="/forecast" element={<ForecastPage />} />
              <Route path="/history" element={<HistoryPage />} />
              <Route path="/map" element={<DistrictsMap />} />
              <Route path="/districts" element={<DistrictsDataPage />} />

              {/* Backward compatibility and route aliases */}
              <Route path="/GroundWaterDashboard" element={<Navigate to="/dashboard" replace />} />
              <Route path="/district" element={<Navigate to="/districts" replace />} />
              <Route path="/Districts" element={<Navigate to="/districts" replace />} />

              {/* States & GIS */}
              <Route path="/state" element={<States />} />
              <Route path="/states" element={<States />} />

              {/* User Authentication & Alerts */}
              <Route path="/signup" element={<SignupPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
              <Route path="/subscribe" element={<AlertSubscription />} />

              {/* Catch-all 404 */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </LanguageProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
