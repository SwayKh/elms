const { z } = require('zod');

const idString = z.string().min(1).max(100);

const bookBase = {
  title: z.string().trim().min(1, 'Title is required').max(300, 'Title is too long'),
  description: z.string().trim().max(10000).optional().nullable(),
  isbn: z.string().trim().min(1).max(30).optional().nullable(),
  publicationDate: z.coerce.date().optional().nullable(),
  language: z.string().trim().min(2).max(20).optional().nullable(),
  publisher: z.string().trim().min(1).max(200).optional().nullable(),
  coverUrl: z.string().trim().url('coverUrl must be a valid URL').max(1000).optional().nullable(),
  authorIds: z.array(idString).max(20).optional().default([]),
  categoryIds: z.array(idString).max(20).optional().default([]),
};

const createBookSchema = z.object(bookBase).strict();

const updateBookSchema = z.object(bookBase).strict().partial().refine(
  (data) => Object.keys(data).length > 0,
  { message: 'At least one field must be provided' },
);

const bookQuerySchema = z
  .object({
    search: z.string().trim().max(200).optional(),
    author: z.string().trim().max(200).optional(),
    category: z.string().trim().max(200).optional(),
    language: z.string().trim().max(20).optional(),
    sort: z
      .enum(['title', 'recent', 'oldest', 'mostBorrowed', 'mostFavorited', 'mostReviewed'])
      .default('recent'),
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20),
  })
  .strict();

module.exports = { createBookSchema, updateBookSchema, bookQuerySchema };
