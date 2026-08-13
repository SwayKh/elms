const { prisma } = require('../config/database');
const { ApiError } = require('../utils/ApiError');

const BOOK_INCLUDE = {
  authors: { include: { author: true } },
  categories: { include: { category: true } },
  files: { select: { id: true, fileName: true, fileType: true, fileSize: true, createdAt: true } },
  reviews: { select: { rating: true } },
};

const SORT_MAP = {
  title: { title: 'asc' },
  recent: { createdAt: 'desc' },
  oldest: { createdAt: 'asc' },
  mostBorrowed: { loans: { _count: 'desc' } },
  mostFavorited: { favorites: { _count: 'desc' } },
  mostReviewed: { reviews: { _count: 'desc' } },
};

function serializeBook(book) {
  const { reviews, authors, categories, ...rest } = book;
  const ratingCount = reviews.length;
  const avgRating = ratingCount
    ? Number((reviews.reduce((sum, r) => sum + r.rating, 0) / ratingCount).toFixed(1))
    : null;

  return {
    ...rest,
    authors: authors.map(({ author }) => author),
    categories: categories.map(({ category }) => category),
    avgRating,
    ratingCount,
    formats: book.files.map((f) => f.fileType),
  };
}

function buildWhere({ search, author, category, language } = {}) {
  const where = {};

  if (search && search.trim()) {
    const term = search.trim();
    where.OR = [
      { title: { contains: term, mode: 'insensitive' } },
      { description: { contains: term, mode: 'insensitive' } },
      { isbn: { contains: term } },
      { publisher: { contains: term, mode: 'insensitive' } },
      { authors: { some: { author: { name: { contains: term, mode: 'insensitive' } } } } },
    ];
  }

  if (author && author.trim()) {
    where.authors = { some: { author: { name: { contains: author.trim(), mode: 'insensitive' } } } };
  }

  if (category && category.trim()) {
    where.categories = { some: { category: { name: { contains: category.trim(), mode: 'insensitive' } } } };
  }

  if (language && language.trim()) {
    where.language = { equals: language.trim(), mode: 'insensitive' };
  }

  return where;
}

async function listBooks(filters, userId) {
  const { search, author, category, language, sort = 'recent', page, limit } = filters;
  const where = buildWhere({ search, author, category, language });
  const orderBy = SORT_MAP[sort] || SORT_MAP.recent;

  const [items, total] = await Promise.all([
    prisma.book.findMany({
      where,
      include: BOOK_INCLUDE,
      orderBy,
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.book.count({ where }),
  ]);

  const activeLoan = await getActiveLoans(userId, items.map((b) => b.id));

  return {
    items: items.map((book) => ({ ...serializeBook(book), activeLoan: activeLoan.get(book.id) || null })),
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

async function getBook(bookId, userId) {
  const book = await prisma.book.findUnique({ where: { id: bookId }, include: BOOK_INCLUDE });
  if (!book) {
    throw ApiError.notFound('Book not found', 'BOOK_NOT_FOUND');
  }
  const activeLoan = await getActiveLoans(userId, [book.id]);
  return { ...serializeBook(book), activeLoan: activeLoan.get(book.id) || null };
}

async function getActiveLoans(userId, bookIds) {
  const map = new Map();
  if (!userId || !bookIds.length) return map;
  const loans = await prisma.digitalLoan.findMany({
    where: { userId, status: 'ACTIVE', bookId: { in: bookIds } },
    select: { bookId: true, expiresAt: true },
  });
  for (const loan of loans) map.set(loan.bookId, loan.expiresAt);
  return map;
}

async function assertRelationsExist({ authorIds, categoryIds }) {
  if (authorIds && authorIds.length) {
    const count = await prisma.author.count({ where: { id: { in: authorIds } } });
    if (count !== authorIds.length) {
      throw ApiError.badRequest('One or more authorIds are invalid', 'INVALID_AUTHOR_IDS');
    }
  }
  if (categoryIds && categoryIds.length) {
    const count = await prisma.category.count({ where: { id: { in: categoryIds } } });
    if (count !== categoryIds.length) {
      throw ApiError.badRequest('One or more categoryIds are invalid', 'INVALID_CATEGORY_IDS');
    }
  }
}

function relationCreate(ids) {
  return ids.map((id) => ({ authorId: id }));
}

function categoryRelationCreate(ids) {
  return ids.map((id) => ({ categoryId: id }));
}

async function createBook(input) {
  const { title, description, isbn, publicationDate, language, publisher, coverUrl, authorIds = [], categoryIds = [] } = input;

  await assertRelationsExist({ authorIds, categoryIds });

  try {
    const book = await prisma.book.create({
      data: {
        title,
        description,
        isbn,
        publicationDate,
        language,
        publisher,
        coverUrl,
        authors: { create: relationCreate(authorIds) },
        categories: { create: categoryRelationCreate(categoryIds) },
      },
      include: BOOK_INCLUDE,
    });
    return serializeBook(book);
  } catch (err) {
    if (err.code === 'P2002') {
      throw ApiError.conflict('A book with this ISBN already exists', 'DUPLICATE_ISBN');
    }
    throw err;
  }
}

async function updateBook(bookId, input) {
  const book = await prisma.book.findUnique({ where: { id: bookId } });
  if (!book) {
    throw ApiError.notFound('Book not found', 'BOOK_NOT_FOUND');
  }

  const { title, description, isbn, publicationDate, language, publisher, coverUrl, authorIds, categoryIds } = input;

  await assertRelationsExist({ authorIds, categoryIds });

  const data = {};
  if (title !== undefined) data.title = title;
  if (description !== undefined) data.description = description;
  if (isbn !== undefined) data.isbn = isbn;
  if (publicationDate !== undefined) data.publicationDate = publicationDate;
  if (language !== undefined) data.language = language;
  if (publisher !== undefined) data.publisher = publisher;
  if (coverUrl !== undefined) data.coverUrl = coverUrl;

  if (authorIds) {
    data.authors = { deleteMany: {}, create: relationCreate(authorIds) };
  }
  if (categoryIds) {
    data.categories = { deleteMany: {}, create: categoryRelationCreate(categoryIds) };
  }

  try {
    const updated = await prisma.book.update({
      where: { id: bookId },
      data,
      include: BOOK_INCLUDE,
    });
    return serializeBook(updated);
  } catch (err) {
    if (err.code === 'P2002') {
      throw ApiError.conflict('A book with this ISBN already exists', 'DUPLICATE_ISBN');
    }
    throw err;
  }
}

module.exports = { listBooks, getBook, createBook, updateBook, serializeBook };