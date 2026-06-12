const express = require('express');
const { authenticate, authorize } = require('../middleware/authMiddleware');
const { PERMISSIONS } = require('../config/roles');
const multer = require('multer');
const path = require('path');
const chemicalController = require('../controllers/chemical/chemicalController');
const { requireLabScope } = require('../middleware/labScope');

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '../uploads')),
  filename: (req, file, cb) => cb(null, `sds-${Date.now()}${path.extname(file.originalname)}`)
});
const upload = multer({ storage });

const router = express.Router();

router.use(authenticate, requireLabScope);

router.get('/stats', authorize(PERMISSIONS.VIEW_CHEMICALS), chemicalController.getStats);
router.get('/', authorize(PERMISSIONS.VIEW_CHEMICALS), chemicalController.getChemicals);
router.get('/:id', authorize(PERMISSIONS.VIEW_CHEMICALS), chemicalController.getChemical);
router.post(
  '/',
  authorize(PERMISSIONS.CREATE_CHEMICAL),
  upload.fields([{ name: 'sds_file', maxCount: 1 }, { name: 'disposal_file', maxCount: 1 }]),
  chemicalController.createChemical
);
router.put(
  '/:id',
  authorize(PERMISSIONS.EDIT_CHEMICAL),
  upload.fields([{ name: 'sds_file', maxCount: 1 }, { name: 'disposal_file', maxCount: 1 }]),
  chemicalController.updateChemical
);
router.delete('/:id', authorize(PERMISSIONS.DELETE_CHEMICAL), chemicalController.archiveChemical);
router.put('/:id/restore', authorize(PERMISSIONS.DELETE_CHEMICAL), chemicalController.restoreChemical);
router.get('/:id/qrcode', authorize(PERMISSIONS.VIEW_CHEMICALS), chemicalController.getQRCode);
router.get('/:id/label', authorize(PERMISSIONS.VIEW_CHEMICALS), chemicalController.getLabelData);

module.exports = router;
