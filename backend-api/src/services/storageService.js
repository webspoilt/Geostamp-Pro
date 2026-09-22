const fs = require('fs');
const path = require('path');
const {
    S3Client,
    PutObjectCommand,
    GetObjectCommand,
    DeleteObjectCommand,
} = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

const isS3Configured = Boolean(process.env.S3_BUCKET);

let s3Client = null;
if (isS3Configured) {
    const s3Config = {
        region: process.env.AWS_REGION || 'auto',
        credentials: {
            accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
        },
    };

    if (process.env.S3_ENDPOINT) {
        s3Config.endpoint = process.env.S3_ENDPOINT;
        s3Config.forcePathStyle = true;
    }

    s3Client = new S3Client(s3Config);
}

const localUploadsDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(localUploadsDir)) {
    fs.mkdirSync(localUploadsDir, { recursive: true });
}

/**
 * Uploads a buffer to storage (S3 or local disk)
 */
async function uploadFile({ buffer, filename, mimeType }) {
    if (isS3Configured && s3Client) {
        const key = `images/${filename}`;
        await s3Client.send(
            new PutObjectCommand({
                Bucket: process.env.S3_BUCKET,
                Key: key,
                Body: buffer,
                ContentType: mimeType,
            })
        );
        return {
            provider: 's3',
            key,
            filename,
        };
    }

    const filePath = path.join(localUploadsDir, filename);
    await fs.promises.writeFile(filePath, buffer);
    return {
        provider: 'local',
        path: filePath,
        filename,
    };
}

/**
 * Retrieves file stream or read buffer for sending to client
 */
async function getFileStream(filename) {
    if (isS3Configured && s3Client) {
        const key = `images/${filename}`;
        const command = new GetObjectCommand({
            Bucket: process.env.S3_BUCKET,
            Key: key,
        });
        const response = await s3Client.send(command);
        return {
            stream: response.Body,
            contentType: response.ContentType,
            contentLength: response.ContentLength,
        };
    }

    const filePath = path.join(localUploadsDir, filename);
    if (!fs.existsSync(filePath)) {
        return null;
    }
    return {
        stream: fs.createReadStream(filePath),
        contentType: null,
        filePath,
    };
}

/**
 * Generates short-lived signed URL if using S3
 */
async function getSignedDownloadUrl(filename, expiresInSeconds = 900) {
    if (isS3Configured && s3Client) {
        const key = `images/${filename}`;
        const command = new GetObjectCommand({
            Bucket: process.env.S3_BUCKET,
            Key: key,
        });
        return await getSignedUrl(s3Client, command, { expiresIn: expiresInSeconds });
    }
    return null;
}

/**
 * Deletes file from storage
 */
async function deleteFile(filename) {
    if (isS3Configured && s3Client) {
        const key = `images/${filename}`;
        await s3Client.send(
            new DeleteObjectCommand({
                Bucket: process.env.S3_BUCKET,
                Key: key,
            })
        );
        return;
    }

    const filePath = path.join(localUploadsDir, filename);
    if (fs.existsSync(filePath)) {
        await fs.promises.unlink(filePath);
    }
}

module.exports = {
    isS3Configured,
    uploadFile,
    getFileStream,
    getSignedDownloadUrl,
    deleteFile,
};
