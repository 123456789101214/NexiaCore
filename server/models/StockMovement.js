import mongoose from 'mongoose';

const StockMovementSchema = new mongoose.Schema({

    // 🛡️ TENANT ISOLATION
    shopId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Shop',
        required: true
    },

    // 📦 WHICH PRODUCT
    productId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        required: true
    },

    // 🔄 MOVEMENT TYPE
    type: {
        type: String,
        enum: [
            'sale',             // POS-ෙකෙදී විකිණීම — stock අඩු වෙනවා
            'purchase',         // GRN-ෙකෙදී ලැබීම — stock වැඩි වෙනවා
            'manual_increase',  // Admin manual adjustment — stock වැඩි කිරීම
            'manual_decrease',  // Admin manual adjustment — stock අඩු කිරීම
            'void_return'       // GRN void/Order void — stock reverse
        ],
        required: true
    },

    // 📊 QUANTITY & BALANCE
    quantity: {
        type: Number,
        required: true,
        min: [1, 'Quantity must be at least 1']
        // Always positive — direction determined by 'type' field
    },
    balanceAfter: {
        type: Number,
        required: true
        // Stock level AFTER this movement — crucial for audit trail
    },

    // 🔗 REFERENCE
    referenceId: {
        type: mongoose.Schema.Types.ObjectId
        // Points to Order._id (sale/void_return) or GRN._id (purchase)
        // null for manual adjustments
    },

    // 👤 WHO DID THIS
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },

    // 📝 NOTE
    note: {
        type: String,
        trim: true
        // Human-readable description of why stock changed
    }

}, { timestamps: true }); // createdAt = exact time of movement


// 🚀 INDEXES: Critical for stock history queries at scale
StockMovementSchema.index({ shopId: 1, createdAt: -1 });       // All movements for a shop (timeline)
StockMovementSchema.index({ shopId: 1, productId: 1, createdAt: -1 }); // Product-specific history
StockMovementSchema.index({ shopId: 1, type: 1 });              // Filter by movement type
StockMovementSchema.index({ referenceId: 1 });                  // Find all movements for an Order/GRN


const StockMovement = mongoose.model('StockMovement', StockMovementSchema);
export default StockMovement;