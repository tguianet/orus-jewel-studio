import { BrowserRouter, Route, Routes } from "react-router-dom";
import { forwardRef, lazy, Suspense } from "react";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { CartProvider } from "@/contexts/CartContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { AppUpdatePrompt } from "./components/system/AppUpdatePrompt";
import { LazyRouteErrorBoundary } from "./components/system/LazyRouteErrorBoundary";
import { OfflineBanner } from "./components/system/OfflineBanner";
import { RouteFallback } from "./components/system/RouteFallback";
import { PwaManifestSwitcher } from "./pwa/PwaManifestSwitcher";

const Landing = lazy(() => import("./pages/Landing"));
const LoginPage = lazy(() => import("./pages/LoginPage"));
const ResetPasswordPage = lazy(() => import("./pages/ResetPasswordPage"));
const NotFound = lazy(() => import("./pages/NotFound"));
const OAuthConsent = lazy(() => import("./pages/OAuthConsent"));

const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard"));
const AdminProducts = lazy(() => import("./pages/admin/AdminProducts"));
const AdminCategories = lazy(() => import("./pages/admin/AdminCategories"));
const AdminSellers = lazy(() => import("./pages/admin/AdminSellers"));
const AdminOrders = lazy(() => import("./pages/admin/AdminOrders"));
const AdminReturns = lazy(() => import("./pages/admin/AdminReturns"));
const AdminFinance = lazy(() => import("./pages/admin/AdminFinance"));
const AdminSettings = lazy(() => import("./pages/admin/AdminSettings"));
const AdminNetwork = lazy(() => import("./pages/admin/AdminNetwork"));
const AdminBanners = lazy(() => import("./pages/admin/AdminBanners"));

const SellerDashboard = lazy(() => import("./pages/seller/SellerDashboard"));
const SellerStore = lazy(() => import("./pages/seller/SellerStore"));
const SellerCustomization = lazy(() => import("./pages/seller/SellerCustomization"));
const SellerCatalog = lazy(() => import("./pages/seller/SellerCatalog"));
const SellerProducts = lazy(() => import("./pages/seller/SellerProducts"));
const SellerOrders = lazy(() => import("./pages/seller/SellerOrders"));
const SellerCustomers = lazy(() => import("./pages/seller/SellerCustomers"));
const SellerSettings = lazy(() => import("./pages/seller/SellerSettings"));
const SellerNetwork = lazy(() => import("./pages/seller/SellerNetwork"));
const SellerMarketing = lazy(() => import("./pages/seller/SellerMarketing"));

const StoreLayout = lazy(() => import("./pages/store/StoreLayout"));
const StoreHome = lazy(() => import("./pages/store/StoreHome"));
const StoreProduct = lazy(() => import("./pages/store/StoreProduct"));
const StoreCart = lazy(() => import("./pages/store/StoreCart"));
const StoreCheckout = lazy(() => import("./pages/store/StoreCheckout"));

const PrivacyPolicy = lazy(() => import("./pages/legal/PrivacyPolicy"));
const TermsOfUse = lazy(() => import("./pages/legal/TermsOfUse"));
const ReturnsPolicy = lazy(() => import("./pages/legal/ReturnsPolicy"));
const DeliveryPolicy = lazy(() => import("./pages/legal/DeliveryPolicy"));
const CommissionPolicy = lazy(() => import("./pages/legal/CommissionPolicy"));
const WithdrawalPolicy = lazy(() => import("./pages/legal/WithdrawalPolicy"));

const Admin = ({ children }: { children: JSX.Element }) => (
  <ProtectedRoute role="admin">{children}</ProtectedRoute>
);
const Seller = ({ children }: { children: JSX.Element }) => (
  <ProtectedRoute role="sacoleira">{children}</ProtectedRoute>
);

