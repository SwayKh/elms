const { prisma } = require('../config/database');
const { ApiError } = require('../utils/ApiError');

async function assertBookExists(bookId) {
  const book = await prisma.book.findUnique({ where: { id: bookId } });
  if (!book) {
    throw ApiError.notFound('Book not found', 'BOOK_NOT_FOUND');
  }
}

async function getProgress(userId, bookId) {
  await assertBookExists(bookId);
  const progress = await prisma.readingProgress.findUnique({
    where: { userId_bookId: { userId, bookId } },
  });
  return (
    progress || {
      userId,
      bookId,
      progress: 0,
      lastReadAt: null,
    }
  );
}

async function updateProgress(userId, bookId, progressValue) {
  await assertBookExists(bookId);
  return prisma.readingProgress.upsert({
    where: { userId_bookId: { userId, bookId } },
    update: { progress: progressValue, lastReadAt: new Date() },
    create: { userId, bookId, progress: progressValue, lastReadAt: new Date() },
  });
}

module.exports = { getProgress, updateProgress };
