import { useEffect } from "react";
import { Navigate, Route, Routes } from "react-router";
import { site } from "@/config/site";
import { AdminAuthProvider, useAdminAuth } from "./auth";
import { AdminLayout } from "./AdminLayout";
import { Loading } from "./ui";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Orders from "./pages/Orders";
import OrderDetail from "./pages/OrderDetail";
import Products from "./pages/Products";
import ProductEdit from "./pages/ProductEdit";
import Waitlist from "./pages/Waitlist";

export default function AdminApp() {
  useEffect(() => {
    document.title = `Admin — ${site.name}`;
    const robots = document.createElement("meta");
    robots.name = "robots";
    robots.content = "noindex";
    document.head.appendChild(robots);
    return () => robots.remove();
  }, []);

  return (
    <AdminAuthProvider>
      <AdminRoutes />
    </AdminAuthProvider>
  );
}

function AdminRoutes() {
  const { status } = useAdminAuth();
  if (status === "checking") return <div className="p-10"><Loading /></div>;

  if (status === "signed-out") {
    return (
      <Routes>
        <Route path="/admin/login" element={<Login />} />
        <Route path="*" element={<Navigate to="/admin/login" replace />} />
      </Routes>
    );
  }

  return (
    <Routes>
      <Route element={<AdminLayout />}>
        <Route path="/admin" element={<Dashboard />} />
        <Route path="/admin/waitlist" element={<Waitlist />} />
        <Route path="/admin/orders" element={<Orders />} />
        <Route path="/admin/orders/:id" element={<OrderDetail />} />
        <Route path="/admin/products" element={<Products />} />
        <Route path="/admin/products/new" element={<ProductEdit />} />
        <Route path="/admin/products/:id" element={<ProductEdit />} />
      </Route>
      <Route path="*" element={<Navigate to="/admin" replace />} />
    </Routes>
  );
}
