const express = require('express');
const { authenticate } = require('../middleware/auth.middleware');
const { validate } = require('../middleware/validate.middleware');
const { updateMeSchema, changePasswordSchema } = require('../validators/user.validator');
const {
  getCurrentUser,
  updateCurrentUser,
  updatePassword,
} = require('../controllers/user.controller');

const router = express.Router();

router.get('/me', authenticate, getCurrentUser);
router.put('/me', authenticate, validate(updateMeSchema), updateCurrentUser);
router.put('/me/password', authenticate, validate(changePasswordSchema), updatePassword);

module.exports = router;
