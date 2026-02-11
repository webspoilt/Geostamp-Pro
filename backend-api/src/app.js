const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const connectDB = require('./config/db');

// Startup checks
if (!process.env.MONGO_URI) {
    console.error('❌ MONGO_URI environment variable is not set!');
    console.error('   Set it in Render dashboard → Environment → Add MONGO_URI');
    process.exit(1);
}

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
