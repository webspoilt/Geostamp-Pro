const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const upload = require('../middleware/upload');
const { coordinatesValidator } = require('../middleware/validators');
const {
    uploadImage,
    getNearbyImages,
    getImages,
    getImageById,
    getImageFile,
    getImageThumbnail,
    deleteImage,
} = require('../controllers/imageController');

// All image operations are strictly protected
router.use(protect);

// IMPORTANT: /nearby MUST be registered BEFORE /:id to avoid Express route shadowing
router.get('/nearby', getNearbyImages);

// List images (scoped to user or all for admin)
router.get('/', getImages);

// Upload image (requires auth, file, and valid GPS coordinates)
router.post('/', upload.single('image'), coordinatesValidator, uploadImage);

// Specific image routes
router.get('/:id', getImageById);
router.get('/:id/file', getImageFile);
router.get('/:id/thumb', getImageThumbnail);
router.delete('/:id', deleteImage);

module.exports = router;
