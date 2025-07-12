import express from 'express';
import protect from '../middleware/authMiddleware.js';
import {
  accessChat,
  getChats,
  createGroupChat,
  renameGroup,
  addToGroup,
  removeFromGroup,
  getGroupPicture,
  uploadGroupPicture,
  removeGroupPicture,
} from '../controllers/chatController.js';
import {
  accessChatValidator,
  createGroupChatValidator,
  renameGroupValidator,
  addToGroupValidator,
  removeFromGroupValidator,
} from '../utils/validators/chatValidators.js';
import { createUploader } from '../utils/fileUpload.js';
import {
  validateFileUpload,
  handleMulterError,
} from '../utils/validators/fileValidators.js';

const router = express.Router();

const uploadGroup = createUploader('groups');

router.get('/groups/:filename', getGroupPicture);

router.use(protect);

router
  .route('/')
  .get(getChats)
  .post(accessChatValidator, accessChat);

router.post('/group', createGroupChatValidator, createGroupChat);
router.put('/group/rename', renameGroupValidator, renameGroup);
router.put('/group/add', addToGroupValidator, addToGroup);
router.put('/group/remove', removeFromGroupValidator, removeFromGroup);

router.post(
  '/group-picture',
  uploadGroup.single('image'),
  handleMulterError,
  validateFileUpload,
  uploadGroupPicture
);
router.delete('/group-picture', removeGroupPicture);

export default router;
