import { BrowserRouter, Route, Routes } from "react-router-dom";
import { forwardRef, lazy, Suspense } from "react";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { CartProvider } from "@/contexts/CartContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { AreaProvider } from "@/contexts/AreaContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { AppUpdatePrompt } from "./components/system/AppUpdatePrompt";
import { LazyRouteErrorBoundary } from "./components/system/LazyRouteErrorBoundary";
import { OfflineBanner } from "./components/system/OfflineBanner";
import { RouteFallback } from "./components/system/RouteFallback";
import { AppErrorBoundary } from "./components/errors/AppErrorBoundary";
import { RouteErrorBoundary } from "./components/errors/RouteErrorBoundary";
import { PwaManifestSwitcher } from "./pwa/PwaManifestSwitcher";

const Landing = lazy(() => import("./pages/Landing"));
const LoginPage = lazy(() => import("./pages/LoginPage"));
const ResetPasswordPage = lazy(() => import("./pages/ResetPasswordPage"));
const PendingAccessPage = lazy(() => import("./pages/PendingAccessPage"));
const ChooseAreaPage = lazy(() => import("./pages/ChooseAreaPage"));
const NotFound = lazy(() => import("./pages/NotFound"));
const ErrorPage = lazy(() => import("./pages/ErrorPage"));
const OAuthConsent = lazy(() => import("./pages/OAuthConsent"));

const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard"));
const AdminProducts = lazy(() => import("./pages/admin/AdminProducts"));
const AdminCategories = lazy(() => import("./pages/admin/AdminCategories"));
const AdminSellers = lazy(() => import("./pages/admin/AdminSellers"));
const AdminOrders = lazy(() => import("./pages/admin/AdminOrders"));
const AdminReturns = lazy(() => import("./pages/admin/AdminReturns"));
const AdminFinance = lazy(() => import("./pages/admin/AdminFinance"));
const AdminWithdrawals = lazy(() => import("./pages/admin/AdminWithdrawals"));
const AdminLegalDocuments = lazy(() => import("./pages/admin/AdminLegalDocuments"));
const AdminLegalConsents = lazy(() => import("./pages/admin/AdminLegalConsents"));
const AdminOperationalErrors = lazy(() => import("./pages/admin/AdminOperationalErrors"));
const AdminReports = lazy(() => import("./pages/admin/AdminReports"));
const AdminSalesReport = lazy(() => import("./pages/admin/reports/SalesReport"));
const AdminResellerReport = lazy(() => import("./pages/admin/reports/ResellerReport"));
const AdminCommissionReport = lazy(() => import("./pages/admin/reports/CommissionReport"));
const AdminWalletReport = lazy(() => import("./pages/admin/reports/WalletReport"));
const AdminWithdrawalReport = lazy(() => import("./pages/admin/reports/WithdrawalReport"));
const AdminReturnsReport = lazy(() => import("./pages/admin/reports/ReturnsReport"));
const AdminInventoryReport = lazy(() => import("./pages/admin/reports/InventoryReport"));
const AdminProductsReport = lazy(() => import("./pages/admin/reports/ProductsReport"));
const AdminExpiredOrdersReport = lazy(() => import("./pages/admin/reports/ExpiredOrdersReport"));
const AdminSettings = lazy(() => import("./pages/admin/AdminSettings"));
const AdminAdministrators = lazy(() => import("./pages/admin/AdminAdministrators"));
const AdminNetwork = lazy(() => import("./pages/admin/AdminNetwork"));
const AdminBanners = lazy(() => import("./pages/admin/AdminBanners"));

