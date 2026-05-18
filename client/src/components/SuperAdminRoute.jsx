// src/components/SuperAdminRoute.jsx

import React from "react";
import { Navigate, Outlet } from "react-router-dom";
import useAuthStore from "../store/authStore"; // 🔥 Context වෙනුවට ඔයාගේ Zustand Store එක ගත්තා
import { isSuperAdmin } from "../services/auth";

export default function SuperAdminRoute() {
  // Zustand store එකෙන් user ව ගන්නවා
  const user = useAuthStore((state) => state.user);

  // යූසර් Super Admin නෙවෙයි නම් (සාමාන්‍ය කෙනෙක් නම්), Dashboard එකට විසි කරනවා
  if (!isSuperAdmin(user)) {
    return <Navigate to="/dashboard" replace />;
  }

  // Super Admin නම් විතරක් ඇතුළට (SaaSDashboard එකට) යන්න දෙනවා
  return <Outlet />;
}