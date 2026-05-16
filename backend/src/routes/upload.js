const express = require('express');
const router = express.Router();
const upload = require('../middleware/uploadMiddleware');
const { authenticate } = require('../middleware/authMiddleware');

router.post('/', authenticate, (req, res, next) => {
  upload.single('image')(req, res, function(err) {
    if (err) {
      console.error('MULTER ERROR CAUGHT:', err);
      return res.status(500).json({ error: 'Multer Error', details: err.message, stack: err.stack });
    }
    next();
  });
}, (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    res.json({ url: req.file.path });
  } catch (err) {
    console.error('Error uploading file:', err);
    res.status(500).json({ error: 'File upload failed' });
  }
});

module.exports = router;
