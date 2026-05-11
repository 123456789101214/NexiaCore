// server/controllers/superAdminController.js
import Shop from '../models/Shop.js';
import ShopPayment from '../models/ShopPayment.js';
import Product from '../models/Product.js';
import User from '../models/User.js';

export const getSystemStats = async (req, res) => {
  try {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const [totalShops, activeShops, trialShops, pendingVerifications, mrrAgg, recentShops] = await Promise.all([
      Shop.countDocuments(),
      Shop.countDocuments({ planStatus: 'active' }),
      Shop.countDocuments({ planStatus: 'trial' }),
      ShopPayment.countDocuments({ status: 'pending_verification' }),
      ShopPayment.aggregate([
        { $match: { status: 'completed', createdAt: { $gte: startOfMonth } } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]),
      Shop.find().sort({ createdAt: -1 }).limit(5)
    ]);

    const mrr = mrrAgg.length > 0 ? mrrAgg[0].total : 0;

    res.status(200).json({
      success: true,
      data: { totalShops, activeShops, trialShops, pendingVerifications, mrr, recentShops }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch stats' });
  }
};

export const getAllShops = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const filter = {};
    if (req.query.planStatus) filter.planStatus = req.query.planStatus;
    if (req.query.subscriptionPlan) filter.subscriptionPlan = req.query.subscriptionPlan;

    const total = await Shop.countDocuments(filter);
    const shopsRaw = await Shop.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean();

    const shops = await Promise.all(shopsRaw.map(async (shop) => {
      const productCount = await Product.countDocuments({ shopId: shop._id });
      const userCount = await User.countDocuments({ shopId: shop._id });
      return { ...shop, productCount, userCount };
    }));

    res.status(200).json({
      success: true,
      data: shops,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch shops' });
  }
};

export const getPendingPayments = async (req, res) => {
  try {
    const payments = await ShopPayment.find({ status: 'pending_verification' })
      .populate('shopId', 'name phone')
      .populate('recordedBy', 'name email')
      .sort({ createdAt: 1 });

    res.status(200).json({ success: true, data: payments });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch pending payments' });
  }
};

// @desc    Verify Payment (Approve/Reject) with Atomic Locking
// @route   PUT /api/super-admin/payments/:id/verify
export const verifyPayment = async (req, res) => {
  try {
    const { action, rejectionReason } = req.body;

    // 🛡️ BUG 2 FIX: Atomic Lock for Race Conditions
    // findOneAndUpdate එකෙන් document එක හොයාගෙන ඒ වෙලාවෙම 'processing_lock' එකට දානවා.
    // මේකෙන් අනිත් අයට මේක access කරන එක block වෙනවා.
    const payment = await ShopPayment.findOneAndUpdate(
      { _id: req.params.id, status: 'pending_verification' },
      { $set: { status: 'processing_lock' } },
      { new: true }
    );

    if (!payment) {
      return res.status(400).json({ success: false, error: 'Payment already processed, locked, or not found' });
    }
    
    const shop = await Shop.findById(payment.shopId);
    if (!shop) return res.status(404).json({ success: false, error: 'Associated shop not found' });

    const now = new Date();

    if (action === 'approve') {
      payment.status = 'completed';
      payment.verifiedBy = req.user._id;
      payment.verifiedAt = now;
      payment.billingPeriod = { from: now, to: new Date(now.getTime() + (30 * 24 * 60 * 60 * 1000)) };
      await payment.save();

      shop.subscriptionPlan = payment.plan;
      shop.planStatus = 'active';
      shop.planStartedAt = now;
      shop.planExpiresAt = payment.billingPeriod.to;
      await shop.save();

      return res.status(200).json({ success: true, message: 'Payment approved. Shop plan activated.' });
    }

    if (action === 'reject') {
      if (!rejectionReason) {
         // Lock එක අයින් කරලා ආයෙත් pending දානවා Reason එකක් නැත්නම්
         payment.status = 'pending_verification';
         await payment.save();
         return res.status(400).json({ success: false, error: 'Rejection reason is required' });
      }

      payment.status = 'rejected';
      payment.rejectionReason = rejectionReason;
      payment.verifiedBy = req.user._id;
      payment.verifiedAt = now;
      await payment.save();

      shop.planStatus = (shop.trialEndsAt && shop.trialEndsAt > now) ? 'trial' : 'expired';
      await shop.save();

      return res.status(200).json({ success: true, message: 'Payment rejected. Shop notified.' });
    }

    // Invalid action එකක් ආවොත් Lock එක අයින් කරන්න
    payment.status = 'pending_verification';
    await payment.save();
    return res.status(400).json({ success: false, error: 'Invalid action' });
  } catch (error) {
    console.error('Verify Payment Error:', error);
    res.status(500).json({ success: false, error: 'Verification failed' });
  }
};

export const toggleShopStatus = async (req, res) => {
  try {
    const shop = await Shop.findById(req.params.id);
    if (!shop) return res.status(404).json({ success: false, error: 'Shop not found' });

    shop.isActive = !shop.isActive;

    if (!shop.isActive) {
      shop.planStatus = 'cancelled';
    } else {
      shop.planStatus = (shop.planExpiresAt && shop.planExpiresAt > new Date()) ? 'active' : 'expired';
    }

    await shop.save();
    res.status(200).json({ success: true, data: shop, message: `Shop ${shop.isActive ? 'activated' : 'suspended'}` });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to toggle shop status' });
  }
};