// models/MasterProduct.js
import mongoose from 'mongoose';

const MasterProductSchema = new mongoose.Schema({
    barcode: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    category: { type: String, default: 'General' }
}, { timestamps: true });

export default mongoose.model('MasterProduct', MasterProductSchema);