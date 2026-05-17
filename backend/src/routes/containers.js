const express = require('express');
const { authenticate, authorize } = require('../middleware/authMiddleware');
const { requireLabScope } = require('../middleware/labScope');
const { PERMISSIONS } = require('../config/roles');
const containerController = require('../controllers/container/containerController');

const router = express.Router();

router.use(authenticate, requireLabScope);

router.get('/', authorize(PERMISSIONS.VIEW_CHEMICALS), containerController.getContainers);
router.get('/chemical/:chemical_id', authorize(PERMISSIONS.VIEW_CHEMICALS), containerController.getContainersByChemical);
router.get('/:id', authorize(PERMISSIONS.VIEW_CHEMICALS), containerController.getContainer);
router.post('/', authorize(PERMISSIONS.CREATE_CHEMICAL), containerController.createContainer);
router.put('/:id', authorize(PERMISSIONS.EDIT_CHEMICAL), containerController.updateContainer);
router.delete('/:id', authorize(PERMISSIONS.DELETE_CHEMICAL), containerController.deleteContainer);

module.exports = router;



