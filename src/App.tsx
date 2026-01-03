import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "@/hooks/useAuth";
import { AnimatePresence } from "framer-motion";
import { useDeepLinks, useBackButton, useCapacitor } from "@/hooks/useCapacitor";
import { useBadgeCount } from "@/hooks/useBadgeCount";
import { useBackgroundSync } from "@/hooks/useBackgroundSync";
import PageTransition from "@/components/PageTransition";
import SafeAreaWrapper from "@/components/SafeAreaWrapper";
import { PWAInstallBanner } from "@/components/PWAInstallBanner";
import Index from "./pages/Index";
import PostDetail from "./pages/PostDetail";
import Auth from "./pages/Auth";
import CreatePost from "./pages/CreatePost";
import Profile from "./pages/Profile";
import Community from "./pages/Community";
import Communities from "./pages/Communities";
import Search from "./pages/Search";
import NotificationCenter from "./pages/NotificationCenter";
import Moderation from "./pages/Moderation";
import ModQueue from "./pages/ModQueue";
import AdminSettings from "./pages/AdminSettings";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const AnimatedRoutes = () => {
  const location = useLocation();
  
  // Initialize deep links and back button handling
  useDeepLinks();
  useBackButton();

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<PageTransition><Index /></PageTransition>} />
        <Route path="/auth" element={<PageTransition><Auth /></PageTransition>} />
        <Route path="/create" element={<PageTransition><CreatePost /></PageTransition>} />
        <Route path="/u/:username" element={<PageTransition><Profile /></PageTransition>} />
        <Route path="/communities" element={<PageTransition><Communities /></PageTransition>} />
        <Route path="/search" element={<PageTransition><Search /></PageTransition>} />
        <Route path="/notifications" element={<PageTransition><NotificationCenter /></PageTransition>} />
        <Route path="/moderation" element={<PageTransition><Moderation /></PageTransition>} />
        <Route path="/mod-queue" element={<PageTransition><ModQueue /></PageTransition>} />
        <Route path="/admin" element={<PageTransition><AdminSettings /></PageTransition>} />
        <Route path="/settings" element={<PageTransition><Settings /></PageTransition>} />
        <Route path="/c/:communityName" element={<PageTransition><Community /></PageTransition>} />
        <Route path="/post/:postId" element={<PageTransition><PostDetail /></PageTransition>} />
        {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
        <Route path="*" element={<PageTransition><NotFound /></PageTransition>} />
      </Routes>
    </AnimatePresence>
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
      <AnimatedRoutes />
      {!isNative && <PWAInstallBanner />}
    </SafeAreaWrapper>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <AppContent />
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
