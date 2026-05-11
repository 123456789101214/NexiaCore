import mongoose from 'mongoose';

const ProductSchema = new mongoose.Schema({
    shopId: { type: mongoose.Schema.Types.ObjectId, ref: 'Shop', required: true, index: true },
    name: { type: String, required: [true, 'Product name is required'], trim: true },
    sku: { type: String, trim: true },
    barcode: { type: String, trim: true, default: null },
    category: { type: String, required: [true, 'Category is required'], default: 'General' },
    buyingPrice: { type: Number, required: true, min: 0, default: 0 },
    price: { type: Number, required: true, min: 0 },
    discount: {
        isActive: { type: Boolean, default: false },
        percentage: { type: Number, default: 0, min: 0, max: 100 },
        discountedPrice: { type: Number, default: 0 }
    },
    stock: { type: Number, default: 0 },
    unit: { type: String, enum: ['pcs', 'kg', 'g', 'ltr', 'ml', 'packet', 'bottle', 'bundle'], default: 'pcs' },
    minStockLevel: { type: Number, default: 10 },
    expiryDate: { type: Date },
    expiryThreshold: { type: Number, default: 30 },
    salesVelocity: { type: Number, default: 0 },
    lastPurchasedAt: { type: Date },
    lastSoldAt: { type: Date },
    status: { type: String, enum: ['active', 'archived'], default: 'active' },
    image: { type: String, default: 'https://via.placeholder.com/150' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

// 🚀 PRODUCTION-GRADE SAAS INDEXING
// ---------------------------------------------------------
// 1. Unique Constraints per Shop (SaaS Requirement)
ProductSchema.index({ shopId: 1, barcode: 1 }, { unique: true, sparse: true });
ProductSchema.index({ shopId: 1, sku: 1 }, { unique: true, sparse: true });

// 2. High-Speed Category & Status Filtering
ProductSchema.index({ shopId: 1, status: 1 });
ProductSchema.index({ shopId: 1, category: 1 });

// 3. Smart POS Search (Text Indexing)
// Enables searching by name, barcode, or SKU across large datasets
ProductSchema.index({ shopId: 1, name: 'text', barcode: 'text', sku: 'text' });

const Product = mongoose.model('Product', ProductSchema);
export default Product;