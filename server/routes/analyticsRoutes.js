// FIXED: BUG E - Restricting analytics routes to manager and above
import express from 'express';
import { getDashboardSummary, getStockForecast, getSalesChartData } from '../controllers/analyticsController.js';
import { protect, authorize } from '../middleware/authMiddleware.js'; // 💡 PRO FIX: Import authorize
import { requireFeature } from '../middleware/planMiddleware.js';

const router = express.Router();

// 💡 PRO FIX: Restricted to admin, owner, manager
router.get('/dashboard-summary', protect, authorize('admin', 'owner', 'manager'), getDashboardSummary);
router.get('/stock-forecast', protect, authorize('owner','admin','manager'), requireFeature('stockForecast'), getStockForecast);
router.get('/chart-data', protect, authorize('owner','admin','manager'), requireFeature('analytics'), getSalesChartData);

export default router;