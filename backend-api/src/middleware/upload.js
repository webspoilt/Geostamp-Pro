const multer = require('multer');
const path = require('path');

// Store in memory buffer so sharp & storageService can process before persistence
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
    const allowedExtensions = /jpeg|jpg|png|webp|heic/;
    const extName = allowedExtensions.test(path.extname(file.originalname).toLowerCase());
    const mimeAllowed = /image\/(jpeg|png|webp|heic)/.test(file.mimetype) || file.mimetype === 'image/jpg';

    if (extName || mimeAllowed) {
        cb(null, true);
    } else {
        const err = new Error('Only image files (JPEG, PNG, WebP, HEIC) are allowed');
        err.statusCode = 415;
        cb(err, false);
    }
};

const upload = multer({
    storage,
    fileFilter,
    limits: { fileSize: 20 * 1024 * 1024 }, // 20 MB max
});

module.exports = upload;
