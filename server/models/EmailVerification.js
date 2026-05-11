import mongoose from 'mongoose';

const emailVerificationSchema = new mongoose.Schema({
    email: { 
        type: String, 
        required: true, 
        lowercase: true, 
        trim: true 
    },
    otp: { 
        type: String, 
        required: true 
    },
    expiresAt: { 
        type: Date, 
        required: true 
    },
    isUsed: { 
        type: Boolean, 
        default: false 
    },
    attempts: { 
        type: Number, 
        default: 0 
    }
}, { timestamps: true });

// 🛡️ Indexes for Performance & Security
emailVerificationSchema.index({ email: 1 });
// 💡 TTL Index: Auto-deletes document when current time > expiresAt
emailVerificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model('EmailVerification', emailVerificationSchema);