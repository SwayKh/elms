const { asyncHandler } = require('../utils/async-handler');
const { searchExternal, importWork } = require('../services/import.service');

const search = asyncHandler(async (req, res) => {
  const results = await searchExternal(req.query.q, { limit: Number(req.query.limit) || 10 });
  res.json({ results });
});

const importByKey = asyncHandler(async (req, res) => {
  const book = await importWork(req.params.key);
  res.status(201).json({ book });
});

module.exports = { search, importByKey };
