import React, { useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import API from '../services/api';
import useAuthStore from '../store/authStore';
import { TrendingUp, Loader2, AlertCircle } from 'lucide-react';

// Custom Tooltip (කලින් විදිහටමයි, තව පොඩ්ඩක් Smooth කළා)
const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl text-slate-800 dark:text-white p-4 rounded-2xl shadow-xl shadow-slate-200/50 dark:shadow-black/50 text-xs font-bold border border-slate-100 dark:border-slate-800 transition-all">
                <p className="text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3">{label}</p>
                {payload.map((entry, index) => (
                    <div key={index} className="flex items-center gap-3 mb-2" style={{ color: entry.color }}>
                        <div className="w-2.5 h-2.5 rounded-full shadow-sm" style={{ backgroundColor: entry.color }}></div>
                        <span className="text-slate-600 dark:text-slate-300">{entry.name === 'totalSales' ? 'Total Sales' : 'Net Profit'}:</span>
                        <span className="ml-auto font-black text-sm">Rs. {entry.value.toLocaleString()}</span>
                    </div>
                ))}
                {payload[0]?.payload?.orderCount !== undefined && (
                    <div className="flex items-center gap-3 mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 text-slate-500 dark:text-slate-400">
                        <span>Total Orders:</span>
                        <span className="ml-auto font-black text-slate-700 dark:text-slate-200">{payload[0].payload.orderCount}</span>
                    </div>
                )}
            </div>
        );
    }
    return null;
};

