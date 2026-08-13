const { z } = require('zod');

const createReviewSchema = z
  .object({
    rating: z.coerce.number().int().min(1, 'Rating must be between 1 and 5').max(5, 'Rating must be between 1 and 5'),
    comment: z.string().trim().max(2000).optional().nullable(),
  })
  .strict();

const updateReviewSchema = z
  .object({
    rating: z.coerce.number().int().min(1).max(5).optional(),
    comment: z.string().trim().max(2000).optional().nullable(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided',
  });

const reviewQuerySchema = z
  .object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20),
  })
  .strict();

module.exports = { createReviewSchema, updateReviewSchema, reviewQuerySchema };
