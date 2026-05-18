import Shop from '../models/Shop.js';
import Product from '../models/Product.js';
import User from '../models/User.js';

// ━━━ 1. PLAN CONFIGURATION (MUST BE AT THE TOP) ━━━
const PLAN_FEATURES = {
    free: {
        maxProducts: 500, // 👈 Testing limit
        maxUsers: 1,    // 👈 Testing limit
        customerCredit: false,
        analytics: false,
        stockForecast: false,
        expiryAlerts: false,
        bulkUpload: false,
        advancedReports: false,
    },
    pro: {
        maxProducts: 5000,
        maxUsers: 2,
        customerCredit: true,
        analytics: true,
        stockForecast: true,
        expiryAlerts: true,
        bulkUpload: true,
        advancedReports: true,
    },
    enterprise: {
        maxProducts: Infinity,
        maxUsers: Infinity,
        customerCredit: true,
        analytics: true,
        stockForecast: true,
        expiryAlerts: true,
        bulkUpload: true,
        advancedReports: true,
    }
};

// ━━━ 2. HELPER FUNCTION ━━━
const getEffectivePlan = async (shopId) => {
    const shop = await Shop.findById(shopId).select('subscriptionPlan planStatus trialEndsAt');
    if (!shop) return 'free';

    
    const planStatus = shop.planStatus?.toLowerCase();
    const subPlan = shop.subscriptionPlan?.toLowerCase() || 'free';

    // Expired trial or cancelled → treat as free
    if (planStatus === 'expired' || planStatus === 'cancelled') return 'free';

    // Trial counts as pro (full features during trial)
    if (planStatus === 'trial') {
        const now = new Date();
        if (shop.trialEndsAt && now > shop.trialEndsAt) return 'free'; // trial ended
        return subPlan === 'free' ? 'pro' : subPlan; 
    }

    return subPlan;
};

// ━━━ 3. MIDDLEWARE FUNCTIONS ━━━

export const checkProductLimit = async (req, res, next) => {
    try {
        const effectivePlan = await getEffectivePlan(req.user.shopId);
        const limit = PLAN_FEATURES[effectivePlan]?.maxProducts || 500;

        if (limit === Infinity) return next();

        const currentCount = await Product.countDocuments({ 
            $or: [{ shop: req.user.shopId }, { shopId: req.user.shopId }],
            status: { $ne: 'archived' } 
        });

        console.log(`[PLAN CHECK] Shop: ${req.user.shopId} | Plan: ${effectivePlan} | Active Products: ${currentCount} | Limit: ${limit}`);

        if (currentCount >= limit) {
            return res.status(403).json({
                success: false,
                error: `Product limit reached (${limit} max). Please upgrade your plan to Pro or Enterprise to add more products.`,
                limitReached: true
            });
        }
        next();
    } catch (error) {
        console.error('Product limit check error:', error);
        res.status(500).json({ success: false, error: 'Failed to verify product limit' });
    }
};
export const checkUserLimit = async (req, res, next) => {
    try {
        const effectivePlan = await getEffectivePlan(req.user.shopId);
        const limit = PLAN_FEATURES[effectivePlan]?.maxUsers || 2;

        if (limit === Infinity) return next();

        // Count current staff for this shop
        const currentCount = await User.countDocuments({ shopId: req.user.shopId }); 

        if (currentCount >= limit) {
            return res.status(403).json({
                success: false,
                error: `Staff limit reached (${limit} max). Please upgrade your plan to add more staff members.`,
                limitReached: true
            });
        }
        next();
    } catch (error) {
        console.error('User limit check error:', error);
        res.status(500).json({ success: false, error: 'Failed to verify staff limit' });
    }
};

// 💡 PRO FIX: Remove the duplicate checkStaffLimit logic and alias it to checkUserLimit 
// This ensures any route using 'checkStaffLimit' still works perfectly but uses the new logic!
export const checkStaffLimit = checkUserLimit; 

export const requireFeature = (featureName) => {
    return async (req, res, next) => {
        try {
            const effectivePlan = await getEffectivePlan(req.user.shopId);
            const features = PLAN_FEATURES[effectivePlan] || PLAN_FEATURES.free;

            if (!features[featureName]) {
                return res.status(403).json({
                    success: false,
                    error: `This feature requires a Pro or Enterprise plan.`,
                    featureLocked: true,
                    feature: featureName,
                    currentPlan: effectivePlan,
                    upgradeRequired: true
                });
            }
            next();
        } catch (error) {
            console.error('Feature gate error:', error);
            res.status(500).json({ success: false, error: 'Plan validation failed' });
        }
    };
};

export { PLAN_FEATURES, getEffectivePlan };