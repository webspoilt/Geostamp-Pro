const jwt = require('jsonwebtoken');
const User = require('../models/User');

const signToken = (id, role = 'user') =>
    jwt.sign({ id, role }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    });

// POST /api/auth/register
exports.register = async (req, res) => {
    try {
        const { name, email, password } = req.body;

        const existing = await User.findOne({ email });
        if (existing) {
            return res.status(400).json({ message: 'Email already registered' });
        }

        const user = await User.create({ name, email, password });
        const token = signToken(user._id, user.role);

        res.status(201).json({
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                isPremium: user.isPremium || false,
            },
        });
    } catch (error) {
        // Catch MongoDB duplicate key error (race condition)
        if (error.code === 11000) {
            return res.status(400).json({ message: 'Email already registered' });
        }
        res.status(500).json({ message: error.message });
    }
};

// POST /api/auth/login
exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await User.findOne({ email }).select('+password');
        if (!user || !(await user.comparePassword(password))) {
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        const token = signToken(user._id, user.role);

        res.json({
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                isPremium: user.isPremium || false,
            },
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// GET /api/auth/profile
exports.getProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user._id);
        res.json({
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                isPremium: user.isPremium || false,
            },
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// GET /api/auth/subscription-status
exports.getSubscriptionStatus = async (req, res) => {
    try {
        const user = await User.findById(req.user._id);
        if (!user) return res.status(404).json({ message: 'User not found' });

        const today = new Date().toISOString().slice(0, 10);
        if (user.lastEditDate !== today) {
            user.dailyEditCount = 0;
            user.lastEditDate = today;
            await user.save();
        }

        res.json({
            isPremium: user.isPremium || false,
            freeDailyLimit: 1,
            todayEditsCount: user.dailyEditCount || 0,
            remainingEdits: user.isPremium ? 999 : Math.max(0, 1 - (user.dailyEditCount || 0)),
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// POST /api/auth/subscribe (₹99 / month Pro upgrade)
exports.upgradeSubscription = async (req, res) => {
    try {
        const user = await User.findById(req.user._id);
        if (!user) return res.status(404).json({ message: 'User not found' });

        user.isPremium = true;
        const expires = new Date();
        expires.setDate(expires.getDate() + 30);
        user.premiumExpiresAt = expires;
        await user.save();

        res.json({
            success: true,
            message: 'Upgraded to GeoStamp Pro Unlimited for ₹99/month',
            isPremium: true,
            expiresAt: user.premiumExpiresAt,
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};


