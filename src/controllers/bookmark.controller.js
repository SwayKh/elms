const { asyncHandler } = require('../utils/async-handler');
const {
  listBookmarks,
  createBookmark,
  updateBookmark,
  deleteBookmark,
} = require('../services/bookmark.service');

const list = asyncHandler(async (req, res) => {
  const bookmarks = await listBookmarks(req.user.id, req.params.bookId);
  res.json({ bookmarks });
});

const create = asyncHandler(async (req, res) => {
  const bookmark = await createBookmark(req.user.id, req.params.bookId, req.body);
  res.status(201).json({ bookmark });
});

const update = asyncHandler(async (req, res) => {
  const bookmark = await updateBookmark(req.user.id, req.params.id, req.body);
  res.json({ bookmark });
});

const remove = asyncHandler(async (req, res) => {
  const isAdmin = req.user.role === 'ADMIN';
  const result = await deleteBookmark(req.user.id, req.params.id, isAdmin);
  res.json(result);
});

module.exports = { list, create, update, remove };
