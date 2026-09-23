const sharp = require('sharp');
const crypto = require('crypto');
const path = require('path');
const piexif = require('piexifjs');

let heicConvert;
try {
    heicConvert = require('heic-convert');
} catch (e) {
    // optional fallback if binary not present
}

/**
 * Converts decimal degrees to EXIF rational [degrees, minutes, seconds]
 */
function degToExifRational(deg) {
    const absolute = Math.abs(deg);
    const degrees = Math.floor(absolute);
    const minutesNotTruncated = (absolute - degrees) * 60;
    const minutes = Math.floor(minutesNotTruncated);
    const seconds = Math.round((minutesNotTruncated - minutes) * 60 * 100);

    return [
        [degrees, 1],
        [minutes, 1],
        [seconds, 100],
    ];
}

/**
 * Strips all incoming metadata, then inserts verified custom GPS & timestamp EXIF tags
 */
function injectCustomExif({ jpegBinaryString, latitude, longitude, capturedAt, address }) {
    try {
        const dateObj = capturedAt ? new Date(capturedAt) : new Date();
        const yyyy = dateObj.getFullYear();
        const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
        const dd = String(dateObj.getDate()).padStart(2, '0');
        const hh = String(dateObj.getHours()).padStart(2, '0');
        const min = String(dateObj.getMinutes()).padStart(2, '0');
        const sec = String(dateObj.getSeconds()).padStart(2, '0');
        const exifDateStr = `${yyyy}:${mm}:${dd} ${hh}:${min}:${sec}`;

        const zeroth = {};
        const exif = {};
        const gps = {};

        // Software & description
        zeroth[piexif.ImageIFD.Software] = 'GeoStamp Pro';
        if (address) {
            zeroth[piexif.ImageIFD.ImageDescription] = address.slice(0, 128);
        }

        // Timestamp
        exif[piexif.ExifIFD.DateTimeOriginal] = exifDateStr;
        exif[piexif.ExifIFD.DateTimeDigitized] = exifDateStr;

        // GPS Coordinates
        if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
            gps[piexif.GPSIFD.GPSLatitudeRef] = latitude >= 0 ? 'N' : 'S';
            gps[piexif.GPSIFD.GPSLatitude] = degToExifRational(latitude);
            gps[piexif.GPSIFD.GPSLongitudeRef] = longitude >= 0 ? 'E' : 'W';
            gps[piexif.GPSIFD.GPSLongitude] = degToExifRational(longitude);
            gps[piexif.GPSIFD.GPSDateStamp] = `${yyyy}:${mm}:${dd}`;
            gps[piexif.GPSIFD.GPSTimeStamp] = [
                [dateObj.getUTCHours(), 1],
                [dateObj.getUTCMinutes(), 1],
                [dateObj.getUTCSeconds(), 1],
            ];
        }

        const exifObj = {
            '0th': zeroth,
            Exif: exif,
            GPS: gps,
        };

        const exifBytes = piexif.dump(exifObj);
        return piexif.insert(exifBytes, jpegBinaryString);
    } catch (e) {
        // In case of any EXIF serialization error, return clean binary without crashing
        return jpegBinaryString;
    }
}

/**
 * 1. Strips all pre-existing EXIF/metadata and dangerous payloads.
 * 2. Injects clean, edited GPS and timestamp metadata.
 * 3. Generates 400px thumbnail.
 */
async function processImageBuffer({ buffer, originalname, mimetype, latitude, longitude, capturedAt, address }) {
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

    // Step 1: Strip ALL existing metadata, orient, and re-encode to clean JPEG
    let cleanImageBuffer;
    try {
        cleanImageBuffer = await sharp(workingBuffer)
            .rotate() // orient according to initial EXIF before stripping
            .jpeg({ quality: 88, mozjpeg: true }) // sharp strips all EXIF/IPTC/XMP by default unless withMetadata() is called
            .toBuffer();
    } catch (e) {
        const err = new Error('Unsupported or malformed image data');
        err.statusCode = 422;
        throw err;
    }

    // Step 2: Inject ONLY the newly edited metadata (verified GPS, timestamp, and location tag)
    let finalFullBuffer = cleanImageBuffer;
    if (latitude !== undefined && longitude !== undefined) {
        const binaryString = cleanImageBuffer.toString('binary');
        const modifiedBinary = injectCustomExif({
            jpegBinaryString: binaryString,
            latitude: parseFloat(latitude),
            longitude: parseFloat(longitude),
            capturedAt,
            address,
        });
        finalFullBuffer = Buffer.from(modifiedBinary, 'binary');
    }

    // Step 3: Generate clean 400px thumbnail (metadata stripped)
    const thumbnailBuffer = await sharp(cleanImageBuffer)
        .resize({ width: 400, height: 400, fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 80 })
        .toBuffer();

    return {
        filename,
        thumbnailFilename,
        mimeType: 'image/jpeg',
        fullBuffer: finalFullBuffer,
        thumbnailBuffer,
        size: finalFullBuffer.length,
    };
}

module.exports = {
    processImageBuffer,
};
