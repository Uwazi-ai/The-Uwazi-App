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
import { RootRedirect } from "@/components/auth/RootRedirect";
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
import WatchPage from "./pages/WatchPage";
import LegislationPage from "./pages/LegislationPage";
import BillDetailPage from "./pages/BillDetailPage";
import CandidatesPage from "./pages/CandidatesPage";
import CandidateDetailPage from "./pages/CandidateDetailPage";
import ProgressPage from "./pages/ProgressPage";
import SettingsPage from "./pages/SettingsPage";
import NotFound from "./pages/NotFound";
import PrivacyPolicyPage from "./pages/PrivacyPolicyPage";
import TermsOfServicePage from "./pages/TermsOfServicePage";
import AdminOverviewPage from "./pages/admin/AdminOverviewPage";
import AdminUsersPage from "./pages/admin/AdminUsersPage";
import AdminAnalyticsPage from "./pages/admin/AdminAnalyticsPage";
import AdminIntelligencePage from "./pages/admin/AdminIntelligencePage";
import AdminLessonsPage from "./pages/admin/AdminLessonsPage";
// AdminContentPage removed - replaced by AdminEpisodesPage at /admin/content
import AdminAlertsPage from "./pages/admin/AdminAlertsPage";
import AdminPlatformPage from "./pages/admin/AdminPlatformPage";
import AdminCRMPage from "./pages/admin/AdminCRMPage";
import AdminSurveysPage from "./pages/admin/AdminSurveysPage";
import AdminEpisodesPage from "./pages/admin/AdminEpisodesPage";
import AdminPartnerOrgsPage from "./pages/admin/AdminPartnerOrgsPage";
import UpgradePage from "./pages/UpgradePage";
import AdminCodesPage from "./pages/admin/AdminCodesPage";
import CheckoutReturnPage from "./pages/CheckoutReturnPage";
import ManageSubscriptionPage from "./pages/ManageSubscriptionPage";
import RedeemPage from "./pages/RedeemPage";
import PromoRedeemPage from "./pages/PromoRedeemPage";
import BackpackRulesPage from "./pages/BackpackRulesPage";
import Welcome from "./pages/Welcome";
import PartnerDashboardPage from "./pages/PartnerDashboardPage";
import JoinPage from "./pages/JoinPage";
import ImpactPage from "./pages/ImpactPage";
import { PWAUpdateBanner } from "@/components/PWAUpdateBanner";
import AdminSecurityPage from "./pages/admin/AdminSecurityPage";
import AdminSEOPage from "./pages/admin/AdminSEOPage";
import AdminBallotReviewPage from "./pages/admin/AdminBallotReviewPage";
import UnsubscribePage from "./pages/UnsubscribePage";
import MyCity from "./pages/MyCity";
import MyBallotEntryPage from "./pages/MyBallotEntryPage";
import MyBallotWalkthroughPage from "./pages/MyBallotWalkthroughPage";
import MyBallotReviewPage from "./pages/MyBallotReviewPage";
import MyBallotExportPage from "./pages/MyBallotExportPage";
import { InAppBrowserProvider } from "@/contexts/InAppBrowserContext";
import OAuthConsentPage from "./pages/OAuthConsentPage";

const queryClient = new QueryClient();

