import multer from 'multer';

// Store files in memory for processing
const storage = multer.memoryStorage();

export const bulkUploadMiddleware = multer({
    storage,
    limits: { fileSize: 50 * 1024 * 1024 }, // 50MB max for ZIP
    fileFilter: (req, file, cb) => {
        if (file.fieldname === 'excel') {
            if (!file.originalname.match(/\.(xlsx|csv)$/)) {
                return cb(new Error('Excel file must be .xlsx or .csv'), false);
            }
        }
        if (file.fieldname === 'images') {
            if (!file.originalname.match(/\.zip$/)) {
                return cb(new Error('Images file must be a .zip'), false);
            }
        }
        cb(null, true);
    }
}).fields([
    { name: 'excel', maxCount: 1 },
    { name: 'images', maxCount: 1 }
]);