import { Switch, Route, useRoute } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { ThemeInjector } from "@/components/layout/ThemeInjector";
import { ScrollToTop } from "@/components/layout/ScrollToTop";
import Home from "@/pages/Home";
import Explore from "@/pages/Explore";
import StoreDetails from "@/pages/StoreDetails";
import Cart from "@/pages/Cart";
import Account from "@/pages/Account";
import AccountOrders from "@/pages/account/Orders";
import AccountAddresses from "@/pages/account/Addresses";
import AccountPayments from "@/pages/account/Payments";
import AccountSettings from "@/pages/account/Settings";
import KycVerification from "@/pages/KycVerification";
import Terms from "@/pages/Terms";
import Privacy from "@/pages/Privacy";
import OrderTracking from "@/pages/OrderTracking";
import Travel from "@/pages/Travel";
import Auth from "@/pages/Auth";
import MerchantOnboarding from "@/pages/MerchantOnboarding";
import RiderOnboarding from "@/pages/RiderOnboarding";
import PanelRouter from "@/pages/panel/PanelRouter";
import ForgotPassword from "@/pages/ForgotPassword";
import ResetPassword from "@/pages/ResetPassword";
import AccountFavorites from "@/pages/account/Favorites";
import Videos from "@/pages/Videos";
import ProductDetail from "@/pages/ProductDetail";
import Help from "@/pages/Help";
import PanelInstitucional from "@/pages/PanelInstitucional";
import NovedadesPortal from "@/pages/NovedadesPortal";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/admin" component={PanelRouter} />
      <Route path="/panel" component={PanelRouter} />
      <Route path="/panel/admin" component={PanelRouter} />
      <Route path="/explore" component={Explore} />
      <Route path="/videos" component={Videos} />
      <Route path="/store/:id" component={StoreDetails} />
      <Route path="/product/:id" component={ProductDetail} />
      <Route path="/cart" component={Cart} />
      <Route path="/account/orders" component={AccountOrders} />
      <Route path="/account/favorites" component={AccountFavorites} />
      <Route path="/account/addresses" component={AccountAddresses} />
      <Route path="/account/payments" component={AccountPayments} />
      <Route path="/account/settings" component={AccountSettings} />
      <Route path="/account/kyc" component={KycVerification} />
      <Route path="/account" component={Account} />
      <Route path="/order/:id/tracking" component={OrderTracking} />
      <Route path="/travel" component={Travel} />
      <Route path="/auth" component={Auth} />
      <Route path="/login" component={Auth} />
      <Route path="/register" component={Auth} />
      <Route path="/forgot-password" component={ForgotPassword} />
      <Route path="/reset-password" component={ResetPassword} />
      <Route path="/terms" component={Terms} />
      <Route path="/privacy" component={Privacy} />
      <Route path="/institucional" component={PanelInstitucional} />
      <Route path="/panel-institucional" component={PanelInstitucional} />
      <Route path="/vender" component={MerchantOnboarding} />
      <Route path="/repartidor" component={RiderOnboarding} />
      <Route path="/novedades" component={NovedadesPortal} />
      <Route path="/help" component={Help} />
      <Route component={NotFound} />
    </Switch>
  );
}

function AppLayout() {
  const [isVideos] = useRoute("/videos");
  const [isInstitucional] = useRoute("/institucional");
  const [isInstitucionalAlias] = useRoute("/panel-institucional");
  if (isInstitucional || isInstitucionalAlias) return <Router />;
  return (
    <div className={`min-h-screen flex flex-col${isVideos ? " h-screen overflow-hidden" : ""}`}>
      <Navbar />
      <main className={`${isVideos ? "flex-1 overflow-hidden" : "flex-1"} page-transition`}>
        <Router />
      </main>
      {!isVideos && <Footer />}
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <ThemeInjector />
        <ScrollToTop />
        <AppLayout />
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