const App = forwardRef<HTMLDivElement>((_, ref) => (
  <div ref={ref} className="min-h-screen bg-background text-foreground">
    <TooltipProvider>
    <Toaster />
    <Sonner position="top-center" />
    <AuthProvider>
      <CartProvider>
        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <PwaManifestSwitcher />
          <OfflineBanner />
          <AppUpdatePrompt />
          <LazyRouteErrorBoundary>
            <Suspense fallback={<RouteFallback />}>
              <Routes>
                <Route path="/" element={<Landing />} />
                <Route path="/login-admin" element={<LoginPage role="admin" />} />
                <Route path="/login-sacoleira" element={<LoginPage role="sacoleira" />} />
                <Route path="/reset-password" element={<ResetPasswordPage />} />
                <Route path="/.lovable/oauth/consent" element={<OAuthConsent />} />

                <Route path="/politica-de-privacidade" element={<PrivacyPolicy />} />
                <Route path="/termos-de-uso" element={<TermsOfUse />} />
                <Route path="/trocas-e-devolucoes" element={<ReturnsPolicy />} />
                <Route path="/politica-de-entrega" element={<DeliveryPolicy />} />
                <Route path="/politica-de-comissoes" element={<CommissionPolicy />} />
                <Route path="/politica-de-saques" element={<WithdrawalPolicy />} />

                <Route path="/admin" element={<Admin><AdminDashboard /></Admin>} />
                <Route path="/admin/produtos" element={<Admin><AdminProducts /></Admin>} />
                <Route path="/admin/categorias" element={<Admin><AdminCategories /></Admin>} />
                <Route path="/admin/sacoleiras" element={<Admin><AdminSellers /></Admin>} />
                <Route path="/admin/pedidos" element={<Admin><AdminOrders /></Admin>} />
                <Route path="/admin/devolucoes" element={<Admin><AdminReturns /></Admin>} />
                <Route path="/admin/financeiro" element={<Admin><AdminFinance /></Admin>} />
                <Route path="/admin/configuracoes" element={<Admin><AdminSettings /></Admin>} />
                <Route path="/admin/rede" element={<Admin><AdminNetwork /></Admin>} />
                <Route path="/admin/banners" element={<Admin><AdminBanners /></Admin>} />
                <Route path="/admin/banners/:formatSlug" element={<Admin><AdminBanners /></Admin>} />

                <Route path="/sacoleira" element={<Seller><SellerDashboard /></Seller>} />
                <Route path="/sacoleira/loja" element={<Seller><SellerStore /></Seller>} />
                <Route path="/sacoleira/personalizacao" element={<Seller><SellerCustomization /></Seller>} />
                <Route path="/sacoleira/catalogo" element={<Seller><SellerCatalog /></Seller>} />
                <Route path="/sacoleira/meus-produtos" element={<Seller><SellerProducts /></Seller>} />
                <Route path="/sacoleira/pedidos" element={<Seller><SellerOrders /></Seller>} />
                <Route path="/sacoleira/clientes" element={<Seller><SellerCustomers /></Seller>} />
                <Route path="/sacoleira/configuracoes" element={<Seller><SellerSettings /></Seller>} />
                <Route path="/sacoleira/rede" element={<Seller><SellerNetwork /></Seller>} />
                <Route path="/sacoleira/marketing" element={<Seller><SellerMarketing /></Seller>} />

                <Route path="/loja/:slug" element={<StoreLayout />}>
                  <Route index element={<StoreHome />} />
                  <Route path="produto/:id" element={<StoreProduct />} />
                  <Route path="carrinho" element={<StoreCart />} />
                  <Route path="checkout" element={<StoreCheckout />} />
                </Route>
                <Route path="/loja/:slug/*" element={<StoreLayout />}>
                  <Route path="*" element={<StoreHome />} />
                </Route>

                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </LazyRouteErrorBoundary>
        </BrowserRouter>
      </CartProvider>
    </AuthProvider>
    </TooltipProvider>
  </div>
));

App.displayName = "App";

export default App;
