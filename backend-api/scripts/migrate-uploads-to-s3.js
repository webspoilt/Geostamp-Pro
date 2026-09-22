const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const storageService = require('../src/services/storageService');
const Image = require('../src/models/Image');
const mongoose = require('mongoose');

async function migrate() {
    if (!storageService.isS3Configured) {
        console.error('Error: S3_BUCKET is not configured. Please set S3 credentials in .env first.');
        process.exit(1);
    }

    const uploadsDir = path.join(__dirname, '../uploads');
    if (!fs.existsSync(uploadsDir)) {
        console.log('No uploads directory found to migrate.');
        process.exit(0);
    }

    const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/geostamp';
    await mongoose.connect(mongoUri);

    const files = await fs.promises.readdir(uploadsDir);
    console.log(`Found ${files.length} local files in ${uploadsDir}. Migrating to S3...`);

    let count = 0;
    for (const file of files) {
        const filePath = path.join(uploadsDir, file);
        const stat = await fs.promises.stat(filePath);
        if (stat.isDirectory()) continue;

        const buffer = await fs.promises.readFile(filePath);
        await storageService.uploadFile({
            buffer,
            filename: file,
            mimeType: 'image/jpeg',
        });

        // Update database records
        await Image.updateMany(
            { filename: file },
            { $set: { storageProvider: 's3' } }
        );
        await Image.updateMany(
            { thumbnailFilename: file },
            { $set: { storageProvider: 's3' } }
        );

        count++;
        console.log(`[${count}/${files.length}] Uploaded ${file} to S3`);
    }

    console.log(`✅ Migration complete: ${count} files uploaded to S3.`);
    process.exit(0);
}

migrate().catch(err => {
    console.error('Migration failed:', err);
    process.exit(1);
});
