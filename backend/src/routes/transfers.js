const express = require('express');
const router = express.Router();
const transferController = require('../controllers/transfer/transferController');
const { authenticate, authorize } = require('../middleware/authMiddleware');
const { requireLabScope } = require('../middleware/labScope');

router.use(authenticate, requireLabScope);

router.post('/', transferController.createTransfer);
router.get('/', transferController.getTransfers);
router.get('/lab-chemicals/:labId', transferController.getLabChemicalsForRequisition);
router.put('/:id/approve', transferController.approveTransfer);
router.put('/:id/reject', transferController.rejectTransfer);

module.exports = router;
