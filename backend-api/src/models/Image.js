const mongoose = require('mongoose');

const imageSchema = new mongoose.Schema({
    originalName: {
        type: String,
        required: true,
    },
    filename: {
        type: String,
        required: true,
    },
    mimeType: {
        type: String,
        required: true,
    },
    size: {
        type: Number,
        required: true,
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    thumbnailFilename: {
        type: String,
    },
    storageProvider: {
        type: String,
        enum: ['local', 's3'],
        default: 'local',
    },
    location: {
        type: {
            type: String,
            enum: ['Point'],
            default: 'Point',
        },
        coordinates: {
            type: [Number], // [longitude, latitude]
            required: true,
        },
    },
    address: {
        type: String,
        default: '',
    },
    tags: [{
        type: String,
        trim: true,
    }],
    notes: {
        type: String,
        default: '',
    },
    capturedAt: {
        type: Date,
        default: Date.now,
    },
}, {
    timestamps: true,
});

imageSchema.index({ location: '2dsphere' });
imageSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model('Image', imageSchema);
