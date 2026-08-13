const express = require('express');
const { authenticate } = require('../middleware/auth.middleware');
const { authorizeAdmin } = require('../middleware/admin.middleware');
const { validate } = require('../middleware/validate.middleware');
const { createCategorySchema, updateCategorySchema } = require('../validators/category.validator');
const categoryController = require('../controllers/category.controller');

const router = express.Router();

router.use(authenticate);

router.get('/', categoryController.list);
router.get('/:id', categoryController.detail);

router.post('/', authorizeAdmin, validate(createCategorySchema), categoryController.create);
router.put('/:id', authorizeAdmin, validate(updateCategorySchema), categoryController.update);
router.delete('/:id', authorizeAdmin, categoryController.remove);

module.exports = router;
