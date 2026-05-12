const express = require('express');
const router = express.Router();
const labController = require('../controllers/lab/labController');
const { authenticate, authorize } = require('../middleware/authMiddleware'); // assuming these exist

router.use(authenticate);

router.post('/', authorize('MANAGE_LABS'), labController.createLab);
router.get('/', labController.getLabs);
router.put('/assign', authorize('MANAGE_LABS'), labController.assignUser);
router.put('/:id', authorize('MANAGE_LABS'), labController.updateLab);
router.post('/switch', labController.switchActiveLab);

module.exports = router;
