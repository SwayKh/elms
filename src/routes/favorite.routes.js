const express = require('express');
const { authenticate } = require('../middleware/auth.middleware');
const favoriteController = require('../controllers/favorite.controller');

const router = express.Router();

router.use(authenticate);

router.get('/', favoriteController.list);
router.post('/:bookId', favoriteController.add);
router.delete('/:bookId', favoriteController.remove);

module.exports = router;
