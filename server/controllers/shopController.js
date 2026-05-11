import Shop from '../models/Shop.js';
import Product from '../models/Product.js'; // 🛡️ CRITICAL: Must import
import User from '../models/User.js';    // 🛡️ CRITICAL: Must import

// @desc    Register a new Shop + Owner (SaaS Entry Point)
export const registerShop = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { shopName, ownerName, email, password, phone, planName } = req.body;

        // 1. Check if email already exists
        const userExists = await User.findOne({ email });
        if (userExists) throw new Error("Email already registered");
        
        const planConfig = SAAS_PLANS[selectedPlan.toUpperCase()] || SAAS_PLANS.FREE;
        // 2. Create the Shop (Tenant) first
        const shop = await Shop.create([{
            name: shopName,
            phone,
            subscription: {
                plan: planConfig.name,
                status: 'active',
                features: planConfig.features, // 🚀 Mapping the features array here
                limits: {
                    maxProducts: planConfig.maxProducts,
                    maxUsers: planConfig.maxUsers
                }
            }
        }], { session });

        // 3. Create the Owner User linked to this Shop
        const user = await User.create([{
            name: ownerName,
            email,
            password, // This will be hashed via User model pre-save hook
            role: 'owner', // 👑 First user is ALWAYS the Owner
            shopId: shop[0]._id // 🔒 Locked to the new shop
        }], { session });

        await session.commitTransaction();
        session.endSession();

        res.status(201).json({
            success: true,
            message: "SaaS Onboarding Complete!",
            shopId: shop[0]._id,
            owner: { id: user[0]._id, name: user[0].name, email: user[0].email }
        });

    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        res.status(400).json({ success: false, error: error.message });
    }
};

// 💡 PRO FIX: Hardcode limits to match planMiddleware.js for consistency
const PLAN_LIMITS = {
    free: { maxProducts: 500, maxUsers: 2 },
    pro: { maxProducts: 5000, maxUsers: 10 },
    enterprise: { maxProducts: Infinity, maxUsers: Infinity }
};

/**
 * @desc    Get current shop details & usage stats for the logged-in tenant
 * @route   GET /api/shops/me
 * @access  Private (Owner/Admin)
 */
export const getMyShop = async (req, res) => {
    try {
        // Find shop and ensure it exists
        const shop = await Shop.findById(req.user.shopId);
        if (!shop) {
            return res.status(404).json({ success: false, error: 'Shop not found' });
        }

        // 📊 Calculate REAL-TIME Usage Stats
        // Every query filters by req.user.shopId (Tenant Isolation)
        const [productCount, userCount] = await Promise.all([
            Product.countDocuments({ shopId: req.user.shopId, status: 'active' }),
            User.countDocuments({ shopId: req.user.shopId })
        ]);

        // Determine limits based on the current plan (Item 1 & 2 logic)
        const plan = shop.subscriptionPlan || 'free';
        const limits = PLAN_LIMITS[plan];

        res.status(200).json({
            success: true,
            data: {
                shop,
                usage: {
                    products: productCount,
                    users: userCount,
                    productLimit: limits.maxProducts,
                    userLimit: limits.maxUsers
                }
            }
        });
    } catch (error) {
        // 🚨 Log the actual error to the terminal for the developer
        console.error("GET_MY_SHOP_ERROR:", error.message);
        res.status(500).json({ success: false, error: 'Internal Server Error' });
    }
};

/**
 * @desc    Update shop localization and identity details
 * @route   PUT /api/shops/me
 */
export const updateShop = async (req, res) => {
    try {
        const { name, address, phone, currency, taxRate, billPrefix, timezone } = req.body;

        // Use findOneAndUpdate to ensure we only update the logged-in user's shop
        const shop = await Shop.findOneAndUpdate(
            { _id: req.user.shopId },
            { name, address, phone, currency, taxRate, billPrefix, timezone },
            { new: true, runValidators: true }
        );

        if (!shop) return res.status(404).json({ success: false, error: 'Shop not found' });

        res.status(200).json({ success: true, data: shop });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
};