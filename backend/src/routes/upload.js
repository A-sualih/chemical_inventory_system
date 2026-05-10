const express = require('express');
const router = express.Router();
const upload = require('../middleware/uploadMiddleware');
const { authenticate } = require('../middleware/authMiddleware');

router.post('/', authenticate, upload.single('image'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    // Return relative API path so frontend proxy catches it
    const fileUrl = `/api/uploads/${req.file.filename}`;
    res.json({ url: fileUrl });
  } catch (err) {
    console.error('Error uploading file:', err);
    res.status(500).json({ error: 'File upload failed' });
  }
});

module.exports = router;
