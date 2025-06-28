import express from 'express';
import protect from '../middleware/authMiddleware.js';
import { sendMessage, getMessages } from '../controllers/messageController.js';
import { createMessageValidator, getMessagesValidator } from '../utils/validators/messageValidators.js';

const router = express.Router();

router.use(protect);

router.route('/').post(createMessageValidator, sendMessage);

router.get('/chat/:chatId', getMessagesValidator, getMessages);

export default router;
