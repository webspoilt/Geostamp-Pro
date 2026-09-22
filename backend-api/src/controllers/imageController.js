const Image = require('../models/Image');
const { processImageBuffer } = require('../services/imageProcessor');
const storageService = require('../services/storageService');

// POST /api/images – upload & process image (Protected)
exports.uploadImage = async (req, res) => {
    try {
        if (!req.file || !req.file.buffer) {
            return res.status(400).json({ message: 'No image file provided' });
        }

        const { address, tags, notes, capturedAt } = req.body;
        const coordinates = req.parsedCoordinates; // set by coordinatesValidator

        // Sanitize, strip bad payloads, convert HEIC if needed, generate 400px thumb
        const processed = await processImageBuffer({
            buffer: req.file.buffer,
            originalname: req.file.originalname,
            mimetype: req.file.mimetype,
        });

        // Upload original/processed full image
        const fullUpload = await storageService.uploadFile({
            buffer: processed.fullBuffer,
            filename: processed.filename,
            mimeType: processed.mimeType,
        });

        // Upload thumbnail
        await storageService.uploadFile({
            buffer: processed.thumbnailBuffer,
            filename: processed.thumbnailFilename,
            mimeType: processed.mimeType,
        });

        const image = await Image.create({
            user: req.user._id,
            originalName: req.file.originalname,
            filename: processed.filename,
            thumbnailFilename: processed.thumbnailFilename,
            storageProvider: fullUpload.provider,
            mimeType: processed.mimeType,
            size: processed.size,
            location: {
                type: 'Point',
                coordinates: [coordinates.longitude, coordinates.latitude], // GeoJSON order: [lng, lat]
            },
            address: address || '',
            tags: tags ? (Array.isArray(tags) ? tags : tags.split(',').map((t) => t.trim())) : [],
            notes: notes || '',
            capturedAt: capturedAt ? new Date(capturedAt) : new Date(),
        });

        res.status(201).json(image);
    } catch (error) {
        const status = error.statusCode || 500;
        res.status(status).json({ message: error.message });
    }
};

// GET /api/images/nearby – geo query for images near location (Protected)
exports.getNearbyImages = async (req, res) => {
    try {
        const lat = parseFloat(req.query.lat);
        const lng = parseFloat(req.query.lng);
        const maxDistance = parseInt(req.query.maxDistance) || 50000; // 50km default
        const limit = Math.min(Math.max(parseInt(req.query.limit) || 50, 1), 100);

        if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
            return res.status(422).json({ message: 'Valid lat and lng query parameters required' });
        }

        // Scope to user unless admin
        const filter = req.user.role === 'admin' ? {} : { user: req.user._id };

        filter.location = {
            $near: {
                $geometry: {
                    type: 'Point',
                    coordinates: [lng, lat],
                },
                $maxDistance: maxDistance,
            },
        };

        const images = await Image.find(filter).limit(limit);
        res.json({ count: images.length, images });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// GET /api/images – list images scoped to owner or admin (Protected)
exports.getImages = async (req, res) => {
    try {
        const page = Math.max(parseInt(req.query.page) || 1, 1);
        const rawLimit = parseInt(req.query.limit) || 20;
        // Clamp pagination limit to max 100
        const limit = Math.min(Math.max(rawLimit, 1), 100);
        const skip = (page - 1) * limit;

        // Admin sees all images, regular users only see their own
        const filter = req.user.role === 'admin' ? {} : { user: req.user._id };

        const [images, total] = await Promise.all([
            Image.find(filter)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit),
            Image.countDocuments(filter),
        ]);

        res.json({
            images,
            page,
            pages: Math.ceil(total / limit) || 1,
            total,
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// GET /api/images/:id – get image metadata (Protected, Owner or Admin)
exports.getImageById = async (req, res) => {
    try {
        const image = await Image.findById(req.params.id);

        if (!image) {
            return res.status(404).json({ message: 'Image not found' });
        }

        // Owner or Admin check
        const isOwner = image.user && image.user.toString() === req.user._id.toString();
        const isAdmin = req.user.role === 'admin';

        if (!isOwner && !isAdmin) {
            return res.status(403).json({ message: 'Forbidden – You do not own this image' });
        }

        res.json(image);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// GET /api/images/:id/file – stream full image or redirect to signed URL (Protected, Owner or Admin)
exports.getImageFile = async (req, res) => {
    try {
        const image = await Image.findById(req.params.id);
        if (!image) {
            return res.status(404).json({ message: 'Image not found' });
        }

        const isOwner = image.user && image.user.toString() === req.user._id.toString();
        const isAdmin = req.user.role === 'admin';

        if (!isOwner && !isAdmin) {
            return res.status(403).json({ message: 'Forbidden – You do not own this image' });
        }

        // If using S3, redirect to signed URL
        const signedUrl = await storageService.getSignedDownloadUrl(image.filename);
        if (signedUrl) {
            return res.redirect(signedUrl);
        }

        // Local disk streaming
        const fileStream = await storageService.getFileStream(image.filename);
        if (!fileStream) {
            return res.status(404).json({ message: 'File not found on storage' });
        }

        res.setHeader('Content-Type', image.mimeType || 'image/jpeg');
        fileStream.stream.pipe(res);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// GET /api/images/:id/thumb – stream thumbnail or redirect to signed URL (Protected, Owner or Admin)
exports.getImageThumbnail = async (req, res) => {
    try {
        const image = await Image.findById(req.params.id);
        if (!image) {
            return res.status(404).json({ message: 'Image not found' });
        }

        const isOwner = image.user && image.user.toString() === req.user._id.toString();
        const isAdmin = req.user.role === 'admin';

        if (!isOwner && !isAdmin) {
            return res.status(403).json({ message: 'Forbidden – You do not own this image' });
        }

        const thumbFilename = image.thumbnailFilename || image.filename;
        const signedUrl = await storageService.getSignedDownloadUrl(thumbFilename);
        if (signedUrl) {
            return res.redirect(signedUrl);
        }

        const fileStream = await storageService.getFileStream(thumbFilename);
        if (!fileStream) {
            return res.status(404).json({ message: 'Thumbnail not found on storage' });
        }

        res.setHeader('Content-Type', 'image/jpeg');
        fileStream.stream.pipe(res);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// DELETE /api/images/:id – delete image & files (Protected, Owner or Admin)
exports.deleteImage = async (req, res) => {
    try {
        const image = await Image.findById(req.params.id);

        if (!image) {
            return res.status(404).json({ message: 'Image not found' });
        }

        const isOwner = image.user && image.user.toString() === req.user._id.toString();
        const isAdmin = req.user.role === 'admin';

        if (!isOwner && !isAdmin) {
            return res.status(403).json({ message: 'Forbidden – You do not own this image' });
        }

        // Delete full and thumbnail files from storage
        await storageService.deleteFile(image.filename);
        if (image.thumbnailFilename) {
            await storageService.deleteFile(image.thumbnailFilename);
        }

        await image.deleteOne();
        res.json({ message: 'Image deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
