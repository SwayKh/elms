# E-Library Management System — Backend

A modular Node.js backend for an **E-Library Management System**. This is a digital library, not a physical one: books are digital resources (PDF/EPUB), there is no inventory, no physical copies, and borrowing is a **digital access entitlement** that unlimited users can hold on the same book at the same time.

## Highlights

- Digital book catalog (metadata + separate digital files)
- JWT authentication (`USER` / `ADMIN` roles) with access + refresh tokens
- Digital borrowing with automatic loan expiration and renewal
- Secure, entitlement-gated file streaming (`GET /api/books/:id/file`)
- Search, filtering, sorting and pagination against PostgreSQL
- Authors & categories (many-to-many)
- Favorites, reading progress, reviews/ratings, bookmarks
- **AI-powered book summaries** with caching (metadata-based, mockable AI client)
- Open Library metadata import for admins
- Admin dashboard stats + AI quota monitoring
- Centralized validation (Zod), error handling, rate limiting, secure headers

## Tech Stack

| Concern        | Choice                                     |
| -------------- | ------------------------------------------ |
| Runtime        | Node.js (>= 20)                            |
| Framework      | Express 4                                  |
| Database       | PostgreSQL                                 |
| ORM            | Prisma 5                                   |
| Auth           | JWT (access + refresh), bcryptjs           |
| Validation     | Zod                                        |
| Uploads        | Multer (streamed from filesystem storage)  |
| Tests          | node:test + supertest                      |
| Security       | helmet, express-rate-limit, secure file access |

---

## Getting Started

### Prerequisites

- Node.js >= 20
- PostgreSQL running locally (or via Docker)

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Edit `.env` and set at minimum:

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/e_library?schema=public
JWT_SECRET=some-long-random-secret
```

**Using a hosted/serverless database (Neon, Supabase, …)?** Serverless providers cap concurrent connections, and Prisma's default pool (10–20) will stall with `P2024` ("timed out fetching a connection"). The app already keeps the pool at `PRISMA_CONNECTION_LIMIT=1`, but make sure you:

- Use the provider's **pooler/transaction** endpoint and add `sslmode=require` (scheme must be `postgresql://`).
- Set `PG_BOUNCER=true` in `.env` when connecting through a Neon or Supabase pooler.

Never commit `.env`. The real `AI_API_TOKEN` must **only** live in `.env` and is never logged or exposed.

### 3. Create the schema and seed

```bash
npm run db:push     # applies prisma/schema.prisma
npm run db:seed     # creates demo users, categories, authors, books
```

Seed accounts:

| Role  | Email               | Password     |
| ----- | ------------------- | ------------ |
| Admin | admin@elibrary.com  | admin123456  |
| User  | user@elibrary.com   | user123456   |

### 4. Run

```bash
npm run dev    # development (watch mode)
npm start      # production
```

Server listens on `http://localhost:3000`. Health check: `GET /health`.

### 5. Try it in the browser (optional)

The repo ships a tiny, dependency-free test UI (single page, vanilla JS) served by the backend itself — not a real product frontend, just a way to exercise the API:

```bash
npm run dev
# open http://localhost:3000
```

It covers login/register (pre-filled seed credentials), book search/sort, borrow/renew, AI summaries, downloading files with an active loan, favorites, progress, reviews, bookmarks, and (for admin) stats, Open Library import, and author/category/book creation.

---

## Project Structure

