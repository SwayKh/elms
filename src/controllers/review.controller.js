const { asyncHandler } = require('../utils/async-handler');
const { getPagination, paginate } = require('../utils/pagination');
const {
  listReviews,
  createReview,
  updateReview,
  deleteReview,
} = require('../services/review.service');

const list = asyncHandler(async (req, res) => {
  const { page, limit } = getPagination(req.query);
  const result = await listReviews(req.params.bookId, { page, limit });
  res.json(paginate({ items: result.items, total: result.total, page, limit }));
});

const create = asyncHandler(async (req, res) => {
  const review = await createReview(req.user.id, req.params.bookId, req.body);
  res.status(201).json({ review });
});

const update = asyncHandler(async (req, res) => {
  const review = await updateReview(req.user.id, req.params.id, req.body);
  res.json({ review });
});

const remove = asyncHandler(async (req, res) => {
  const isAdmin = req.user.role === 'ADMIN';
  const result = await deleteReview(req.user.id, req.params.id, isAdmin);
  res.json(result);
});

module.exports = { list, create, update, remove };
