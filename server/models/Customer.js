import mongoose from 'mongoose';

const CustomerSchema = new mongoose.Schema({
    shopId: { type: mongoose.Schema.Types.ObjectId, ref: 'Shop', required: true },
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    nic: { type: String, trim: true },
    address: { type: String, trim: true },
    
    // 💰 Credit Control (Naya Potha)
    creditLimit: { type: Number, default: 5000, min: 0 },
    creditBalance: { type: Number, default: 0, min: 0 }, // 💡 Unpaid amount owed to shop
    
    loyaltyPoints: { type: Number, default: 0 },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' }
}, { timestamps: true });

// 🚀 SAAS INDEXING
CustomerSchema.index({ shopId: 1, phone: 1 }, { unique: true }); // No duplicate phone per shop
CustomerSchema.index({ shopId: 1, status: 1 });

export default mongoose.model('Customer', CustomerSchema);