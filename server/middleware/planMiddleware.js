import Shop from '../models/Shop.js';
import Product from '../models/Product.js';
import User from '../models/User.js';

const PLAN_LIMITS = {
    free: { maxProducts: 500, maxStaff: 2 },
    pro: { maxProducts: 5000, maxStaff: 10 },
    enterprise: { maxProducts: Infinity, maxStaff: Infinity }
};

export const checkProductLimit = async (req, res, next) => {
    try {
        const shop = await Shop.findById(req.user.shopId);
        if (!shop) return res.status(404).json({ success: false, error: 'Shop not found' });

        // 🛡️ GAP 2 FIX: Dynamic API-Level Enforcement
        const effectivePlan = (shop.planStatus === 'expired' || shop.planStatus === 'cancelled') 
            ? 'free' 
            : shop.subscriptionPlan;

        const limit = PLAN_LIMITS[effectivePlan]?.maxProducts ?? 500;
        const currentProducts = await Product.countDocuments({ shopId: req.user.shopId });

        if (currentProducts >= limit) {
            return res.status(403).json({
                success: false,
                error: `Plan limit reached. Your effective plan (${effectivePlan.toUpperCase()}) allows a maximum of ${limit} products.`
            });
        }
        next();
    } catch (error) {
        res.status(500).json({ success: false, error: 'Failed to verify plan limits' });
    }
};

export const checkStaffLimit = async (req, res, next) => {
    try {
        const shop = await Shop.findById(req.user.shopId);
        if (!shop) return res.status(404).json({ success: false, error: 'Shop not found' });

        // 🛡️ GAP 2 FIX: Dynamic API-Level Enforcement
        const effectivePlan = (shop.planStatus === 'expired' || shop.planStatus === 'cancelled') 
            ? 'free' 
            : shop.subscriptionPlan;

        const limit = PLAN_LIMITS[effectivePlan]?.maxStaff ?? 2;
        const currentStaff = await User.countDocuments({ shopId: req.user.shopId });

        if (currentStaff >= limit) {
            return res.status(403).json({
                success: false,
                error: `Plan limit reached. Your effective plan (${effectivePlan.toUpperCase()}) allows a maximum of ${limit} staff accounts.`
            });
        }
        next();
    } catch (error) {
        res.status(500).json({ success: false, error: 'Failed to verify plan limits' });
    }
};