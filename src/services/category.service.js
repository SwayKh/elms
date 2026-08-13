const { prisma } = require('../config/database');
const { ApiError } = require('../utils/ApiError');

async function listCategories({ page, limit, search } = {}) {
  const where = search
    ? { name: { contains: search, mode: 'insensitive' } }
    : undefined;

  const [items, total] = await Promise.all([
    prisma.category.findMany({
      where,
      orderBy: { name: 'asc' },
      include: { _count: { select: { books: true } } },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.category.count({ where }),
  ]);

  return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
}

async function getCategory(categoryId) {
  const category = await prisma.category.findUnique({
    where: { id: categoryId },
    include: {
      books: { include: { book: { include: { authors: { include: { author: true } }, categories: { include: { category: true } } } } } },
    },
  });
  if (!category) {
    throw ApiError.notFound('Category not found', 'CATEGORY_NOT_FOUND');
  }
  return {
    ...category,
    books: category.books.map(({ book }) => book),
  };
}

async function createCategory({ name, description }) {
  try {
    return await prisma.category.create({ data: { name, description } });
  } catch (err) {
    if (err.code === 'P2002') {
      throw ApiError.conflict('A category with this name already exists', 'DUPLICATE_CATEGORY');
    }
    throw err;
  }
}

async function updateCategory(categoryId, data) {
  const category = await prisma.category.findUnique({ where: { id: categoryId } });
  if (!category) {
    throw ApiError.notFound('Category not found', 'CATEGORY_NOT_FOUND');
  }
  try {
    return await prisma.category.update({ where: { id: categoryId }, data });
  } catch (err) {
    if (err.code === 'P2002') {
      throw ApiError.conflict('A category with this name already exists', 'DUPLICATE_CATEGORY');
    }
    throw err;
  }
}

async function deleteCategory(categoryId) {
  const category = await prisma.category.findUnique({ where: { id: categoryId } });
  if (!category) {
    throw ApiError.notFound('Category not found', 'CATEGORY_NOT_FOUND');
  }
  await prisma.category.delete({ where: { id: categoryId } });
  return { success: true };
}

module.exports = { listCategories, getCategory, createCategory, updateCategory, deleteCategory };
