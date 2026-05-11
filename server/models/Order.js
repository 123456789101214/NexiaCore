import mongoose from 'mongoose';

const OrderSchema = new mongoose.Schema({
    shopId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Shop',
        required: true
    },
    cashierId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    customerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Customer',
        default: null
    },
    customerName: {
        type: String,
        default: 'Walk-in Customer'
    },
    customerPhone: {
        type: String,
        default: null
    },
    items: [{
        productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
        name:       { type: String, required: true },
        quantity:   { type: Number, required: true, min: 0.01 },
        price:      { type: Number, required: true },      // selling price at time of sale (snapshot)
        buyingPrice:{ type: Number, required: true },      // cost price at time of sale (snapshot)
        subTotal:   { type: Number, required: true }
    }],
    totalAmount: { type: Number, required: true },
    totalProfit: { type: Number, required: true },

    paymentMethod: {
        type: String,
        enum: ['Cash', 'Card', 'Online', 'Credit'],
        default: 'Cash'
    },
    status: {
        type: String,
        enum: ['completed', 'voided'],
        default: 'completed'
    },
    billNumber: {
        type: String,
        required: true
    },

    // FIX: void audit trail fields — were missing, Mongoose silently dropped them before
    // voidOrder() controller sets all 3 of these on void
    voidedBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    voidedAt:   { type: Date, default: null },
    voidReason: { type: String, default: null }

}, { timestamps: true });

// 🚀 INDEXES
OrderSchema.index({ shopId: 1, billNumber: 1 }, { unique: true }); // unique bill per shop
OrderSchema.index({ shopId: 1, createdAt: -1 });                    // sales history + date filter
OrderSchema.index({ shopId: 1, paymentMethod: 1 });                 // payment type reports
OrderSchema.index({ shopId: 1, customerId: 1 });                    // credit customer ledger
OrderSchema.index({ shopId: 1, status: 1 });                        // completed vs voided filter

const Order = mongoose.model('Order', OrderSchema);
export default Order;