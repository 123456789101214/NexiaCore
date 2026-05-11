import express from 'express';
import {
    addProduct,
    getProducts,
    updateProduct,
    deleteProduct,
    bulkUploadProducts,
    bulkArchiveProducts,
    applyDiscount
} from '../controllers/productController.js';

import { protect, authorize } from '../middleware/authMiddleware.js';
// import { checkSubscription } from '../middleware/subscriptionMiddleware.js';
// import { checkProductLimit } from '../middleware/planMiddleware.js';
import upload from '../config/cloudinary.js';
import { getSmartAlerts } from '../controllers/analyticsController.js';

const router = express.Router();

// 🛡️ All product routes require authentication
router.use(protect);

// -------------------------------------------------------------------------
// 1. STATIC & ANALYTICS ROUTES
// -------------------------------------------------------------------------

// 🛡️ High-level management requires proper authorization
router.post('/bulk-upload', authorize('owner', 'admin'), bulkUploadProducts);
router.put('/bulk-archive-all', authorize('owner', 'admin'), bulkArchiveProducts); 
router.get('/expiry-alerts', authorize('owner', 'admin', 'manager'), getSmartAlerts);

// 💡 PRO FIX: Discount logic for higher roles only
router.put('/:id/apply-discount', authorize('admin', 'owner', 'manager'), applyDiscount);

// -------------------------------------------------------------------------
// 2. MAIN CRUD ROUTES
// -------------------------------------------------------------------------

router.route('/')
    .get(getProducts) // All staff can view products
    .post(
        authorize('owner', 'admin', 'manager'), 
 // 🛡️ Limit check BEFORE upload (Cloudinary Safety)
        upload.single('image'), 
        addProduct
    );

// -------------------------------------------------------------------------
// 3. DYNAMIC ROUTES
// -------------------------------------------------------------------------

router.route('/:id')
    .put(
        authorize('owner', 'admin', 'manager'), 
        upload.single('image'), 
        updateProduct
    )
    .delete(
        authorize('owner', 'admin'), 

        deleteProduct
    );

export default router;