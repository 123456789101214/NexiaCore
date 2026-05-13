// App.jsx - ONLY CHANGE NEEDED
// Move /register route from ProtectedRoute to PublicRoute block

// ✅ CORRECT App.jsx structure:

import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import useAuthStore from './store/authStore';
import Layout from './components/Layout';
import Login from './pages/Login';
import Register from './pages/Register';      // ← import must exist
import Dashboard from './pages/Dashboard';
import Inventory from './pages/Inventory';
import POS from './pages/POS';
import SalesHistory from './pages/SalesHistory';
import Suppliers from './pages/Suppliers';
import NewPurchase from './pages/NewPurchase';
import GRNHistory from './pages/GRNHistory';
import Customers from './pages/Customers';
import Settings from './pages/Settings';
import SaaSDashboard from './pages/SaaSDashboard';
import StaffManagement from './pages/StaffManagement';
import ForgotPassword from './pages/ForgotPassword';

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

        {/*
          /register is OUTSIDE PublicRoute and ProtectedRoute intentionally.
          Register.jsx handles both states itself:
            - Not logged in → shows registration form
            - Logged in     → shows "Already Logged In" wall
          PublicRoute would redirect logged-in users BEFORE Register.jsx renders.
        */}
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
            <Route path="super-admin" element={<SaaSDashboard />} />
            <Route path="staff" element={<StaffManagement />} />
          </Route>
        </Route>

      </Routes>
    </Router>
  );
}

export default App;