const SellerDashboard = lazy(() => import("./pages/seller/SellerDashboard"));
const SellerStore = lazy(() => import("./pages/seller/SellerStore"));
const SellerCustomization = lazy(() => import("./pages/seller/SellerCustomization"));
const SellerCatalog = lazy(() => import("./pages/seller/SellerCatalog"));
const SellerProducts = lazy(() => import("./pages/seller/SellerProducts"));
const SellerOrders = lazy(() => import("./pages/seller/SellerOrders"));
const SellerCustomers = lazy(() => import("./pages/seller/SellerCustomers"));
const SellerWithdrawals = lazy(() => import("./pages/seller/SellerWithdrawals"));
const SellerLegalConsents = lazy(() => import("./pages/seller/SellerLegalConsents"));
const SellerReports = lazy(() => import("./pages/seller/SellerReports"));
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
  <ProtectedRoute allowedRoles={["admin"]}>{children}</ProtectedRoute>
);
const Seller = ({ children }: { children: JSX.Element }) => (
  <ProtectedRoute allowedRoles={["sacoleira"]}>{children}</ProtectedRoute>
);

const App = forwardRef<HTMLDivElement>((_, ref) => (
  <div ref={ref} className="min-h-screen bg-background text-foreground">
    <TooltipProvider>
    <Toaster />
    <Sonner position="top-center" />
    <AppErrorBoundary>
    <AuthProvider>
      <CartProvider>
        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <AreaProvider>
          <PwaManifestSwitcher />
          <OfflineBanner />
          <AppUpdatePrompt />
          <LazyRouteErrorBoundary>
            <RouteErrorBoundary name="app-routes">
            <Suspense fallback={<RouteFallback />}>
              <Routes>
                <Route path="/" element={<Landing />} />
                <Route path="/login-admin" element={<LoginPage role="admin" />} />
                <Route path="/login-sacoleira" element={<LoginPage role="sacoleira" />} />
                <Route path="/reset-password" element={<ResetPasswordPage />} />
                <Route path="/acesso-pendente" element={<PendingAccessPage />} />
                <Route path="/escolher-area" element={<ChooseAreaPage />} />
                <Route path="/erro" element={<ErrorPage />} />
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
                <Route path="/admin/saques" element={<Admin><AdminWithdrawals /></Admin>} />
                <Route path="/admin/documentos-legais" element={<Admin><AdminLegalDocuments /></Admin>} />
                <Route path="/admin/consentimentos" element={<Admin><AdminLegalConsents /></Admin>} />
                <Route path="/admin/erros-operacionais" element={<Admin><AdminOperationalErrors /></Admin>} />
                <Route path="/admin/relatorios" element={<Admin><AdminReports /></Admin>} />
                <Route path="/admin/relatorios/vendas" element={<Admin><AdminSalesReport /></Admin>} />
                <Route path="/admin/relatorios/sacoleiras" element={<Admin><AdminResellerReport /></Admin>} />
                <Route path="/admin/relatorios/comissoes" element={<Admin><AdminCommissionReport /></Admin>} />
                <Route path="/admin/relatorios/carteira" element={<Admin><AdminWalletReport /></Admin>} />
                <Route path="/admin/relatorios/saques" element={<Admin><AdminWithdrawalReport /></Admin>} />
                <Route path="/admin/relatorios/devolucoes" element={<Admin><AdminReturnsReport /></Admin>} />
                <Route path="/admin/relatorios/estoque" element={<Admin><AdminInventoryReport /></Admin>} />
                <Route path="/admin/relatorios/produtos" element={<Admin><AdminProductsReport /></Admin>} />
                <Route path="/admin/relatorios/expirados" element={<Admin><AdminExpiredOrdersReport /></Admin>} />
                <Route path="/admin/configuracoes" element={<Admin><AdminSettings /></Admin>} />
                <Route path="/admin/configuracoes/administradores" element={<Admin><AdminAdministrators /></Admin>} />
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
                <Route path="/sacoleira/saques" element={<Seller><SellerWithdrawals /></Seller>} />
                <Route path="/sacoleira/consentimentos" element={<Seller><SellerLegalConsents /></Seller>} />
                <Route path="/sacoleira/relatorios" element={<Seller><SellerReports /></Seller>} />
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
            </RouteErrorBoundary>
          </LazyRouteErrorBoundary>
          </AreaProvider>
        </BrowserRouter>
      </CartProvider>
    </AuthProvider>
    </AppErrorBoundary>
    </TooltipProvider>
  </div>
));

App.displayName = "App";

export default App;
