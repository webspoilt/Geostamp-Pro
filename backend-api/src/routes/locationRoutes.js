const express = require('express');
const router = express.Router();
const {
    createLocation,
    getLocations,
    updateLocation,
    deleteLocation,
} = require('../controllers/locationController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.route('/').post(createLocation).get(getLocations);
router.route('/:id').put(updateLocation).delete(deleteLocation);

module.exports = router;
