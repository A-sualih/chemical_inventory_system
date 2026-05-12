const express = require('express');
const router = express.Router();
const transferController = require('../controllers/transfer/transferController');
const { authenticate } = require('../middleware/authMiddleware');

router.use(authenticate);

router.post('/', transferController.createTransfer);
router.get('/', transferController.getTransfers);
router.put('/:id/approve', transferController.approveTransfer);
router.put('/:id/reject', transferController.rejectTransfer);

module.exports = router;
