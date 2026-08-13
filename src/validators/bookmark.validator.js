const { z } = require('zod');

const createBookmarkSchema = z
  .object({
    location: z.string().trim().min(1, 'location is required').max(500, 'location is too long'),
    note: z.string().trim().max(2000).optional().nullable(),
  })
  .strict();

const updateBookmarkSchema = z
  .object({
    location: z.string().trim().min(1).max(500).optional(),
    note: z.string().trim().max(2000).optional().nullable(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided',
  });

module.exports = { createBookmarkSchema, updateBookmarkSchema };
