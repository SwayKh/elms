const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');
const { env } = require('../config/env');
const { ApiError } = require('../utils/ApiError');

/**
 * Local filesystem-backed storage for digital book files.
 *
 * The interface mirrors what an object-storage implementation (S3, R2,
 * MinIO) would provide, so the rest of the app does not depend on the
 * concrete storage backend.
 *
 * Layout:
 *   <root>/books/<bookId>/book.<ext>
 *   <root>/covers/<bookId>.<ext>
 */
class LocalStorageService {
  constructor(rootPath) {
    this.root = path.resolve(rootPath);
  }

  _bookDir(bookId) {
    return path.join(this.root, 'books', bookId);
  }

  _coverDir() {
    return path.join(this.root, 'covers');
  }

  async _ensureDir(dir) {
    await fsp.mkdir(dir, { recursive: true });
  }

  _safeResolve(base, target) {
    const resolved = path.resolve(base, target);
    if (resolved !== base && !resolved.startsWith(base + path.sep)) {
      throw ApiError.badRequest('Invalid file path', 'INVALID_FILE_PATH');
    }
    return resolved;
  }

  async _moveTemp(uploadPath, target) {
    try {
      await fsp.rename(uploadPath, target);
    } catch {
      await fsp.copyFile(uploadPath, target);
      await fsp.unlink(uploadPath).catch(() => {});
    }
  }

  async saveBookFile(bookId, uploadedFile, ext) {
    const dir = this._bookDir(bookId);
    await this._ensureDir(dir);
    const target = path.join(dir, `book.${ext.toLowerCase()}`);
    await this._moveTemp(uploadedFile.path, target);

    const stat = await fsp.stat(target);
    return {
      filePath: path.relative(this.root, target),
      fileSize: stat.size,
      absolutePath: target,
    };
  }

  async saveCover(bookId, uploadedFile, ext) {
    const dir = this._coverDir();
    await this._ensureDir(dir);
    const target = path.join(dir, `${bookId}.${ext.toLowerCase()}`);
    await this._moveTemp(uploadedFile.path, target);
    return target;
  }

  async deleteBookFile(relativePath) {
    if (!relativePath) return;
    const target = this._safeResolve(this.root, relativePath);
    await fsp.unlink(target).catch(() => {});
  }

  async deleteBookFiles(bookId) {
    const dir = this._bookDir(bookId);
    await fsp.rm(dir, { recursive: true, force: true }).catch(() => {});
  }

  async deleteCover(bookId) {
    const dir = this._coverDir();
    let entries;
    try {
      entries = await fsp.readdir(dir);
    } catch {
      return;
    }
    for (const entry of entries) {
      if (entry.startsWith(`${bookId}.`)) {
        await fsp.unlink(path.join(dir, entry)).catch(() => {});
      }
    }
  }

  async findCoverFile(bookId) {
    const dir = this._coverDir();
    let entries;
    try {
      entries = await fsp.readdir(dir);
    } catch {
      return null;
    }
    const match = entries.find((entry) => entry.startsWith(`${bookId}.`));
    return match ? path.join(dir, match) : null;
  }

  async resolvePath(relativePath) {
    return this._safeResolve(this.root, relativePath);
  }

  createReadStream(absolutePath) {
    return fs.createReadStream(absolutePath);
  }

  async fileInfo(absolutePath) {
    const stat = await fsp.stat(absolutePath);
    return { size: stat.size, mimeType: 'application/octet-stream' };
  }
}

const storageService = new LocalStorageService(env.STORAGE_PATH);

module.exports = { LocalStorageService, storageService };
