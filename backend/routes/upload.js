const express = require('express');
const { authMiddleware } = require('../middleware/auth');
const { uploadSingle, uploadToCloudinary } = require('../utils/cloudinary');

const router = express.Router();

// Upload image endpoint
router.post('/image', authMiddleware, uploadSingle('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    // Upload to Cloudinary using unsigned upload
    const result = await uploadToCloudinary(req.file.buffer, req.file.originalname);
    
    res.json({
      message: 'Image uploaded successfully',
      imageUrl: result.secure_url,
      publicId: result.public_id
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ message: 'Failed to upload image: ' + error.message });
  }
});

module.exports = router;