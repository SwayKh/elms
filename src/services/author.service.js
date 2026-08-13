const { prisma } = require('../config/database');
const { ApiError } = require('../utils/ApiError');

async function listAuthors({ page, limit, search } = {}) {
  const where = search
    ? { name: { contains: search, mode: 'insensitive' } }
    : undefined;

  const [items, total] = await Promise.all([
    prisma.author.findMany({
      where,
      orderBy: { name: 'asc' },
      include: { _count: { select: { books: true } } },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.author.count({ where }),
  ]);

  return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
}

async function getAuthor(authorId) {
  const author = await prisma.author.findUnique({
    where: { id: authorId },
    include: {
      books: { include: { book: { include: { authors: { include: { author: true } }, categories: { include: { category: true } } } } } },
    },
  });
  if (!author) {
    throw ApiError.notFound('Author not found', 'AUTHOR_NOT_FOUND');
  }
  return {
    ...author,
    books: author.books.map(({ book }) => book),
  };
}

async function createAuthor({ name, biography }) {
  try {
    return await prisma.author.create({ data: { name, biography } });
  } catch (err) {
    if (err.code === 'P2002') {
      throw ApiError.conflict('An author with this name already exists', 'DUPLICATE_AUTHOR');
    }
    throw err;
  }
}

async function updateAuthor(authorId, data) {
  const author = await prisma.author.findUnique({ where: { id: authorId } });
  if (!author) {
    throw ApiError.notFound('Author not found', 'AUTHOR_NOT_FOUND');
  }
  try {
    return await prisma.author.update({ where: { id: authorId }, data });
  } catch (err) {
    if (err.code === 'P2002') {
      throw ApiError.conflict('An author with this name already exists', 'DUPLICATE_AUTHOR');
    }
    throw err;
  }
}

async function deleteAuthor(authorId) {
  const author = await prisma.author.findUnique({ where: { id: authorId } });
  if (!author) {
    throw ApiError.notFound('Author not found', 'AUTHOR_NOT_FOUND');
  }
  await prisma.author.delete({ where: { id: authorId } });
  return { success: true };
}

module.exports = { listAuthors, getAuthor, createAuthor, updateAuthor, deleteAuthor };
