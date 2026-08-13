const express = require('express');
const { authenticate } = require('../middleware/auth.middleware');
const { validate } = require('../middleware/validate.middleware');
const { updateProgressSchema } = require('../validators/progress.validator');
const progressController = require('../controllers/progress.controller');

const router = express.Router();

router.use(authenticate);

router.get('/:bookId', progressController.get);
router.put('/:bookId', validate(updateProgressSchema), progressController.update);

module.exports = router;
