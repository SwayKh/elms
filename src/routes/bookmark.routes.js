const express = require('express');
const { authenticate } = require('../middleware/auth.middleware');
const { validate } = require('../middleware/validate.middleware');
const { createBookmarkSchema, updateBookmarkSchema } = require('../validators/bookmark.validator');
const bookmarkController = require('../controllers/bookmark.controller');

const router = express.Router();

router.use(authenticate);

router.get('/:bookId', bookmarkController.list);
router.post('/:bookId', validate(createBookmarkSchema), bookmarkController.create);
router.put('/:id', validate(updateBookmarkSchema), bookmarkController.update);
router.delete('/:id', bookmarkController.remove);

module.exports = router;
