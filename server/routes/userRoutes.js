import express from 'express';
import { getStaff, updateStaff, deleteStaff } from '../controllers/userController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

// 🛡️ All routes in this file require Authentication
router.use(protect);

// 🛡️ Only Owners and Admins can manage staff
router.use(authorize('owner', 'admin'));

router.route('/')
    .get(getStaff);

router.route('/:id')
    .put(updateStaff)
    .delete(deleteStaff);

export default router;