import mongoose from 'mongoose';

const GRNSchema = new mongoose.Schema({
    shopId: { type: mongoose.Schema.Types.ObjectId, ref: 'Shop', required: true },
    grnNumber: { type: String },
    supplierInvoiceNumber: { type: String, trim: true },
    supplierId: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier', required: true },
    items: [{
        productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
        name: { type: String, required: true },
        quantity: { type: Number, required: true, min: 1 },
        unitCost: { type: Number, required: true },
        previousUnitCost: { type: Number, default: 0 },
        sellingPrice: { type: Number, required: true },
        previousSellingPrice: { type: Number, default: 0 },
        subTotal: { type: Number, required: true },
        expiryDate: { type: Date }
    }],
    totalAmount: { type: Number, required: true },
    paidAmount: { type: Number, default: 0 },
    balanceAmount: { type: Number, default: 0 },
    paymentType: { type: String, enum: ['Cash', 'Credit', 'Partial'], default: 'Cash' },
    status: { type: String, enum: ['completed', 'voided'], default: 'completed' },
    enteredBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    voidedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    voidedAt: { type: Date, default: null },
    voidReason: { type: String, default: null }
}, { timestamps: true });

// 🚀 GRN & LEDGER INDEXES
// ---------------------------------------------------------
// 1. Tenant Integrity
GRNSchema.index({ shopId: 1, grnNumber: 1 }, { unique: true });

// 2. Audit & Date Filtering
GRNSchema.index({ shopId: 1, createdAt: -1 });

// 3. Fast Supplier Statement Fetching
GRNSchema.index({ shopId: 1, supplierId: 1, status: 1 });

// ✅ DATA INTEGRITY GUARD: Auto-balance calculation
GRNSchema.pre('save', async function() {
    if (this.isNew || this.isModified('totalAmount') || this.isModified('paidAmount')) {
        this.balanceAmount = Math.max(0, (this.totalAmount || 0) - (this.paidAmount || 0));
    }
});

const GRN = mongoose.model('GRN', GRNSchema);
export default GRN;