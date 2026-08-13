const { prisma } = require('../config/database');
const { ApiError } = require('../utils/ApiError');
const { openLibraryClient } = require('./openlibrary.service');

async function searchExternal(query, { limit = 10 } = {}) {
  if (!query || !query.trim()) {
    throw ApiError.badRequest('A search query is required', 'QUERY_REQUIRED');
  }
  const results = await openLibraryClient.searchBooks(query, { limit });
  if (!results.length) {
    throw ApiError.notFound('No books found in the external catalog', 'NO_EXTERNAL_RESULTS');
  }
  return results;
}

async function upsertAuthor(key, fallbackName) {
  let author = null;
  if (key) {
    try {
      const data = await openLibraryClient.getAuthor(key);
      author = data;
    } catch {
      author = null;
    }
  }

  const name = (author && author.name) || fallbackName;
  if (!name) {
    return null;
  }

  try {
    return await prisma.author.upsert({
      where: { name },
      update: {},
      create: { name, biography: author?.bio || null },
    });
  } catch {
    return null;
  }
}

async function upsertCategory(name) {
  if (!name) return null;
  return prisma.category.upsert({
    where: { name },
    update: {},
    create: { name, description: null },
  });
}

async function importWork(key) {
  if (!key) {
    throw ApiError.badRequest('A work key is required', 'KEY_REQUIRED');
  }

  const work = await openLibraryClient.getWork(key);

  const authorKeys = work.authors || [];
  const authors = [];
  for (const authorKey of authorKeys.slice(0, 5)) {
    const author = await upsertAuthor(authorKey, null);
    if (author) authors.push(author);
  }

  const categories = [];
  for (const subject of (work.subjects || []).slice(0, 5)) {
    const category = await upsertCategory(subject);
    if (category) categories.push(category);
  }

  const coverUrl = work.covers && work.covers.length
    ? `https://covers.openlibrary.org/b/id/${work.covers[0]}-L.jpg`
    : null;

  try {
    const book = await prisma.book.create({
      data: {
        title: work.title,
        description: work.description,
        publicationDate: work.firstPublishDate ? new Date(work.firstPublishDate) : null,
        coverUrl,
        externalSource: 'openlibrary',
        externalId: work.key,
        authors: { create: authors.map((a) => ({ authorId: a.id })) },
        categories: { create: categories.map((c) => ({ categoryId: c.id })) },
      },
      include: {
        authors: { include: { author: true } },
        categories: { include: { category: true } },
      },
    });

    return {
      ...book,
      authors: book.authors.map(({ author }) => author),
      categories: book.categories.map(({ category }) => category),
    };
  } catch (err) {
    if (err.code === 'P2002') {
      throw ApiError.conflict(
        'This book has already been imported into the e-library',
        'DUPLICATE_EXTERNAL_ID',
      );
    }
    throw err;
  }
}

module.exports = { searchExternal, importWork };
