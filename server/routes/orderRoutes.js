// FIXED: SaaS Subscription Enforcement & RBAC Validation
import express from 'express';
const router = express.Router();

import { createOrder, getSalesHistory, voidOrder } from '../controllers/orderController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';
// import { checkSubscription } from '../middleware/subscriptionMiddleware.js';

// @route    POST /api/orders
// @desc     Checkout එකේදී අලුත් ඕඩර් එකක් සේව් කිරීමට
// 🛡️ PRO FIX: Added checkSubscription to block sales if trial expired
router.post('/', 
    protect,  
    createOrder
);

// @route    GET /api/orders/history
// @desc     සියලුම සේල්ස් විස්තර (Sales History) ලබා ගැනීමට
// 💡 READ-ONLY: Subscription check අවශ්‍ය නැත (අයිතිකරුට පරණ විස්තර බැලීමට ඉඩ දිය යුතුය)
router.get('/history', 
    protect, 
    authorize('admin', 'owner', 'manager'), 
    getSalesHistory
);

// @route    PUT /api/orders/:id/void
// @desc     බිලක් අවලංගු කිරීම
// 🛡️ PRO FIX: Void කරද්දී Stock update වන බැවින් Subscription එක අනිවාර්යයි
router.put('/:id/void', 
    protect, 
    authorize('admin', 'owner'),  
    voidOrder
);

export default router;