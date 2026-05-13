const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/authMiddleware');
const { requireLabScope } = require('../middleware/labScope');
const { PERMISSIONS } = require('../config/roles');
const locationController = require('../controllers/location/locationController');

router.use(authenticate, requireLabScope);

// GET all locations (with optional filters)
router.get('/', locationController.getLocations);

// GET distinct buildings, rooms, cabinets for cascading dropdowns
router.get('/hierarchy', locationController.getLocationHierarchy);

// GET single location with chemical count
router.get('/:id', locationController.getLocation);

// POST create new location
router.post('/', authorize(PERMISSIONS.MANAGE_SETTINGS), locationController.createLocation);

// PUT update location
router.put('/:id', authorize(PERMISSIONS.MANAGE_SETTINGS), locationController.updateLocation);

// DELETE (deactivate) a location
router.delete('/:id', authorize(PERMISSIONS.MANAGE_SETTINGS), locationController.deleteLocation);

module.exports = router;


