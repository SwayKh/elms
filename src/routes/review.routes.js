const express = require('express');
const { authenticate } = require('../middleware/auth.middleware');
const { validate } = require('../middleware/validate.middleware');
const { createReviewSchema, updateReviewSchema } = require('../validators/review.validator');
const reviewController = require('../controllers/review.controller');

const router = express.Router();

router.use(authenticate);

router.get('/book/:bookId', reviewController.list);
router.post('/book/:bookId', validate(createReviewSchema), reviewController.create);
router.put('/:id', validate(updateReviewSchema), reviewController.update);
router.delete('/:id', reviewController.remove);

module.exports = router;
