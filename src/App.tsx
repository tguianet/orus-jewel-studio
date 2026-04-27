import { BrowserRouter, Route, Routes } from "react-router-dom";
import { lazy, Suspense } from "react";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { CartProvider } from "@/contexts/CartContext";
import { AuthProvider } from "@/contexts/AuthContext";

const Landing = lazy(() => import("./pages/Landing"));
const LoginPage = lazy(() => import("./pages/LoginPage"));
const NotFound = lazy(() => import("./pages/NotFound"));

const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard"));
const AdminProducts = lazy(() => import("./pages/admin/AdminProducts"));
const AdminCategories = lazy(() => import("./pages/admin/AdminCategories"));
const AdminSellers = lazy(() => import("./pages/admin/AdminSellers"));
const AdminOrders = lazy(() => import("./pages/admin/AdminOrders"));
const AdminFinance = lazy(() => import("./pages/admin/AdminFinance"));
const AdminSettings = lazy(() => import("./pages/admin/AdminSettings"));
const AdminNetwork = lazy(() => import("./pages/admin/AdminNetwork"));

const SellerDashboard = lazy(() => import("./pages/seller/SellerDashboard"));
const SellerStore = lazy(() => import("./pages/seller/SellerStore"));
const SellerCustomization = lazy(() => import("./pages/seller/SellerCustomization"));
const SellerCatalog = lazy(() => import("./pages/seller/SellerCatalog"));
const SellerProducts = lazy(() => import("./pages/seller/SellerProducts"));
const SellerOrders = lazy(() => import("./pages/seller/SellerOrders"));
const SellerCustomers = lazy(() => import("./pages/seller/SellerCustomers"));
const SellerSettings = lazy(() => import("./pages/seller/SellerSettings"));
const SellerNetwork = lazy(() => import("./pages/seller/SellerNetwork"));

const StoreLayout = lazy(() => import("./pages/store/StoreLayout"));
const StoreHome = lazy(() => import("./pages/store/StoreHome"));
const StoreProduct = lazy(() => import("./pages/store/StoreProduct"));
const StoreCart = lazy(() => import("./pages/store/StoreCart"));
const StoreCheckout = lazy(() => import("./pages/store/StoreCheckout"));

const RouteFallback = () => (
  <div className="min-h-screen bg-background text-foreground" />
);

const App = () => (
  <TooltipProvider>
    <Toaster />
    <Sonner position="top-center" />
    <AuthProvider>
      <CartProvider>
        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <Suspense fallback={<RouteFallback />}>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/login-admin" element={<LoginPage role="admin" />} />
            <Route path="/login-sacoleira" element={<LoginPage role="sacoleira" />} />

            {/* Admin */}
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/admin/produtos" element={<AdminProducts />} />
            <Route path="/admin/categorias" element={<AdminCategories />} />
            <Route path="/admin/sacoleiras" element={<AdminSellers />} />
            <Route path="/admin/pedidos" element={<AdminOrders />} />
            <Route path="/admin/financeiro" element={<AdminFinance />} />
            <Route path="/admin/configuracoes" element={<AdminSettings />} />
            <Route path="/admin/rede" element={<AdminNetwork />} />

            {/* Seller */}
            <Route path="/sacoleira" element={<SellerDashboard />} />
            <Route path="/sacoleira/loja" element={<SellerStore />} />
            <Route path="/sacoleira/personalizacao" element={<SellerCustomization />} />
            <Route path="/sacoleira/catalogo" element={<SellerCatalog />} />
            <Route path="/sacoleira/meus-produtos" element={<SellerProducts />} />
            <Route path="/sacoleira/pedidos" element={<SellerOrders />} />
            <Route path="/sacoleira/clientes" element={<SellerCustomers />} />
            <Route path="/sacoleira/configuracoes" element={<SellerSettings />} />
            <Route path="/sacoleira/rede" element={<SellerNetwork />} />

            {/* Public store */}
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
        </BrowserRouter>
      </CartProvider>
    </AuthProvider>
  </TooltipProvider>
);

export default App;
