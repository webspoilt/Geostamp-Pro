const sharp = require('sharp');
const crypto = require('crypto');
const path = require('path');

let heicConvert;
try {
    heicConvert = require('heic-convert');
} catch (e) {
    // optional fallback if binary not present
}

/**
 * Validates, re-encodes, strips malicious payloads, and generates thumbnails
 */
async function processImageBuffer({ buffer, originalname, mimetype }) {
    let workingBuffer = buffer;
    let ext = path.extname(originalname).toLowerCase();
    const isHeic = mimetype === 'image/heic' || ext === '.heic';

    if (isHeic) {
        if (!heicConvert) {
            const err = new Error('HEIC image decoding is currently unavailable on this server');
            err.statusCode = 415;
            throw err;
        }
        try {
            workingBuffer = await heicConvert({
                buffer: workingBuffer,
                format: 'JPEG',
                quality: 0.9,
            });
            ext = '.jpg';
        } catch (e) {
            const err = new Error('Invalid or corrupted HEIC image file');
            err.statusCode = 415;
            throw err;
        }
    }

    const uuid = crypto.randomUUID();
    const filename = `${uuid}.jpg`;
    const thumbnailFilename = `${uuid}-thumb.jpg`;

    // Process & sanitize full image: re-encode to clean JPEG
    let processedImageBuffer;
    try {
        processedImageBuffer = await sharp(workingBuffer)
            .rotate() // auto-orient based on EXIF before stripping
            .jpeg({ quality: 85, mozjpeg: true })
            .toBuffer();
    } catch (e) {
        const err = new Error('Unsupported or malformed image data');
        err.statusCode = 422;
        throw err;
    }

    // Generate 400px thumbnail
    const thumbnailBuffer = await sharp(processedImageBuffer)
        .resize({ width: 400, height: 400, fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 80 })
        .toBuffer();

    return {
        filename,
        thumbnailFilename,
        mimeType: 'image/jpeg',
        fullBuffer: processedImageBuffer,
        thumbnailBuffer,
        size: processedImageBuffer.length,
    };
}

module.exports = {
    processImageBuffer,
};
