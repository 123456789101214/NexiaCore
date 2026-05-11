// server/controllers/subscriptionController.js
import Shop from '../models/Shop.js';
import ShopPayment from '../models/ShopPayment.js';

export const getMySubscription = async (req, res) => {
  try {
    const shop = await Shop.findById(req.user.shopId);
    if (!shop) return res.status(404).json({ success: false, error: 'Shop not found' });

    let trialDaysRemaining = 0;
    if (shop.planStatus === 'trial' && shop.trialEndsAt) {
      trialDaysRemaining = Math.ceil((new Date(shop.trialEndsAt) - Date.now()) / (1000 * 60 * 60 * 24));
      if (trialDaysRemaining < 0) trialDaysRemaining = 0;
    }

    const paymentHistory = await ShopPayment.find({ shopId: req.user.shopId })
      .sort({ createdAt: -1 })
      .limit(10);

    res.status(200).json({ success: true, data: { shop, trialDaysRemaining, paymentHistory } });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch subscription data' });
  }
};

export const getTrialStatus = async (req, res) => {
  try {
    const shop = await Shop.findById(req.user.shopId);
    if (!shop) return res.status(404).json({ success: false, error: 'Shop not found' });

    let trialDaysRemaining = 0;
    let isExpired = false;

    if (shop.planStatus === 'trial') {
      trialDaysRemaining = Math.ceil((new Date(shop.trialEndsAt) - Date.now()) / (1000 * 60 * 60 * 24));
      isExpired = trialDaysRemaining <= 0;
      if (isExpired) {
        shop.planStatus = 'expired';
        await shop.save();
        trialDaysRemaining = 0;
      }
    } else if (shop.planStatus === 'expired') {
      isExpired = true;
    }

    res.status(200).json({
      success: true,
      data: { planStatus: shop.planStatus, trialDaysRemaining, isExpired, subscriptionPlan: shop.subscriptionPlan }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch trial status' });
  }
};

export const updateShopSettings = async (req, res) => {
  try {
    const allowedFields = ['name', 'phone', 'address', 'currency', 'taxRate', 'billPrefix', 'timezone'];
    const updateData = {};
    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) updateData[field] = req.body[field];
    });

    const updatedShop = await Shop.findByIdAndUpdate(req.user.shopId, { $set: updateData }, { new: true, runValidators: true });
    res.status(200).json({ success: true, data: updatedShop });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to update settings' });
  }
};

export const upgradePlan = async (req, res) => {
  try {
    const { plan, paymentMethod, transactionId } = req.body;
    const shopId = req.user.shopId;
    const shop = await Shop.findById(shopId);

    if (!shop) return res.status(404).json({ success: false, error: 'Shop not found' });
    if (!['free', 'pro', 'enterprise'].includes(plan)) {
      return res.status(400).json({ success: false, error: 'Invalid plan selected' });
    }

    const now = new Date();

    // Rule: Upgrading to Enterprise ends trial immediately
    if (shop.planStatus === 'trial' && plan === 'enterprise') {
      shop.trialEndsAt = now;
    }

    // SCENARIO A: Free Plan
    if (plan === 'free') {
      shop.subscriptionPlan = 'free';
      shop.planStatus = 'active';
      shop.planExpiresAt = null;
      await shop.save();

      await ShopPayment.create({
        shopId,
        plan: 'free',
        amount: 0,
        currency: shop.currency || 'LKR',
        paymentMethod: 'Free',
        status: 'completed',
        recordedBy: req.user._id
      });

      return res.status(200).json({ success: true, message: 'Switched to Free plan successfully' });
    }

    // 🛡️ FIX: Calculate Amount based on plan (Pro: 2999, Enterprise: 15000)
    let amount = 0;
    if (plan === 'pro') amount = 2999;
    if (plan === 'enterprise') amount = 15000;

    const planExpiresAt = new Date(now.getTime() + (30 * 24 * 60 * 60 * 1000));

    // SCENARIO B: Online Transfer (Requires Super Admin Verification)
    if (paymentMethod === 'Online Transfer') {
      if (!transactionId || transactionId.trim().length < 5) {
        return res.status(400).json({ success: false, error: 'Transaction reference is required (min 5 chars)' });
      }

      await ShopPayment.create({
        shopId,
        plan,
        amount, // 💡 දැන් මෙතනට අදාළ ගාණ හරියටම එනවා
        currency: shop.currency || 'LKR',
        paymentMethod: 'Online Transfer',
        transactionId: transactionId.trim(),
        status: 'pending_verification',
        recordedBy: req.user._id
      });

      shop.planStatus = 'pending_verification';
      await shop.save();

      return res.status(200).json({
        success: true,
        message: 'Payment submitted. Awaiting Super Admin verification.'
      });
    }

    // SCENARIO C: Bank Deposit
    if (paymentMethod === 'Bank Deposit') {
      if (!req.file || !req.file.path) {
        return res.status(400).json({ success: false, error: 'Please upload your bank deposit slip' });
      }

      await ShopPayment.create({
        shopId,
        plan,
        amount, // 💡 මෙතනටත් අදාළ ගාණ හරියටම එනවා
        currency: shop.currency || 'LKR',
        paymentMethod: 'Bank Deposit',
        receiptUrl: req.file.path,
        status: 'pending_verification',
        recordedBy: req.user._id
      });

      shop.planStatus = 'pending_verification';
      await shop.save();

      return res.status(200).json({
        success: true,
        message: 'Slip uploaded. Awaiting verification (1-2 business days).'
      });
    }

    return res.status(400).json({ success: false, error: 'Invalid payment method' });
  } catch (error) {
    console.error('Upgrade Error:', error);
    res.status(500).json({ success: false, error: 'Failed to process upgrade' });
  }
};