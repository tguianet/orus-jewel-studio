import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { CartProvider } from "@/contexts/CartContext";
import { AuthProvider } from "@/contexts/AuthContext";

import Landing from "./pages/Landing";
import LoginPage from "./pages/LoginPage";
import NotFound from "./pages/NotFound";

import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminProducts from "./pages/admin/AdminProducts";
import AdminCategories from "./pages/admin/AdminCategories";
import AdminSellers from "./pages/admin/AdminSellers";
import AdminOrders from "./pages/admin/AdminOrders";
import AdminFinance from "./pages/admin/AdminFinance";
import AdminSettings from "./pages/admin/AdminSettings";

import SellerDashboard from "./pages/seller/SellerDashboard";
import SellerStore from "./pages/seller/SellerStore";
import SellerCustomization from "./pages/seller/SellerCustomization";
import SellerCatalog from "./pages/seller/SellerCatalog";
import SellerProducts from "./pages/seller/SellerProducts";
import SellerOrders from "./pages/seller/SellerOrders";
import SellerCustomers from "./pages/seller/SellerCustomers";
import SellerSettings from "./pages/seller/SellerSettings";

import StoreLayout from "./pages/store/StoreLayout";
import StoreHome from "./pages/store/StoreHome";
import StoreProduct from "./pages/store/StoreProduct";
import StoreCart from "./pages/store/StoreCart";
import StoreCheckout from "./pages/store/StoreCheckout";

const App = () => (
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
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/admin/produtos" element={<AdminProducts />} />
            <Route path="/admin/categorias" element={<AdminCategories />} />
            <Route path="/admin/sacoleiras" element={<AdminSellers />} />
            <Route path="/admin/pedidos" element={<AdminOrders />} />
            <Route path="/admin/financeiro" element={<AdminFinance />} />
            <Route path="/admin/configuracoes" element={<AdminSettings />} />

            {/* Seller */}
            <Route path="/sacoleira" element={<SellerDashboard />} />
            <Route path="/sacoleira/loja" element={<SellerStore />} />
            <Route path="/sacoleira/personalizacao" element={<SellerCustomization />} />
            <Route path="/sacoleira/catalogo" element={<SellerCatalog />} />
            <Route path="/sacoleira/meus-produtos" element={<SellerProducts />} />
            <Route path="/sacoleira/pedidos" element={<SellerOrders />} />
            <Route path="/sacoleira/clientes" element={<SellerCustomers />} />
            <Route path="/sacoleira/configuracoes" element={<SellerSettings />} />

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
);

export default App;
