import mongoose from 'mongoose';

const SupplierSchema = new mongoose.Schema({
    // 🛡️ TENANT ISOLATION
    shopId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Shop',
        required: true,
        index: true
    },
    // 👤 BASIC INFO
    name: { 
        type: String, 
        required: [true, 'Supplier name is required'], 
        trim: true 
    },
    contactPerson: { type: String, trim: true },
    phone: { 
        type: String, 
        required: [true, 'Phone number is required'], 
        trim: true 
    },
    email: { type: String, lowercase: true, trim: true },
    address: { type: String, trim: true },
    
    // 🏢 BUSINESS INFO (SaaS Audit Standard)
    businessRegNumber: { type: String, trim: true }, // BR Number
    taxNumber: { type: String, trim: true }, // VAT/TIN for tax invoices
    
    // 💳 FINANCIALS & TERMS
    balance: { 
        type: Number, 
        default: 0 // 💡 Positive means we owe money to supplier (Payables)
    },
    creditLimit: { type: Number, default: 0 },
    creditPeriod: { 
        type: Number, 
        default: 0, // In days (e.g., 30 days credit)
        min: 0 
    },
    
    // 🛠️ STATUS & TRACKING
    category: { type: String, default: 'General' },
    status: { 
        type: String, 
        enum: ['active', 'archived'], 
        default: 'active', 
        index: true 
    },
    notes: { type: String, trim: true }

}, { timestamps: true });

// 🚀 SAAS LEVEL INDEXING
// එකම කඩේ ඇතුළේ එකම Phone එක තියෙන සප්ලයර්ලා දෙන්නෙක් බෑ
SupplierSchema.index({ shopId: 1, phone: 1 }, { unique: true });
// කඩේ ඇතුළේ නමින් සර්ච් එක වේගවත් කිරීමට
SupplierSchema.index({ shopId: 1, name: 1 });

export default mongoose.model('Supplier', SupplierSchema);