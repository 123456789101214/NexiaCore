// src/services/auth.js

export const isSuperAdmin = (user) => {
  // යූසර් කෙනෙක් නැත්නම් කෙලින්ම false
  if (!user || !user.email) return false;
  
  // Vite වල .env එකෙන් Super Admin ගේ ඊමේල් එක ගන්නවා
  const superAdminEmail = import.meta.env.VITE_SUPER_ADMIN_EMAIL;
  
  // ඊමේල් එක මැච් වෙනවා නම් විතරක් true දෙනවා
  return user.email === superAdminEmail;
};