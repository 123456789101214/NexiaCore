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

// 📦 1. Existing Storage for Single Products (Keeps your current routes working!)
const productStorage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'smart-pos-products',
        allowed_formats: ['jpg', 'png', 'jpeg', 'webp'],
    },
});

// 🧾 2. Existing Storage for Bank Receipts
const receiptStorage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'smart_pos_receipts', 
        allowed_formats: ['jpg', 'png', 'jpeg', 'webp'],
    },
});

// 🧠 3. NEW: Memory Storage EXACTLY for Bulk Uploads (Excel/ZIP)
// CloudinaryStorage crashes if you send it an Excel or ZIP file. We MUST use memory for bulk!
const uploadMemory = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 15 * 1024 * 1024 }, // 15MB limit for ZIP/Excel combos
    fileFilter: (req, file, cb) => {
        const allowedTypes = [
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
            'application/vnd.ms-excel', // .xls
            'text/csv', // .csv
            'application/zip', // .zip
            'application/x-zip-compressed', // .zip
            'application/octet-stream',
            'image/jpeg', 'image/png', 'image/webp', 'image/jpg'
        ];
        if (file.mimetype.startsWith('image/') || allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            console.warn(`[Upload Blocked] Unsupported format: ${file.mimetype}`);
            cb(new Error(`Unsupported file format! Received: ${file.mimetype}`), false);
        }
    }
});

// 👑 4. Architect Level Buffer Uploader (For ZIP Image Processing)
const uploadBufferToCloudinary = (buffer, filename, shopId = 'general') => {
    return new Promise((resolve) => {
        if (!buffer) return resolve(null);
        
        const safeFilename = filename 
            ? filename.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 30) 
            : `img_${Date.now()}`;

        const uploadStream = cloudinary.uploader.upload_stream(
            {
                folder: `smart-pos-products/${shopId}`,
                public_id: `${Date.now()}_${safeFilename}`,
                resource_type: 'image',
                transformation: [
                    { width: 500, height: 500, crop: 'limit' },
                    { quality: 'auto', fetch_format: 'auto' }
                ]
            },
            (error, result) => {
                if (error) {
                    console.error(`[Cloudinary Stream Error] ${safeFilename}:`, error.message);
                    return resolve(null); 
                }
                resolve(result.secure_url);
            }
        );
        uploadStream.end(buffer);
    });
};

// 👑 5. Architect Level URL Uploader (For Direct Links in Excel)
const downloadAndUploadToCloudinary = (url, productName, shopId) => {
    return new Promise((resolve) => {
        try {
            if (!url || typeof url !== 'string') return resolve(null);
            if (url.includes('res.cloudinary.com')) return resolve(url);

            const ALLOWED_HOSTS = [
                'drive.google.com', 'dropbox.com', 'dl.dropboxusercontent.com', 
                'res.cloudinary.com', 'images.unsplash.com', 'firebasestorage.googleapis.com'
            ];
            
            try {
                const parsed = new URL(url);
                if (!ALLOWED_HOSTS.some(h => parsed.hostname.endsWith(h))) {
                    console.warn(`[Security Alert] Blocked host: ${parsed.hostname}`);
                    return resolve(null); 
                }
            } catch (err) {
                return resolve(null); 
            }

            cloudinary.uploader.upload(url, {
                folder: `smart-pos-products/${shopId}`,
                public_id: `${Date.now()}_${productName.replace(/\s+/g, '_').slice(0, 30)}`,
                resource_type: 'image',
                timeout: 60000, 
                transformation: [
                    { width: 500, height: 500, crop: 'limit' },
                    { quality: 'auto', fetch_format: 'auto' }
                ]
            }, (error, result) => {
                if (error) {
                    console.warn(`[Cloudinary URL Failed] ${productName}:`, error.message);
                    resolve(null); 
                } else {
                    resolve(result.secure_url);
                }
            });
        } catch (error) {
            resolve(null);
        }
    });
};

const upload = multer({ storage: productStorage });
const uploadReceipt = multer({ storage: receiptStorage });

// 💡 EXPORTS
export { 
    cloudinary, 
    uploadReceipt, 
    uploadMemory, // Use this for bulk upload routes!
    uploadBufferToCloudinary, 
    downloadAndUploadToCloudinary 
};

// 💡 DEFAULT EXPORT (Fixes the crash in productRoutes.js)
export default upload;