const Location = require('../models/Location');

// POST /api/locations
exports.createLocation = async (req, res) => {
    try {
        const { name, latitude, longitude, address, description } = req.body;
        const location = await Location.create({
            user: req.user._id,
            name,
            latitude,
            longitude,
            address,
            description,
        });
        res.status(201).json(location);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// GET /api/locations
exports.getLocations = async (req, res) => {
    try {
        const locations = await Location.find({ user: req.user._id }).sort({
            createdAt: -1,
        });
        res.json(locations);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// PUT /api/locations/:id
exports.updateLocation = async (req, res) => {
    try {
        const location = await Location.findOneAndUpdate(
            { _id: req.params.id, user: req.user._id },
            req.body,
            { new: true, runValidators: true }
        );

        if (!location) {
            return res.status(404).json({ message: 'Location not found' });
        }

        res.json(location);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// DELETE /api/locations/:id
exports.deleteLocation = async (req, res) => {
    try {
        const location = await Location.findOneAndDelete({
            _id: req.params.id,
            user: req.user._id,
        });

        if (!location) {
            return res.status(404).json({ message: 'Location not found' });
        }

        res.json({ message: 'Location deleted' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
