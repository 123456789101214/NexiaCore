import mongoose from 'mongoose';

const SupplierPaymentSchema = new mongoose.Schema({
    // 🛡️ TENANT ISOLATION (Strict Multi-tenancy)
    shopId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Shop',
        required: [true, 'Shop ID is strictly required for data isolation'],
        index: true
    },
    
    // 🏢 SUPPLIER RELATION
    supplierId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Supplier',
        required: [true, 'Supplier ID is required to record a payment'],
        index: true
    },
    
    // 💰 PAYMENT DETAILS
    amount: {
        type: Number,
        required: [true, 'Payment amount is required'],
        min: [1, 'Payment amount must be at least Rs. 1']
    },
    paymentMethod: {
        type: String,
        enum: {
            values: ['Cash', 'Bank Transfer', 'Cheque'],
            message: '{VALUE} is not a valid payment method'
        },
        default: 'Cash'
    },
    referenceNumber: {
        type: String,
        trim: true,
        // Used for Cheque Numbers or Bank Transfer Reference IDs
    },
    note: {
        type: String,
        trim: true,
        maxlength: [500, 'Note cannot exceed 500 characters']
    },
    
    // ⏱️ AUDIT & TRACKING
    paidAt: {
        type: Date,
        default: Date.now
    },
    recordedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'Recorded By (User ID) is required for audit trails']
    }
}, { timestamps: true });

// 🚀 SAAS INDEXING (Crucial for 10,000+ tenant scaling)

// 1. Get payment history for a SPECIFIC supplier quickly (for supplier ledger/statement)
SupplierPaymentSchema.index({ shopId: 1, supplierId: 1, paidAt: -1 });

// 2. Get global payment history for the ENTIRE shop (for daily expense reports)
SupplierPaymentSchema.index({ shopId: 1, paidAt: -1 });

export default mongoose.model('SupplierPayment', SupplierPaymentSchema);