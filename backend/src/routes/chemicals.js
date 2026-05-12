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

// authenticate MUST come before requireLabScope (labScope needs req.user.id)
router.use(authenticate, requireLabScope);

router.get('/stats', chemicalController.getStats);
router.get('/', authenticate, authorize(PERMISSIONS.VIEW_CHEMICALS), chemicalController.getChemicals);
router.get('/:id', authenticate, chemicalController.getChemical);
router.post('/', authenticate, authorize(PERMISSIONS.CREATE_CHEMICAL), upload.single('sds_file'), chemicalController.createChemical);
router.put('/:id', authenticate, authorize(PERMISSIONS.EDIT_CHEMICAL), upload.single('sds_file'), chemicalController.updateChemical);
router.delete('/:id', authenticate, authorize(PERMISSIONS.DELETE_CHEMICAL), chemicalController.archiveChemical);
router.put('/:id/restore', authenticate, authorize(PERMISSIONS.DELETE_CHEMICAL), chemicalController.restoreChemical);
router.get('/:id/qrcode', authenticate, chemicalController.getQRCode);
router.get('/:id/label', authenticate, chemicalController.getLabelData);

module.exports = router;



