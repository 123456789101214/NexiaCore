import mongoose from 'mongoose';

const CustomerPaymentSchema = new mongoose.Schema({

    shopId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Shop',
        required: true
    },
    customerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Customer',
        required: true
    },
    // BUG 2 FIX: receiptNumber field added — controller generates this, model must store it
    receiptNumber: {
        type: String,
        trim: true
    },
    amount: {
        type: Number,
        required: true,
        min: [1, 'Payment amount must be at least 1']
    },
    paymentMethod: {
        type: String,
        enum: ['Cash', 'Bank Transfer', 'Card'],
        default: 'Cash'
    },
    note: {
        type: String,
        trim: true
    },
    paidAt: {
        type: Date,
        default: Date.now
    },
    recordedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    }

}, { timestamps: true });

// Indexes for fast payment history queries
CustomerPaymentSchema.index({ shopId: 1, customerId: 1, paidAt: -1 }); // per-customer history
CustomerPaymentSchema.index({ shopId: 1, paidAt: -1 });                 // all payments timeline

export default mongoose.model('CustomerPayment', CustomerPaymentSchema);