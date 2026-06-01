import mongoose from 'mongoose';

const categorySchema = new mongoose.Schema({
    shopId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Shop',
        required: true,
        index: true
    },
    name: {
        type: String,
        required: true,
        trim: true
    },
    status: {
        type: String,
        enum: ['active', 'archived'],
        default: 'active'
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, {
    timestamps: true
});

// 👑 SaaS Architecture Tip: Compound Index
// එකම ෂොප් එක ඇතුළේ එකම නම තියෙන Categories දෙකක් හැදෙන එක නවත්තන්න මේ Index එක උදව් වෙනවා.
// (හැබැයි වෙනස් ෂොප් දෙකකට 'General' කියලා හදාගන්න පුළුවන්)
categorySchema.index({ shopId: 1, name: 1 }, { unique: true });

const Category = mongoose.model('Category', categorySchema);
export default Category;