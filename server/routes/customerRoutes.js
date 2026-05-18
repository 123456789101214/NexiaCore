import express from 'express';
import { protect, authorize } from '../middleware/authMiddleware.js';
import {
    addCustomer,
    getCustomers,
    getCustomerById,
    updateCustomer,
    recordPayment,
    toggleCustomerStatus
} from '../controllers/customerController.js';

import { requireFeature } from '../middleware/planMiddleware.js';

const router = express.Router();

router.use(protect); // All customer routes require login

router.use(requireFeature('customerCredit'));

// GET /api/customers — all roles can search (cashier needs this at POS for credit sales)
// POST /api/customers — owner, admin, manager only
router.route('/')
    .get(getCustomers)
    .post(authorize('owner', 'admin', 'manager'), addCustomer);

// BUG 4 FIX: GET /:id returns full credit history — cashier should NOT see this
// PUT /:id — owner, admin, manager only
router.route('/:id')
    .get(authorize('owner', 'admin', 'manager'), getCustomerById)
    .put(authorize('owner', 'admin', 'manager'), updateCustomer);

// Toggle active/inactive status
router.put('/:id/toggle', authorize('owner', 'admin', 'manager'), toggleCustomerStatus);

// Record a customer debt payment
router.post('/:id/pay', authorize('owner', 'admin', 'manager'), recordPayment);

export default router;