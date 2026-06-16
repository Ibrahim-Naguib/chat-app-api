import { getCloudinary, isCloudinaryConfigured } from '../config/cloudinary';
import config from '../config/envConfig';
import logger from '../config/logger';
import { AppError } from '../utils/errors/AppError';

interface UploadResult {
  url: string;
  publicId: string;
}

const readFileAsBuffer = (file: Express.Multer.File): string => {
  return `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;
};

const buildPublicId = (subfolder: 'profiles' | 'groups', id: string): string => {
  return `${config.cloudinary.folder}/${subfolder}/${id}`;
};

export const uploadToCloudinary = async (
  file: Express.Multer.File,
  subfolder: 'profiles' | 'groups',
  id: string
): Promise<UploadResult> => {
  if (!isCloudinaryConfigured()) {
    throw new AppError('Cloudinary is not configured', 500);
  }

  const cloudinary = getCloudinary();
  const publicId = buildPublicId(subfolder, id);

  try {
    const result = await cloudinary.uploader.upload(readFileAsBuffer(file), {
      public_id: publicId,
      resource_type: 'image',
      invalidate: true,
      overwrite: true,
      transformation: [
        { width: 500, height: 500, crop: 'limit', quality: 'auto' },
      ],
    });

    return {
      url: result.secure_url,
      publicId: result.public_id,
    };
  } catch (error) {
    throw new AppError(
      `Failed to upload image: ${error instanceof Error ? error.message : 'Unknown error'}`,
      500
    );
  }
};

export const deleteFromCloudinary = async (publicId: string): Promise<void> => {
  if (!isCloudinaryConfigured()) return;

  const cloudinary = getCloudinary();

  try {
    await cloudinary.uploader.destroy(publicId);
  } catch {
    logger.warn({ publicId }, 'Failed to delete Cloudinary asset');
  }
};

export const getPublicId = (subfolder: 'profiles' | 'groups', id: string): string => {
  return buildPublicId(subfolder, id);
};
