import multer from 'multer';

// 💡 Memory Storage is used so we don't save files locally. 
// It's directly uploaded to Cloudinary from RAM.
const storage = multer.memoryStorage();

const upload = multer({
    storage,
    limits: { 
        fileSize: 5 * 1024 * 1024 // උපරිම 5MB
    }, 
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Only image files (JPEG, PNG) are allowed!'), false);
        }
    }
});

export default upload;