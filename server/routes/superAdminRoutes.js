// server/routes/superAdminRoutes.js
import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import {
  getSystemStats,
  getAllShops,
  getPendingPayments,
  verifyPayment,
  toggleShopStatus,
  downgradeShopPlan
} from '../controllers/superAdminController.js';

const router = express.Router();

const superAdminOnly = (req, res, next) => {
  if (!req.user || req.user.email !== process.env.SUPER_ADMIN_EMAIL) {
    return res.status(403).json({ success: false, error: 'Super Admin access required' });
  }
  next();
};

router.use(protect);
router.use(superAdminOnly);

router.get('/stats', getSystemStats);
router.get('/shops', getAllShops);
router.get('/payments/pending', getPendingPayments);
router.put('/payments/:id/verify', verifyPayment);
router.put('/shops/:id/toggle', toggleShopStatus);
router.put('/shops/:id/downgrade', downgradeShopPlan);

export default router;