const App = () => (
  <ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange={false}>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <PWAUpdateBanner />
        <BrowserRouter>
          <AuthProvider>
            <InAppBrowserProvider>
            <Routes>
              {/* Root redirect */}
              <Route path="/" element={<RootRedirect />} />

              {/* Public routes */}
              <Route path="/welcome" element={<Welcome />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/signup" element={<SignupPage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
              <Route path="/reset-password" element={<ResetPasswordPage />} />
              <Route path="/onboarding" element={<OnboardingPage />} />
              <Route path="/privacy" element={<PrivacyPolicyPage />} />
              <Route path="/terms" element={<TermsOfServicePage />} />
              <Route path="/join" element={<JoinPage />} />
              <Route path="/unsubscribe" element={<UnsubscribePage />} />
              <Route path="/impact" element={<ImpactPage />} />
              <Route path="/redeem" element={<PromoRedeemPage />} />
              <Route path="/backpack-rules" element={<BackpackRulesPage />} />
              <Route path="/.lovable/oauth/consent" element={<OAuthConsentPage />} />

              <Route path="/vote" element={<Navigate to="/app/vote" replace />} />
              <Route path="/partner-dashboard" element={<ProtectedRoute><PartnerDashboardPage /></ProtectedRoute>} />

              {/* App dashboard */}
              <Route path="/app" element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
                <Route index element={<HomePage />} />
                <Route path="/app/ask" element={<AskUwaziPage />} />
                <Route path="/app/vote" element={<VotingHubPage />} />
                <Route path="/app/my-city" element={<MyCity />} />
                <Route path="/app/my-ballot" element={<MyBallotEntryPage />} />
                <Route path="/app/my-ballot/walkthrough" element={<MyBallotWalkthroughPage />} />
                <Route path="/app/my-ballot/review" element={<MyBallotReviewPage />} />
                <Route path="/app/my-ballot/export" element={<MyBallotExportPage />} />
                <Route path="/app/vote/candidates" element={<CandidatesPage />} />
                <Route path="/app/vote/candidates/:id" element={<CandidateDetailPage />} />
                <Route path="/app/news" element={<NewsPage />} />
                <Route path="/app/saved" element={<SavedPage />} />
                <Route path="/app/learn" element={<LearnPage />} />
                <Route path="/app/watch" element={<WatchPage />} />
                <Route path="/app/legislation" element={<LegislationPage />} />
                <Route path="/app/legislation/:congress/:type/:number" element={<BillDetailPage />} />
                <Route path="/app/progress" element={<ProgressPage />} />
                <Route path="/app/profile" element={<Navigate to="/app/settings" replace />} />
                <Route path="/app/settings" element={<SettingsPage />} />
                <Route path="/app/settings/subscription" element={<ManageSubscriptionPage />} />
                <Route path="/app/upgrade" element={<UpgradePage />} />
                <Route path="/app/redeem" element={<RedeemPage />} />
                <Route path="/app/checkout/return" element={<CheckoutReturnPage />} />

                {/* Admin routes — program_admin can access lessons, analytics, intelligence, surveys, crm, alerts, overview, content */}
                <Route path="/app/admin" element={<AdminRoute allowProgramAdmin><AdminOverviewPage /></AdminRoute>} />
                <Route path="/app/admin/users" element={<AdminRoute><AdminUsersPage /></AdminRoute>} />
                <Route path="/app/admin/analytics" element={<AdminRoute allowProgramAdmin><AdminAnalyticsPage /></AdminRoute>} />
                <Route path="/app/admin/intelligence" element={<AdminRoute allowProgramAdmin><AdminIntelligencePage /></AdminRoute>} />
                <Route path="/app/admin/lessons" element={<AdminRoute allowProgramAdmin><AdminLessonsPage /></AdminRoute>} />
                <Route path="/app/admin/content" element={<AdminRoute allowProgramAdmin><AdminEpisodesPage /></AdminRoute>} />
                <Route path="/app/admin/alerts" element={<AdminRoute allowProgramAdmin><AdminAlertsPage /></AdminRoute>} />
                <Route path="/app/admin/platform" element={<AdminRoute><AdminPlatformPage /></AdminRoute>} />
                <Route path="/app/admin/crm" element={<AdminRoute allowProgramAdmin><AdminCRMPage /></AdminRoute>} />
                <Route path="/app/admin/surveys" element={<AdminRoute allowProgramAdmin><AdminSurveysPage /></AdminRoute>} />
                <Route path="/app/admin/partner-orgs" element={<AdminRoute><AdminPartnerOrgsPage /></AdminRoute>} />
                <Route path="/app/admin/codes" element={<AdminRoute><AdminCodesPage /></AdminRoute>} />
                <Route path="/app/admin/security" element={<AdminRoute><AdminSecurityPage /></AdminRoute>} />
                <Route path="/app/admin/ballot-review" element={<AdminRoute><AdminBallotReviewPage /></AdminRoute>} />
              </Route>
              <Route path="*" element={<NotFound />} />
            </Routes>
            </InAppBrowserProvider>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;
