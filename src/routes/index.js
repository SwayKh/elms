const express = require('express');
const authRoutes = require('./auth.routes');
const userRoutes = require('./user.routes');
const bookRoutes = require('./book.routes');
const authorRoutes = require('./author.routes');
const categoryRoutes = require('./category.routes');
const favoriteRoutes = require('./favorite.routes');
const progressRoutes = require('./progress.routes');
const reviewRoutes = require('./review.routes');
const bookmarkRoutes = require('./bookmark.routes');
const adminRoutes = require('./admin.routes');

const router = express.Router();

router.get('/health', (req, res) => res.json({ status: 'ok' }));

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/books', bookRoutes);
router.use('/authors', authorRoutes);
router.use('/categories', categoryRoutes);
router.use('/favorites', favoriteRoutes);
router.use('/progress', progressRoutes);
router.use('/reviews', reviewRoutes);
router.use('/bookmarks', bookmarkRoutes);
router.use('/admin', adminRoutes);

module.exports = router;
