import express from 'express';
import { protect, authorize } from '../middleware/authMiddleware.js';
import { getMyShop, updateShop } from '../controllers/shopController.js';

const router = express.Router();

router.use(protect);
router.use(authorize('owner', 'admin')); // 🛡️ Settings වලට යන්න පුළුවන් Owner/Admin ට විතරයි

router.route('/me').get(getMyShop).put(updateShop);

export default router;