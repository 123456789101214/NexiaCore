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
import { requireFeature, checkProductLimit } from '../middleware/planMiddleware.js';

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
router.post('/bulk-upload', protect, authorize('owner','admin'), requireFeature('bulkUpload'), checkProductLimit, bulkUploadProducts);
router.put('/bulk-archive-all', authorize('owner', 'admin'), bulkArchiveProducts); 
router.get('/expiry-alerts', protect,  authorize('owner', 'admin', 'manager'), requireFeature('expiryAlerts'), getSmartAlerts);

// 💡 PRO FIX: Discount logic for higher roles only
router.put('/:id/apply-discount', authorize('admin', 'owner', 'manager'), applyDiscount);

// -------------------------------------------------------------------------
// 2. MAIN CRUD ROUTES
// -------------------------------------------------------------------------

router.route('/')
    .get(getProducts) // All staff can view products
    .post(
        authorize('owner', 'admin', 'manager'), 
        checkProductLimit,
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