```
src/
├── app.js                  # Express app factory
├── server.js               # Entry point (starts HTTP server)
├── config/
│   ├── env.js              # Env loading + Zod validation
│   └── database.js         # Prisma client singleton
├── routes/                 # Express routers (thin)
├── controllers/            # Request/response handling (thin)
├── services/               # Business logic
│   ├── auth.service.js
│   ├── user.service.js
│   ├── book.service.js
│   ├── borrowing.service.js
│   ├── storage.service.js
│   ├── openlibrary.service.js
│   ├── import.service.js
│   ├── admin.service.js
│   └── ai/
│       ├── ai.client.js            # Real provider client (never called in tests)
│       ├── fake-ai.client.js       # Deterministic fake for dev/tests
│       ├── book-summary.service.js # Caching + prompt building
│       └── index.js                # Client factory (fake in test mode)
├── middleware/              # auth, admin, validate, upload, error, rate-limit
├── validators/              # Zod schemas
└── utils/                   # ApiError, jwt, password, logger, pagination
prisma/
├── schema.prisma            # Database schema (source of truth)
└── seed.js
tests/
├── unit/                    # No DB required
└── integration/             # Requires a test database
scripts/
└── test-setup.js            # Applies schema to the test DB
public/                      # Minimal test UI (vanilla, no build step)
├── index.html
├── style.css
└── app.js
```

Layering rule: `routes → controllers → services → (prisma | storage | external clients)`. Controllers contain no business logic.

---

## Approach & Architecture

### Layered, dependency-on-one-direction

```
HTTP → routes → middleware (auth, admin, validate, rate-limit, upload)
            → controllers        (thin: parse HTTP, call services, shape responses)
            → services           (business logic: loans, summaries, imports, stats)
            → data layer         (Prisma models · storage.service · Open Library · AI client)
```

Each layer only calls the layer below it. This buys three things:

1. **Swappable infrastructure** — storage (filesystem today, S3/R2 tomorrow) and the AI provider are both behind interfaces, so a swap touches one service, not the controllers.
2. **Testability** — services can be unit-tested with fakes (fake Prisma, `FakeAIClient`, stubbed `fetch`), while controllers are exercised end-to-end via supertest against the same `createApp()` factory.
3. **Readability** — "where does business logic live?" has a single answer: `src/services/`.

### Key architectural choices

