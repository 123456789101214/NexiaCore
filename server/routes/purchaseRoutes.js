import express from 'express';
import { createGRN } from '../controllers/purchaseController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// 🔒 සියලුම Purchase routes වලට Login වීම අනිවාර්යයි
router.use(protect);

// 🛒 අලුත් GRN (Purchase) එකක් ඇතුළත් කිරීමේ පාර
router.route('/')
    .post(createGRN);

// පස්සේ අපිට පුළුවන් පරණ GRN ලිස්ට් එකක් බලන්න .get(getPurchases) වගේ ඒවා මෙතනටම ඇඩ් කරන්න

export default router;