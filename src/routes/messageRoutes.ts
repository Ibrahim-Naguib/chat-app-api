import { Router } from 'express';
import { protect } from '../middleware/authMiddleware';
import { validate } from '../middleware/validate';
import { sendMessage, getMessages, markAsRead, editMessage } from '../controllers/messageController';
import { sendMessageSchema, commonValidators, updateMessageSchema } from '../utils/validators/index';
import { messageLimiter } from '../utils/rateLimiter';
import { z } from 'zod';

const router = Router();

router.use(protect);

router.route('/').post(messageLimiter, validate(sendMessageSchema), sendMessage);

router.get('/chat/:chatId', validate(z.object({ chatId: commonValidators.mongoId }), 'params'), getMessages);

router.post('/read/:chatId', validate(z.object({ chatId: commonValidators.mongoId }), 'params'), markAsRead);

router.put(
  '/:messageId',
  validate(z.object({ messageId: commonValidators.mongoId }), 'params'),
  validate(updateMessageSchema),
  editMessage
);

export default router;
