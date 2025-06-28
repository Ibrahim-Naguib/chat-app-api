import express from 'express';
import protect from '../middleware/authMiddleware.js';
import { createUploader } from '../utils/fileUpload.js';
import { updateProfileValidation } from '../utils/validators/userValidators.js';
import {
  validateFileUpload,
  handleMulterError,
} from '../utils/validators/fileValidators.js';
import {
  getProfilePicture,
  uploadProfilePicture,
  removeProfilePicture,
  getProfile,
  updateProfile,
} from '../controllers/userController.js';

const router = express.Router();

const profileUpload = createUploader('profiles');

router.get('/profiles/:filename', getProfilePicture);

router.use(protect);

router.get('/profile', getProfile);
router.post(
  '/profile-picture',
  profileUpload.single('image'),
  handleMulterError,
  validateFileUpload,
  uploadProfilePicture
);
router.delete('/profile-picture', removeProfilePicture);
router.put('/profile', updateProfileValidation, updateProfile);

export default router;
