const { asyncHandler } = require('../utils/async-handler');
const { getPagination, paginate } = require('../utils/pagination');
const {
  listFavorites,
  addFavorite,
  removeFavorite,
} = require('../services/favorite.service');

const list = asyncHandler(async (req, res) => {
  const { page, limit } = getPagination(req.query);
  const result = await listFavorites(req.user.id, { page, limit });
  res.json(paginate({ items: result.items, total: result.total, page, limit }));
});

const add = asyncHandler(async (req, res) => {
  const favorite = await addFavorite(req.user.id, req.params.bookId);
  res.status(201).json({ favorite });
});

const remove = asyncHandler(async (req, res) => {
  const result = await removeFavorite(req.user.id, req.params.bookId);
  res.json(result);
});

module.exports = { list, add, remove };
