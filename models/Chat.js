import mongoose from 'mongoose';
import { ValidationError } from '../utils/errors/customErrors.js';

const chatSchema = new mongoose.Schema(
  {
    chatName: {
      type: String,
      trim: true,
      minlength: 3,
    },
    isGroupChat: {
      type: Boolean,
      default: false,
    },
    users: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    latestMessage: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Message',
    },
    groupAdmin: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    groupPicture: {
      type: String,
      default: function () {
        return this.isGroupChat
          ? 'https://icon-library.com/images/anonymous-avatar-icon/anonymous-avatar-icon-25.jpg'
          : undefined;
      },
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

// Ensure at least 2 users in a chat
chatSchema.pre('save', function (next) {
  if (this.users.length < 2) {
    return next(new ValidationError('Chat must have at least 2 users'));
  }

  // Only allow groupPicture for group chats
  if (!this.isGroupChat && this.groupPicture) {
    this.groupPicture = undefined;
  }

  // Set default group picture for new group chats if not already set
  if (this.isGroupChat && !this.groupPicture) {
    this.groupPicture =
      'https://icon-library.com/images/anonymous-avatar-icon/anonymous-avatar-icon-25.jpg';
  }

  next();
});

// Index for querying chats by users
chatSchema.index({ users: 1, isGroupChat: 1 });

export const Chat = mongoose.model('Chat', chatSchema);
