const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/authMiddleware');
const { requireLabScope } = require('../middleware/labScope');
const { PERMISSIONS } = require('../config/roles');
const locationController = require('../controllers/location/locationController');
const hierarchicalLocationController = require('../controllers/location/hierarchicalLocationController');

router.use(authenticate, requireLabScope);

const canView = authorize(PERMISSIONS.VIEW_CHEMICALS, PERMISSIONS.MANAGE_SETTINGS, PERMISSIONS.MANAGE_LOCATIONS);
const canManage = authorize(PERMISSIONS.MANAGE_LOCATIONS);

router.get('/hierarchy/full', canView, hierarchicalLocationController.getFullHierarchy);
router.post('/blocks', canManage, hierarchicalLocationController.createBlock);
router.get('/blocks', canView, hierarchicalLocationController.getBlocks);
router.post('/rooms', canManage, hierarchicalLocationController.createRoom);
router.post('/rooms/bulk', canManage, hierarchicalLocationController.bulkCreateRooms);
router.get('/rooms', canView, hierarchicalLocationController.getRooms);
router.post('/cabinets', canManage, hierarchicalLocationController.createCabinet);
router.post('/cabinets/bulk', canManage, hierarchicalLocationController.bulkCreateCabinets);
router.get('/cabinets', canView, hierarchicalLocationController.getCabinets);
router.post('/shelves', canManage, hierarchicalLocationController.createShelf);
router.post('/shelves/bulk', canManage, hierarchicalLocationController.bulkCreateShelves);
router.get('/shelves', canView, hierarchicalLocationController.getShelves);

router.get('/', canView, locationController.getLocations);
router.get('/hierarchy', canView, locationController.getLocationHierarchy);
router.get('/:id', canView, locationController.getLocation);
router.post('/', canManage, locationController.createLocation);
router.post('/bulk', canManage, locationController.bulkCreateLocations);
router.put('/:id', canManage, locationController.updateLocation);
router.delete('/:id', canManage, locationController.deleteLocation);

module.exports = router;
