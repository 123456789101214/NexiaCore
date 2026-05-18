// App.jsx - 100% Cleaned & Fixed

import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import useAuthStore from './store/authStore';
import Layout from './components/Layout';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Inventory from './pages/Inventory';
import POS from './pages/POS';
import SalesHistory from './pages/SalesHistory';
import Suppliers from './pages/Suppliers';
import NewPurchase from './pages/NewPurchase';
import GRNHistory from './pages/GRNHistory';
import Customers from './pages/Customers';
import Settings from './pages/Settings';
import SaaSDashboard from './pages/SaaSDashboard'; // ඔයාගේ Super Admin පේජ් එක
import StaffManagement from './pages/StaffManagement';
import ForgotPassword from './pages/ForgotPassword';
import SuperAdminRoute from "./components/SuperAdminRoute"; // අලුත් Route Protector එක

const ProtectedRoute = () => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />;
};

const PublicRoute = () => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  return !isAuthenticated ? <Outlet /> : <Navigate to="/dashboard" replace />;
};

function App() {
  return (
    <Router>
      <Routes>

        {/* PUBLIC ROUTES — logged-in users redirected to /dashboard */}
        <Route element={<PublicRoute />}>
          <Route path="/login" element={<Login />} />
        </Route>

        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />

        {/* ✅ PROTECTED ROUTES — login required */}
        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<Layout />}>
            <Route index element={<Navigate to="/dashboard" />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="inventory" element={<Inventory />} />
            <Route path="pos" element={<POS />} />
            <Route path="sales-history" element={<SalesHistory />} />
            <Route path="suppliers" element={<Suppliers />} />
            <Route path="new-purchase" element={<NewPurchase />} />
            <Route path="grn-history" element={<GRNHistory />} />
            <Route path="customers" element={<Customers />} />
            <Route path="settings" element={<Settings />} />
            <Route path="staff" element={<StaffManagement />} />

            {/* 🔥 SUPER ADMIN PROTECTED ROUTE (Nested inside Layout) 🔥 */}
            {/* මේකෙන් කියන්නේ: Login වෙලා ඉන්න ඕනේ -> Layout එක තියෙන්න ඕනේ -> Super Admin කෙනෙක් වෙන්නත් ඕනේ */}
            <Route element={<SuperAdminRoute />}>
              <Route path="super-admin" element={<SaaSDashboard />} />
            </Route>

          </Route>
        </Route>

      </Routes>
    </Router>
  );
}

export default App;