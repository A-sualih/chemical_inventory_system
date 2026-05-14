const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/authMiddleware');
const { requireLabScope } = require('../middleware/labScope');
const { PERMISSIONS } = require('../config/roles');
const locationController = require('../controllers/location/locationController');
const hierarchicalLocationController = require('../controllers/location/hierarchicalLocationController');

router.use(authenticate, requireLabScope);

// --- New Hierarchical Routes ---
router.get('/hierarchy/full', hierarchicalLocationController.getFullHierarchy);

router.post('/blocks', authorize(PERMISSIONS.MANAGE_SETTINGS), hierarchicalLocationController.createBlock);
router.get('/blocks', hierarchicalLocationController.getBlocks);

router.post('/rooms', authorize(PERMISSIONS.MANAGE_SETTINGS), hierarchicalLocationController.createRoom);
router.post('/rooms/bulk', authorize(PERMISSIONS.MANAGE_SETTINGS), hierarchicalLocationController.bulkCreateRooms);
router.get('/rooms', hierarchicalLocationController.getRooms);

router.post('/cabinets', authorize(PERMISSIONS.MANAGE_SETTINGS), hierarchicalLocationController.createCabinet);
router.post('/cabinets/bulk', authorize(PERMISSIONS.MANAGE_SETTINGS), hierarchicalLocationController.bulkCreateCabinets);
router.get('/cabinets', hierarchicalLocationController.getCabinets);

router.post('/shelves', authorize(PERMISSIONS.MANAGE_SETTINGS), hierarchicalLocationController.createShelf);
router.post('/shelves/bulk', authorize(PERMISSIONS.MANAGE_SETTINGS), hierarchicalLocationController.bulkCreateShelves);
router.get('/shelves', hierarchicalLocationController.getShelves);

// --- Original Flat Routes (Legacy Support) ---
router.get('/', locationController.getLocations);
router.get('/hierarchy', locationController.getLocationHierarchy);
router.get('/:id', locationController.getLocation);
router.post('/', authorize(PERMISSIONS.MANAGE_SETTINGS), locationController.createLocation);
router.post('/bulk', authorize(PERMISSIONS.MANAGE_SETTINGS), locationController.bulkCreateLocations);
router.put('/:id', authorize(PERMISSIONS.MANAGE_SETTINGS), locationController.updateLocation);
router.delete('/:id', authorize(PERMISSIONS.MANAGE_SETTINGS), locationController.deleteLocation);

module.exports = router;
