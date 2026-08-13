const { prisma } = require('../config/database');
const { ApiError } = require('../utils/ApiError');

async function assertBookExists(bookId) {
  const book = await prisma.book.findUnique({ where: { id: bookId } });
  if (!book) {
    throw ApiError.notFound('Book not found', 'BOOK_NOT_FOUND');
  }
}

async function listBookmarks(userId, bookId) {
  await assertBookExists(bookId);
  return prisma.bookmark.findMany({
    where: { userId, bookId },
    orderBy: { createdAt: 'desc' },
  });
}

async function createBookmark(userId, bookId, { location, note }) {
  await assertBookExists(bookId);
  const existing = await prisma.bookmark.findUnique({
    where: { userId_bookId_location: { userId, bookId, location } },
  });
  if (existing) {
    throw ApiError.conflict('A bookmark already exists at this location', 'DUPLICATE_BOOKMARK');
  }
  return prisma.bookmark.create({
    data: { userId, bookId, location, note },
  });
}

async function updateBookmark(userId, bookmarkId, { location, note }) {
  const bookmark = await prisma.bookmark.findUnique({ where: { id: bookmarkId } });
  if (!bookmark || bookmark.userId !== userId) {
    throw ApiError.notFound('Bookmark not found', 'BOOKMARK_NOT_FOUND');
  }

  const data = {};
  if (location !== undefined) data.location = location;
  if (note !== undefined) data.note = note;

  try {
    return await prisma.bookmark.update({ where: { id: bookmarkId }, data });
  } catch (err) {
    if (err.code === 'P2002') {
      throw ApiError.conflict('A bookmark already exists at this location', 'DUPLICATE_BOOKMARK');
    }
    throw err;
  }
}

async function deleteBookmark(userId, bookmarkId, isAdmin) {
  const bookmark = await prisma.bookmark.findUnique({ where: { id: bookmarkId } });
  if (!bookmark || (!isAdmin && bookmark.userId !== userId)) {
    throw ApiError.notFound('Bookmark not found', 'BOOKMARK_NOT_FOUND');
  }
  await prisma.bookmark.delete({ where: { id: bookmarkId } });
  return { success: true };
}

module.exports = { listBookmarks, createBookmark, updateBookmark, deleteBookmark };
