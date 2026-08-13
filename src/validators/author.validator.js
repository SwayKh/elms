const { z } = require('zod');

const createAuthorSchema = z
  .object({
    name: z.string().trim().min(1, 'Name is required').max(200, 'Name is too long'),
    biography: z.string().trim().max(10000).optional().nullable(),
  })
  .strict();

const updateAuthorSchema = createAuthorSchema.partial().refine(
  (data) => Object.keys(data).length > 0,
  { message: 'At least one field must be provided' },
);

module.exports = { createAuthorSchema, updateAuthorSchema };
