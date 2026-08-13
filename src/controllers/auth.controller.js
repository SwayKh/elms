const { asyncHandler } = require('../utils/async-handler');
const { register, login, refresh } = require('../services/auth.service');

const registerUser = asyncHandler(async (req, res) => {
  const result = await register(req.body);
  res.status(201).json({ ...result, message: 'Account created successfully' });
});

const loginUser = asyncHandler(async (req, res) => {
  const result = await login(req.body);
  res.json(result);
});

const refreshToken = asyncHandler(async (req, res) => {
  const result = await refresh(req.body.refreshToken);
  res.json(result);
});

const logout = asyncHandler(async (req, res) => {
  // Stateless JWT: logout is handled client-side by discarding tokens.
  res.status(204).end();
});

module.exports = { registerUser, loginUser, refreshToken, logout };
