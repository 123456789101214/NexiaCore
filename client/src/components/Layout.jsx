import { useState, useMemo, useEffect } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { isSuperAdmin } from '../services/auth';
import useAuthStore from '../store/authStore';
import usePlanStore from '../store/planStore';
import ThemeToggle from './ThemeToggle';
import { useNetworkStatus } from '../hooks/useNetworkStatus';
import useOfflineStore from '../store/offlineStore';
import PWAInstallPrompt from './PWAInstallPrompt'; // We will create this next
import {
  LayoutDashboard, Package, ShoppingCart, Users, LogOut, Store, Menu, X,
  BarChart2, ShoppingBag, ClipboardList, Truck, BookUser, Settings, ShieldCheck, Lock, Loader2, Zap
} from 'lucide-react';

const Layout = () => {
  const isOnline = useNetworkStatus();
  const { pendingOrdersCount } = useOfflineStore();
  const user = useAuthStore((state) => state.user);
  const logoutAction = useAuthStore((state) => state.logout);

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  // 🔥 STRICT REACTIVITY: Fetch function එක වගේම, features object එකත් කෙලින්ම Store එකෙන් ගන්නවා. 
  // එතකොට Data ආපු ගමන් මේ Component එක Re-render වෙනවා.
  const fetchPlanFeatures = usePlanStore((state) => state.fetchPlanFeatures);
  const features = usePlanStore((state) => state.features);

  useEffect(() => {
    if (isAuthenticated) {
      fetchPlanFeatures();
    }
  }, [isAuthenticated, fetchPlanFeatures]);

  const hasSuperAdminAccess = isSuperAdmin(user);

  const menuItems = useMemo(() => {
    // 💡 Helper function to check strict locking
    const checkFeatureLocked = (featureName) => {
      if (!features) return true; // Loading වෙද්දී lock කරලා තියනවා
      return features[featureName] !== true;
    };

    const allItems = [
      { name: 'Dashboard', path: '/dashboard', icon: <LayoutDashboard size={20} />, roles: ['owner', 'admin', 'manager'] },
      { name: 'POS System', path: '/pos', icon: <ShoppingCart size={20} />, roles: ['owner', 'admin', 'manager', 'cashier'] },
      { name: 'Inventory', path: '/inventory', icon: <Package size={20} />, roles: ['owner', 'admin'] },
      { name: 'Suppliers', path: '/suppliers', icon: <Truck size={20} />, roles: ['owner', 'admin', 'manager'] },
      { name: 'Add Purchase (GRN)', path: '/new-purchase', icon: <ShoppingBag size={20} />, roles: ['owner', 'admin', 'manager'] },
      { name: 'GRN History', path: '/grn-history', icon: <ClipboardList size={20} />, roles: ['owner', 'admin', 'manager'] },
      { name: 'Customers & Credit', path: '/customers', icon: <BookUser size={20} />, roles: ['owner', 'admin', 'manager', 'cashier'], locked: checkFeatureLocked('customerCredit') },
      { name: 'Staff Management', path: '/staff', icon: <Users size={20} />, roles: ['owner', 'admin'] },
      { name: 'Reports', path: '/sales-history', icon: <BarChart2 size={20} />, roles: ['owner', 'admin', 'manager'], locked: checkFeatureLocked('analytics') },
      { name: 'Settings', path: '/settings', icon: <Settings size={20} />, roles: ['owner', 'admin'] },
      // { name: 'Quick Setup Wizard',path: '/inventory/quick-setup',icon: <Zap size={20} />,roles: ['owner', 'admin'] }
    ];

    const currentRole = user?.role?.toLowerCase() || '';
    return allItems.filter(item => item.roles.includes(currentRole));
  }, [user?.role, features]); // 🔥 features කියන එක Dependency Array එකට දැම්මා අනිවාර්යයෙන්ම Update වෙන්න

  const handleLogout = () => {
    logoutAction();
    navigate('/login');
  };

  return (
    // 🌌 1. Main Background wrapping everything (Added dark mode and transitions)
    <div className="min-h-screen w-full bg-slate-200 dark:bg-slate-950 flex justify-center font-sans transition-colors duration-500">

      {/* 🌌 2. Inner App Container */}
      <div className="w-full max-w-[1600px] h-screen bg-slate-50 dark:bg-slate-900 flex overflow-hidden shadow-2xl md:border-x border-slate-300 dark:border-slate-800 transition-colors duration-500 relative">

        {isSidebarOpen && (
          <div
            className="fixed inset-0 bg-slate-900/50 dark:bg-slate-950/80 z-40 lg:hidden backdrop-blur-sm transition-all"
            onClick={() => setIsSidebarOpen(false)}
          ></div>
        )}

        {/* 🌌 3. Sidebar */}
        <aside className={`
          fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-[#0f172a] border-r border-slate-200 dark:border-slate-800/50 flex flex-col transition-all duration-300 ease-in-out
          lg:relative lg:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        `}>
          <div className="p-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-blue-600 dark:bg-blue-500 p-2 rounded-lg text-white shadow-md shadow-blue-600/20 dark:shadow-blue-500/20">
                <Store size={24} />
              </div>
              <span className="font-black text-xl text-slate-800 dark:text-white tracking-tight transition-colors">NexiaCore</span>
            </div>
            <button className="lg:hidden p-2 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors" onClick={() => setIsSidebarOpen(false)}>
              <X size={24} />
            </button>
          </div>

          <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
            {menuItems.map((item) => {
              const isActive = location.pathname.startsWith(item.path);
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setIsSidebarOpen(false)}
                  className={`flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-300 ${isActive
                      ? 'bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold shadow-sm dark:shadow-[inset_3px_0_0_0_#3b82f6]'
                      : 'text-slate-500 dark:text-slate-400 font-medium hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-800 dark:hover:text-slate-200'
                    } ${item.locked ? 'opacity-70 grayscale dark:opacity-50' : 'opacity-100'}`}
                >
                  <div className="flex items-center gap-3">
                    {item.icon}
                    {item.name}
                  </div>

                  {item.locked && (
                    <div className="flex items-center gap-1 bg-amber-100 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 px-2 py-0.5 rounded-md border border-amber-200/50 dark:border-amber-500/20">
                      <Lock size={10} />
                      <span className="text-[8px] font-black uppercase">PRO</span>
                    </div>
                  )}
                </Link>
              );
            })}

            {hasSuperAdminAccess && (
              <div className="mt-auto mb-4">
                <Link to="/super-admin" className="w-full flex items-center justify-center p-3 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 font-bold rounded-xl border border-indigo-100 dark:border-indigo-500/20 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 transition-colors">
                  <ShieldCheck size={18} className="mr-2" />
                  SUPER ADMIN PORTAL
                </Link>
              </div>
            )}
          </nav>

          {/* 🌌 4. User Profile */}
          <div className="p-4 border-t border-slate-100 dark:border-slate-800/50">
            <div className="flex items-center gap-3 px-4 py-3 mb-2 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-700/50 transition-colors">
              <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center text-blue-600 dark:text-blue-400 font-black text-sm shrink-0 shadow-sm border border-blue-200 dark:border-blue-800/50">
                {user?.name?.charAt(0)?.toUpperCase() || 'U'}
              </div>
              <div className="flex flex-col overflow-hidden">
                <span className="text-sm font-bold text-slate-700 dark:text-slate-200 truncate">{user?.name || 'User'}</span>
                <span className="text-[10px] font-black text-blue-500 dark:text-blue-400 uppercase tracking-widest">{user?.role || 'Guest'}</span>
              </div>
            </div>
            <button onClick={handleLogout} className="flex items-center justify-center gap-2 w-full px-4 py-3 text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 hover:text-red-600 dark:hover:text-red-300 font-bold rounded-xl transition-all">
              <LogOut size={18} />
              <span>Sign Out</span>
            </button>
          </div>

        </aside>

        {/* 🌌 5. Main Content Area */}
        <main className="flex-1 overflow-y-auto flex flex-col bg-slate-50 dark:bg-slate-950 transition-colors duration-500">

          {/* 🌌 6. Header */}
          <header className="h-16 bg-white dark:bg-[#0f172a] border-b border-slate-200 dark:border-slate-800/80 flex items-center justify-between px-4 md:px-8 sticky top-0 z-30 shrink-0 shadow-sm transition-colors duration-500">
            <div className="flex items-center gap-4">
              <button
                className="lg:hidden p-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                onClick={() => setIsSidebarOpen(true)}
              >
                <Menu size={24} />
              </button>
              <h1 className="text-lg font-black text-slate-800 dark:text-white uppercase tracking-tight transition-colors">
                {location.pathname.startsWith('/super-admin')
                  ? 'Super Admin Portal'
                  : (menuItems.find(item => location.pathname.startsWith(item.path))?.name || 'Nexus POS')}
              </h1>
            </div>

            <div className="flex items-center gap-3">
              <ThemeToggle />
              {/* 🌌 7. Role Badge (Premium Dark Mode Colors) */}
              <span className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest shadow-sm transition-colors ${hasSuperAdminAccess ? 'bg-indigo-100 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/20' :
                  user?.role === 'admin' ? 'bg-purple-100 dark:bg-purple-500/10 text-purple-700 dark:text-purple-400 border border-purple-200 dark:border-purple-500/20' :
                    user?.role === 'manager' ? 'bg-orange-100 dark:bg-orange-500/10 text-orange-700 dark:text-orange-400 border border-orange-200 dark:border-orange-500/20' :
                      user?.role === 'owner' ? 'bg-blue-100 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-500/20' :
                        'bg-emerald-100 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20'
                }`}>
                {hasSuperAdminAccess ? 'SUPER ADMIN' : user?.role || 'Guest'} MODE
              </span>
            </div>
            {!isOnline && (
              <div className="flex items-center gap-2 bg-amber-100 text-amber-800 px-3 py-1 rounded-full text-xs font-black">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                OFFLINE MODE
              </div>
            )}

            {pendingOrdersCount > 0 && isOnline && (
              <div className="flex items-center gap-2 bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-xs font-black">
                <Loader2 size={12} className="animate-spin" />
                Syncing {pendingOrdersCount} orders...
              </div>
            )}
          </header>

          <div className="p-4 md:p-8">
            <Outlet />
          </div>
        </main>
      </div>
      <PWAInstallPrompt />
    </div>
  );
};

export default Layout;