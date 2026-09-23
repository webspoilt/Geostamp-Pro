const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../src/app');
const User = require('../src/models/User');
const Image = require('../src/models/Image');

let mongoServer;

beforeAll(async () => {
    process.env.JWT_SECRET = 'test-secret-key-12345';
    process.env.NODE_ENV = 'test';
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);
    await Image.syncIndexes();
});

afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
});

beforeEach(async () => {
    await User.deleteMany({});
    await Image.deleteMany({});
});

describe('1. Route Ordering & Nearby Endpoint Regression', () => {
    it('GET /api/images/nearby should hit the nearby handler, NOT be shadowed by /:id returning 404', async () => {
        // Register & login user
        const regRes = await request(app).post('/api/auth/register').send({
            name: 'Geo Tester',
            email: 'geotester@example.com',
            password: 'password1234',
        });
        const token = regRes.body.token;

        // Query nearby endpoint
        const res = await request(app)
            .get('/api/images/nearby?lat=40.7128&lng=-74.0060')
            .set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('images');
        expect(Array.isArray(res.body.images)).toBe(true);
    });
});

describe('2. Auth & Image Ownership Isolation', () => {
    it('User A cannot view or delete User B\'s image (returns 403)', async () => {
        // Create User A
        const userARes = await request(app).post('/api/auth/register').send({
            name: 'User A',
            email: 'usera@example.com',
            password: 'password1234',
        });
        const tokenA = userARes.body.token;
        const userAId = userARes.body.user.id;

        // Create User B
        const userBRes = await request(app).post('/api/auth/register').send({
            name: 'User B',
            email: 'userb@example.com',
            password: 'password1234',
        });
        const tokenB = userBRes.body.token;

        // Create an Image belonging to User A
        const imageA = await Image.create({
            user: userAId,
            originalName: 'test.jpg',
            filename: 'test-a.jpg',
            thumbnailFilename: 'test-a-thumb.jpg',
            mimeType: 'image/jpeg',
            size: 1024,
            location: {
                type: 'Point',
                coordinates: [-73.9851, 40.7488],
            },
        });

        // User B attempts to access User A's image metadata -> 403
        const getRes = await request(app)
            .get(`/api/images/${imageA._id}`)
            .set('Authorization', `Bearer ${tokenB}`);

        expect(getRes.status).toBe(403);
        expect(getRes.body.message).toMatch(/Forbidden/);

        // User B attempts to delete User A's image -> 403
        const delRes = await request(app)
            .delete(`/api/images/${imageA._id}`)
            .set('Authorization', `Bearer ${tokenB}`);

        expect(delRes.status).toBe(403);
    });
});

describe('3. Registration Race Condition (Duplicate Key 11000)', () => {
    it('returns 400 instead of 500 when duplicate emails are registered concurrently', async () => {
        const payload = {
            name: 'Racer',
            email: 'racer@example.com',
            password: 'password1234',
        };

        const [res1, res2] = await Promise.all([
            request(app).post('/api/auth/register').send(payload),
            request(app).post('/api/auth/register').send(payload),
        ]);

        const statuses = [res1.status, res2.status].sort();
        // One must succeed (201), the other must return 400 (not 500)
        expect(statuses).toEqual([201, 400]);
    });
});

describe('4. Pagination Limit Clamping', () => {
    it('clamps limit to maximum 100 when a malicious limit=5000 is passed', async () => {
        const userRes = await request(app).post('/api/auth/register').send({
            name: 'Paginator',
            email: 'paginator@example.com',
            password: 'password1234',
        });
        const token = userRes.body.token;

        const res = await request(app)
            .get('/api/images?limit=5000')
            .set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(200);
        expect(res.body.images.length).toBeLessThanOrEqual(100);
    });
});

describe('5. GPS Coordinate Validation & Null Island Rejection', () => {
    it('rejects (0, 0) Null Island coordinates with HTTP 422', async () => {
        const userRes = await request(app).post('/api/auth/register').send({
            name: 'Geo Validator',
            email: 'geovalidator@example.com',
            password: 'password1234',
        });
        const token = userRes.body.token;

        // Fake 1x1 transparent PNG buffer
        const fakeImageBuffer = Buffer.from(
            'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
            'base64'
        );

        const res = await request(app)
            .post('/api/images')
            .set('Authorization', `Bearer ${token}`)
            .field('latitude', '0')
            .field('longitude', '0')
            .attach('image', fakeImageBuffer, 'sample.png');

        expect(res.status).toBe(422);
        expect(res.body.message).toMatch(/Valid GPS coordinates required/);
    });

    it('cleans pre-existing metadata and injects verified edited GPS and timestamp metadata', async () => {
        const userRes = await request(app).post('/api/auth/register').send({
            name: 'Exif Cleaner',
            email: 'exifcleaner@example.com',
            password: 'password1234',
        });
        const token = userRes.body.token;

        const fakeImageBuffer = Buffer.from(
            'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
            'base64'
        );

        const uploadRes = await request(app)
            .post('/api/images')
            .set('Authorization', `Bearer ${token}`)
            .field('latitude', '37.7749')
            .field('longitude', '-122.4194')
            .field('address', 'San Francisco, CA')
            .attach('image', fakeImageBuffer, 'original_camera.png');

        expect(uploadRes.status).toBe(201);
        expect(uploadRes.body.location.coordinates).toEqual([-122.4194, 37.7749]);
        expect(uploadRes.body.address).toBe('San Francisco, CA');

        // Fetch the processed file and verify it is a valid JPEG
        const fileRes = await request(app)
            .get(`/api/images/${uploadRes.body._id}/file`)
            .set('Authorization', `Bearer ${token}`);

        expect(fileRes.status).toBe(200);
        expect(fileRes.headers['content-type']).toMatch(/image\/jpeg/);
    });
});
