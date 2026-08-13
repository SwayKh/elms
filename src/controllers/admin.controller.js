const { asyncHandler } = require('../utils/async-handler');
const { getStats, getAIUsage } = require('../services/admin.service');

const stats = asyncHandler(async (req, res) => {
  const statsData = await getStats();
  res.json(statsData);
});

const aiUsage = asyncHandler(async (req, res) => {
  const usage = await getAIUsage();
  res.json({ usage });
});

module.exports = { stats, aiUsage };
