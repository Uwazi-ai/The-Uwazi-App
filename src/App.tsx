import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { AdminRoute } from "@/components/auth/AdminRoute";
import { AppLayout } from "@/components/layout/AppLayout";
import HomePage from "./pages/HomePage";
import AskUwaziPage from "./pages/AskUwaziPage";
import VotingHubPage from "./pages/VotingHubPage";
import NewsPage from "./pages/NewsPage";
import SavedPage from "./pages/SavedPage";
import ProfilePage from "./pages/ProfilePage";
import LoginPage from "./pages/LoginPage";
import SignupPage from "./pages/SignupPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import OnboardingPage from "./pages/OnboardingPage";
import LearnPage from "./pages/LearnPage";
import LegislationPage from "./pages/LegislationPage";
import BillDetailPage from "./pages/BillDetailPage";
import ProgressPage from "./pages/ProgressPage";
import SettingsPage from "./pages/SettingsPage";
import NotFound from "./pages/NotFound";
import AdminOverviewPage from "./pages/admin/AdminOverviewPage";
import AdminUsersPage from "./pages/admin/AdminUsersPage";
import AdminAnalyticsPage from "./pages/admin/AdminAnalyticsPage";
import AdminIntelligencePage from "./pages/admin/AdminIntelligencePage";
import AdminLessonsPage from "./pages/admin/AdminLessonsPage";
import AdminContentPage from "./pages/admin/AdminContentPage";
import AdminAlertsPage from "./pages/admin/AdminAlertsPage";
import AdminPlatformPage from "./pages/admin/AdminPlatformPage";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="/onboarding" element={<OnboardingPage />} />

            {/* Protected routes */}
            <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
              <Route path="/" element={<HomePage />} />
              <Route path="/ask" element={<AskUwaziPage />} />
              <Route path="/vote" element={<VotingHubPage />} />
              <Route path="/news" element={<NewsPage />} />
              <Route path="/saved" element={<SavedPage />} />
              <Route path="/learn" element={<LearnPage />} />
              <Route path="/legislation" element={<LegislationPage />} />
              <Route path="/legislation/:congress/:type/:number" element={<BillDetailPage />} />
              <Route path="/progress" element={<ProgressPage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/settings" element={<SettingsPage />} />

              {/* Admin routes */}
              <Route path="/admin" element={<AdminRoute><AdminOverviewPage /></AdminRoute>} />
              <Route path="/admin/users" element={<AdminRoute><AdminUsersPage /></AdminRoute>} />
              <Route path="/admin/analytics" element={<AdminRoute><AdminAnalyticsPage /></AdminRoute>} />
              <Route path="/admin/intelligence" element={<AdminRoute><AdminIntelligencePage /></AdminRoute>} />
              <Route path="/admin/lessons" element={<AdminRoute><AdminLessonsPage /></AdminRoute>} />
              <Route path="/admin/content" element={<AdminRoute><AdminContentPage /></AdminRoute>} />
              <Route path="/admin/alerts" element={<AdminRoute><AdminAlertsPage /></AdminRoute>} />
              <Route path="/admin/platform" element={<AdminRoute><AdminPlatformPage /></AdminRoute>} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
