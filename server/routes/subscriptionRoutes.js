// server/routes/subscriptionRoutes.js
import express from 'express';
import { uploadReceipt } from '../config/receiptUpload.js';
import { protect, authorize } from '../middleware/authMiddleware.js';
import {
  getMySubscription,
  upgradePlan,
  updateShopSettings,
  getTrialStatus
} from '../controllers/subscriptionController.js';

const router = express.Router();

router.use(protect);
router.get('/', authorize('owner', 'admin'), getMySubscription);
router.post('/upgrade', authorize('owner'), uploadReceipt.single('receipt'), upgradePlan);
router.put('/settings', authorize('owner', 'admin'), updateShopSettings);
router.get('/trial', getTrialStatus);

export default router;