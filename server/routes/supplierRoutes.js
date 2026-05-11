// FIXED: BUG E - Granular permissions. Manager can view, but cannot create or update.
import express from 'express';
import { addSupplier, getSuppliers, updateSupplier } from '../controllers/supplierController.js';
import { protect, authorize } from '../middleware/authMiddleware.js'; // 💡 PRO FIX: Import authorize
// import { checkSubscription } from '../middleware/subscriptionMiddleware.js';

const router = express.Router();

router.use(protect); // හැම එකටම Login වෙලා ඉන්න ඕනේ

router.route('/')
    // 💡 PRO FIX: Managers can view suppliers
    .get(authorize('admin', 'owner', 'manager'), getSuppliers)
    // 💡 PRO FIX: Only admin/owner can add suppliers
    .post(authorize('admin', 'owner'), addSupplier);

router.route('/:id')
    // 💡 PRO FIX: Only admin/owner can update suppliers
    .put(authorize('admin', 'owner'),  updateSupplier)

export default router;