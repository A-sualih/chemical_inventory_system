const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/authMiddleware');
const { PERMISSIONS } = require('../config/roles');
const locationController = require('../controllers/location/locationController');

// GET all locations (with optional filters)
router.get('/', authenticate, locationController.getLocations);

// GET distinct buildings, rooms, cabinets for cascading dropdowns
router.get('/hierarchy', authenticate, locationController.getLocationHierarchy);

// GET single location with chemical count
router.get('/:id', authenticate, locationController.getLocation);

// POST create new location
router.post('/', authenticate, authorize(PERMISSIONS.MANAGE_SETTINGS), locationController.createLocation);

// PUT update location
router.put('/:id', authenticate, authorize(PERMISSIONS.MANAGE_SETTINGS), locationController.updateLocation);

// DELETE (deactivate) a location
router.delete('/:id', authenticate, authorize(PERMISSIONS.MANAGE_SETTINGS), locationController.deleteLocation);

module.exports = router;


