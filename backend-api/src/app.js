const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

// Fast fail if required environment variables are missing
if (!process.env.JWT_SECRET) {
    console.error('FATAL: JWT_SECRET environment variable is missing.');
    if (process.env.NODE_ENV === 'production') {
        process.exit(1);
    }
}

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const connectDB = require('./config/db');

// Route imports
const authRoutes = require('./routes/authRoutes');
const imageRoutes = require('./routes/imageRoutes');
const locationRoutes = require('./routes/locationRoutes');

const app = express();

// Trust first proxy hop (essential for Render, Vercel, Fly.io, etc. to read correct client IP)
app.set('trust proxy', 1);

// --------------- Security Middleware ---------------
app.use(helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

// CORS Configuration: allow configured origins + common local dev origins; allow non-browser clients (e.g. mobile)
const allowedOrigins = process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(',').map((o) => o.trim())
    : ['http://localhost:5173', 'http://localhost:3000', 'http://127.0.0.1:5173'];

app.use(cors({
    origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps, curl, server-to-server)
        if (!origin) return callback(null, true);
        if (allowedOrigins.indexOf(origin) !== -1 || allowedOrigins.includes('*')) {
            return callback(null, true);
        }
        return callback(null, true); // Permissive in dev, or specify strict origins
    },
    credentials: true,
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

if (process.env.NODE_ENV !== 'production' && process.env.NODE_ENV !== 'test') {
    app.use(morgan('dev'));
}

// Global General Rate Limiter (skip /api/health to preserve monitoring quotas)
const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 300,
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => req.path === '/api/health',
    message: { message: 'Too many requests from this IP, please try again later.' },
});
app.use(generalLimiter);

// Strict Rate Limiter for Authentication routes (anti-brute-force)
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 15, // max 15 login/register attempts per 15 min per IP
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: 'Too many authentication attempts, please try again after 15 minutes.' },
});

// --------------- Health Check ---------------
app.get('/api/health', (req, res) =>
    res.json({
        status: 'ok',
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
    })
);

// --------------- Routes ---------------
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/auth', authRoutes);
app.use('/api/images', imageRoutes);
app.use('/api/locations', locationRoutes);

// 404 handler for unmatched routes
app.use((req, res) => {
    res.status(404).json({ message: `Route ${req.originalUrl} not found` });
});

// --------------- Error handler ---------------
app.use((err, req, res, _next) => {
    const statusCode = err.status || err.statusCode || 500;
    if (process.env.NODE_ENV !== 'test') {
        console.error(err);
    }
    res.status(statusCode).json({
        message: err.message || 'Internal Server Error',
    });
});

// Export app for test suite
module.exports = app;

// --------------- Start Server if not imported by test ---------------
if (require.main === module) {
    const PORT = process.env.PORT || 5000;
    connectDB().then(() => {
        app.listen(PORT, () => {
            console.log(`🚀 GeoStamp API running on port ${PORT}`);
        });
    });
}
