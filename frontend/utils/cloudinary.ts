/**
 * Cloudinary utilities for frontend direct uploads
 */

// Cloudinary configuration from environment variables
const CLOUDINARY_CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
const CLOUDINARY_UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_UPLOAD_PRESET) {
  throw new Error('Missing Cloudinary environment variables. Please check NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME and NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET');
}

/**
 * Upload image directly to Cloudinary from frontend
 */
export const uploadToCloudinary = async (file: File): Promise<{
  secure_url: string;
  public_id: string;
  width: number;
  height: number;
}> => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);

  try {
    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
      {
        method: 'POST',
        body: formData,
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || 'Upload failed');
    }

    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Cloudinary upload error:', error);
    throw error;
  }
};

/**
 * Get optimized Cloudinary URL for display
 */
export const getOptimizedUrl = (publicId: string, options?: {
  width?: number;
  height?: number;
  crop?: string;
  quality?: string;
}): string => {
  const { width = 400, height = 400, crop = 'fill', quality = 'auto' } = options || {};
  
  return `https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}/image/upload/w_${width},h_${height},c_${crop},q_${quality}/${publicId}`;
};

/**
 * Extract public_id from Cloudinary URL
 */
export const extractPublicId = (cloudinaryUrl: string): string | null => {
  try {
    const urlParts = cloudinaryUrl.split('/');
    const versionIndex = urlParts.findIndex(part => part.startsWith('v') && /^\d+$/.test(part.substring(1)));
    
    if (versionIndex !== -1 && versionIndex < urlParts.length - 1) {
      const pathAfterVersion = urlParts.slice(versionIndex + 1).join('/');
      return pathAfterVersion.replace(/\.[^/.]+$/, ''); // Remove file extension
    }
    
    return null;
  } catch (error) {
    console.error('Error extracting public_id:', error);
    return null;
  }
};