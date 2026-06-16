import { z } from 'zod';

export const commonValidators = {
  email: z.string().email('Please enter a valid email').toLowerCase().trim(),
  password: z.string().min(6, 'Password must be at least 6 characters').trim(),
  mongoId: z.string().regex(/^[a-f\d]{24}$/i, 'Invalid ID format'),
  chatName: z.string().trim().min(3, 'Chat name must be at least 3 characters'),
  name: z
    .string()
    .trim()
    .min(2, 'Name must be at least 2 characters')
    .max(50, 'Name must not exceed 50 characters'),
  content: z
    .string()
    .trim()
    .min(1, 'Content cannot be empty')
    .max(5000, 'Content cannot exceed 5000 characters'),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
};

export const signupSchema = z.object({
  name: commonValidators.name,
  email: commonValidators.email,
  password: commonValidators.password,
});

export const loginSchema = z.object({
  email: commonValidators.email,
  password: commonValidators.password,
});

export const forgotPasswordSchema = z.object({
  email: commonValidators.email,
});

export const verifyResetCodeSchema = z.object({
  email: commonValidators.email,
  resetCode: z
    .string()
    .length(6, 'Reset code must be exactly 6 digits')
    .regex(/^\d+$/, 'Reset code must contain only numbers'),
});

export const resetPasswordSchema = z.object({
  email: commonValidators.email,
  newPassword: commonValidators.password,
});

export const updateProfileSchema = z
  .object({
    name: commonValidators.name.optional(),
    currentPassword: commonValidators.password.optional(),
    newPassword: commonValidators.password.optional(),
  })
  .refine(
    (data) => {
      if (
        (data.currentPassword && !data.newPassword) ||
        (!data.currentPassword && data.newPassword)
      ) {
        return false;
      }
      return true;
    },
    { message: 'Both current password and new password are required to update password' },
  )
  .refine(
    (data) => {
      if (!data.name && !data.currentPassword && !data.newPassword) {
        return false;
      }
      return true;
    },
    { message: 'Please provide a name or password to update' },
  );

export const accessChatSchema = z.object({
  email: commonValidators.email,
});

export const createGroupChatSchema = z.object({
  name: commonValidators.chatName,
  users: z
    .array(commonValidators.email)
    .min(2, 'Group chat must have at least 3 members including you')
    .refine((emails) => new Set(emails.map((e) => e.toLowerCase())).size === emails.length, {
      message: 'Duplicate email addresses are not allowed',
    }),
});

export const renameGroupSchema = z.object({
  chatId: commonValidators.mongoId,
  chatName: commonValidators.chatName,
});

export const addToGroupSchema = z.object({
  chatId: commonValidators.mongoId,
  email: commonValidators.email,
});

export const removeFromGroupSchema = z.object({
  chatId: commonValidators.mongoId,
  userId: commonValidators.mongoId,
});

export const sendMessageSchema = z.object({
  content: commonValidators.content,
  chatId: commonValidators.mongoId,
});

export const getMessagesSchema = z.object({
  chatId: commonValidators.mongoId,
  page: commonValidators.page.optional(),
  limit: commonValidators.limit.optional(),
});

export const updateMessageSchema = z.object({
  content: commonValidators.content,
});

export const uploadPictureSchema = z.object({
  chatId: commonValidators.mongoId.optional(),
});

export const readMessagesSchema = z.object({
  chatId: commonValidators.mongoId,
});

// Inferred types
export type SignupInput = z.infer<typeof signupSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type VerifyResetCodeInput = z.infer<typeof verifyResetCodeSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type AccessChatInput = z.infer<typeof accessChatSchema>;
export type CreateGroupChatInput = z.infer<typeof createGroupChatSchema>;
export type RenameGroupInput = z.infer<typeof renameGroupSchema>;
export type AddToGroupInput = z.infer<typeof addToGroupSchema>;
export type RemoveFromGroupInput = z.infer<typeof removeFromGroupSchema>;
export type SendMessageInput = z.infer<typeof sendMessageSchema>;
export type GetMessagesInput = z.infer<typeof getMessagesSchema>;
