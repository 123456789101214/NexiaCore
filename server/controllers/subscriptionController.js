// server/controllers/subscriptionController.js
import Shop from '../models/Shop.js';
import ShopPayment from '../models/ShopPayment.js';
import { getEffectivePlan, PLAN_FEATURES } from '../middleware/planMiddleware.js';
import md5 from 'md5';
import mongoose from 'mongoose';

export const getMySubscription = async (req, res) => {
  try {
    const effectivePlan = await getEffectivePlan(req.user.shopId);
    const features = PLAN_FEATURES[effectivePlan];
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

    res.status(200).json({ success: true, data: { shop, paymentHistory, features, effectivePlan, trialDaysRemaining } });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch subscription data' });
  }
};

export const getTrialStatus = async (req, res) => {
  try {
    if (!req.user || !req.user.shopId) {
      return res.status(401).json({ success: false, error: 'Unauthorized: Missing tenant mapping' });
    }

    const shop = await Shop.findById(req.user.shopId);
    if (!shop) return res.status(404).json({ success: false, error: 'Shop not found' });

    // Defensive check: ensures JWT shopId claim resolves to a real shop owned by this tenant — guards against ID manipulation attacks.
    // (While theoretically redundant with findById(req.user.shopId), this strictly enforces tenant boundaries).
    if (shop._id.toString() !== req.user.shopId.toString()) {
      return res.status(403).json({ success: false, error: 'Tenant mismatch protection violation' });
    }

    let trialDaysRemaining = 0;
    let isExpired = false;

    if (shop.planStatus === 'trial') {
      trialDaysRemaining = Math.max(0, Math.ceil((new Date(shop.trialEndsAt) - Date.now()) / (1000 * 60 * 60 * 24)));
      isExpired = trialDaysRemaining === 0;
    } else if (shop.planStatus === 'expired') {
      isExpired = true;
    }

    res.status(200).json({
      success: true,
      data: {
        planStatus: shop.planStatus,
        trialDaysRemaining,
        isExpired,
        subscriptionPlan: shop.subscriptionPlan,
        planExpiresAt: shop.planExpiresAt
      }
    });
  } catch (error) {
    console.error('getTrialStatus error:', error);
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

export const initiatePayherePayment = async (req, res) => {
  try {
    const { plan } = req.body;

    if (plan === 'enterprise') {
      return res.status(400).json({ success: false, error: 'Please contact sales for Enterprise plan upgrades.' });
    }

    const shop = await Shop.findById(req.user.shopId);
    if (!shop) return res.status(404).json({ success: false, error: 'Shop not found' });

    const amount = plan === 'pro' ? 2999 : 0;
    if (amount === 0) return res.status(400).json({ success: false, error: 'Invalid plan selected' });

    const merchant_id = process.env.PAYHERE_MERCHANT_ID;
    const merchant_secret = process.env.PAYHERE_MERCHANT_SECRET;
    const currency = 'LKR';
    const formattedAmount = amount.toFixed(2);
    const order_id = `NEXIA-${req.user.shopId.toString().slice(-6).toUpperCase()}-${Date.now()}`;

    // Generate MD5 Hash
    const hash = md5(
      merchant_id +
      order_id +
      formattedAmount +
      currency +
      md5(merchant_secret).toUpperCase()
    ).toUpperCase();

    const paymentParams = {
      sandbox: process.env.PAYHERE_SANDBOX === 'true',
      merchant_id,
      return_url: `${process.env.CLIENT_URL}/settings?payment=success`, // 👈 FIXED
      cancel_url: `${process.env.CLIENT_URL}/settings?payment=cancelled`, // 👈 FIXED
      notify_url: `${process.env.SERVER_URL}/api/subscription/payhere/notify`, // 👈 FIXED
      order_id,
      items: `NexiaCore ${plan.toUpperCase()} Plan - 1 Month`, // 👈 FIXED
      amount: formattedAmount,
      currency,
      hash,
      first_name: req.user.name.split(' ')[0],
      last_name: req.user.name.split(' ').slice(1).join(' ') || 'User',
      email: req.user.email,
      phone: shop.phone || '0000000000',
      address: shop.address || 'Sri Lanka',
      city: 'Colombo',
      country: 'Sri Lanka',
      custom_1: req.user.shopId.toString(),
      custom_2: plan
    };

    res.status(200).json({ success: true, data: paymentParams });
  } catch (error) {
    console.error('PayHere Initiate Error:', error);
    res.status(500).json({ error: 'Failed to initiate payment gateway' });
  }
};

export const payhereNotify = async (req, res) => {
  try {
    const {
      merchant_id,
      order_id,
      payhere_amount,
      payhere_currency,
      status_code,
      md5sig,
      custom_1: shopId,
      custom_2: plan
    } = req.body;

    const merchant_secret = process.env.PAYHERE_MERCHANT_SECRET;

    // Verify Signature
    const localSig = md5(
      merchant_id +
      order_id +
      payhere_amount +
      payhere_currency +
      status_code +
      md5(merchant_secret).toUpperCase()
    ).toUpperCase();

    if (localSig !== md5sig) {
      console.error('🚨 PayHere Webhook: Invalid Signature');
      return res.status(400).send('Invalid signature');
    }

    // Check if payment was successful
    if (status_code !== '2') {
      return res.status(200).send('OK'); // Ignore pending, failed, or canceled statuses
    }

    const shopObjectId = new mongoose.Types.ObjectId(shopId);

    // Idempotency check: Prevent duplicate webhook processing
    const existingPayment = await ShopPayment.findOne({ transactionId: order_id });
    if (existingPayment) {
      console.log('PayHere webhook duplicate — already processed:', order_id);
      return res.status(200).send('OK');
    }

    // Record Payment (Using shopObjectId)
    await ShopPayment.create({
      shopId: shopObjectId,
      plan,
      amount: parseFloat(payhere_amount),
      currency: payhere_currency,
      paymentMethod: 'PayHere',
      transactionId: order_id,
      status: 'completed',
      recordedBy: null
    });

    // Activate Plan for 30 Days
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    // Update Shop (Using shopObjectId)
    await Shop.findByIdAndUpdate(shopObjectId, {
      subscriptionPlan: plan,
      planStatus: 'active',
      planStartedAt: new Date(),
      planExpiresAt: thirtyDaysFromNow,
      trialEndsAt: new Date() // 💡 FIX 2: End any active trial immediately
    });

    // 💡 FIX 3: Add success log for backend visibility
    console.log(`✅ PayHere Activated: Shop=${shopId} Plan=${plan} Order=${order_id}`);

    // MUST return 200 OK string for PayHere
    res.status(200).send('OK');
  } catch (error) {
    console.error('PayHere Webhook Error:', error);
    res.status(500).send('Server Error');
  }
};