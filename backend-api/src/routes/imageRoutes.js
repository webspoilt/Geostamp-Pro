const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const upload = require('../middleware/upload');
const {
    uploadImage,
    getImages,
    getImageById,
    deleteImage,
} = require('../controllers/imageController');

// Public routes
router.post('/', upload.single('image'), uploadImage);
router.get('/:id', getImageById);

// Protected routes (Admin only for list/delete)
router.get('/', protect, getImages);
router.delete('/:id', protect, deleteImage);

module.exports = router;
