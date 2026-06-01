import multer from 'multer';

const excelUpload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max limit
    fileFilter: (req, file, cb) => {
        const allowedMimeTypes = [
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
            'application/vnd.ms-excel', // .xls
            'text/csv', // .csv
            'application/octet-stream' // fallback
        ];
        if (allowedMimeTypes.includes(file.mimetype) || file.originalname.match(/\.(xlsx|xls|csv)$/i)) {
            cb(null, true);
        } else {
            cb(new Error('Only Excel (.xlsx, .xls) or CSV files are allowed'), false);
        }
    }
});

export default excelUpload;