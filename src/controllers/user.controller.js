const { asyncHandler } = require('../utils/async-handler');
const { getMe, updateMe, changePassword } = require('../services/user.service');

const getCurrentUser = asyncHandler(async (req, res) => {
  const user = await getMe(req.user.id);
  res.json({ user });
});

const updateCurrentUser = asyncHandler(async (req, res) => {
  const user = await updateMe(req.user.id, req.body);
  res.json({ user });
});

const updatePassword = asyncHandler(async (req, res) => {
  const result = await changePassword(req.user.id, req.body);
  res.json(result);
});

module.exports = { getCurrentUser, updateCurrentUser, updatePassword };
