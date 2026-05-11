import express from 'express';
import { protect, authorize } from '../middleware/authMiddleware.js';
// import { checkUserLimit } from '../middleware/planMiddleware.js'; // Uncomment when plan limits are active

import {
    getStaff,
    updateStaff,
    deactivateStaff,
    resetStaffPassword,
    getStaffStats
} from '../controllers/staffController.js';

const router = express.Router();

// 🛡️ All staff routes require authentication
router.use(protect);

router.get('/stats', authorize('owner', 'admin'), getStaffStats);
router.get('/', authorize('owner', 'admin'), getStaff);
router.put('/:id', authorize('owner', 'admin'), updateStaff);
router.put('/:id/toggle', authorize('owner', 'admin'), deactivateStaff);
router.put('/:id/reset-password', authorize('owner'), resetStaffPassword);

// Note: POST / (add staff) is already handled securely at /api/auth/register-staff

export default router;