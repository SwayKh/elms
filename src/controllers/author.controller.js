const { asyncHandler } = require('../utils/async-handler');
const { getPagination, paginate } = require('../utils/pagination');
const {
  listAuthors,
  getAuthor,
  createAuthor,
  updateAuthor,
  deleteAuthor,
} = require('../services/author.service');

const list = asyncHandler(async (req, res) => {
  const { page, limit } = getPagination(req.query);
  const { search } = req.query;
  const result = await listAuthors({ page, limit, search });
  res.json(paginate({ items: result.items, total: result.total, page, limit }));
});

const detail = asyncHandler(async (req, res) => {
  const author = await getAuthor(req.params.id);
  res.json({ author });
});

const create = asyncHandler(async (req, res) => {
  const author = await createAuthor(req.body);
  res.status(201).json({ author });
});

const update = asyncHandler(async (req, res) => {
  const author = await updateAuthor(req.params.id, req.body);
  res.json({ author });
});

const remove = asyncHandler(async (req, res) => {
  const result = await deleteAuthor(req.params.id);
  res.json(result);
});

module.exports = { list, detail, create, update, remove };
