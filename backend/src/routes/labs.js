const express = require('express');
const router = express.Router();
const labController = require('../controllers/lab/labController');
const { authenticate, authorize, requireAdmin } = require('../middleware/authMiddleware');
const { PERMISSIONS } = require('../config/roles');

router.use(authenticate);

router.post('/', requireAdmin, labController.createLab);
router.get('/', labController.getLabs);
router.put('/assign', requireAdmin, labController.assignUser);
router.put('/:id', authorize(PERMISSIONS.MANAGE_LABS), labController.updateLab);
router.delete('/:id', requireAdmin, labController.deleteLab);
router.post('/switch', labController.switchActiveLab);

module.exports = router;
