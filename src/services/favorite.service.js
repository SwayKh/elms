const { prisma } = require('../config/database');
const { ApiError } = require('../utils/ApiError');

async function assertBookExists(bookId) {
  const book = await prisma.book.findUnique({ where: { id: bookId } });
  if (!book) {
    throw ApiError.notFound('Book not found', 'BOOK_NOT_FOUND');
  }
}

async function listFavorites(userId, { page, limit }) {
  const where = { userId };
  const [items, total] = await Promise.all([
    prisma.favorite.findMany({
      where,
      include: {
        book: {
          include: {
            authors: { include: { author: true } },
            categories: { include: { category: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.favorite.count({ where }),
  ]);

  return {
    items: items.map((fav) => {
      const { authors, categories, ...book } = fav.book;
      return {
        ...fav,
        book: {
          ...book,
          authors: authors.map(({ author }) => author),
          categories: categories.map(({ category }) => category),
        },
      };
    }),
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

async function addFavorite(userId, bookId) {
  await assertBookExists(bookId);

  const existing = await prisma.favorite.findUnique({
    where: { userId_bookId: { userId, bookId } },
  });
  if (existing) {
    return existing;
  }

  return prisma.favorite.create({
    data: { userId, bookId },
  });
}

async function removeFavorite(userId, bookId) {
  await prisma.favorite.deleteMany({
    where: { userId, bookId },
  });
  return { success: true };
}

module.exports = { listFavorites, addFavorite, removeFavorite };
