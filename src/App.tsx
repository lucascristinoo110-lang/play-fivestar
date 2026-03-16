import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Profile from "./pages/Profile";
import Football from "./pages/Football";
import AffiliateDashboard from "./pages/AffiliateDashboard";
import TicketsPage from "./pages/Tickets";
import AdminLayout from "./pages/admin/AdminLayout";
import AdminDashboardPage from "./pages/admin/AdminDashboardPage";
import AdminUsersPage from "./pages/admin/AdminUsersPage";
import AdminDepositsPage from "./pages/admin/AdminDepositsPage";
import AdminWithdrawalsPage from "./pages/admin/AdminWithdrawalsPage";
import AdminKycPage from "./pages/admin/AdminKycPage";
import AdminGamesPage from "./pages/admin/AdminGamesPage";
import AdminAppearancePage from "./pages/admin/AdminAppearancePage";
import AdminBspayPage from "./pages/admin/AdminBspayPage";
import AdminSettingsPage from "./pages/admin/AdminSettingsPage";
import AdminBannersPage from "./pages/admin/AdminBannersPage";
import AdminBetsPage from "./pages/admin/AdminBetsPage";
import AdminAffiliatesPage from "./pages/admin/AdminAffiliatesPage";
import AdminAdsPage from "./pages/admin/AdminAdsPage";
import PrivacyPolicy from "./pages/legal/PrivacyPolicy";
import TermsConditions from "./pages/legal/TermsConditions";
import PlayerSupport from "./pages/legal/PlayerSupport";
import Complaints from "./pages/legal/Complaints";
import Ombudsman from "./pages/legal/Ombudsman";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/" element={<Index />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/football" element={<Football />} />
            <Route path="/tickets" element={<TicketsPage />} />
            <Route path="/affiliate" element={<AffiliateDashboard />} />
            <Route path="/privacidade" element={<PrivacyPolicy />} />
            <Route path="/termos" element={<TermsConditions />} />
            <Route path="/suporte" element={<PlayerSupport />} />
            <Route path="/denuncias" element={<Complaints />} />
            <Route path="/ouvidoria" element={<Ombudsman />} />
            <Route path="/rei" element={<AdminLayout />}>
              <Route index element={<AdminDashboardPage />} />
              <Route path="users" element={<AdminUsersPage />} />
              <Route path="deposits" element={<AdminDepositsPage />} />
              <Route path="withdrawals" element={<AdminWithdrawalsPage />} />
              <Route path="kyc" element={<AdminKycPage />} />
              <Route path="games" element={<AdminGamesPage />} />
              <Route path="banners" element={<AdminBannersPage />} />
              <Route path="bets" element={<AdminBetsPage />} />
              <Route path="affiliates" element={<AdminAffiliatesPage />} />
              <Route path="ads" element={<AdminAdsPage />} />
              <Route path="appearance" element={<AdminAppearancePage />} />
              <Route path="bspay" element={<AdminBspayPage />} />
              <Route path="settings" element={<AdminSettingsPage />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
