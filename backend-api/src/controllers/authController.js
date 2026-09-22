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
            user: { id: user._id, name: user.name, email: user.email, role: user.role },
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
            user: { id: user._id, name: user.name, email: user.email, role: user.role },
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// GET /api/auth/profile
exports.getProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user._id);
        res.json({ user: { id: user._id, name: user.name, email: user.email, role: user.role } });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

