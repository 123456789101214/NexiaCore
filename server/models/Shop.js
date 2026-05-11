import mongoose from 'mongoose';

/**
 * @description Shop model representing a Tenant in the Multi-tenant SaaS.
 * This schema defines the business rules, localization, and subscription status.
 */
const ShopSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Shop name is required'],
        trim: true,
        maxlength: [100, 'Shop name cannot exceed 100 characters']
    },
    address: {
        type: String,
        trim: true
    },
    phone: {
        type: String,
        trim: true
    },
    
    // 🌍 LOCALIZATION & BILLING CONFIG
    currency: {
        type: String,
        default: 'LKR',
        uppercase: true,
        trim: true
    },
    taxRate: {
        type: Number,
        default: 0,
        min: [0, 'Tax rate cannot be negative'],
        max: [100, 'Tax rate cannot exceed 100%']
    },
    billPrefix: {
        type: String,
        default: 'INV',
        trim: true,
        uppercase: true
    },
    timezone: {
        type: String,
        default: 'Asia/Colombo'
    },

    // 🚀 SAAS SUBSCRIPTION LIFECYCLE (FLATTENED FOR STABILITY)
    // 💡 BUG FIX: Removed nested 'subscription' object to prevent Settings.jsx crashes
    subscriptionPlan: {
        type: String,
        enum: ['free', 'pro', 'enterprise'],
        default: 'free'
    },
    planStatus: {
        type: String,
        enum: ['trial', 'active', 'expired', 'cancelled', 'pending_verification'],
        default: 'trial'
    },
    trialEndsAt: {
        type: Date,
        // Default: 14 days from registration
        default: () => new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) 
    },
    planStartedAt: { 
        type: Date, 
        default: null 
    },
    planExpiresAt: { 
        type: Date, 
        default: null 
    },
    planAutoRenew: { 
        type: Boolean, 
        default: true 
    },
    
    // Status flag for disabling a tenant (SaaS Management)
    isActive: {
        type: Boolean,
        default: true
    }
}, { 
    timestamps: true,
    // Ensure shopId is not confused with _id in business logic
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Index for performance
ShopSchema.index({ name: 'text' });

export default mongoose.model('Shop', ShopSchema);