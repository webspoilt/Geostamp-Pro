const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

// Debug: log available env var keys (NOT values, for security)
console.log('🔍 Available env vars:', Object.keys(process.env).filter(k =>
    ['MONGO_URI', 'MONGO_URL', 'MONGODB_URI', 'DATABASE_URL', 'JWT_SECRET', 'NODE_ENV', 'PORT', 'RENDER'].includes(k)
));
console.log('🔍 MONGO_URI is:', process.env.MONGO_URI ? 'SET ✅' : 'MISSING ❌');

const express = require('express');
const cors = require('cors');
const morgan = require('morgan');

// Use MONGO_URI or fallback to MONGODB_URI or DATABASE_URL
const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI || process.env.DATABASE_URL;
const connectDB = require('./config/db');

// Route imports
const authRoutes = require('./routes/authRoutes');
const imageRoutes = require('./routes/imageRoutes');
const locationRoutes = require('./routes/locationRoutes');

const app = express();

// --------------- Middleware ---------------
app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
if (process.env.NODE_ENV !== 'production') {
    app.use(morgan('dev'));
}

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// --------------- Routes ---------------
app.get('/api/health', (req, res) =>
    res.json({ status: 'ok', timestamp: new Date().toISOString() })
);

app.use('/api/auth', authRoutes);
app.use('/api/images', imageRoutes);
app.use('/api/locations', locationRoutes);

// --------------- Error handler ---------------
app.use((err, req, res, _next) => {
    console.error(err.stack);
    res.status(err.status || 500).json({
        message: err.message || 'Internal Server Error',
    });
});

// --------------- Start ---------------
const PORT = process.env.PORT || 5000;

connectDB().then(() => {
    app.listen(PORT, () => {
        console.log(`🚀 GeoStamp API running on port ${PORT}`);
    });
});
