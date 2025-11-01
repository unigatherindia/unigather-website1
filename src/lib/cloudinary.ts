import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || 'dtzu5krsj',
  api_key: process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY || '694422649724473',
  api_secret: process.env.NEXT_PUBLIC_CLOUDINARY_API_SECRET || 'TB4DkOuTCflVvrLW6Zl_O680xfY',
});

export interface CloudinaryUploadResult {
  public_id: string;
  secure_url: string;
  url: string;
  width: number;
  height: number;
  format: string;
  resource_type: string;
}

/**
 * Upload an image file to Cloudinary
 * @param file - The file to upload
 * @param folder - Optional folder path in Cloudinary
 * @returns Promise with upload result
 */
export async function uploadImageToCloudinary(
  file: File,
  folder: string = 'unigather-gallery'
): Promise<CloudinaryUploadResult> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onloadend = () => {
      const base64String = reader.result as string;
      const base64Data = base64String.split(',')[1]; // Remove data:image/...;base64, prefix

      // Use unsigned upload since we don't have upload preset configured
      // Alternatively, you can use signed upload if you set up an upload preset
      const uploadOptions = {
        resource_type: 'image' as const,
        folder: folder,
        transformation: [
          { width: 1200, height: 800, crop: 'limit' }, // Limit max dimensions
          { quality: 'auto:good' }, // Auto optimize quality
          { fetch_format: 'auto' }, // Auto format (webp when supported)
        ],
      };

      // For client-side uploads, we need to use the upload endpoint
      // Since we're in a Next.js environment, we'll create an API route for secure uploads
      reject(new Error('Please use the API route for image uploads'));
    };

    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };

    reader.readAsDataURL(file);
  });
}

/**
 * Upload image via FormData (for API route use)
 */
export async function uploadImageViaFormData(
  fileBuffer: Buffer,
  originalName: string,
  folder: string = 'unigather-gallery'
): Promise<CloudinaryUploadResult> {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: folder,
        resource_type: 'image',
        transformation: [
          { width: 1200, height: 800, crop: 'limit' },
          { quality: 'auto:good' },
          { fetch_format: 'auto' },
        ],
      },
      (error, result) => {
        if (error) {
          reject(error);
        } else if (result) {
          resolve({
            public_id: result.public_id,
            secure_url: result.secure_url,
            url: result.url,
            width: result.width || 0,
            height: result.height || 0,
            format: result.format || '',
            resource_type: result.resource_type || 'image',
          });
        } else {
          reject(new Error('Upload failed: No result returned'));
        }
      }
    );

    uploadStream.end(fileBuffer);
  });
}

export default cloudinary;
