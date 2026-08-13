const { asyncHandler } = require('../utils/async-handler');
const { getPagination, paginate } = require('../utils/pagination');
const {
  listCategories,
  getCategory,
  createCategory,
  updateCategory,
  deleteCategory,
} = require('../services/category.service');

const list = asyncHandler(async (req, res) => {
  const { page, limit } = getPagination(req.query);
  const { search } = req.query;
  const result = await listCategories({ page, limit, search });
  res.json(paginate({ items: result.items, total: result.total, page, limit }));
});

const detail = asyncHandler(async (req, res) => {
  const category = await getCategory(req.params.id);
  res.json({ category });
});

const create = asyncHandler(async (req, res) => {
  const category = await createCategory(req.body);
  res.status(201).json({ category });
});

const update = asyncHandler(async (req, res) => {
  const category = await updateCategory(req.params.id, req.body);
  res.json({ category });
});

const remove = asyncHandler(async (req, res) => {
  const result = await deleteCategory(req.params.id);
  res.json(result);
});

module.exports = { list, detail, create, update, remove };
