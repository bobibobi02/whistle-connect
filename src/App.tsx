import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { AnimatePresence } from "framer-motion";
import { useDeepLinks, useBackButton, useCapacitor } from "@/hooks/useCapacitor";
import { useBadgeCount } from "@/hooks/useBadgeCount";
import { useBackgroundSync } from "@/hooks/useBackgroundSync";
import PageTransition from "@/components/PageTransition";
import SafeAreaWrapper from "@/components/SafeAreaWrapper";
import { PWAInstallBanner } from "@/components/PWAInstallBanner";
import EmergencyBanner from "@/components/EmergencyBanner";
import ErrorBoundary from "@/components/ErrorBoundary";
import EnvErrorBanner from "@/components/EnvErrorBanner";
import Index from "./pages/Index";
import PostDetail from "./pages/PostDetail";
import Auth from "./pages/Auth";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Messages from "./pages/Messages";
import CreatePost from "./pages/CreatePost";
import Profile from "./pages/Profile";
import Community from "./pages/Community";
import Communities from "./pages/Communities";
import Search from "./pages/Search";
import NotificationCenter from "./pages/NotificationCenter";
import Moderation from "./pages/Moderation";
import ModQueue from "./pages/ModQueue";
import AdminSettings from "./pages/AdminSettings";
import AdminAds from "./pages/AdminAds";
import AdminMediaKit from "./pages/AdminMediaKit";
import AdminGoLive from "./pages/AdminGoLive";
import AdminLegal from "./pages/AdminLegal";
import AdminAnalytics from "./pages/AdminAnalytics";
import AdminBackups from "./pages/AdminBackups";
import AdminSupport from "./pages/AdminSupport";
import AdminBugs from "./pages/AdminBugs";
import Settings from "./pages/Settings";
import CreatorMonetization from "./pages/CreatorMonetization";
import AuthCallback from "./pages/AuthCallback";
import Debug from "./pages/Debug";
import NotFound from "./pages/NotFound";
import LegalPage from "./pages/LegalPage";
import Status from "./pages/Status";
import Help from "./pages/Help";
import ReportBug from "./pages/ReportBug";

const queryClient = new QueryClient();

const AnimatedRoutes = () => {
  const location = useLocation();
  
  // Initialize deep links and back button handling
  useDeepLinks();
  useBackButton();

  return (
    <ErrorBoundary>
      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>
          <Route path="/" element={<PageTransition><ErrorBoundary><Index /></ErrorBoundary></PageTransition>} />
          <Route path="/auth" element={<PageTransition><Auth /></PageTransition>} />
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/forgot-password" element={<PageTransition><ForgotPassword /></PageTransition>} />
          <Route path="/reset-password" element={<PageTransition><ResetPassword /></PageTransition>} />
          <Route path="/messages" element={<PageTransition><ErrorBoundary><Messages /></ErrorBoundary></PageTransition>} />
          <Route path="/messages/:conversationId" element={<PageTransition><ErrorBoundary><Messages /></ErrorBoundary></PageTransition>} />
          <Route path="/create" element={<PageTransition><ErrorBoundary><CreatePost /></ErrorBoundary></PageTransition>} />
          <Route path="/u/:username" element={<PageTransition><ErrorBoundary><Profile /></ErrorBoundary></PageTransition>} />
          <Route path="/communities" element={<PageTransition><ErrorBoundary><Communities /></ErrorBoundary></PageTransition>} />
          <Route path="/search" element={<PageTransition><ErrorBoundary><Search /></ErrorBoundary></PageTransition>} />
          <Route path="/notifications" element={<PageTransition><ErrorBoundary><NotificationCenter /></ErrorBoundary></PageTransition>} />
          <Route path="/moderation" element={<PageTransition><ErrorBoundary><Moderation /></ErrorBoundary></PageTransition>} />
          <Route path="/mod-queue" element={<PageTransition><ErrorBoundary><ModQueue /></ErrorBoundary></PageTransition>} />
          <Route path="/admin" element={<PageTransition><ErrorBoundary><AdminSettings /></ErrorBoundary></PageTransition>} />
          <Route path="/admin/ads" element={<PageTransition><ErrorBoundary><AdminAds /></ErrorBoundary></PageTransition>} />
          <Route path="/admin/media-kit" element={<PageTransition><ErrorBoundary><AdminMediaKit /></ErrorBoundary></PageTransition>} />
          <Route path="/admin/go-live" element={<PageTransition><ErrorBoundary><AdminGoLive /></ErrorBoundary></PageTransition>} />
          <Route path="/admin/legal" element={<PageTransition><ErrorBoundary><AdminLegal /></ErrorBoundary></PageTransition>} />
          <Route path="/admin/analytics" element={<PageTransition><ErrorBoundary><AdminAnalytics /></ErrorBoundary></PageTransition>} />
          <Route path="/admin/backups" element={<PageTransition><ErrorBoundary><AdminBackups /></ErrorBoundary></PageTransition>} />
          <Route path="/admin/support" element={<PageTransition><ErrorBoundary><AdminSupport /></ErrorBoundary></PageTransition>} />
          <Route path="/admin/bugs" element={<PageTransition><ErrorBoundary><AdminBugs /></ErrorBoundary></PageTransition>} />
          <Route path="/settings" element={<PageTransition><ErrorBoundary><Settings /></ErrorBoundary></PageTransition>} />
          <Route path="/settings/monetization" element={<PageTransition><ErrorBoundary><CreatorMonetization /></ErrorBoundary></PageTransition>} />
          <Route path="/c/:communityName" element={<PageTransition><ErrorBoundary><Community /></ErrorBoundary></PageTransition>} />
          <Route path="/post/:postId" element={<PageTransition><ErrorBoundary><PostDetail /></ErrorBoundary></PageTransition>} />
          <Route path="/debug" element={<Debug />} />
          {/* Legal & Help Pages */}
          <Route path="/terms" element={<PageTransition><LegalPage /></PageTransition>} />
          <Route path="/privacy" element={<PageTransition><LegalPage /></PageTransition>} />
          <Route path="/content-policy" element={<PageTransition><LegalPage /></PageTransition>} />
          <Route path="/cookies" element={<PageTransition><LegalPage /></PageTransition>} />
          <Route path="/copyright" element={<PageTransition><LegalPage /></PageTransition>} />
          <Route path="/contact" element={<PageTransition><LegalPage /></PageTransition>} />
          <Route path="/refunds" element={<PageTransition><LegalPage /></PageTransition>} />
          <Route path="/advertiser-terms" element={<PageTransition><LegalPage /></PageTransition>} />
          <Route path="/creator-terms" element={<PageTransition><LegalPage /></PageTransition>} />
          <Route path="/status" element={<Status />} />
          <Route path="/help" element={<PageTransition><Help /></PageTransition>} />
          <Route path="/report-bug" element={<PageTransition><ReportBug /></PageTransition>} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<PageTransition><NotFound /></PageTransition>} />
        </Routes>
      </AnimatePresence>
    </ErrorBoundary>
  );
};

const AppContent = () => {
  const { isNative } = useCapacitor();
  
  // Initialize badge count - auto-updates based on unread notifications
  useBadgeCount();
  
  // Initialize background sync for offline actions
  useBackgroundSync();
  
  return (
    <SafeAreaWrapper>
      <EnvErrorBanner />
      <EmergencyBanner />
      <AnimatedRoutes />
      {!isNative && <PWAInstallBanner />}
    </SafeAreaWrapper>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AppContent />
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
