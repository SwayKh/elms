const { z } = require('zod');

const updateMeSchema = z
  .object({
    name: z.string().trim().min(1, 'Name is required').max(100, 'Name is too long').optional(),
    email: z.string().trim().toLowerCase().email('A valid email is required').optional(),
  })
  .strict();

const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'currentPassword is required'),
    newPassword: z.string().min(8, 'Password must be at least 8 characters').max(100, 'Password is too long'),
  })
  .strict();

module.exports = { updateMeSchema, changePasswordSchema };
