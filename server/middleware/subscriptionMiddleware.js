// import Shop from '../models/Shop.js';

// export const checkSubscription = async (req, res, next) => {
//     try {
//         // req.user එක එන්නේ කලින් රන් වෙන 'protect' (authMiddleware) එකෙන්
//         const shopId = req.user.shopId;
        
//         if (!shopId) {
//             return res.status(403).json({ success: false, error: 'No shop associated with this user.' });
//         }

//         const shop = await Shop.findById(shopId);
        
//         if (!shop) {
//             return res.status(404).json({ success: false, error: 'Shop not found.' });
//         }

//         if (!shop.isActive) {
//             return res.status(403).json({ success: false, error: 'This shop has been permanently disabled.' });
//         }

//         const now = new Date();
//         const sub = shop.subscriptionPlan;

//         // 1. Check if Trial has Expired
//         if (sub.status === 'trialing' && sub.trialEndsAt < now) {
//             // Auto Update status to past_due in background (Fire and forget)
//             Shop.findByIdAndUpdate(shopId, { 'subscriptionPlan.status': 'past_due' }).exec();
            
//             return res.status(402).json({ 
//                 success: false, 
//                 error: 'Your 14-day free trial has expired. Please upgrade your plan to continue using NexMart.',
//                 code: 'TRIAL_EXPIRED'
//             });
//         }

//         // 2. Check if active subscriptionPlan has expired
//         if (sub.status === 'past_due' || (sub.currentPeriodEnd && sub.currentPeriodEnd < now)) {
//             return res.status(402).json({ 
//                 success: false, 
//                 error: 'Your subscriptionPlan payment is overdue. Please renew your plan.',
//                 code: 'PAYMENT_REQUIRED'
//             });
//         }

//         // 3. Check for Suspended accounts
//         if (sub.status === 'suspended' || sub.status === 'canceled') {
//             return res.status(403).json({ 
//                 success: false, 
//                 error: 'Your subscriptionPlan is inactive. Please contact support.',
//                 code: 'SUBSCRIPTION_INACTIVE'
//             });
//         }

//         // හැමදේම හරි නම්, shop ඩේටා ටික request එකට attach කරලා ඉස්සරහට යවනවා
//         req.shop = shop;
//         next();

//     } catch (error) {
//         console.error('Subscription Middleware Error:', error);
//         return res.status(500).json({ success: false, error: 'Internal server error during subscriptionPlan check.' });
//     }
// };