- **App as a factory.** `src/app.js` exports `createApp()`; `src/server.js` only starts the HTTP server when run directly (`require.main === module`). Integration tests boot the identical app in-process with supertest — no stray ports, no flaky sockets.
- **Schema-as-source-of-truth.** `prisma/schema.prisma` is the canonical data model; the generated client is the only DB access path. Seed data (`prisma/seed.js`) gives you a usable demo on first boot.
- **Digital borrowing is an access entitlement**, not an inventory transaction — no `available_copies`, no `returned_at`; loans expire. This single assumption shapes the whole schema (see [Borrowing Model](#borrowing-model-digital-access)).
- **Metadata and files are separate concerns.** PostgreSQL holds book metadata; binaries live on disk under `storage/` and are streamed through an authenticated, entitlement-gated endpoint rather than served statically.
- **External systems are optional.** Open Library is an admin import *source*; the AI API is behind an abstraction with a cached, quota-safe summary pipeline. Normal runtime never depends on either being reachable.
- **Fail fast, fail safe.** Environment variables are validated by Zod at boot (clear error listing missing vars); input is validated before any DB access; errors funnel into one envelope with machine-readable codes; 5xx responses never leak stack traces or secrets.
- **Explicit configuration over magic.** Everything tunable (JWT TTLs, loan duration, rate limits, storage path, AI model/base URL) is an environment variable with a documented default.

### Request lifecycle (example: borrow a book)

1. `POST /api/books/:id/borrow` → `router.use(authenticate)` decodes the JWT into `req.user`.
2. Controller `borrow` (wrapped by `asyncHandler`) delegates to `borrowing.service.borrowBook(userId, bookId)`.
3. Service lazily expires overdue loans, checks the book exists (`404 BOOK_NOT_FOUND`) and that no active loan exists (`409 ALREADY_BORROWED`), then creates a `DigitalLoan`.
4. Controller replies `201` with the loan. Any thrown `ApiError` is routed by `asyncHandler` to the central error handler, which renders the error envelope.

---

## Database Schema

`prisma/schema.prisma` is the source of truth. Entities:

```
User            Book           Author          Category
├── loans       ├── authors    ├── books       ├── books
├── favorites   ├── categories └── (via join)  └── (via join)
├── progress    ├── files (BookFile)
├── bookmarks   ├── loans (DigitalLoan)
├── reviews     ├── favorites
│               ├── progress
│               ├── bookmarks
│               ├── reviews
│               └── summaries (BookSummary)
```

Key design decisions:

- **Book is metadata only.** Digital files live in `BookFile` and on the filesystem (`storage/books/<bookId>/book.<pdf|epub>`); the DB stores a relative reference.
- **`DigitalLoan`** — a user can hold at most one active loan per book. This is enforced in `borrowing.service.js` (an indexed `(userId, bookId)` lookup plus a conflict error), and unlimited users can borrow the same book simultaneously.
- **`Review`** is unique per `(userId, bookId)` — users update rather than duplicate.
- **`BookSummary`** is unique per `(bookId, summaryType, sourceType)` so each summary variant is generated/cached once.
- Deletes **cascade** (a deleted book removes its loans, reviews, files references, summaries, etc.).

### ER diagram

```mermaid
erDiagram
    User ||--o{ DigitalLoan : "borrows"
    User ||--o{ Favorite : ""
    User ||--o{ ReadingProgress : ""
    User ||--o{ Bookmark : ""
    User ||--o{ Review : ""
    Book ||--o{ DigitalLoan : ""
    Book ||--o{ Favorite : ""
    Book ||--o{ ReadingProgress : ""
    Book ||--o{ Bookmark : ""
    Book ||--o{ Review : ""
    Book ||--o{ BookFile : ""
    Book ||--o{ BookSummary : ""
    Book ||--o{ BookAuthor : ""
    Author ||--o{ BookAuthor : ""
    Book ||--o{ BookCategory : ""
    Category ||--o{ BookCategory : ""
```

---

## API Reference

All routes under `/api` require authentication unless noted. Success responses are plain JSON; errors always use the envelope:

```json
{
  "success": false,
  "error": { "code": "BOOK_NOT_FOUND", "message": "Book not found", "details": [] }
}
```

Common error codes: `VALIDATION_ERROR`, `UNAUTHENTICATED`, `TOKEN_EXPIRED`, `INVALID_TOKEN`, `ADMIN_REQUIRED`, `BOOK_NOT_FOUND`, `ALREADY_BORROWED`, `LOAN_REQUIRED`, `LOAN_NOT_FOUND`, `DUPLICATE_ISBN`, `REVIEW_EXISTS`, `REVIEW_NOT_FOUND`, `EMAIL_TAKEN`, `INVALID_CREDENTIALS`, `INCORRECT_PASSWORD`, `AI_UNAVAILABLE`, `AI_RATE_LIMITED`, `AI_AUTH_ERROR`, `AI_TIMEOUT`, `AI_INVALID_RESPONSE`.

### Auth

| Method | Endpoint             | Access | Description                    |
| ------ | -------------------- | ------ | ------------------------------ |
| POST   | `/api/auth/register` | public | Create account, returns tokens |
| POST   | `/api/auth/login`    | public | Login, returns tokens          |
| POST   | `/api/auth/refresh`  | public | Exchange refresh token         |
| POST   | `/api/auth/logout`   | user   | Discard tokens (stateless JWT) |

### Users

| Method | Endpoint                  | Access | Description               |
| ------ | ------------------------- | ------ | ------------------------- |
| GET    | `/api/users/me`           | user   | Current profile           |
| PUT    | `/api/users/me`           | user   | Update name/email         |
| PUT    | `/api/users/me/password`  | user   | Change password           |

### Books

| Method | Endpoint                    | Access | Description                               |
| ------ | --------------------------- | ------ | ----------------------------------------- |
| GET    | `/api/books`                | user   | List/search/filter/sort/paginate          |
| GET    | `/api/books/:id`            | user   | Book detail (with authors, categories)    |
| GET    | `/api/books/:id/file`       | user   | Stream file **requires active loan**      |
| GET    | `/api/books/:id/summary`    | user   | Cached AI summary (`?type=DETAILED`)      |
| GET    | `/api/books/:id/cover`      | user   | Stream uploaded cover                     |
| POST   | `/api/books`                | admin  | Create book                               |
| PUT    | `/api/books/:id`            | admin  | Update book                               |
| DELETE | `/api/books/:id`            | admin  | Delete book (+ storage files)             |
| POST   | `/api/books/:id/borrow`     | user   | Create a digital loan                     |
| POST   | `/api/books/:id/renew`      | user   | Extend an active loan                     |
| POST   | `/api/books/:id/files`      | admin  | Upload PDF/EPUB (multipart `file`)        |
| DELETE | `/api/books/:id/files/:fileId` | admin | Remove a file                            |
| POST   | `/api/books/:id/cover`      | admin  | Upload cover image (multipart `cover`)    |

**`activeLoan`**: the list (`GET /api/books`) and detail (`GET /api/books/:id`) responses include an `activeLoan` field on every book — the requesting user's active loan `expiresAt` for that book, or `null`. The test UI uses it to show "On loan until …" and to swap the **Borrow** button for **Renew**.

**Search query parameters** (`GET /api/books`):

```
search=harry&author=tolkien&category=fantasy&language=en
sort=title|recent|oldest|mostBorrowed|mostFavorited|mostReviewed
page=1&limit=20
```

### Authors & Categories

| Method | Endpoint                | Access | Description            |
| ------ | ----------------------- | ------ | ---------------------- |
| GET    | `/api/authors`          | user   | List (search, paged)   |
| GET    | `/api/authors/:id`      | user   | Detail + books         |
| POST   | `/api/authors`          | admin  | Create                 |
| PUT    | `/api/authors/:id`      | admin  | Update                 |
| DELETE | `/api/authors/:id`      | admin  | Delete                 |

Same pattern under `/api/categories`.

### Favorites / Progress / Bookmarks

| Method | Endpoint                    | Access | Description                  |
| ------ | --------------------------- | ------ | ---------------------------- |
| GET    | `/api/favorites`            | user   | My favorites (paged)         |
| POST   | `/api/favorites/:bookId`    | user   | Add favorite                 |
| DELETE | `/api/favorites/:bookId`    | user   | Remove favorite              |
| GET    | `/api/progress/:bookId`     | user   | Get reading progress (0-100) |
| PUT    | `/api/progress/:bookId`     | user   | Set reading progress         |
| GET    | `/api/bookmarks/:bookId`    | user   | List bookmarks for a book    |
| POST   | `/api/bookmarks/:bookId`    | user   | Create bookmark              |
| PUT    | `/api/bookmarks/:id`        | user   | Update own bookmark          |
| DELETE | `/api/bookmarks/:id`        | user   | Delete own bookmark          |

### Reviews

| Method | Endpoint                  | Access | Description                            |
| ------ | ------------------------- | ------ | -------------------------------------- |
| GET    | `/api/reviews/book/:bookId` | user  | List reviews for a book (paged)        |
| POST   | `/api/reviews/book/:bookId` | user  | Review (rating 1-5, one per user)      |
| PUT    | `/api/reviews/:id`         | user   | Update own review                      |
| DELETE | `/api/reviews/:id`         | user   | Delete own review (admin can too)      |

### Admin

| Method | Endpoint                              | Access | Description                              |
| ------ | ------------------------------------- | ------ | ---------------------------------------- |
| GET    | `/api/admin/stats`                    | admin  | Library totals + top lists               |
| GET    | `/api/admin/ai-usage`                 | admin  | AI quota from the provided API (on demand) |
| GET    | `/api/admin/openlibrary/search?q=`    | admin  | Search Open Library metadata             |
| POST   | `/api/admin/openlibrary/import/:key`  | admin  | Import a work locally                    |

---

## Borrowing Model (Digital Access)

- `POST /api/books/:id/borrow` creates a loan with `expiresAt = now + LOAN_DURATION_DAYS` (default **14 days**).
- The same book can be borrowed by unlimited users simultaneously — there are no copies.
- Loans automatically transition `ACTIVE → EXPIRED` (checked lazily on borrow/renew/file access).
- `POST /api/books/:id/renew` extends from `max(now, currentExpiry)`.
- File access (`GET /api/books/:id/file`) requires an **active** loan; expired loans are denied.

## File Storage & Security

- Files live outside the DB at `storage/books/<bookId>/book.<pdf|epub>` (configurable via `STORAGE_PATH`).
- The storage layer (`src/services/storage.service.js`) is an interface; swap in S3/R2/MinIO later without touching controllers.
- The storage directory is **never** served directly. Access goes through `GET /api/books/:id/file` which: authenticates → checks active loan → resolves the `BookFile` record → streams the file.
- Uploads: PDF/EPUB only (by MIME + extension), max 50 MB, admin-only, path-traversal-safe.

## AI Book Summary

Architecture: `Controller → BookSummaryService → AIClient → provided API`.

- Input: book **metadata** (title, authors, description, categories, publisher, language).
- `summary_type`: `SHORT` | `DETAILED`; `source_type`: `METADATA`.
- Results are **cached** in `BookSummary` — the same (book, type) is never regenerated, protecting the 100-call quota.
- The real API is **never called in development or tests**. `AI_CLIENT=fake` (or `NODE_ENV=test`) uses `FakeAIClient`, which returns a deterministic string.
- Errors are mapped to safe messages (`AI_UNAVAILABLE`, `AI_RATE_LIMITED`, `AI_AUTH_ERROR`) — raw provider errors and the token are never exposed.
- `GET /api/admin/ai-usage` reports the remaining quota only when an admin explicitly asks.

The real token lives only in `AI_API_TOKEN`. If it is absent, the app silently uses the fake client rather than failing or wasting quota.

## Open Library Metadata Import

Admin flow: `search → inspect → import`.

```
POST /api/admin/openlibrary/search?q=hobbit
POST /api/admin/openlibrary/import/:key      # e.g. /works/OL27520W
```

Imported books keep `externalSource: "openlibrary"` and `external_id` (the work key), with a unique `(externalSource, externalId)` constraint so the same work can't be imported twice. Authors and subjects are upserted locally. Normal user searches always hit **PostgreSQL**, never Open Library.

---

## Testing

> Tests never touch the real AI API. All AI tests use `FakeAIClient`.

### Unit tests (no database)

```bash
npm test            # or npm run test:unit
```

Covers password hashing, JWT, validators, the AI client (against a stubbed `fetch`), and the summary service (caching + fake client).

### Integration tests (need a test database)

```bash
cp .env.test.example .env.test
# point DATABASE_URL in .env.test at a test database, e.g. e_library_test
npm run test:integration
```

The setup script applies the Prisma schema to the test DB automatically. Covers auth, books, search, borrowing + loan expiration, file access, favorites, reviews, progress, bookmarks, admin stats, and AI summary caching.

---

## Environment Variables

| Variable               | Default                         | Description                            |
| ---------------------- | ------------------------------- | -------------------------------------- |
| `PORT`                 | `3000`                          | HTTP port                              |
| `DATABASE_URL`         | — (required)                    | PostgreSQL connection string           |
| `PRISMA_CONNECTION_LIMIT` | `1`                          | Prisma pool size (keep low for hosted providers) |
| `PG_BOUNCER`           | `false`                         | Set `true` for Neon/Supabase pooler    |
| `JWT_SECRET`           | — (required)                    | Signing secret (long random string)    |
| `JWT_ACCESS_TTL`       | `15m`                           | Access token lifetime                  |
| `JWT_REFRESH_TTL`      | `30d`                           | Refresh token lifetime                 |
| `STORAGE_PATH`         | `./storage`                     | Filesystem storage root                |
| `AI_API_BASE_URL`      | `https://ai-api.userfacet.com`  | Provided AI API base URL               |
| `AI_API_TOKEN`         | empty                            | Provided AI token (never commit/log)   |
| `AI_MODEL`             | `gpt-4o-mini`                   | Model sent to the AI API               |
| `AI_CLIENT`            | `real`                          | `real` or `fake`                       |
| `OPEN_LIBRARY_BASE_URL`| `https://openlibrary.org`       | Metadata import source                 |
| `RATE_LIMIT_WINDOW_MS` | `60000`                         | Rate limit window                      |
| `RATE_LIMIT_MAX`       | `100`                           | Requests per window                    |
| `LOAN_DURATION_DAYS`   | `14`                            | Digital loan length                    |

---

## Assumptions

1. **E-Library, not a physical library.** Books are digital resources. There is no inventory, no physical copies, no shelves, no returns, no fines, no `available_copies`.
2. **Unlimited concurrent borrowers.** Because there are no copies, any number of users may hold an active loan on the same book at the same time; a loan is a time-boxed *access entitlement*, not the exclusive possession of an item.
3. **One review, one progress row, one bookmark per location per user.** Compound unique constraints encode these rules; adding a duplicate review/bookmark is an error while a duplicate favorite is idempotent.
4. **ISBN is unique and authoritative.** Admin-created and imported books must carry a unique ISBN; a violation returns `DUPLICATE_ISBN`.
5. **AI summaries are metadata-based and cached.** The provided AI API has a hard 100-call quota, so summaries are built from book metadata, generated at most once per `(book, summary type, source type)`, and cached in the database. Content-based summaries (needing PDF/EPUB extraction) are explicitly out of scope for this version.
6. **The AI API is never called in development or tests.** Without a configured `AI_API_TOKEN` (or with `AI_CLIENT=fake` / `NODE_ENV=test`), the app silently uses `FakeAIClient`. The quota cannot be burned by accident.
7. **Open Library is an optional import source.** Search and import are admin-only operations; normal user searches always hit local PostgreSQL. The app never depends on Open Library availability at runtime.
8. **Files are stored on the local filesystem** behind a storage interface. Relative paths are stored in the DB; the storage root is configurable and never served directly.
9. **Stateless JWT sessions.** Access + refresh tokens with no server-side session store. Consequence: a stolen refresh token cannot be revoked server-side (documented trade-off; a revocation/blacklist mechanism is a future improvement).
10. **Lazy loan expiration is sufficient.** Loans are transitioned `ACTIVE → EXPIRED` on demand (borrow / renew / file access) rather than by a cron job, because correctness only matters at the moment of access.
11. **`ILIKE` search and JS-computed average ratings scale adequately** for this catalog size; Postgres full-text search and SQL aggregates are the documented upgrade path.
12. **Secrets live only in `.env`** (gitignored). The AI token and JWT secret are never logged, returned in responses, or committed.

---

## Design Rules Followed

1. This is an **E-Library** — no physical inventory, no copies, no shelves, no returns, no fines.
2. Borrowing = digital access entitlement; the same book is borrowed by many users at once.
3. Book metadata (PostgreSQL) is separate from digital files (filesystem, referenced).
4. Open Library is an optional import source, never a live dependency.
5. The AI API is behind an abstraction; quota is protected via caching and fakes.
6. Controllers, services, validation, middleware, storage and external clients stay separated.
7. All input is validated (Zod) before touching the database.
8. Secrets never appear in code, logs, or responses.
