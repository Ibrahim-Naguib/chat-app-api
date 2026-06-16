import { Router } from 'express';
import { protect } from '../middleware/authMiddleware';
import { validate } from '../middleware/validate';
import {
  accessChat,
  getChats,
  createGroupChat,
  renameGroup,
  addToGroup,
  removeFromGroup,
  uploadGroupPicture,
  removeGroupPicture,
} from '../controllers/chatController';
import {
  accessChatSchema,
  createGroupChatSchema,
  renameGroupSchema,
  addToGroupSchema,
  removeFromGroupSchema,
} from '../utils/validators/index';
import { createUploader, handleMulterError, validateFileUpload } from '../utils/fileUpload';

const router = Router();
const uploadGroup = createUploader('groups');

router.use(protect);

router
  .route('/')
  .get(getChats)
  .post(validate(accessChatSchema), accessChat);

router.post('/group', validate(createGroupChatSchema), createGroupChat);
router.put('/group/rename', validate(renameGroupSchema), renameGroup);
router.put('/group/add', validate(addToGroupSchema), addToGroup);
router.put('/group/remove', validate(removeFromGroupSchema), removeFromGroup);

router.post(
  '/group-picture',
  uploadGroup.single('image'),
  handleMulterError,
  validateFileUpload,
  uploadGroupPicture
);
router.delete('/group-picture', removeGroupPicture);

export default router;
