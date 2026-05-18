import { create } from 'zustand';
import API from '../services/api';

const usePlanStore = create((set, get) => ({
    features: null,
    effectivePlan: null,
    planStatus: null,
    trialDaysRemaining: null,
    isLoading: true,

    fetchPlanFeatures: async () => {
        try {
            const res = await API.get('/subscription'); // Update endpoint if needed
            const { features, effectivePlan, shop, trialDaysRemaining } = res.data.data;
            
            set({
                features,
                effectivePlan,
                planStatus: shop?.planStatus,
                trialDaysRemaining,
                isLoading: false
            });
        } catch (error) {
            console.error('Failed to fetch plan features:', error);
            // Fallback to FREE plan if API fails
            set({
                features: {
                    customerCredit: false,
                    analytics: false,
                    stockForecast: false,
                    expiryAlerts: false,
                    bulkUpload: false,
                    advancedReports: false,
                },
                effectivePlan: 'free',
                isLoading: false
            });
        }
    },

    hasFeature: (featureName) => {
        const { features } = get();
        if (!features) return false;
        return features[featureName] === true;
    },

    clearPlan: () => set({ features: null, effectivePlan: null, isLoading: true })
}));

export default usePlanStore;