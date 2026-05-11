import { BrowserRouter, Route, Routes } from "react-router-dom";
import { forwardRef } from "react";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { CartProvider } from "@/contexts/CartContext";
import { AuthProvider } from "@/contexts/AuthContext";
import Landing from "./pages/Landing";
import LoginPage from "./pages/LoginPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import NotFound from "./pages/NotFound";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminProducts from "./pages/admin/AdminProducts";
import AdminCategories from "./pages/admin/AdminCategories";
import AdminSellers from "./pages/admin/AdminSellers";
import AdminOrders from "./pages/admin/AdminOrders";
import AdminFinance from "./pages/admin/AdminFinance";
import AdminSettings from "./pages/admin/AdminSettings";
import AdminNetwork from "./pages/admin/AdminNetwork";
import SellerDashboard from "./pages/seller/SellerDashboard";
import SellerStore from "./pages/seller/SellerStore";
import SellerCustomization from "./pages/seller/SellerCustomization";
import SellerCatalog from "./pages/seller/SellerCatalog";
import SellerProducts from "./pages/seller/SellerProducts";
import SellerOrders from "./pages/seller/SellerOrders";
import SellerCustomers from "./pages/seller/SellerCustomers";
import SellerSettings from "./pages/seller/SellerSettings";
import SellerNetwork from "./pages/seller/SellerNetwork";
import StoreLayout from "./pages/store/StoreLayout";
import StoreHome from "./pages/store/StoreHome";
import StoreProduct from "./pages/store/StoreProduct";
import StoreCart from "./pages/store/StoreCart";
import StoreCheckout from "./pages/store/StoreCheckout";
import { ProtectedRoute } from "./components/ProtectedRoute";

const Admin = ({ children }: { children: JSX.Element }) => <ProtectedRoute role="admin">{children}</ProtectedRoute>;
const Seller = ({ children }: { children: JSX.Element }) => <ProtectedRoute role="sacoleira">{children}</ProtectedRoute>;

const App = forwardRef<HTMLDivElement>((_, ref) => (
  <div ref={ref} className="min-h-screen bg-background text-foreground">
    <TooltipProvider>
    <Toaster />
    <Sonner position="top-center" />
    <AuthProvider>
      <CartProvider>
        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/login-admin" element={<LoginPage role="admin" />} />
            <Route path="/login-sacoleira" element={<LoginPage role="sacoleira" />} />

            {/* Admin */}
            <Route path="/admin" element={<Admin><AdminDashboard /></Admin>} />
            <Route path="/admin/produtos" element={<Admin><AdminProducts /></Admin>} />
            <Route path="/admin/categorias" element={<Admin><AdminCategories /></Admin>} />
            <Route path="/admin/sacoleiras" element={<Admin><AdminSellers /></Admin>} />
            <Route path="/admin/pedidos" element={<Admin><AdminOrders /></Admin>} />
            <Route path="/admin/financeiro" element={<Admin><AdminFinance /></Admin>} />
            <Route path="/admin/configuracoes" element={<Admin><AdminSettings /></Admin>} />
            <Route path="/admin/rede" element={<Admin><AdminNetwork /></Admin>} />

            {/* Seller */}
            <Route path="/sacoleira" element={<Seller><SellerDashboard /></Seller>} />
            <Route path="/sacoleira/loja" element={<Seller><SellerStore /></Seller>} />
            <Route path="/sacoleira/personalizacao" element={<Seller><SellerCustomization /></Seller>} />
            <Route path="/sacoleira/catalogo" element={<Seller><SellerCatalog /></Seller>} />
            <Route path="/sacoleira/meus-produtos" element={<Seller><SellerProducts /></Seller>} />
            <Route path="/sacoleira/pedidos" element={<Seller><SellerOrders /></Seller>} />
            <Route path="/sacoleira/clientes" element={<Seller><SellerCustomers /></Seller>} />
            <Route path="/sacoleira/configuracoes" element={<Seller><SellerSettings /></Seller>} />
            <Route path="/sacoleira/rede" element={<Seller><SellerNetwork /></Seller>} />

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
        </BrowserRouter>
      </CartProvider>
    </AuthProvider>
    </TooltipProvider>
  </div>
));

App.displayName = "App";

export default App;
