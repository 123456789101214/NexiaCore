import express from 'express';
import { getMyProfile, updateMyProfile, changeMyPassword } from '../controllers/profileController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// Apply protect middleware to all profile routes
router.use(protect);

router.route('/')
    .get(getMyProfile)
    .put(updateMyProfile);

router.put('/change-password', changeMyPassword);

export default router;