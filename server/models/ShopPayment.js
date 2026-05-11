import mongoose from 'mongoose';

const ShopPaymentSchema = new mongoose.Schema({
  shopId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Shop',
    required: true
  },
  plan: {
    type: String,
    enum: ['free', 'pro', 'enterprise'],
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  currency: {
    type: String,
    default: 'LKR'
  },
  paymentMethod: {
    type: String,
    enum: ['Free', 'Online Transfer', 'Bank Deposit', 'Cash', 'Card'],
    required: true
  },
  transactionId: {
    type: String,
    default: null
  },
  // Cloudinary URL for Bank Deposit slips
  receiptUrl: {
    type: String,
    default: null
  },
  status: {
    type: String,
    enum: ['pending', 'pending_verification', 'completed', 'failed', 'rejected'],
    default: 'pending'
  },
  rejectionReason: {
    type: String,
    default: null
  },
  billingPeriod: {
    from: { type: Date },
    to: { type: Date }
  },
  notes: {
    type: String,
    trim: true
  },
  recordedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  // Super Admin Verification tracking
  verifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  verifiedAt: {
    type: Date,
    default: null
  }
}, { timestamps: true });

export default mongoose.model('ShopPayment', ShopPaymentSchema);