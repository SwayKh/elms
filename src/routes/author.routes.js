const express = require('express');
const { authenticate } = require('../middleware/auth.middleware');
const { authorizeAdmin } = require('../middleware/admin.middleware');
const { validate } = require('../middleware/validate.middleware');
const { createAuthorSchema, updateAuthorSchema } = require('../validators/author.validator');
const authorController = require('../controllers/author.controller');

const router = express.Router();

router.use(authenticate);

router.get('/', authorController.list);
router.get('/:id', authorController.detail);

router.post('/', authorizeAdmin, validate(createAuthorSchema), authorController.create);
router.put('/:id', authorizeAdmin, validate(updateAuthorSchema), authorController.update);
router.delete('/:id', authorizeAdmin, authorController.remove);

module.exports = router;
