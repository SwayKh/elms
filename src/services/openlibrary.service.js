const { env } = require('../config/env');
const { ApiError } = require('../utils/ApiError');

/**
 * Client for the Open Library public API.
 *
 * Open Library is only a METADATA SOURCE for the admin import workflow.
 * Normal application searches always hit PostgreSQL, never this client.
 */
class OpenLibraryClient {
  constructor({ baseUrl, timeoutMs = 15000 } = {}) {
    this.baseUrl = baseUrl.replace(/\/+$/, '');
    this.timeoutMs = timeoutMs;
  }

  async _get(path) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    let response;
    try {
      response = await fetch(`${this.baseUrl}${path}`, {
        signal: controller.signal,
        headers: {
          // Open Library serves 503 to requests without a descriptive User-Agent.
          'User-Agent': 'E-LibraryBackend/1.0 (https://github.com/userfacet/e-library; contact: admin@elibrary.com)',
        },
      });
    } catch {
      throw ApiError.unavailable(
        'External book metadata service is temporarily unavailable.',
        'EXTERNAL_SERVICE_UNAVAILABLE',
      );
    } finally {
      clearTimeout(timer);
    }

    if (!response.ok) {
      throw ApiError.badGateway(
        'External book metadata service returned an error.',
        'EXTERNAL_SERVICE_ERROR',
      );
    }
    return response.json();
  }

  async searchBooks(query, { limit = 10 } = {}) {
    const params = new URLSearchParams({
      q: query,
      limit: String(Math.min(limit, 20)),
      fields: 'key,title,author_name,first_publish_year,cover_i,isbn,publisher,subject',
    });
    const data = await this._get(`/search.json?${params.toString()}`);

    return (data.docs || []).map((doc) => ({
      key: doc.key,
      title: doc.title,
      authors: doc.author_name || [],
      firstPublishYear: doc.first_publish_year || null,
      publisher: (doc.publisher || [])[0] || null,
      isbns: (doc.isbn || []).slice(0, 5),
      subjects: (doc.subject || []).slice(0, 8),
      coverUrl: doc.cover_i
        ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-L.jpg`
        : null,
    }));
  }

  async getWork(key) {
    const clean = key.replace(/^\/+/, '').replace(/^works\//, '');
    const work = await this._get(`/works/${clean}.json`);
    const description =
      typeof work.description === 'string'
        ? work.description
        : work.description?.value || null;

    return {
      key,
      title: work.title,
      description,
      covers: work.covers || [],
      subjects: (work.subjects || []).slice(0, 8),
      firstPublishDate: work.first_publish_date || null,
      authors: (work.authors || []).map((a) => a.author?.key).filter(Boolean),
    };
  }

  async getAuthor(key) {
    const clean = key.replace(/^\/+/, '').replace(/^authors\//, '');
    const author = await this._get(`/authors/${clean}.json`);
    return {
      key,
      name: author.name,
      bio:
        typeof author.bio === 'string'
          ? author.bio
          : author.bio?.value || null,
    };
  }
}

const openLibraryClient = new OpenLibraryClient({ baseUrl: env.OPEN_LIBRARY_BASE_URL });

module.exports = { OpenLibraryClient, openLibraryClient };
