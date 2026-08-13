const multer = require('multer');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const { ApiError } = require('../utils/ApiError');

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB

const ALLOWED_TYPES = {
  'application/pdf': 'PDF',
  'application/epub+zip': 'EPUB',
};

const storage = multer.diskStorage({
  destination: os.tmpdir(),
  filename(req, file, cb) {
    cb(null, `${Date.now()}-${crypto.randomBytes(8).toString('hex')}-${file.originalname}`);
  },
});

const uploadBookFile = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE, files: 1 },
  fileFilter(req, file, cb) {
    const ext = path.extname(file.originalname || '').toLowerCase();
    if (ALLOWED_TYPES[file.mimetype] && (ext === '.pdf' || ext === '.epub')) {
      return cb(null, true);
    }
    return cb(ApiError.badRequest('Only PDF and EPUB files are allowed', 'UNSUPPORTED_FILE_TYPE'));
  },
});

const uploadCover = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024, files: 1 },
  fileFilter(req, file, cb) {
    if (file.mimetype && file.mimetype.startsWith('image/')) {
      return cb(null, true);
    }
    return cb(ApiError.badRequest('Only image files are allowed', 'UNSUPPORTED_FILE_TYPE'));
  },
});

function resolveFileType(file) {
  return ALLOWED_TYPES[file.mimetype] || 'PDF';
}

module.exports = { uploadBookFile, uploadCover, resolveFileType, MAX_FILE_SIZE };
