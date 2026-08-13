const { prisma } = require('../config/database');
const { env } = require('../config/env');
const { ApiError } = require('../utils/ApiError');

const LOAN_DURATION_MS = env.LOAN_DURATION_DAYS * 24 * 60 * 60 * 1000;

function addDays(date, days) {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

async function expireOverdueLoans() {
  await prisma.digitalLoan.updateMany({
    where: { status: 'ACTIVE', expiresAt: { lt: new Date() } },
    data: { status: 'EXPIRED' },
  });
}

async function hasActiveLoan(userId, bookId) {
  const loan = await prisma.digitalLoan.findFirst({
    where: { userId, bookId, status: 'ACTIVE' },
  });
  return Boolean(loan);
}

async function getActiveLoan(userId, bookId) {
  return prisma.digitalLoan.findFirst({
    where: { userId, bookId, status: 'ACTIVE' },
  });
}

async function borrowBook(userId, bookId) {
  await expireOverdueLoans();

  const book = await prisma.book.findUnique({ where: { id: bookId } });
  if (!book) {
    throw ApiError.notFound('Book not found', 'BOOK_NOT_FOUND');
  }

  const existing = await getActiveLoan(userId, bookId);
  if (existing) {
    throw ApiError.conflict('You already have an active loan for this book', 'ALREADY_BORROWED');
  }

  const now = new Date();
  const loan = await prisma.digitalLoan.create({
    data: {
      userId,
      bookId,
      borrowedAt: now,
      expiresAt: addDays(now, env.LOAN_DURATION_DAYS),
      status: 'ACTIVE',
    },
  });

  return loan;
}

async function renewLoan(userId, bookId) {
  await expireOverdueLoans();

  const loan = await getActiveLoan(userId, bookId);
  if (!loan) {
    throw ApiError.notFound('No active loan found for this book', 'LOAN_NOT_FOUND');
  }

  const now = new Date();
  // Renewal extends from the later of now / current expiry so users do not
  // lose remaining time.
  const base = loan.expiresAt > now ? loan.expiresAt : now;
  const expiresAt = addDays(base, env.LOAN_DURATION_DAYS);

  return prisma.digitalLoan.update({
    where: { id: loan.id },
    data: { expiresAt },
  });
}

async function getLoanHistory(userId, { page, limit }) {
  const where = { userId };
  const [items, total] = await Promise.all([
    prisma.digitalLoan.findMany({
      where,
      include: { book: { select: { id: true, title: true, coverUrl: true } } },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.digitalLoan.count({ where }),
  ]);

  return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
}

module.exports = {
  LOAN_DURATION_MS,
  expireOverdueLoans,
  hasActiveLoan,
  getActiveLoan,
  borrowBook,
  renewLoan,
  getLoanHistory,
};
