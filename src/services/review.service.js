const { prisma } = require('../config/database');
const { ApiError } = require('../utils/ApiError');

async function assertBookExists(bookId) {
  const book = await prisma.book.findUnique({ where: { id: bookId } });
  if (!book) {
    throw ApiError.notFound('Book not found', 'BOOK_NOT_FOUND');
  }
}

async function listReviews(bookId, { page, limit }) {
  await assertBookExists(bookId);

  const where = { bookId };
  const [items, total] = await Promise.all([
    prisma.review.findMany({
      where,
      include: { user: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.review.count({ where }),
  ]);

  return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
}

async function createReview(userId, bookId, { rating, comment }) {
  await assertBookExists(bookId);

  const existing = await prisma.review.findUnique({
    where: { userId_bookId: { userId, bookId } },
  });
  if (existing) {
    throw ApiError.conflict(
      'You already reviewed this book. Update your existing review instead.',
      'REVIEW_EXISTS',
    );
  }

  return prisma.review.create({
    data: { userId, bookId, rating, comment },
  });
}

async function updateReview(userId, reviewId, { rating, comment }) {
  const review = await prisma.review.findUnique({ where: { id: reviewId } });
  if (!review || review.userId !== userId) {
    throw ApiError.notFound('Review not found', 'REVIEW_NOT_FOUND');
  }

  const data = {};
  if (rating !== undefined) data.rating = rating;
  if (comment !== undefined) data.comment = comment;

  return prisma.review.update({ where: { id: reviewId }, data });
}

async function deleteReview(userId, reviewId, isAdmin) {
  const review = await prisma.review.findUnique({ where: { id: reviewId } });
  if (!review || (!isAdmin && review.userId !== userId)) {
    throw ApiError.notFound('Review not found', 'REVIEW_NOT_FOUND');
  }
  await prisma.review.delete({ where: { id: reviewId } });
  return { success: true };
}

module.exports = { listReviews, createReview, updateReview, deleteReview };
