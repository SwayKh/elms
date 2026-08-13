process.env.NODE_ENV = 'test';

const path = require('path');
const dotenv = require('dotenv');
const fs = require('fs');

const envPath = path.join(__dirname, '..', '..', '.env.test');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
}

const request = require('supertest');
const { createApp } = require('../../src/app');
const { prisma } = require('../../src/config/database');
const { hashPassword } = require('../../src/utils/password');
const { signAccessToken, signRefreshToken } = require('../../src/utils/jwt');

const api = request(createApp());

const TABLES = [
  'Bookmark',
  'ReadingProgress',
  'Favorite',
  'Review',
  'DigitalLoan',
  'BookSummary',
  'BookFile',
  'BookAuthor',
  'BookCategory',
  'Book',
  'Author',
  'Category',
  'User',
];

async function resetDb() {
  for (const table of TABLES) {
    await prisma.$executeRawUnsafe(`TRUNCATE TABLE "${table}" CASCADE;`);
  }
}

let userCounter = 0;

async function createUser(overrides = {}) {
  userCounter += 1;
  return prisma.user.create({
    data: {
      name: overrides.name || 'Test User',
      email:
        overrides.email ||
        `user_${Date.now()}_${userCounter}${Math.random().toString(36).slice(2, 8)}@test.com`,
      passwordHash: await hashPassword(overrides.password || 'password123'),
      role: overrides.role || 'USER',
    },
  });
}

async function createAdmin(overrides = {}) {
  return createUser({ role: 'ADMIN', name: 'Test Admin', ...overrides });
}

function accessTokenFor(user) {
  return signAccessToken({ id: user.id, role: user.role });
}

function refreshTokenFor(user) {
  return signRefreshToken({ id: user.id, role: user.role });
}

function auth(user) {
  return { Authorization: `Bearer ${accessTokenFor(user)}` };
}

async function createBook(overrides = {}) {
  return prisma.book.create({
    data: {
      title: overrides.title || 'Test Book',
      description: overrides.description || 'A book used in tests.',
      isbn: overrides.isbn || null,
      publicationDate: overrides.publicationDate || new Date('2000-01-01'),
      language: overrides.language || 'en',
      publisher: overrides.publisher || 'Test Publisher',
      coverUrl: overrides.coverUrl || null,
    },
  });
}

async function createCategory(name = 'Fantasy') {
  return prisma.category.create({ data: { name } });
}

async function createAuthor(name = 'Test Author') {
  return prisma.author.create({ data: { name } });
}

module.exports = {
  api,
  prisma,
  resetDb,
  createUser,
  createAdmin,
  createBook,
  createCategory,
  createAuthor,
  accessTokenFor,
  refreshTokenFor,
  auth,
};
