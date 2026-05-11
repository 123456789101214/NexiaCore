import React from 'react';
import useAuthStore from '../store/authStore';
import { Navigate } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';

const RoleGuard = ({ allowedRoles, children }) => {
    const user = useAuthStore((state) => state.user);

    if (!user) return <Navigate to="/login" replace />;

    if (!allowedRoles.includes(user.role)) {
        return (
            <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center">
                <div className="w-20 h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center mb-6">
                    <ShieldAlert size={40} />
                </div>
                <h1 className="text-2xl font-black text-slate-800 mb-2">Access Denied</h1>
                <p className="text-slate-500 max-w-md">
                    You don't have the required permissions to view this page. Please contact your Shop Owner.
                </p>
            </div>
        );
    }

    return <>{children}</>;
};

export default RoleGuard;