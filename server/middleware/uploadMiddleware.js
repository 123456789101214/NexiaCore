import multer from 'multer';

// Use memory storage (Required for Railway)
const storage = multer.memoryStorage();

const upload = multer({
    storage,
    limits: { 
        fileSize: 10 * 1024 * 1024 // 👈 Increased to 10MB to support ZIP files and Excel
    }, 
    fileFilter: (req, file, cb) => {
        // 👑 ARCHITECT FIX 4: Allow Images, Excel, CSV, and ZIP files
        const allowedMimeTypes = [
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
            'application/vnd.ms-excel', // .xls
            'text/csv', // .csv
            'application/zip', // .zip
            'application/x-zip-compressed', // .zip (Windows)
            'application/octet-stream' // Sometimes ZIP/Excel defaults to this on certain clients
        ];

        if (file.mimetype.startsWith('image/') || allowedMimeTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            console.warn(`[Upload Blocked] Unsupported mimetype: ${file.mimetype}`);
            cb(new Error(`Unsupported file type! Received: ${file.mimetype}`), false);
        }
    }
});

export default upload;