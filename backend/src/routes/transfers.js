const express = require('express');
const router = express.Router();
const transferController = require('../controllers/transfer/transferController');
const { authenticate, authorize } = require('../middleware/authMiddleware');
const { requireLabScope } = require('../middleware/labScope');
const { PERMISSIONS } = require('../config/roles');

router.use(authenticate, requireLabScope);

router.post('/', authorize(PERMISSIONS.SUBMIT_REQUEST), transferController.createTransfer);
router.get('/', authorize(PERMISSIONS.VIEW_CHEMICALS), transferController.getTransfers);
router.get(
  '/lab-chemicals/:labId',
  authorize(PERMISSIONS.SUBMIT_REQUEST, PERMISSIONS.APPROVE_CROSS_LAB_TRANSFER),
  transferController.getLabChemicalsForRequisition
);
router.put(
  '/:id/approve',
  authorize(PERMISSIONS.APPROVE_CROSS_LAB_TRANSFER),
  transferController.approveTransfer
);
router.put(
  '/:id/reject',
  authorize(PERMISSIONS.APPROVE_CROSS_LAB_TRANSFER),
  transferController.rejectTransfer
);

module.exports = router;
