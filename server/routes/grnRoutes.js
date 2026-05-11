import express from 'express';
import { protect, authorize } from '../middleware/authMiddleware.js';
// import { checkSubscription } from '../middleware/subscriptionMiddleware.js';
import {
    createGRN,
    getGRNList,
    getGRNById,
    voidGRN
} from '../controllers/grnController.js';

const router = express.Router();

// 🛡️ All GRN routes require login (Tenant Isolation)
router.use(protect);

router.route('/')
    .post(authorize('owner', 'admin', 'manager'), createGRN)
    .get(authorize('owner', 'admin', 'manager'), getGRNList);

router.route('/:id')
    .get(authorize('owner', 'admin', 'manager'), getGRNById);

router.route('/:id/void')
    .put(authorize('owner', 'admin'), voidGRN); // Strictly high-level access

export default router;