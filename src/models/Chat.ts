import mongoose, { type Document } from 'mongoose';
import { ValidationError } from '../utils/errors/customErrors';

export interface IChat extends Document {
  chatName?: string;
  isGroupChat: boolean;
  users: mongoose.Types.ObjectId[];
  latestMessage?: mongoose.Types.ObjectId;
  groupAdmin?: mongoose.Types.ObjectId;
  groupPicture?: string;
  createdBy: mongoose.Types.ObjectId;
}

const chatSchema = new mongoose.Schema<IChat>(
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
      default: function (this: IChat) {
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

chatSchema.pre('save', function (next) {
  if (this.users.length < 2) {
    return next(new ValidationError('Chat must have at least 2 users'));
  }

  if (!this.isGroupChat && this.groupPicture) {
    this.groupPicture = undefined;
  }

  if (this.isGroupChat && !this.groupPicture) {
    this.groupPicture =
      'https://icon-library.com/images/anonymous-avatar-icon/anonymous-avatar-icon-25.jpg';
  }

  next();
});

chatSchema.index({ users: 1, isGroupChat: 1 });

export const Chat = mongoose.model<IChat>('Chat', chatSchema);
