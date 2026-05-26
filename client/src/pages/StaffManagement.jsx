import React, { useState, useEffect } from 'react';
import { staffService } from '../services/staffService';
import useAuthStore from '../store/authStore';
import Swal from 'sweetalert2';
import {
    Users, UserPlus, Edit, ShieldAlert, Key,
    Power, Loader2, Mail, Lock, Shield, User, X, CheckCircle2, Ban
} from 'lucide-react';

// Reusable Role Guard
const RoleGuard = ({ allowedRoles, children, user }) => {
    if (!user || !allowedRoles.includes(user.role)) {
        return (
            <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center">
                <div className="w-20 h-20 bg-red-50 dark:bg-red-500/10 text-red-500 dark:text-red-400 rounded-full flex items-center justify-center mb-6 transition-colors">
                    <ShieldAlert size={40} />
                </div>
                <h1 className="text-2xl font-black text-slate-800 dark:text-slate-100 mb-2 transition-colors">Access Denied</h1>
                <p className="text-slate-500 dark:text-slate-400 max-w-md font-medium transition-colors">
                    You don't have the required permissions to manage staff. Please contact the shop owner.
                </p>
            </div>
        );
    }
    return <>{children}</>;
};

const StaffManagement = () => {
    const user = useAuthStore((state) => state.user);

    const [staff, setStaff] = useState([]);
    const [stats, setStats] = useState({ total: 0, active: 0, inactive: 0, byRole: [] });
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);

    // Drawer State
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [drawerMode, setDrawerMode] = useState('add'); // 'add' | 'edit'
    const [selectedStaff, setSelectedStaff] = useState(null);
    const [showPassword, setShowPassword] = useState(false);

    const [formData, setFormData] = useState({
        name: '', email: '', password: '', role: 'cashier', isActive: true
    });

    const fetchData = async () => {
        try {
            setLoading(true);
            const [staffRes, statsRes] = await Promise.all([
                staffService.getStaff(),
                staffService.getStats()
            ]);
            setStaff(staffRes.data.data);
            setStats(statsRes.data.data);
        } catch (error) {
            Swal.fire({
                title: 'Error',
                text: 'Failed to load staff data',
                icon: 'error',
                customClass: { popup: 'dark:bg-slate-800 dark:text-slate-100 rounded-[2rem]' }
            });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (['owner', 'admin'].includes(user?.role)) fetchData();
    }, [user?.role]);

    const openDrawer = (mode, staffData = null) => {
        setDrawerMode(mode);
        if (mode === 'edit' && staffData) {
            setSelectedStaff(staffData);
            setFormData({
                name: staffData.name,
                email: staffData.email,
                password: '',
                role: staffData.role,
                isActive: staffData.isActive !== false // Assume true if undefined
            });
        } else {
            setFormData({ name: '', email: '', password: '', role: 'cashier', isActive: true });
        }
        setShowPassword(false);
        setIsDrawerOpen(true);
    };

    const handleFormSubmit = async (e) => {
        e.preventDefault();
        setActionLoading(true);
        try {
            if (drawerMode === 'add') {
                await staffService.addStaff(formData);
                Swal.fire({
                    title: 'Success',
                    text: 'Staff member added successfully',
                    icon: 'success',
                    customClass: { popup: 'dark:bg-slate-800 dark:text-slate-100 rounded-[2rem]' }
                });
            } else {
                const { email: _email, password: _password, ...updatePayload } = formData;
                await staffService.updateStaff(selectedStaff._id, updatePayload);
                Swal.fire({
                    title: 'Updated',
                    text: 'Staff member updated successfully',
                    icon: 'success',
                    customClass: { popup: 'dark:bg-slate-800 dark:text-slate-100 rounded-[2rem]' }
                });
            }
            setIsDrawerOpen(false);
            fetchData();
        } catch (error) {
            const msg = error.response?.data?.error || 'Operation failed';
            if (msg.includes('plan allows max')) {
                Swal.fire({
                    title: 'Limit Reached',
                    text: 'Staff limit reached. Upgrade your plan in Settings.',
                    icon: 'warning',
                    customClass: { popup: 'dark:bg-slate-800 dark:text-slate-100 rounded-[2rem]' }
                });
            } else {
                Swal.fire({
                    title: 'Error',
                    text: msg,
                    icon: 'error',
                    customClass: { popup: 'dark:bg-slate-800 dark:text-slate-100 rounded-[2rem]' }
                });
            }
        } finally {
            setActionLoading(false);
        }
    };

    const handleToggleStatus = (id, name, currentState) => {
        const action = currentState === false ? 'Reactivate' : 'Deactivate';
        Swal.fire({
            title: `${action} ${name}?`,
            text: currentState === false ? "They will regain access to the system." : "They will lose access immediately.",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: currentState === false ? '#10b981' : '#ef4444',
            confirmButtonText: `Yes, ${action}`,
            customClass: { popup: 'dark:bg-slate-800 dark:text-slate-100 rounded-[2rem]' }
        }).then(async (result) => {
            if (result.isConfirmed) {
                try {
                    await staffService.toggleStatus(id);
                    Swal.fire({
                        title: 'Updated',
                        text: 'Staff status updated.',
                        icon: 'success',
                        customClass: { popup: 'dark:bg-slate-800 dark:text-slate-100 rounded-[2rem]' }
                    });
                    fetchData();
                } catch (error) {
                    Swal.fire({
                        title: 'Error',
                        text: error.response?.data?.error || 'Failed to change status',
                        icon: 'error',
                        customClass: { popup: 'dark:bg-slate-800 dark:text-slate-100 rounded-[2rem]' }
                    });
                }
            }
        });
    };

    const handleResetPassword = async (id) => {
        const { value: newPassword } = await Swal.fire({
            title: 'Reset Password',
            input: 'password',
            inputLabel: 'Enter new password (min 6 characters)',
            inputPlaceholder: '••••••••',
            showCancelButton: true,
            inputValidator: (value) => {
                if (!value || value.length < 6) return 'Password must be at least 6 characters!';
            },
            customClass: { 
                popup: 'dark:bg-slate-800 dark:text-slate-100 rounded-[2rem]',
                input: 'dark:bg-slate-900 dark:border-slate-700 dark:text-slate-100',
                inputLabel: 'dark:text-slate-300'
            }
        });

        if (newPassword) {
            try {
                await staffService.resetPassword(id, { newPassword });
                Swal.fire({
                    title: 'Success',
                    text: 'Password reset successfully',
                    icon: 'success',
                    customClass: { popup: 'dark:bg-slate-800 dark:text-slate-100 rounded-[2rem]' }
                });
            } catch (error) {
                Swal.fire({
                    title: 'Error',
                    text: error.response?.data?.error || 'Failed to reset password',
                    icon: 'error',
                    customClass: { popup: 'dark:bg-slate-800 dark:text-slate-100 rounded-[2rem]' }
                });
            }
        }
    };

    const getRoleBadge = (role) => {
        const badges = {
            admin: 'bg-purple-100 dark:bg-purple-500/20 text-purple-700 dark:text-purple-400',
            manager: 'bg-orange-100 dark:bg-orange-500/20 text-orange-700 dark:text-orange-400',
            cashier: 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400'
        };
        return (
            <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${badges[role] || 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'} transition-colors`}>
                {role}
            </span>
        );
    };

    return (
        <RoleGuard allowedRoles={['owner', 'admin']} user={user}>
            <div className="w-full animate-in fade-in zoom-in-95 duration-300 dark:[color-scheme:dark] transition-colors duration-500">

                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                    <div>
                        <h1 className="text-3xl font-black text-slate-900 dark:text-slate-100 flex items-center gap-3 transition-colors">
                            <Users className="text-blue-600 dark:text-blue-500" size={32} />
                            Staff Management
                        </h1>
                        <p className="text-slate-500 dark:text-slate-400 font-medium mt-1 transition-colors">Manage roles, access, and permissions for your team.</p>
                    </div>
                    <button onClick={() => openDrawer('add')} className="bg-slate-900 dark:bg-blue-600 text-white px-6 py-3 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-slate-800 dark:hover:bg-blue-500 transition-all shadow-lg dark:shadow-none">
                        <UserPlus size={18} /> Add Staff
                    </button>
                </div>

                {/* Stats Row */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <div className="bg-white dark:bg-slate-900/60 backdrop-blur-md p-6 rounded-3xl border border-slate-200 dark:border-slate-800/60 shadow-sm dark:shadow-none flex items-center justify-between transition-colors">
                        <div>
                            <p className="text-sm font-bold text-slate-500 dark:text-slate-400 mb-1 transition-colors">Total Staff</p>
                            <h3 className="text-3xl font-black text-slate-900 dark:text-white transition-colors">{stats.total}</h3>
                        </div>
                        <div className="w-12 h-12 bg-blue-50 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center transition-colors"><Users size={24} /></div>
                    </div>
                    <div className="bg-white dark:bg-slate-900/60 backdrop-blur-md p-6 rounded-3xl border border-slate-200 dark:border-slate-800/60 shadow-sm dark:shadow-none flex items-center justify-between transition-colors">
                        <div>
                            <p className="text-sm font-bold text-slate-500 dark:text-slate-400 mb-1 transition-colors">Active Accounts</p>
                            <h3 className="text-3xl font-black text-emerald-600 dark:text-emerald-400 transition-colors">{stats.active}</h3>
                        </div>
                        <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center transition-colors"><CheckCircle2 size={24} /></div>
                    </div>
                    <div className="bg-white dark:bg-slate-900/60 backdrop-blur-md p-6 rounded-3xl border border-slate-200 dark:border-slate-800/60 shadow-sm dark:shadow-none flex items-center justify-between transition-colors">
                        <div>
                            <p className="text-sm font-bold text-slate-500 dark:text-slate-400 mb-1 transition-colors">Inactive Accounts</p>
                            <h3 className="text-3xl font-black text-red-500 dark:text-red-400 transition-colors">{stats.inactive}</h3>
                        </div>
                        <div className="w-12 h-12 bg-red-50 dark:bg-red-500/20 text-red-500 dark:text-red-400 rounded-full flex items-center justify-center transition-colors"><Ban size={24} /></div>
                    </div>
                </div>

                {/* Role Breakdown Badges */}
                {stats.byRole.length > 0 && (
                    <div className="flex flex-wrap gap-3 mb-6">
                        {stats.byRole.map((roleInfo) => (
                            <div key={roleInfo._id} className="bg-white dark:bg-slate-900/50 px-4 py-2 border border-slate-200 dark:border-slate-700/50 rounded-xl text-sm font-bold text-slate-600 dark:text-slate-300 shadow-sm dark:shadow-none flex items-center gap-2 transition-colors">
                                <span className="w-2 h-2 rounded-full bg-slate-400 dark:bg-slate-500 transition-colors"></span>
                                {roleInfo.count} <span className="capitalize">{roleInfo._id}s</span>
                            </div>
                        ))}
                    </div>
                )}

                {/* Staff Table */}
                <div className="bg-white dark:bg-slate-900/60 backdrop-blur-md rounded-3xl shadow-sm dark:shadow-none border border-slate-200 dark:border-slate-800/60 overflow-hidden transition-colors">
                    {loading ? (
                        <div className="p-12 flex justify-center"><Loader2 className="animate-spin text-blue-500" size={40} /></div>
                    ) : staff.length === 0 ? (
                        <div className="p-16 text-center flex flex-col items-center">
                            <div className="w-24 h-24 bg-slate-50 dark:bg-slate-800/50 text-slate-300 dark:text-slate-500 rounded-full flex items-center justify-center mb-4 transition-colors">
                                <UserPlus size={48} />
                            </div>
                            <h3 className="text-xl font-black text-slate-800 dark:text-slate-100 mb-2 transition-colors">No staff members yet</h3>
                            <p className="text-slate-500 dark:text-slate-400 font-medium mb-6 transition-colors">Add your first cashier or manager to get started.</p>
                            <button onClick={() => openDrawer('add')} className="bg-blue-600 text-white px-6 py-3 rounded-2xl font-bold hover:bg-blue-700 transition-colors">
                                Add Staff Member
                            </button>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-50 dark:bg-slate-800/30 border-b border-slate-200 dark:border-slate-800 transition-colors">
                                        <th className="p-5 text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest transition-colors">Team Member</th>
                                        <th className="p-5 text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest transition-colors">Role</th>
                                        <th className="p-5 text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest transition-colors">Status</th>
                                        <th className="p-5 text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest text-right transition-colors">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                                    {staff.map((staffMember) => (
                                        <tr key={staffMember._id} className="border-b border-slate-100 dark:border-slate-800/50 hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                                            <td className="p-5">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-400 font-bold text-sm shrink-0 transition-colors">
                                                        {staffMember.name.charAt(0).toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <div className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2 transition-colors">
                                                            {staffMember.name}
                                                            {staffMember._id.toString() === user?._id?.toString() && <span className="text-xs text-blue-500 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10 px-2 py-0.5 rounded-md transition-colors">(You)</span>}
                                                        </div>
                                                        <div className="text-xs font-medium text-slate-500 dark:text-slate-400 transition-colors">{staffMember.email}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="p-5">{getRoleBadge(staffMember.role)}</td>
                                            <td className="p-5">
                                                {staffMember.isActive !== false ? (
                                                    <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-3 py-1 rounded-full w-fit border border-emerald-100 dark:border-emerald-500/20 transition-colors">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Active
                                                    </span>
                                                ) : (
                                                    <span className="flex items-center gap-1.5 text-xs font-bold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 px-3 py-1 rounded-full w-fit border border-red-100 dark:border-red-500/20 transition-colors">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span> Inactive
                                                    </span>
                                                )}
                                            </td>
                                            <td className="p-5 text-right">
                                                {staffMember._id.toString() !== user?._id?.toString() && (
                                                    <div className="flex justify-end gap-2">
                                                        {user.role === 'owner' && (
                                                            <button title="Reset Password" onClick={() => handleResetPassword(staffMember._id)} className="p-2 text-amber-500 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-500/20 rounded-xl transition-colors">
                                                                <Key size={18} />
                                                            </button>
                                                        )}
                                                        <button title="Edit Role" onClick={() => openDrawer('edit', staffMember)} className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-500/20 rounded-xl transition-colors">
                                                            <Edit size={18} />
                                                        </button>
                                                        <button
                                                            title={staffMember.isActive !== false ? "Deactivate" : "Activate"}
                                                            onClick={() => handleToggleStatus(staffMember._id, staffMember.name, staffMember.isActive)}
                                                            className={`p-2 rounded-xl transition-colors ${staffMember.isActive !== false ? 'text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/20' : 'text-emerald-500 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-500/20'}`}>
                                                            <Power size={18} />
                                                        </button>
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* Drawer UI */}
                {isDrawerOpen && (
                    <div className="fixed inset-0 z-50 flex justify-end">
                        <div className="absolute inset-0 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-sm transition-colors" onClick={() => setIsDrawerOpen(false)}></div>
                        <div className="relative w-full max-w-md bg-white dark:bg-[#0f172a] h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300 transition-colors">

                            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-900/50 transition-colors">
                                <h2 className="text-xl font-black text-slate-800 dark:text-slate-100 transition-colors">
                                    {drawerMode === 'add' ? 'Add New Staff' : 'Edit Staff Member'}
                                </h2>
                                <button onClick={() => setIsDrawerOpen(false)} className="p-2 text-slate-400 dark:text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-300 rounded-full transition-colors">
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-6">
                                <form id="staff-form" onSubmit={handleFormSubmit} className="space-y-6">
                                    <div>
                                        <label className="block text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2 transition-colors">Full Name</label>
                                        <div className="relative">
                                            <User className="absolute left-4 top-3.5 text-slate-400 dark:text-slate-500 transition-colors" size={18} />
                                            <input type="text" required minLength="2"
                                                value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })}
                                                className="w-full pl-12 p-3.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-bold outline-none focus:border-blue-500 dark:focus:border-blue-500 focus:bg-white dark:focus:bg-slate-800 text-slate-800 dark:text-slate-200 transition-all"
                                                placeholder="John Doe" />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2 transition-colors">Email Address</label>
                                        <div className="relative">
                                            <Mail className="absolute left-4 top-3.5 text-slate-400 dark:text-slate-500 transition-colors" size={18} />
                                            <input type="email" required disabled={drawerMode === 'edit'}
                                                value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })}
                                                className={`w-full pl-12 p-3.5 border rounded-2xl text-sm font-bold outline-none transition-all ${drawerMode === 'edit' ? 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400 dark:text-slate-500 cursor-not-allowed' : 'bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-700 focus:border-blue-500 dark:focus:border-blue-500 focus:bg-white dark:focus:bg-slate-800 text-slate-900 dark:text-slate-200'}`}
                                                placeholder="staff@shop.com" />
                                        </div>
                                        {drawerMode === 'edit' && <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold mt-1 uppercase tracking-wider transition-colors">Email cannot be changed after creation.</p>}
                                    </div>

                                    {drawerMode === 'add' && (
                                        <div>
                                            <label className="block text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2 transition-colors">Password</label>
                                            <div className="relative">
                                                <Lock className="absolute left-4 top-3.5 text-slate-400 dark:text-slate-500 transition-colors" size={18} />
                                                <input type={showPassword ? "text" : "password"} required minLength="6"
                                                    value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })}
                                                    className="w-full pl-12 pr-16 p-3.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-bold outline-none focus:border-blue-500 dark:focus:border-blue-500 focus:bg-white dark:focus:bg-slate-800 text-slate-800 dark:text-slate-200 transition-all"
                                                    placeholder="••••••••" />
                                                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-3.5 text-xs font-bold text-blue-600 dark:text-blue-400 hover:text-blue-800 transition-colors">
                                                    {showPassword ? 'HIDE' : 'SHOW'}
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    <div>
                                        <label className="block text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2 transition-colors">System Role</label>
                                        <div className="relative">
                                            <Shield className="absolute left-4 top-3.5 text-slate-400 dark:text-slate-500 transition-colors" size={18} />
                                            <select
                                                value={formData.role} onChange={e => setFormData({ ...formData, role: e.target.value })}
                                                className="w-full pl-12 p-3.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-bold outline-none focus:border-blue-500 dark:focus:border-blue-500 focus:bg-white dark:focus:bg-slate-800 appearance-none text-slate-800 dark:text-slate-200 transition-all">
                                                <option value="cashier" className="dark:bg-[#0f172a]">Cashier</option>
                                                <option value="manager" className="dark:bg-[#0f172a]">Manager</option>
                                                {user.role === 'owner' && <option value="admin" className="dark:bg-[#0f172a]">Admin</option>}
                                            </select>
                                        </div>
                                    </div>

                                    {drawerMode === 'edit' && (
                                        <div>
                                            <label className="block text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2 transition-colors">Account Status</label>
                                            <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-900/50 p-4 border border-slate-200 dark:border-slate-700 rounded-2xl transition-colors">
                                                <button type="button"
                                                    onClick={() => setFormData({ ...formData, isActive: !formData.isActive })}
                                                    className={`w-12 h-6 rounded-full relative transition-colors ${formData.isActive ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'}`}>
                                                    <span className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${formData.isActive ? 'left-7' : 'left-1'}`}></span>
                                                </button>
                                                <span className="text-sm font-bold text-slate-700 dark:text-slate-300 transition-colors">{formData.isActive ? 'Active User' : 'Deactivated User'}</span>
                                            </div>
                                        </div>
                                    )}

                                </form>
                            </div>

                            <div className="p-6 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-[#0f172a] transition-colors">
                                <button form="staff-form" type="submit" disabled={actionLoading} className="w-full bg-slate-900 dark:bg-blue-600 text-white p-4 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-black dark:hover:bg-blue-500 disabled:opacity-70 flex justify-center items-center transition-colors">
                                    {actionLoading ? <Loader2 size={18} className="animate-spin" /> : (drawerMode === 'add' ? 'Create Account' : 'Save Changes')}
                                </button>
                            </div>

                        </div>
                    </div>
                )}
            </div>
        </RoleGuard>
    );
};

export default StaffManagement;