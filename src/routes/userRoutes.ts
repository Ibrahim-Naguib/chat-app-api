import { Router } from 'express';
import { protect } from '../middleware/authMiddleware';
import { validate } from '../middleware/validate';
import { createUploader, handleMulterError, validateFileUpload } from '../utils/fileUpload';
import { updateProfileSchema } from '../utils/validators/index';
import {
  uploadProfilePicture,
  removeProfilePicture,
  getProfile,
  updateProfile,
} from '../controllers/userController';

const router = Router();
const profileUpload = createUploader('profiles');

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
router.put('/profile', validate(updateProfileSchema), updateProfile);

export default router;
