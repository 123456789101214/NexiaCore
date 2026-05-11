import API from './api';

// All shop/subscription API calls — points to /api/subscription routes
// Built to match subscriptionController.js endpoints

export const shopService = {
    // GET /api/subscription — returns { shop, usage, paymentHistory, trialDaysRemaining }
    getMyShop: () => API.get('/subscription'),

    // PUT /api/subscription/settings — update shop profile fields
    updateShop: (data) => API.put('/subscription/settings', data),

    // GET /api/subscription/trial — check trial status (used for banners)
    getTrialStatus: () => API.get('/subscription/trial'),

    // POST /api/subscription/upgrade — record plan upgrade + payment
    upgradePlan: (data) => API.post('/subscription/upgrade', data)
};

export default shopService;