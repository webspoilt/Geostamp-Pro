const { body, validationResult } = require('express-validator');

const validate = (validations) => {
    return async (req, res, next) => {
        for (const validation of validations) {
            const result = await validation.run(req);
            if (result.errors.length) break;
        }

        const errors = validationResult(req);
        if (errors.isEmpty()) {
            return next();
        }

        return res.status(422).json({
            message: 'Validation failed',
            errors: errors.array().map(e => ({ field: e.path, message: e.msg })),
        });
    };
};

const registerValidator = validate([
    body('name')
        .trim()
        .notEmpty().withMessage('Name is required')
        .isLength({ max: 50 }).withMessage('Name cannot exceed 50 characters'),
    body('email')
        .trim()
        .isEmail().withMessage('Valid email address is required')
        .normalizeEmail(),
    body('password')
        .isLength({ min: 8 }).withMessage('Password must be at least 8 characters long'),
]);

const loginValidator = validate([
    body('email')
        .trim()
        .isEmail().withMessage('Valid email address is required')
        .normalizeEmail(),
    body('password')
        .notEmpty().withMessage('Password is required'),
]);

const coordinatesValidator = (req, res, next) => {
    const { latitude, longitude } = req.body;
    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);

    if (
        !Number.isFinite(lat) ||
        !Number.isFinite(lng) ||
        Math.abs(lat) > 90 ||
        Math.abs(lng) > 180 ||
        (lat === 0 && lng === 0) // Null Island protection
    ) {
        return res.status(422).json({ message: 'Valid GPS coordinates required' });
    }

    req.parsedCoordinates = { latitude: lat, longitude: lng };
    next();
};

module.exports = {
    registerValidator,
    loginValidator,
    coordinatesValidator,
};
