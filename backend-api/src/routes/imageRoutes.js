const express = require('express');
const router = express.Router();
const {
    uploadImage,
    getImages,
    getImage,
    deleteImage,
} = require('../controllers/imageController');
const { protect } = require('../middleware/auth');
const upload = require('../middleware/upload');

router.use(protect);

router.route('/').post(upload.single('image'), uploadImage).get(getImages);
router.route('/:id').get(getImage).delete(deleteImage);

module.exports = router;
