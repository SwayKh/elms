const express = require('express');
const { authenticate } = require('../middleware/auth.middleware');
const { authorizeAdmin } = require('../middleware/admin.middleware');
const adminController = require('../controllers/admin.controller');
const importController = require('../controllers/import.controller');

const router = express.Router();

router.use(authenticate, authorizeAdmin);

router.get('/stats', adminController.stats);
router.get('/ai-usage', adminController.aiUsage);

// Open Library metadata import workflow
router.get('/openlibrary/search', importController.search);
router.post('/openlibrary/import/:key', importController.importByKey);

module.exports = router;
