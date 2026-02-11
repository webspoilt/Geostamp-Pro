const mongoose = require('mongoose');

const imageSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        filename: {
            type: String,
            required: true,
        },
        originalName: {
            type: String,
            required: true,
        },
        path: {
            type: String,
            required: true,
        },
        mimetype: {
            type: String,
        },
        size: {
            type: Number,
        },
        location: {
            type: {
                type: String,
                enum: ['Point'],
                default: 'Point',
            },
            coordinates: {
                type: [Number], // [longitude, latitude]
                default: [0, 0],
            },
        },
        address: {
            type: String,
            default: '',
        },
        exif: {
            camera: String,
            lens: String,
            iso: Number,
            aperture: String,
            shutterSpeed: String,
            focalLength: String,
            timestamp: Date,
        },
        tags: [String],
        notes: {
            type: String,
            default: '',
        },
    },
    { timestamps: true }
);

imageSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('Image', imageSchema);
