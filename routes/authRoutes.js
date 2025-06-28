import { Router } from 'express';
const router = Router();
import {
  signup,
  login,
  refresh,
  logout,
  forgotPassword,
  verifyResetCode,
  resetPassword,
} from '../controllers/authController.js';
import {
  signupValidation,
  loginValidation,
  forgotPasswordValidation,
  verifyResetCodeValidation,
  resetPasswordValidation,
} from '../utils/validators/authValidators.js';
import protect from '../middleware/authMiddleware.js';

router.post('/signup', signupValidation, signup);
router.post('/login', loginValidation, login);
router.post('/refresh', refresh);
router.post('/logout', protect, logout);
router.post('/forgotPassword', forgotPasswordValidation, forgotPassword);
router.post('/verifyResetCode', verifyResetCodeValidation, verifyResetCode);
router.put('/resetPassword', resetPasswordValidation, resetPassword);

export default router;
