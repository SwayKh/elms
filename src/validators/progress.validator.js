const { z } = require('zod');

const updateProgressSchema = z
  .object({
    progress: z.coerce.number().min(0, 'Progress must be between 0 and 100').max(100, 'Progress must be between 0 and 100'),
  })
  .strict();

module.exports = { updateProgressSchema };
