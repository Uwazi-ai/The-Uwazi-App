import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { ThemeProvider } from "next-themes";
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
import CivicFeedPage from "./pages/CivicFeedPage";
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
import CandidatesPage from "./pages/CandidatesPage";
import CandidateDetailPage from "./pages/CandidateDetailPage";
import ProgressPage from "./pages/ProgressPage";
import SettingsPage from "./pages/SettingsPage";
import NotFound from "./pages/NotFound";
import MarketingHomePage from "./pages/marketing/MarketingHomePage";
import ConsultingPage from "./pages/marketing/ConsultingPage";
import AdminOverviewPage from "./pages/admin/AdminOverviewPage";
import AdminUsersPage from "./pages/admin/AdminUsersPage";
import AdminAnalyticsPage from "./pages/admin/AdminAnalyticsPage";
import AdminIntelligencePage from "./pages/admin/AdminIntelligencePage";
import AdminLessonsPage from "./pages/admin/AdminLessonsPage";
import AdminContentPage from "./pages/admin/AdminContentPage";
import AdminAlertsPage from "./pages/admin/AdminAlertsPage";
import AdminPlatformPage from "./pages/admin/AdminPlatformPage";
import AdminCRMPage from "./pages/admin/AdminCRMPage";
import AdminSurveysPage from "./pages/admin/AdminSurveysPage";

const queryClient = new QueryClient();

const App = () => (
  <ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange={false}>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <Routes>
              {/* Marketing site - now at root */}
              <Route path="/" element={<MarketingHomePage />} />
              <Route path="/consulting" element={<ConsultingPage />} />
              <Route path="/site" element={<Navigate to="/" replace />} />

              {/* Public routes */}
              <Route path="/login" element={<LoginPage />} />
              <Route path="/signup" element={<SignupPage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
              <Route path="/reset-password" element={<ResetPasswordPage />} />
              <Route path="/onboarding" element={<OnboardingPage />} />

              {/* App dashboard - moved to /app */}
              <Route path="/app" element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
                <Route index element={<HomePage />} />
                <Route path="/app/ask" element={<AskUwaziPage />} />
                <Route path="/app/vote" element={<VotingHubPage />} />
                <Route path="/app/vote/candidates" element={<CandidatesPage />} />
                <Route path="/app/vote/candidates/:id" element={<CandidateDetailPage />} />
                <Route path="/app/news" element={<NewsPage />} />
                <Route path="/app/civic-feed" element={<CivicFeedPage />} />
                <Route path="/app/saved" element={<SavedPage />} />
                <Route path="/app/learn" element={<LearnPage />} />
                <Route path="/app/legislation" element={<LegislationPage />} />
                <Route path="/app/legislation/:congress/:type/:number" element={<BillDetailPage />} />
                <Route path="/app/progress" element={<ProgressPage />} />
                <Route path="/app/profile" element={<ProfilePage />} />
                <Route path="/app/settings" element={<SettingsPage />} />

                {/* Admin routes */}
                <Route path="/app/admin" element={<AdminRoute><AdminOverviewPage /></AdminRoute>} />
                <Route path="/app/admin/users" element={<AdminRoute><AdminUsersPage /></AdminRoute>} />
                <Route path="/app/admin/analytics" element={<AdminRoute><AdminAnalyticsPage /></AdminRoute>} />
                <Route path="/app/admin/intelligence" element={<AdminRoute><AdminIntelligencePage /></AdminRoute>} />
                <Route path="/app/admin/lessons" element={<AdminRoute><AdminLessonsPage /></AdminRoute>} />
                <Route path="/app/admin/content" element={<AdminRoute><AdminContentPage /></AdminRoute>} />
                <Route path="/app/admin/alerts" element={<AdminRoute><AdminAlertsPage /></AdminRoute>} />
                <Route path="/app/admin/platform" element={<AdminRoute><AdminPlatformPage /></AdminRoute>} />
                <Route path="/app/admin/crm" element={<AdminRoute><AdminCRMPage /></AdminRoute>} />
                <Route path="/app/admin/surveys" element={<AdminRoute><AdminSurveysPage /></AdminRoute>} />
              </Route>
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;