const SalesChart = () => {
    const user = useAuthStore(state => state.user);
    const [chartData, setChartData] = useState([]);
    const [summary, setSummary] = useState(null);
    const [period, setPeriod] = useState(7);
    const [loading, setLoading] = useState(true);

    // 🚀 NEW UI UPGRADE: Interactive Visibility States
    const [showSales, setShowSales] = useState(true);
    const [showProfit, setShowProfit] = useState(true);

    useEffect(() => {
        const fetchChartData = async () => {
            setLoading(true);
            try {
                const res = await API.get(`/analytics/chart-data?period=${period}`);
                setChartData(res.data.data.chartData);
                setSummary(res.data.data.summary);
            } catch (error) {
                console.error("Failed to fetch chart data:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchChartData();
    }, [period]);

    const canSeeProfit = ['owner', 'admin'].includes(user?.role);
    const isEmpty = chartData.every(d => d.totalSales === 0);

    return (
        <div className="w-full bg-white dark:bg-slate-900/60 backdrop-blur-md p-6 rounded-[2rem] shadow-sm dark:shadow-none border border-slate-100 dark:border-slate-800/60 transition-all duration-500 group hover:shadow-md dark:hover:shadow-blue-900/10">
            {/* Header Area */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-105 duration-300">
                        <TrendingUp size={22} strokeWidth={2.5} />
                    </div>
                    <div>
                        <h2 className="text-xl font-black text-slate-800 dark:text-slate-100 tracking-tight">Sales Overview</h2>
                        <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-0.5">Revenue Analytics</p>
                    </div>
                </div>
                
                <div className="flex bg-slate-50 dark:bg-slate-800/50 p-1.5 rounded-xl border border-slate-100 dark:border-slate-700/50 transition-colors w-fit">
                    {[7, 30, 90].map(days => (
                        <button
                            key={days}
                            onClick={() => setPeriod(days)}
                            className={`px-5 py-2 text-xs font-black uppercase tracking-wider rounded-lg transition-all duration-300 ${
                                period === days 
                                    ? 'bg-slate-900 dark:bg-blue-600 text-white shadow-md shadow-slate-200 dark:shadow-none scale-100' 
                                    : 'text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-200/50 dark:hover:bg-slate-700/50'
                            }`}
                        >
                            {days}D
                        </button>
                    ))}
                </div>
            </div>

            {/* 🚀 UPGRADED SUMMARY CHIPS: Clickable to toggle chart lines */}
            {summary && (
                <div className="flex flex-wrap gap-3 mb-8">
                    {/* Revenue Toggle Card */}
                    <div 
                        onClick={() => setShowSales(!showSales)}
                        className={`flex-1 min-w-[140px] border rounded-2xl p-4 transition-all duration-300 cursor-pointer select-none 
                        ${showSales 
                            ? 'bg-slate-50 dark:bg-slate-800/60 border-blue-200 dark:border-blue-500/30 shadow-sm' 
                            : 'bg-white dark:bg-transparent border-slate-100 dark:border-slate-800/50 opacity-50 grayscale'}`}
                    >
                        <div className="flex items-center gap-2 mb-1">
                            <div className={`w-2 h-2 rounded-full ${showSales ? 'bg-blue-500' : 'bg-slate-400'}`}></div>
                            <span className="text-slate-500 dark:text-slate-400 uppercase tracking-widest text-[10px] font-black">Total Revenue</span>
                        </div>
                        <span className="block text-xl font-black text-slate-700 dark:text-slate-100">Rs. {summary.totalSales.toLocaleString()}</span>
                    </div>

                    {/* Orders Card (Non-clickable for chart, just info) */}
                    <div className="flex-1 min-w-[140px] bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-700/50 rounded-2xl p-4 transition-colors">
                        <span className="block text-slate-400 dark:text-slate-500 uppercase tracking-widest text-[10px] font-black mb-1">Total Orders</span>
                        <span className="block text-xl font-black text-slate-700 dark:text-slate-100">{summary.totalOrders}</span>
                    </div>

                    {/* Profit Toggle Card */}
                    {canSeeProfit && summary.totalProfit !== undefined && (
                        <div 
                            onClick={() => setShowProfit(!showProfit)}
                            className={`flex-1 min-w-[140px] border rounded-2xl p-4 transition-all duration-300 cursor-pointer select-none relative overflow-hidden
                            ${showProfit 
                                ? 'bg-emerald-50/50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/30 shadow-sm' 
                                : 'bg-white dark:bg-transparent border-slate-100 dark:border-slate-800/50 opacity-50 grayscale'}`}
                        >
                            {showProfit && <div className="absolute right-0 top-0 w-16 h-16 bg-emerald-500/10 rounded-bl-full blur-xl"></div>}
                            <div className="flex items-center gap-2 mb-1">
                                <div className={`w-2 h-2 rounded-full ${showProfit ? 'bg-emerald-500' : 'bg-slate-400'}`}></div>
                                <span className={`uppercase tracking-widest text-[10px] font-black ${showProfit ? 'text-emerald-600/70 dark:text-emerald-500/70' : 'text-slate-500 dark:text-slate-400'}`}>Net Profit</span>
                            </div>
                            <span className={`block text-xl font-black ${showProfit ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-700 dark:text-slate-100'}`}>
                                Rs. {summary.totalProfit.toLocaleString()}
                            </span>
                        </div>
                    )}
                </div>
            )}

            {/* Chart Area */}
            <div className="w-full h-[320px] relative">
                {loading ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/60 dark:bg-slate-900/60 backdrop-blur-sm z-10 rounded-2xl transition-all">
                        <Loader2 className="animate-spin text-blue-500 mb-3" size={32} />
                        <span className="text-xs font-bold text-slate-400 tracking-widest uppercase">Analyzing Data...</span>
                    </div>
                ) : isEmpty ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-800/30 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-700 transition-colors">
                        <AlertCircle size={40} className="mb-3 opacity-30" />
                        <span className="text-sm font-black tracking-wide text-slate-500 dark:text-slate-400">No sales recorded yet</span>
                        <span className="text-xs font-medium mt-1 opacity-70">Complete an order to see analytics</span>
                    </div>
                ) : (
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                            <defs>
                                <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.35}/>
                                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                                </linearGradient>
                                {canSeeProfit && (
                                    <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                                    </linearGradient>
                                )}
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-grid, rgba(148, 163, 184, 0.1))" />
                            <XAxis 
                                dataKey="label" 
                                tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 700 }}
                                tickLine={false}
                                axisLine={false}
                                interval={period === 7 ? 0 : period === 30 ? 4 : 9}
                                dy={15}
                            />
                            {/* 🚀 UPGRADE: padding={{ top: 30 }} adds breathing room so lines don't hit the top */}
                            <YAxis 
                                padding={{ top: 30 }} 
                                tickFormatter={(value) => value > 0 ? `${(value / 1000).toFixed(0)}k` : '0'}
                                tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 700 }}
                                tickLine={false}
                                axisLine={false}
                                width={50}
                            />
                            
                            {/* 🚀 UPGRADE: Custom dashed vertical cursor on hover */}
                            <Tooltip 
                                content={<CustomTooltip />} 
                                cursor={{ stroke: '#64748b', strokeWidth: 1.5, strokeDasharray: '4 4', opacity: 0.4 }} 
                            />
                            
                            {/* 🚀 UPGRADE: Conditional rendering based on toggle states */}
                            {showSales && (
                                <Area 
                                    type="monotone" 
                                    dataKey="totalSales" 
                                    name="totalSales"
                                    stroke="#3b82f6" 
                                    strokeWidth={4}
                                    fillOpacity={1} 
                                    fill="url(#colorSales)" 
                                    activeDot={{ r: 6, strokeWidth: 0, fill: '#3b82f6', className: 'shadow-lg drop-shadow-[0_0_8px_rgba(59,130,246,0.8)]' }}
                                    animationDuration={0}
                                />
                            )}
                            {canSeeProfit && showProfit && (
                                <Area 
                                    type="monotone" 
                                    dataKey="totalProfit" 
                                    name="totalProfit"
                                    stroke="#10b981" 
                                    strokeWidth={3}
                                    fillOpacity={1} 
                                    fill="url(#colorProfit)" 
                                    activeDot={{ r: 5, strokeWidth: 0, fill: '#10b981', className: 'shadow-lg drop-shadow-[0_0_8px_rgba(16,185,129,0.8)]' }}
                                    animationDuration={0}
                                />
                            )}
                        </AreaChart>
                    </ResponsiveContainer>
                )}
            </div>
        </div>
    );
};

export default SalesChart;