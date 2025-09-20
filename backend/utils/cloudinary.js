const cloudinary = require('cloudinary').v2;
const multer = require('multer');

// Configure Cloudinary (only cloud_name needed for unsigned uploads)
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
});

// Configure multer to use memory storage (for Cloudinary upload)
const storage = multer.memoryStorage();

// File filter to only allow images
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|webp/;
  const extname = allowedTypes.test(file.originalname.toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('Only image files are allowed (jpg, jpeg, png, gif, webp)'));
  }
};

// Configure multer
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: fileFilter
});

// Middleware for single file upload
const uploadSingle = (fieldName) => {
  return (req, res, next) => {
    const uploadMiddleware = upload.single(fieldName);
    
    uploadMiddleware(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({ message: 'File too large. Maximum size is 5MB.' });
        }
        return res.status(400).json({ message: 'File upload error: ' + err.message });
      } else if (err) {
        return res.status(400).json({ message: err.message });
      }
      next();
    });
  };
};

// Upload image to Cloudinary using unsigned upload
const uploadToCloudinary = (fileBuffer, originalName) => {
  return new Promise((resolve, reject) => {
    // For unsigned uploads, we need to use unsigned_upload with a stream
    const uploadStream = cloudinary.uploader.unsigned_upload_stream(
      process.env.CLOUDINARY_UPLOAD_PRESET,
      {
        transformation: [
          { width: 400, height: 400, crop: 'fill', gravity: 'face' }, // Auto-crop to square, focus on face
          { quality: 'auto' }, // Automatic quality optimization
          { fetch_format: 'auto' } // Automatic format optimization
        ]
      },
      (error, result) => {
        if (error) {
          console.error('Cloudinary unsigned upload error:', error);
          reject(error);
        } else {
          console.log('Cloudinary upload successful:', result.secure_url);
          resolve(result);
        }
      }
    );
    
    uploadStream.end(fileBuffer);
  });
};

// Delete image from Cloudinary
const deleteFromCloudinary = async (publicId) => {
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    return result;
  } catch (error) {
    console.error('Error deleting from Cloudinary:', error);
    throw error;
  }
};

// Extract public_id from Cloudinary URL
const extractPublicId = (cloudinaryUrl) => {
  try {
    // Extract public_id from URL like: https://res.cloudinary.com/cloud/image/upload/v1234567890/social-app/avatars/avatar_123_abc.jpg
    const urlParts = cloudinaryUrl.split('/');
    const versionIndex = urlParts.findIndex(part => part.startsWith('v') && /^\d+$/.test(part.substring(1)));
    
    if (versionIndex !== -1 && versionIndex < urlParts.length - 1) {
      // Get everything after version number, remove file extension
      const pathAfterVersion = urlParts.slice(versionIndex + 1).join('/');
      return pathAfterVersion.replace(/\.[^/.]+$/, ''); // Remove file extension
    }
    
    return null;
  } catch (error) {
    console.error('Error extracting public_id:', error);
    return null;
  }
};

module.exports = {
  uploadSingle,
  uploadToCloudinary,
  cloudinary
};