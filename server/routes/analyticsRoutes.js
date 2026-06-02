import express from 'express';
import { getDashboardSummary, getStockForecast, getSalesChartData, getSmartAlerts } from '../controllers/analyticsController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';
import { requireFeature } from '../middleware/planMiddleware.js';

const router = express.Router();

// 💡 PRO FIX: Restricted to admin, owner, manager
router.get('/dashboard-summary', protect, authorize('admin', 'owner', 'manager'), getDashboardSummary);

// 🚀 Advanced Insights & Alerts (Strictly protected from Cashiers)
router.get('/smart-alerts', protect, authorize('owner','admin','manager'), requireFeature('expiryAlerts'), getSmartAlerts);
router.get('/stock-forecast', protect, authorize('owner','admin','manager'), requireFeature('stockForecast'), getStockForecast);

router.get('/chart-data', protect, authorize('owner','admin','manager'), requireFeature('analytics'), getSalesChartData);

export default router;