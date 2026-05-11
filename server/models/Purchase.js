import mongoose from 'mongoose';

const PurchaseSchema = new mongoose.Schema({
shopId: { type: mongoose.Schema.Types.ObjectId, ref: 'Shop', required: true, index: true },
supplierId: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier', required: true },
processedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // 💡 PRO FIX: කවුද සිස්ටම් එකට බිල දැම්මේ?
invoiceNumber: { type: String, trim: true }, // 💡 PRO FIX: සප්ලයර්ගේ බිල් අංකය (පස්සේ හොයාගන්න ලේසියි)
items: [{
productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
name: String,
quantity: { type: Number, required: true, min: [0.01, 'Quantity must be greater than 0'] }, // 💡 Validation
buyingPrice: { type: Number, required: true, min: 0 },
sellingPrice: { type: Number, required: true, min: 0 },
expiryDate: { type: Date }
}],
totalAmount: { type: Number, required: true, min: 0 },
paidAmount: { type: Number, default: 0, min: 0 },
balanceAmount: { type: Number, default: 0, min: 0 },
paymentType: { type: String, enum: ['Cash', 'Credit', 'Partial', 'Bank Transfer'], default: 'Cash' },
status: { type: String, enum: ['Received', 'Pending', 'Cancelled'], default: 'Received' }
}, { timestamps: true });

export default mongoose.model('Purchase', PurchaseSchema);