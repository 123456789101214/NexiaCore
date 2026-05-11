import React, { useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import API from '../services/api';
import useAuthStore from '../store/authStore';
import { TrendingUp, Loader2 } from 'lucide-react';

// Custom Tooltip to show orders cleanly alongside sales/profit
const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-slate-900 text-white p-4 rounded-2xl shadow-xl text-xs font-bold border border-slate-700">
                <p className="text-slate-400 uppercase tracking-widest mb-3">{label}</p>
                {payload.map((entry, index) => (
                    <div key={index} className="flex items-center gap-2 mb-1.5" style={{ color: entry.color }}>
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }}></div>
                        <span>{entry.name === 'totalSales' ? 'Sales' : 'Profit'}:</span>
                        <span className="ml-auto">Rs. {entry.value.toLocaleString()}</span>
                    </div>
                ))}
                <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-700 text-slate-300">
                    <span>Orders:</span>
                    <span className="ml-auto">{payload[0].payload.orderCount}</span>
                </div>
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
        <div className="w-full bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
            {/* Header Area */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
                        <TrendingUp size={20} />
                    </div>
                    <h2 className="text-lg font-black text-slate-800 tracking-tight">Sales Overview</h2>
                </div>
                
                <div className="flex bg-slate-100 p-1 rounded-xl w-fit">
                    {[7, 30, 90].map(days => (
                        <button
                            key={days}
                            onClick={() => setPeriod(days)}
                            className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${
                                period === days 
                                    ? 'bg-slate-900 text-white shadow-md' 
                                    : 'text-slate-500 hover:text-slate-800'
                            }`}
                        >
                            {days} Days
                        </button>
                    ))}
                </div>
            </div>

            {/* Summary Chips */}
            {summary && (
                <div className="flex flex-wrap gap-3 mb-8">
                    <div className="inline-flex items-center bg-slate-50 border border-slate-100 rounded-xl px-4 py-2 text-xs font-bold text-slate-700">
                        <span className="text-slate-400 mr-2 uppercase tracking-widest text-[10px]">Total Sales</span>
                        Rs. {summary.totalSales.toLocaleString()}
                    </div>
                    <div className="inline-flex items-center bg-slate-50 border border-slate-100 rounded-xl px-4 py-2 text-xs font-bold text-slate-700">
                        <span className="text-slate-400 mr-2 uppercase tracking-widest text-[10px]">Orders</span>
                        {summary.totalOrders}
                    </div>
                    {canSeeProfit && summary.totalProfit !== undefined && (
                        <div className="inline-flex items-center bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-2 text-xs font-bold text-emerald-700">
                            <span className="text-emerald-600/70 mr-2 uppercase tracking-widest text-[10px]">Profit</span>
                            Rs. {summary.totalProfit.toLocaleString()}
                        </div>
                    )}
                </div>
            )}

            {/* Chart Area */}
            <div className="w-full h-[280px] relative">
                {loading ? (
                    <div className="absolute inset-0 flex items-center justify-center bg-white/50 z-10">
                        <Loader2 className="animate-spin text-blue-500" size={32} />
                    </div>
                ) : isEmpty ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                        <TrendingUp size={32} className="mb-2 opacity-50" />
                        <span className="text-sm font-bold">No sales data for this period</span>
                    </div>
                ) : (
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
                            <defs>
                                <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15}/>
                                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                                </linearGradient>
                                {canSeeProfit && (
                                    <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                                    </linearGradient>
                                )}
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis 
                                dataKey="label" 
                                tick={{ fontSize: 11, fill: '#94a3b8', fontWeight: 600 }}
                                tickLine={false}
                                axisLine={false}
                                interval={period === 7 ? 0 : period === 30 ? 4 : 9}
                                dy={10}
                            />
                            <YAxis 
                                tickFormatter={(value) => `Rs.${(value / 1000).toFixed(0)}k`}
                                tick={{ fontSize: 11, fill: '#94a3b8', fontWeight: 600 }}
                                tickLine={false}
                                axisLine={false}
                                width={60}
                            />
                            <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#cbd5e1', strokeWidth: 1, strokeDasharray: '4 4' }} />
                            {canSeeProfit && <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '11px', fontWeight: 'bold', color: '#64748b', paddingTop: '20px' }}/>}
                            <Area 
                                type="monotone" 
                                dataKey="totalSales" 
                                name="totalSales"
                                stroke="#3b82f6" 
                                strokeWidth={3}
                                fillOpacity={1} 
                                fill="url(#colorSales)" 
                            />
                            {canSeeProfit && (
                                <Area 
                                    type="monotone" 
                                    dataKey="totalProfit" 
                                    name="totalProfit"
                                    stroke="#10b981" 
                                    strokeWidth={3}
                                    fillOpacity={1} 
                                    fill="url(#colorProfit)" 
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