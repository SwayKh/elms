const { prisma } = require('../config/database');
const { env } = require('../config/env');
const { ApiError } = require('../utils/ApiError');

async function getStats() {
  const [
    totalUsers,
    totalBooks,
    totalAuthors,
    totalCategories,
    activeLoans,
    totalLoans,
    totalSummaries,
    avgRatingAgg,
    mostBorrowed,
    mostFavorited,
    mostReviewed,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.book.count(),
    prisma.author.count(),
    prisma.category.count(),
    prisma.digitalLoan.count({ where: { status: 'ACTIVE' } }),
    prisma.digitalLoan.count(),
    prisma.bookSummary.count(),
    prisma.review.aggregate({ _avg: { rating: true } }),
    prisma.book.findMany({
      orderBy: { loans: { _count: 'desc' } },
      take: 5,
      select: { id: true, title: true, _count: { select: { loans: true } } },
    }),
    prisma.book.findMany({
      orderBy: { favorites: { _count: 'desc' } },
      take: 5,
      select: { id: true, title: true, _count: { select: { favorites: true } } },
    }),
    prisma.book.findMany({
      orderBy: { reviews: { _count: 'desc' } },
      take: 5,
      select: { id: true, title: true, _count: { select: { reviews: true } } },
    }),
  ]);

  return {
    totals: {
      users: totalUsers,
      books: totalBooks,
      authors: totalAuthors,
      categories: totalCategories,
      activeLoans,
      totalLoans,
      aiSummaries: totalSummaries,
      averageRating: avgRatingAgg._avg.rating ? Number(avgRatingAgg._avg.rating.toFixed(2)) : null,
    },
    mostBorrowed,
    mostFavorited,
    mostReviewed,
  };
}

async function getAIUsage() {
  if (!env.AI_API_TOKEN) {
    throw ApiError.unavailable('AI service is not configured', 'AI_NOT_CONFIGURED');
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  let response;
  try {
    response = await fetch(`${env.AI_API_BASE_URL}/v1/usage`, {
      headers: { Authorization: `Bearer ${env.AI_API_TOKEN}` },
      signal: controller.signal,
    });
  } catch {
    throw ApiError.unavailable('AI service is temporarily unavailable.', 'AI_UNAVAILABLE');
  } finally {
    clearTimeout(timer);
  }

  if (!response.ok) {
    throw ApiError.unavailable('AI service is temporarily unavailable.', 'AI_UNAVAILABLE');
  }
  return response.json();
}

module.exports = { getStats, getAIUsage };
