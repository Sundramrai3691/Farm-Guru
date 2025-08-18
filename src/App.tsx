import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "react-router-dom";
import { useEffect } from "react";

// Import pages
import HomePage from "./pages/HomePage";
import QueryPage from "./pages/QueryPage";
import WeatherPage from "./pages/WeatherPage";
import MarketPage from "./pages/MarketPage";
import SchemesPage from "./pages/SchemesPage";
import DiagnosticsPage from "./pages/DiagnosticsPage";
import CommunityPage from "./pages/CommunityPage";
import ProfilePage from "./pages/ProfilePage";
import AboutPage from "./pages/AboutPage";
import AdminPage from "./pages/AdminPage";
import NotFound from "./pages/NotFound";

// Import layout components
import Header from "./components/Header";
import Footer from "./components/Footer";
import BottomTabs from "./components/BottomTabs";

// Analytics
import { analytics } from "./lib/analytics";

const queryClient = new QueryClient();

// Page wrapper with animations
const PageWrapper = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();

  useEffect(() => {
    analytics.pageView(location.pathname);
  }, [location]);

  return (
    <motion.div
      key={location.pathname}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3, ease: "easeInOut" }}
      className="min-h-screen flex flex-col"
    >
      {children}
    </motion.div>
  );
};

const AppContent = () => {
  const location = useLocation();

  return (
    <>
      <Header />
      <main className="flex-1 pt-16 pb-20 md:pb-8">
        <AnimatePresence mode="wait">
          <Routes location={location} key={location.pathname}>
            <Route path="/" element={
              <PageWrapper>
                <HomePage />
              </PageWrapper>
            } />
            <Route path="/query" element={
              <PageWrapper>
                <QueryPage />
              </PageWrapper>
            } />
            <Route path="/weather" element={
              <PageWrapper>
                <WeatherPage />
              </PageWrapper>
            } />
            <Route path="/market" element={
              <PageWrapper>
                <MarketPage />
              </PageWrapper>
            } />
            <Route path="/schemes" element={
              <PageWrapper>
                <SchemesPage />
              </PageWrapper>
            } />
            <Route path="/diagnostics" element={
              <PageWrapper>
                <DiagnosticsPage />
              </PageWrapper>
            } />
            <Route path="/community" element={
              <PageWrapper>
                <CommunityPage />
              </PageWrapper>
            } />
            <Route path="/profile" element={
              <PageWrapper>
                <ProfilePage />
              </PageWrapper>
            } />
            <Route path="/about" element={
              <PageWrapper>
                <AboutPage />
              </PageWrapper>
            } />
            <Route path="/admin" element={
              <PageWrapper>
                <AdminPage />
              </PageWrapper>
            } />
            <Route path="*" element={
              <PageWrapper>
                <NotFound />
              </PageWrapper>
            } />
          </Routes>
        </AnimatePresence>
      </main>
      <Footer />
      <BottomTabs />
    </>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
