const express = require('express');
const { authenticate, authorize } = require('../middleware/authMiddleware');
const { PERMISSIONS } = require('../config/roles');
const containerController = require('../controllers/container/containerController');

const router = express.Router();

router.get('/', authenticate, authorize(PERMISSIONS.VIEW_CHEMICALS), containerController.getContainers);
router.get('/chemical/:chemical_id', authenticate, authorize(PERMISSIONS.VIEW_CHEMICALS), containerController.getContainersByChemical);
router.get('/:id', authenticate, authorize(PERMISSIONS.VIEW_CHEMICALS), containerController.getContainer);
router.post('/', authenticate, authorize(PERMISSIONS.CREATE_CHEMICAL), containerController.createContainer);
router.put('/:id', authenticate, authorize(PERMISSIONS.EDIT_CHEMICAL), containerController.updateContainer);
router.delete('/:id', authenticate, authorize(PERMISSIONS.DELETE_CHEMICAL), containerController.deleteContainer);

module.exports = router;


