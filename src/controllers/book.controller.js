const path = require('path');
const { asyncHandler } = require('../utils/async-handler');
const { getPagination, paginate } = require('../utils/pagination');
const { ApiError } = require('../utils/ApiError');
const { prisma } = require('../config/database');
const {
  listBooks,
  getBook,
  createBook,
  updateBook,
} = require('../services/book.service');
const { borrowBook, renewLoan, expireOverdueLoans, hasActiveLoan } = require('../services/borrowing.service');
const { storageService } = require('../services/storage.service');
const { resolveFileType } = require('../middleware/upload.middleware');
const { createAIClient } = require('../services/ai');
const { BookSummaryService } = require('../services/ai/book-summary.service');

const summaryService = new BookSummaryService(prisma, createAIClient());

const MIME_TYPES = {
  PDF: 'application/pdf',
  EPUB: 'application/epub+zip',
};

const list = asyncHandler(async (req, res) => {
  const { page, limit } = getPagination(req.query);
  const result = await listBooks({ ...req.query, page, limit }, req.user.id);
  res.json(paginate({ items: result.items, total: result.total, page, limit }));
});

const detail = asyncHandler(async (req, res) => {
  const book = await getBook(req.params.id, req.user.id);
  res.json({ book });
});

const create = asyncHandler(async (req, res) => {
  const book = await createBook(req.body);
  res.status(201).json({ book });
});

const update = asyncHandler(async (req, res) => {
  const book = await updateBook(req.params.id, req.body);
  res.json({ book });
});

const remove = asyncHandler(async (req, res) => {
  const book = await prisma.book.findUnique({
    where: { id: req.params.id },
    include: { files: true },
  });
  if (!book) {
    throw ApiError.notFound('Book not found', 'BOOK_NOT_FOUND');
  }

  await prisma.book.delete({ where: { id: req.params.id } });
  await storageService.deleteBookFiles(req.params.id);
  res.json({ success: true });
});

// Admin upload of a digital book file (PDF/EPUB).
const uploadFile = asyncHandler(async (req, res) => {
  const book = await prisma.book.findUnique({ where: { id: req.params.id } });
  if (!book) {
    throw ApiError.notFound('Book not found', 'BOOK_NOT_FOUND');
  }
  if (!req.file) {
    throw ApiError.badRequest('A file is required', 'FILE_REQUIRED');
  }

  const fileType = resolveFileType(req.file);
  const ext = fileType === 'PDF' ? 'pdf' : 'epub';

  const saved = await storageService.saveBookFile(book.id, req.file, ext);

  // Keep a single file per format: remove the previous one for this format.
  const previous = await prisma.bookFile.findFirst({
    where: { bookId: book.id, fileType },
  });

  const fileRecord = await prisma.bookFile.create({
    data: {
      bookId: book.id,
      filePath: saved.filePath,
      fileName: req.file.originalname,
      fileType,
      mimeType: req.file.mimetype,
      fileSize: saved.fileSize,
    },
  });

  if (previous) {
    await prisma.bookFile.delete({ where: { id: previous.id } });
    await storageService.deleteBookFile(previous.filePath);
  }

  res.status(201).json({ file: fileRecord });
});

const deleteFile = asyncHandler(async (req, res) => {
  const file = await prisma.bookFile.findFirst({
    where: { id: req.params.fileId, bookId: req.params.id },
  });
  if (!file) {
    throw ApiError.notFound('File not found', 'FILE_NOT_FOUND');
  }

  await prisma.bookFile.delete({ where: { id: file.id } });
  await storageService.deleteBookFile(file.filePath);
  res.json({ success: true });
});

// Secure streaming: authenticated user must have an active loan.
const downloadFile = asyncHandler(async (req, res) => {
  await expireOverdueLoans();

  const book = await prisma.book.findUnique({
    where: { id: req.params.id },
    include: { files: true },
  });
  if (!book) {
    throw ApiError.notFound('Book not found', 'BOOK_NOT_FOUND');
  }

  const hasAccess = await hasActiveLoan(req.user.id, book.id);
  if (!hasAccess) {
    throw ApiError.forbidden(
      'Borrow this book to access its digital file',
      'LOAN_REQUIRED',
    );
  }

  const requestedFormat = req.query.format ? req.query.format.toUpperCase() : null;
  let fileRecord;
  if (requestedFormat) {
    fileRecord = book.files.find((f) => f.fileType === requestedFormat);
    if (!fileRecord) {
      throw ApiError.notFound(
        `No ${requestedFormat} file available for this book`,
        'FILE_FORMAT_UNAVAILABLE',
      );
    }
  } else {
    // Prefer PDF, else the only available format.
    fileRecord = book.files.find((f) => f.fileType === 'PDF') || book.files[0];
    if (!fileRecord) {
      throw ApiError.notFound('No digital file available for this book', 'FILE_NOT_FOUND');
    }
  }

  const absolutePath = await storageService.resolvePath(fileRecord.filePath);
  const fallbackName = `book.${fileRecord.fileType.toLowerCase()}`;
  const fileName = fileRecord.fileName || fallbackName;

  res.setHeader('Content-Type', MIME_TYPES[fileRecord.fileType] || 'application/octet-stream');
  res.setHeader('Content-Disposition', `inline; filename="${path.basename(fileName)}"`);
  if (fileRecord.fileSize) {
    res.setHeader('Content-Length', fileRecord.fileSize);
  }
  storageService.createReadStream(absolutePath).pipe(res);
});

const borrow = asyncHandler(async (req, res) => {
  const loan = await borrowBook(req.user.id, req.params.id);
  res.status(201).json({ loan });
});

const renew = asyncHandler(async (req, res) => {
  const loan = await renewLoan(req.user.id, req.params.id);
  res.json({ loan });
});

const getSummary = asyncHandler(async (req, res) => {
  const type = req.query.type === 'DETAILED' ? 'DETAILED' : 'SHORT';
  const summary = await summaryService.getSummary(req.params.id, type);
  res.json({ summary });
});

const uploadCover = asyncHandler(async (req, res) => {
  const book = await prisma.book.findUnique({ where: { id: req.params.id } });
  if (!book) {
    throw ApiError.notFound('Book not found', 'BOOK_NOT_FOUND');
  }
  if (!req.file) {
    throw ApiError.badRequest('An image file is required', 'FILE_REQUIRED');
  }

  const ext = path.extname(req.file.originalname || '.jpg').replace('.', '') || 'jpg';
  await storageService.saveCover(book.id, req.file, ext);
  await prisma.book.update({
    where: { id: book.id },
    data: { coverUrl: `local://${book.id}` },
  });

  const updated = await getBook(book.id);
  res.json({ book: updated });
});

const getCover = asyncHandler(async (req, res) => {
  const book = await prisma.book.findUnique({ where: { id: req.params.id } });
  if (!book) {
    throw ApiError.notFound('Book not found', 'BOOK_NOT_FOUND');
  }

  const coverFile = await storageService.findCoverFile(book.id);
  if (!coverFile) {
    throw ApiError.notFound('Cover not found', 'COVER_NOT_FOUND');
  }

  res.setHeader('Content-Type', 'image/*');
  res.setHeader('Cache-Control', 'public, max-age=86400');
  storageService.createReadStream(coverFile).pipe(res);
});

module.exports = {
  list,
  detail,
  create,
  update,
  remove,
  uploadFile,
  deleteFile,
  downloadFile,
  borrow,
  renew,
  getSummary,
  uploadCover,
  getCover,
};
