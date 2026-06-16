import { v2 as cloudinary } from 'cloudinary';
import config from './envConfig';

let initialized = false;

export const initCloudinary = (): void => {
  if (initialized) return;

  if (config.cloudinary.cloudName && config.cloudinary.apiKey && config.cloudinary.apiSecret) {
    cloudinary.config({
      cloud_name: config.cloudinary.cloudName,
      api_key: config.cloudinary.apiKey,
      api_secret: config.cloudinary.apiSecret,
      secure: true,
    });
    initialized = true;
  }
};

export const getCloudinary = () => {
  if (!initialized) {
    initCloudinary();
  }
  return cloudinary;
};

export const isCloudinaryConfigured = (): boolean => {
  return !!(config.cloudinary.cloudName && config.cloudinary.apiKey && config.cloudinary.apiSecret);
};

export { cloudinary };
