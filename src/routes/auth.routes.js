const express = require('express');
const { authenticate } = require('../middleware/auth.middleware');
const { validate } = require('../middleware/validate.middleware');
const { registerSchema, loginSchema, refreshSchema } = require('../validators/auth.validator');
const {
  registerUser,
  loginUser,
  refreshToken,
  logout,
} = require('../controllers/auth.controller');

const router = express.Router();

router.post('/register', validate(registerSchema), registerUser);
router.post('/login', validate(loginSchema), loginUser);
router.post('/refresh', validate(refreshSchema), refreshToken);
router.post('/logout', authenticate, logout);

module.exports = router;
