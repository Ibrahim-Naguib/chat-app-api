import { Router } from 'express';
import {
  signup,
  login,
  refresh,
  logout,
  forgotPassword,
  verifyResetCode,
  resetPassword,
  getSocketToken,
} from '../controllers/authController';
import { validate } from '../middleware/validate';
import { protect } from '../middleware/authMiddleware';
import {
  signupSchema,
  loginSchema,
  forgotPasswordSchema,
  verifyResetCodeSchema,
  resetPasswordSchema,
} from '../utils/validators/index';

const router = Router();

router.post('/signup', validate(signupSchema), signup);
router.post('/login', validate(loginSchema), login);
router.post('/refresh', refresh);
router.post('/logout', protect, logout);
router.get('/socket-token', protect, getSocketToken);
router.post('/forgotPassword', validate(forgotPasswordSchema), forgotPassword);
router.post('/verifyResetCode', validate(verifyResetCodeSchema), verifyResetCode);
router.put('/resetPassword', validate(resetPasswordSchema), resetPassword);

export default router;
