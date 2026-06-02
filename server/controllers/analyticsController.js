import mongoose from 'mongoose';
import Product from '../models/Product.js';
import Order from '../models/Order.js';

// 1. Get Smart Alerts (Expiry & Low Stock) - 🚀 PRO FIX: LEAN QUERIES & DB STATE SYNC
export const getSmartAlerts = async (req, res) => {
    try {
        // 🛡️ SECURITY: Explicit check just in case
        if (['cashier'].includes(req.user.role)) {
            return res.status(403).json({ success: false, error: 'Unauthorized to view financial insights' });
        }

        const today = new Date();
        const twoWeeksFromNow = new Date();
        twoWeeksFromNow.setDate(today.getDate() + 14);

        // 🚀 THE FIX: Added 'expiryDiscountApplied' and 'discount' to the .select() query
        const expiringProducts = await Product.find({
            shopId: req.user.shopId,
            status: 'active',
            expiryDate: { $lte: twoWeeksFromNow, $ne: null }
        }).select('_id name stock expiryDate price buyingPrice expiryThreshold expiryDiscountApplied discount').lean();

        const alerts = expiringProducts.map(p => {
            const daysToExpiry = Math.ceil((new Date(p.expiryDate) - today) / (1000 * 60 * 60 * 24));
            
            let suggestedAction = "Monitor closely";
            let idealDiscountPercentage = 0;

            if (daysToExpiry <= 3) {
                idealDiscountPercentage = 50;
            } else if (daysToExpiry <= 7) {
                idealDiscountPercentage = 25;
            } else if (daysToExpiry <= 14) {
                idealDiscountPercentage = 10;
            }

            let finalDiscountPercentage = idealDiscountPercentage;
            let recommendedPrice = p.price;

            // 💡 ZERO-LOSS ALGORITHM
            if (idealDiscountPercentage > 0 && p.price > 0) {
                const tentativePrice = Math.round(p.price - (p.price * (idealDiscountPercentage / 100)));

                if (tentativePrice < p.buyingPrice) {
                    if (p.price <= p.buyingPrice) {
                        finalDiscountPercentage = 0;
                        recommendedPrice = p.price;
                        suggestedAction = "Clearance needed, but NO DISCOUNT possible (At Cost/Loss)";
                    } else {
                        const maxSafeDiscount = Math.floor(((p.price - p.buyingPrice) / p.price) * 100);
                        finalDiscountPercentage = Math.max(0, maxSafeDiscount - 1); 
                        
                        if (finalDiscountPercentage > 0) {
                            recommendedPrice = Math.round(p.price - (p.price * (finalDiscountPercentage / 100)));
                            suggestedAction = `Loss Prevented: Max safe discount is ${finalDiscountPercentage}% (Break-even limit)`;
                        } else {
                             finalDiscountPercentage = 0;
                             recommendedPrice = p.price;
                             suggestedAction = "Clearance needed. Margins too low for auto-discount.";
                        }
                    }
                } else {
                    recommendedPrice = tentativePrice;
                    suggestedAction = `Apply a ${finalDiscountPercentage}% promotional discount to clear stock.`;
                    
                    if(daysToExpiry <= 3) suggestedAction = `Run a ${finalDiscountPercentage}% Flash Sale immediately!`;
                }
            }

            return {
                _id: p._id,
                name: p.name,
                stock: p.stock,
                expiryDate: p.expiryDate,
                price: p.price,
                buyingPrice: p.buyingPrice,
                daysToExpiry,
                isExpiringSoon: daysToExpiry <= (p.expiryThreshold || 30),
                suggestedAction, 
                discountSuggestion: finalDiscountPercentage,
                recommendedPrice: recommendedPrice,
                // 🚀 THE FIX: Sync with Database actual state instead of hardcoding false!
                expiryDiscountApplied: p.expiryDiscountApplied || false,
                discount: p.discount || null
            };
        });

        res.status(200).json({ success: true, data: alerts });
    } catch (error) {
        console.error("Smart Alerts Error:", error);
        res.status(500).json({ success: false, error: 'Failed to fetch smart alerts' });
    }
};
// 2. Get Dashboard Summary (Sales & Product counts) - WITH RBAC
export const getDashboardSummary = async (req, res) => {
    try {
        const shopId = req.user.shopId;
        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);

        const totalProducts = await Product.countDocuments({ shopId, status: 'active' });
        const lowStockItems = await Product.countDocuments({
            shopId,
            status: 'active',
            $expr: { $lte: ["$stock", "$minStockLevel"] }
        });

        let todaySales = 0;
        let totalOrders = 0;

        if (req.user.role === 'admin' || req.user.role === 'owner') {
            const todaySalesData = await Order.aggregate([
                { $match: { shopId: new mongoose.Types.ObjectId(shopId), createdAt: { $gte: startOfToday }, status: 'completed' } },
                {
                    $group: {
                        _id: null,
                        totalAmount: { $sum: "$totalAmount" },
                        orderCount: { $sum: 1 }
                    }
                }
            ]);

            todaySales = todaySalesData[0]?.totalAmount || 0;
            totalOrders = todaySalesData[0]?.orderCount || 0;
        } else {
            totalOrders = await Order.countDocuments({ 
                shopId, cashierId: req.user._id, createdAt: { $gte: startOfToday }, status: 'completed' 
            });
        }

        res.status(200).json({
            success: true,
            data: {
                totalProducts,
                lowStockItems,
                todaySales,
                totalOrders
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Failed to load dashboard summary' });
    }
};

// 3. Get Stock Forecast - 🚀 PRO FIX: EXACT OBJECT ID CASTING & ISOLATION
export const getStockForecast = async (req, res) => {
    try {
        const shopId = req.user.shopId;
        const objectShopId = new mongoose.Types.ObjectId(shopId);

        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        // Multi-tenant aggregation
        const salesData = await Order.aggregate([
            { $match: { shopId: objectShopId, createdAt: { $gte: sevenDaysAgo }, status: 'completed' } },
            { $unwind: "$items" },
            { $group: { _id: "$items.productId", totalSold: { $sum: "$items.quantity" } } }
        ]);

        if (salesData.length === 0) {
            return res.status(200).json({ success: true, data: [] });
        }

        const soldProductIds = salesData.map(s => s._id);
        const products = await Product.find({ 
            _id: { $in: soldProductIds }, 
            shopId: shopId, 
            status: 'active' 
        }).select('_id name stock').lean(); // 🚀 PRO FIX: Lean query

        const salesMap = {};
        salesData.forEach(s => {
            salesMap[s._id.toString()] = s.totalSold;
        });

        const forecast = products.map(product => {
            const totalSold = salesMap[product._id.toString()] || 0;
            const velocity = totalSold / 7;
            let daysRemaining = Infinity;

            if (velocity > 0) {
                daysRemaining = Math.floor(product.stock / velocity);
            }

            return {
                _id: product._id,
                name: product.name,
                stock: product.stock,
                velocity: Number(velocity.toFixed(2)),
                daysRemaining,
                status: daysRemaining <= 3 ? 'CRITICAL' : (daysRemaining <= 7 ? 'WARNING' : 'STABLE')
            };
        });

        const smartAlerts = forecast.filter(f => f.status !== 'STABLE');
        res.status(200).json({ success: true, data: smartAlerts });

    } catch (error) {
        console.error("Forecasting Error:", error);
        res.status(500).json({ success: false, error: 'Failed to generate stock forecast' });
    }
};

// @desc    Get sales chart data with date filling
// @route   GET /api/analytics/chart-data
// @access  Private (Owner, Admin, Manager)
export const getSalesChartData = async (req, res) => {
    try {
        const period = parseInt(req.query.period) || 7;
        
        // Step 1: Build date range
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - period);
        startDate.setHours(0, 0, 0, 0);

        // Step 2: Daily sales aggregation (Tenant Isolated)
        const aggregationResult = await Order.aggregate([
            {
                $match: {
                    shopId: new mongoose.Types.ObjectId(req.user.shopId),
                    status: 'completed',
                    createdAt: { $gte: startDate, $lte: endDate }
                }
            },
            {
                $group: {
                    _id: {
                        year: { $year: '$createdAt' },
                        month: { $month: '$createdAt' },
                        day: { $dayOfMonth: '$createdAt' }
                    },
                    totalSales: { $sum: '$totalAmount' },
                    totalProfit: { $sum: '$totalProfit' },
                    orderCount: { $sum: 1 }
                }
            },
            { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
        ]);

        // Step 3: Fill missing days with zeros
        const filledData = [];
        for (let i = 0; i < period; i++) {
            const date = new Date(startDate);
            date.setDate(date.getDate() + i);
            const dateStr = date.toISOString().split('T')[0];

            const found = aggregationResult.find(item => {
                return item._id.year === date.getFullYear() &&
                       item._id.month === date.getMonth() + 1 &&
                       item._id.day === date.getDate();
            });

            filledData.push({
                date: dateStr,
                label: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                totalSales: found ? found.totalSales : 0,
                totalProfit: found ? found.totalProfit : 0,
                orderCount: found ? found.orderCount : 0
            });
        }

        // Step 4: Calculate summary totals
        const totalSales = filledData.reduce((sum, d) => sum + d.totalSales, 0);
        const summary = {
            totalSales,
            totalProfit: filledData.reduce((sum, d) => sum + d.totalProfit, 0),
            totalOrders: filledData.reduce((sum, d) => sum + d.orderCount, 0),
            avgDailySales: totalSales / period
        };

        // Step 5: RBAC Security — Hide profit from managers/cashiers
        if (['manager', 'cashier'].includes(req.user.role)) {
            delete summary.totalProfit;
            filledData.forEach(item => {
                delete item.totalProfit;
            });
        }

        res.status(200).json({
            success: true,
            data: {
                chartData: filledData,
                summary,
                period
            }
        });

    } catch (error) {
        console.error("Get Sales Chart Data Error:", error);
        res.status(500).json({ success: false, error: 'Server error while fetching chart data' });
    }
};