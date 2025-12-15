import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import Index from "./pages/Index";
import PostDetail from "./pages/PostDetail";
import Auth from "./pages/Auth";
import CreatePost from "./pages/CreatePost";
import Profile from "./pages/Profile";
import Community from "./pages/Community";
import Communities from "./pages/Communities";
import Search from "./pages/Search";
import NotificationCenter from "./pages/NotificationCenter";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/create" element={<CreatePost />} />
            <Route path="/u/:username" element={<Profile />} />
            <Route path="/communities" element={<Communities />} />
            <Route path="/search" element={<Search />} />
            <Route path="/notifications" element={<NotificationCenter />} />
            <Route path="/c/:communityName" element={<Community />} />
            <Route path="/post/:postId" element={<PostDetail />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
