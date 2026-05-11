import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import multer from 'multer';
import dotenv from 'dotenv';

dotenv.config();

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// 📦 1. Existing Storage for Products
const productStorage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'smart-pos-products',
        allowed_formats: ['jpg', 'png', 'jpeg', 'webp'],
    },
});

// 🧾 2. NEW: Storage specifically for Bank Receipts
const receiptStorage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'smart_pos_receipts', 
        allowed_formats: ['jpg', 'png', 'jpeg', 'webp'],
    },
});

const upload = multer({ storage: productStorage });
const uploadReceipt = multer({ storage: receiptStorage });

export { cloudinary, uploadReceipt }; // 💡 අලුත් ඒවට Named Export
export default upload; // 💡 පරණ Product routes කැඩෙන්නෙ නැති වෙන්න Default Export එක එහෙම්මම තියෙනවා!