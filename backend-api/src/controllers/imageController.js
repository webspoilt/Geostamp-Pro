const Image = require('../models/Image');
const fs = require('fs');
const path = require('path');

// POST /api/images – upload image (Public)
exports.uploadImage = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No image file provided' });
        }

        const { latitude, longitude, address, tags, notes } = req.body;

        const image = await Image.create({
            user: req.user ? req.user._id : undefined, // Optional user
            filename: req.file.filename,
            originalName: req.file.originalname,
            path: req.file.path,
            mimeType: req.file.mimetype,
            size: req.file.size,
            location: {
                type: 'Point',
                coordinates: [
                    parseFloat(longitude) || 0,
                    parseFloat(latitude) || 0,
                ],
            },
            address: address || '',
            tags: tags ? tags.split(',').map((t) => t.trim()) : [],
            notes: notes || '',
        });

        res.status(201).json(image);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// GET /api/images – list all images (Admin only)
exports.getImages = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skip = (page - 1) * limit;

        // Admin sees all images
        const images = await Image.find({})
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        const total = await Image.countDocuments({});

        res.json({ images, page, pages: Math.ceil(total / limit), total });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// GET /api/images/:id (Public)
exports.getImageById = async (req, res) => {
    try {
        const image = await Image.findById(req.params.id);

        if (!image) {
            return res.status(404).json({ message: 'Image not found' });
        }

        res.json(image);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// DELETE /api/images/:id (Admin only)
exports.deleteImage = async (req, res) => {
    try {
        const image = await Image.findById(req.params.id);

        if (!image) {
            return res.status(404).json({ message: 'Image not found' });
        }

        // Delete file from disk
        const filePath = path.join(__dirname, '../../uploads', image.filename);
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }

        await image.deleteOne();
        res.json({ message: 'Image deleted' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
