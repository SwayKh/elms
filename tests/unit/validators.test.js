const { test } = require('node:test');
const assert = require('node:assert/strict');
const { registerSchema } = require('../../src/validators/auth.validator');
const { bookQuerySchema, createBookSchema } = require('../../src/validators/book.validator');
const { createReviewSchema } = require('../../src/validators/review.validator');

test('registerSchema accepts valid input', () => {
  const result = registerSchema.safeParse({
    name: 'Alice',
    email: 'ALICE@example.com',
    password: 'password123',
  });
  assert.ok(result.success);
  assert.equal(result.data.email, 'alice@example.com');
});

test('registerSchema rejects an invalid email', () => {
  const result = registerSchema.safeParse({ name: 'Alice', email: 'not-an-email', password: 'password123' });
  assert.equal(result.success, false);
});

test('registerSchema rejects a short password', () => {
  const result = registerSchema.safeParse({ name: 'Alice', email: 'a@b.com', password: 'short' });
  assert.equal(result.success, false);
});

test('bookQuerySchema coerces page and limit numbers', () => {
  const result = bookQuerySchema.safeParse({ page: '3', limit: '5' });
  assert.ok(result.success);
  assert.equal(result.data.page, 3);
  assert.equal(result.data.limit, 5);
});

test('bookQuerySchema rejects an unknown sort value', () => {
  const result = bookQuerySchema.safeParse({ sort: 'bogus' });
  assert.equal(result.success, false);
});

test('createBookSchema requires a title', () => {
  const result = createBookSchema.safeParse({});
  assert.equal(result.success, false);
});

test('createReviewSchema rejects ratings outside 1-5', () => {
  assert.equal(createReviewSchema.safeParse({ rating: 0 }).success, false);
  assert.equal(createReviewSchema.safeParse({ rating: 6 }).success, false);
  assert.equal(createReviewSchema.safeParse({ rating: 3 }).success, true);
});
