const { z } = require('zod');

const createCategorySchema = z
  .object({
    name: z.string().trim().min(1, 'Name is required').max(100, 'Name is too long'),
    description: z.string().trim().max(2000).optional().nullable(),
  })
  .strict();

const updateCategorySchema = createCategorySchema.partial().refine(
  (data) => Object.keys(data).length > 0,
  { message: 'At least one field must be provided' },
);

module.exports = { createCategorySchema, updateCategorySchema };
