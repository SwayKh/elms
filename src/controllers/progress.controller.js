const { asyncHandler } = require('../utils/async-handler');
const { getProgress, updateProgress } = require('../services/progress.service');

const get = asyncHandler(async (req, res) => {
  const progress = await getProgress(req.user.id, req.params.bookId);
  res.json({ progress });
});

const update = asyncHandler(async (req, res) => {
  const progress = await updateProgress(req.user.id, req.params.bookId, req.body.progress);
  res.json({ progress });
});

module.exports = { get, update };
