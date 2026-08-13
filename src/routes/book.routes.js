const express = require('express');
const { authenticate } = require('../middleware/auth.middleware');
const { authorizeAdmin } = require('../middleware/admin.middleware');
const { validate } = require('../middleware/validate.middleware');
const { uploadBookFile, uploadCover } = require('../middleware/upload.middleware');
const { createBookSchema, updateBookSchema, bookQuerySchema } = require('../validators/book.validator');
const bookController = require('../controllers/book.controller');

const router = express.Router();

router.use(authenticate);

router.get('/', validate(bookQuerySchema, 'query'), bookController.list);
router.get('/:id', bookController.detail);

// Digital file access (requires an active loan)
router.get('/:id/file', bookController.downloadFile);

// Digital borrowing
router.post('/:id/borrow', bookController.borrow);
router.post('/:id/renew', bookController.renew);

// AI summary (cached)
router.get('/:id/summary', bookController.getSummary);

// Admin-only management
router.post('/', authorizeAdmin, validate(createBookSchema), bookController.create);
router.put('/:id', authorizeAdmin, validate(updateBookSchema), bookController.update);
router.delete('/:id', authorizeAdmin, bookController.remove);

router.post('/:id/files', authorizeAdmin, uploadBookFile.single('file'), bookController.uploadFile);
router.delete('/:id/files/:fileId', authorizeAdmin, bookController.deleteFile);

router.post('/:id/cover', authorizeAdmin, uploadCover.single('cover'), bookController.uploadCover);
router.get('/:id/cover', bookController.getCover);

module.exports = router;
