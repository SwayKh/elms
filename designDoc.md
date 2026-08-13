# E-Library Management System — Backend Design Specification

## 1. Purpose of This Document

This document defines the proposed architecture, scope, domain model, features, workflows, technology choices, and implementation plan for a backend project called **E-Library Management System**.

This document is intended to be handed to another development/AI agent as the project context and design specification.

The agent should **design and implement the system according to the decisions and constraints in this document**, rather than reverting to a traditional physical-library management system.

---

# 2. Critical Domain Constraint: This Is an E-Library

The most important requirement is that this is a **digital/electronic library**, not a physical library.

Books are digital resources such as:

- PDF
- EPUB
- potentially other digital formats later

There is **no physical inventory**.

There are **no physical copies of books**.

There is no concept of:

- `BookCopy`
- `available_copies`
- `borrowed_copies`
- shelf/rack/location
- physical inventory
- physical return
- physical damage
- physical fines

The same digital book can be accessed by many users simultaneously.

For example:

```text
User A ── borrows ──┐
User B ── borrows ──┼──> The Hobbit
User C ── borrows ──┘
```

There is no copy allocation.

However, the assignment explicitly mentions **borrowing**, so the system should still implement a concept of **digital borrowing/access**.

A digital loan means:

> A user obtains permission to access a digital book for a specified period.

It does NOT mean that a copy of the book has been removed from inventory.

---

# 3. Original Problem Statement

The assigned problem statement is:

> Build a backend system for an E-Library Management System.
>
> The platform should allow users to interact with a collection of books, think in terms of what a digital library needs to function (managing books, users, borrowing, searching, etc.). In addition, the system should include an AI-powered Book Summary feature, where users can get a generated summary of a book (e.g., based on its title, description, or content).
>
> Beyond these two anchor points, the exact scope, features, and design decisions are intentionally left open-ended.
>
> Responsibilities:
>
> - Decide what entities, features, and workflows make sense for an e-library system
> - Decide how the AI summary feature should work and where it fits into the system
> - Identify edge cases, constraints, and real-world considerations that haven't been spelled out
> - Add as many additional features as possible beyond the minimum implied above
> - Regardless of how many features are built, the code must be modular, structured and maintainable.
>
> Tech Stack:
>
> - Node.js
> - Python

The assignment is deliberately open-ended. The goal is not merely to satisfy a checklist but to demonstrate good engineering judgment and the ability to turn an ambiguous requirement into a coherent product.

---

# 4. Primary Project Goals

The backend should provide:

1. User authentication and authorization
2. Digital book catalog management
3. Book metadata management
4. Author/category management
5. Book searching, filtering, sorting and pagination
6. Digital borrowing/access
7. Digital book file access
8. Reading progress
9. Favorites
10. Reviews and ratings
11. Bookmarks
12. AI-powered book summaries
13. Administrative functionality
14. Proper validation and error handling
15. Modular and maintainable architecture

The project should prioritize **quality of architecture and reasoning** over simply implementing the largest possible number of features.

---

# 5. Recommended Technology Stack

Recommended initial stack:

```text
Node.js
Express
PostgreSQL
Prisma
JWT authentication
Zod validation
```

Potential supporting libraries can be chosen during implementation.

Python is **not required merely because it appears in the assignment's tech stack**.

Node.js should be the primary backend.

Python may optionally be introduced later for specialized document processing, such as:

- PDF text extraction
- EPUB text extraction
- document cleaning
- chunking large documents

Do not introduce Python unless there is a concrete reason to do so.

---

# 6. High-Level Architecture

Proposed architecture:

```text
                         ┌───────────────────┐
                         │     Frontend      │
                         └─────────┬─────────┘
                                   │
                                REST API
                                   │
                         ┌─────────▼─────────┐
                         │     Node.js       │
                         │     Express       │
                         ├───────────────────┤
                         │ Authentication     │
                         │ Users              │
                         │ Books              │
                         │ Authors            │
                         │ Categories         │
                         │ Borrowing          │
                         │ Reading            │
                         │ Reviews            │
                         │ Favorites          │
                         │ Bookmarks          │
                         │ AI Summary         │
                         └───┬───────────┬───┘
                             │           │
                       ┌─────▼────┐ ┌────▼─────────────┐
                       │PostgreSQL│ │ Digital Storage  │
                       │          │ │ PDF / EPUB       │
                       └──────────┘ └──────────────────┘
                             │
                       ┌─────▼──────────────────┐
                       │ External Services      │
                       │                        │
                       │ Open Library           │
                       │ AI API → gpt-4o-mini   │
                       └────────────────────────┘
```

The backend should be the central application layer.

External APIs should not become the application's source of truth.

---

# 7. Book Metadata vs Digital Book Files

These must be treated as separate concepts.

## Book metadata

Examples:

- title
- description
- ISBN
- publication date
- publisher
- language
- authors
- categories
- cover

This belongs in PostgreSQL.

## Digital file

Examples:

```text
the-hobbit.pdf
the-hobbit.epub
```

These should be stored outside the database, initially using filesystem storage.

The database stores a reference to the file.

For example:

```text
Book
  │
  └── BookFile
       ├── PDF
       └── EPUB
```

The actual files could initially be stored as:

```text
storage/
└── books/
    ├── 1/
    │   └── book.pdf
    ├── 2/
    │   ├── book.pdf
    │   └── book.epub
    └── ...
```

Do not store large PDF/EPUB binaries directly inside PostgreSQL.

The storage implementation should be abstract enough that it can later be replaced with:

- S3
- Cloudflare R2
- MinIO
- another object-storage provider

without redesigning the entire application.

---

# 8. External Book Metadata API

The project should not manually populate every book.

A free external book metadata source can be used to import information.

## Primary recommendation: Open Library

Open Library provides APIs for book metadata/search.

Potential uses:

- search for books
- retrieve book metadata
- retrieve author information
- retrieve cover information
- identify books/editions

The external API is a **metadata source**, not the application's database.

The architecture should be:

```text
Admin
  │
  │ Search for "The Hobbit"
  ▼
Node backend
  │
  ▼
Open Library
  │
  ▼
Book metadata
  │
  ▼
Admin confirms/imports
  │
  ▼
PostgreSQL
```

After import, normal application searches should query **PostgreSQL**, not Open Library.

The application should not depend on Open Library being available every time a user searches the E-Library.

## External identifiers

Books should retain the original external identifier.

For example:

```text
external_source = "openlibrary"
external_id = "OL12345W"
```

This allows imported records to be traced back to their source.

If useful, this can eventually be normalized into a separate `BookExternalId` table.

---

# 9. Actual E-Book Files

Metadata APIs do not automatically provide a legal collection of downloadable books.

The project therefore needs a separate source for actual digital files.

For development/testing, use books that can legally be redistributed, such as public-domain works from sources such as Project Gutenberg.

Do NOT assume that metadata availability means the corresponding copyrighted PDF/EPUB can legally be downloaded and redistributed.

The project should distinguish:

```text
Book metadata
+
Digital book file
```

The metadata may come from Open Library while the actual digital file comes from a legally distributable source.

---

# 10. Core Entities

Initial database entities:

```text
User
Book
Author
Category
BookAuthor
BookCategory
BookFile

DigitalLoan

Favorite
ReadingProgress
Bookmark
Review

BookSummary
```

Potential future entity:

```text
AIRequest
```

Do not add unnecessary entities merely for the sake of complexity.

---

# 11. User

Proposed fields:

```text
User
----------------
id
name
email
password_hash
role
created_at
updated_at
```

Roles:

```text
USER
ADMIN
```

Passwords must never be stored in plaintext.

Passwords should be hashed using an appropriate password-hashing algorithm.

---

# 12. Book

Proposed initial fields:

```text
Book
----------------
id
title
description
isbn
publication_date
language
publisher
cover_url
external_source
external_id
created_at
updated_at
```

The exact data types and optional/required status should be determined during schema design.

Important:

A `Book` represents a **digital literary work/resource**, not a physical copy.

Do not introduce inventory-related fields.

---

# 13. Author

A book can have multiple authors.

Therefore, do not simply store:

```text
Book.author = "Author Name"
```

Instead:

```text
Author
----------------
id
name
biography
```

and a join table:

```text
BookAuthor
----------------
book_id
author_id
```

This supports:

```text
Book
 ├── Author A
 └── Author B
```

---

# 14. Category

Books may belong to multiple categories.

```text
Category
----------------
id
name
description
```

Join table:

```text
BookCategory
----------------
book_id
category_id
```

Example:

```text
The Hobbit
 ├── Fantasy
 ├── Adventure
 └── Fiction
```

---

# 15. BookFile

Digital files should be modeled separately from metadata.

```text
BookFile
----------------
id
book_id
file_path
file_type
file_size
created_at
```

Possible file types:

```text
PDF
EPUB
```

A single book can have multiple digital formats.

Example:

```text
The Hobbit
 ├── PDF
 └── EPUB
```

These are not multiple copies. They are multiple formats of the same digital book.

---

# 16. Digital Borrowing

The assignment explicitly mentions borrowing.

Implement borrowing as a **digital access entitlement**.

Proposed entity:

```text
DigitalLoan
----------------
id
user_id
book_id
borrowed_at
expires_at
status
```

Possible statuses:

```text
ACTIVE
EXPIRED
```

Potentially:

```text
CANCELLED
```

if later required.

Example:

```text
User A
  ↓
DigitalLoan
  ↓
The Hobbit
```

At the same time:

```text
User B
  ↓
DigitalLoan
  ↓
The Hobbit
```

Both are valid.

There is no inventory limitation.

## No physical return

There does not need to be a `returned_at` field or a physical return workflow.

A loan can simply expire:

```text
borrowed_at = 2026-08-13
expires_at  = 2026-08-27
status      = ACTIVE
```

After expiration:

```text
status = EXPIRED
```

Potential API operations:

```text
POST /api/books/:id/borrow
POST /api/books/:id/renew
```

The exact expiration period is a design decision to be made.

---

# 17. Reading Progress

Track where the user is in a book.

```text
ReadingProgress
----------------
id
user_id
book_id
progress
last_read_at
```

For a simple implementation, `progress` can represent a percentage.

For example:

```text
User: 42
Book: 123
Progress: 63
```

For EPUBs, true page numbers are not always stable, so a future implementation could use a more format-specific locator.

Do not overengineer this initially.

---

# 18. Favorites

```text
Favorite
----------------
user_id
book_id
created_at
```

This is a many-to-many relationship between users and books.

A user can favorite many books.

A book can be favorited by many users.

---

# 19. Reviews and Ratings

Recommended entity:

```text
Review
----------------
id
user_id
book_id
rating
comment
created_at
updated_at
```

Rating should be constrained to:

```text
1 <= rating <= 5
```

A user should normally have only one review per book.

Therefore consider:

```text
UNIQUE(user_id, book_id)
```

The user can update their review rather than creating duplicates.

---

# 20. Bookmarks

Bookmarks are different from reading progress.

Reading progress means:

> Where am I currently reading?

A bookmark means:

> I want to remember this specific location.

Proposed entity:

```text
Bookmark
----------------
id
user_id
book_id
location
note
created_at
```

The exact representation of `location` can evolve based on PDF/EPUB support.

---

# 21. AI Book Summary

AI summarization is a mandatory feature.

The supplied AI service proxies to:

```text
gpt-4o-mini
```

The summary should be treated as an application feature, not something the frontend talks to directly.

Architecture:

```text
Client
  │
  ▼
Node API
  │
  ▼
BookSummaryService
  │
  ▼
AIClient
  │
  ▼
Provided AI API
  │
  ▼
gpt-4o-mini
```

---

# 22. CRITICAL AI API SAFETY RULE

## DO NOT CALL THE PROVIDED AI API DURING DEVELOPMENT/TESTING UNLESS EXPLICITLY AUTHORIZED.

The provided API token has a quota of only:

```text
100 calls
```

Every accidental test request can consume part of that quota.

The agent must **not**:

- call `/v1/chat/completions` just to test connectivity
- send sample prompts
- test the token
- repeatedly regenerate summaries
- call the API while experimenting with unrelated backend code
- create automated tests that hit the real AI API
- use the real AI API during normal unit tests
- repeatedly call `/v1/usage` unnecessarily

The API should be treated as a **limited external resource**.

During development:

- mock the AI client
- stub AI responses
- use dependency injection
- write tests against a fake AI service
- only make a real AI request when explicitly requested

The real token must be stored in an environment variable, never committed to git, never exposed to the frontend, and never printed in logs.

Example:

```env
AI_API_TOKEN=...
```

Do not include the actual token in source code.

---

# 23. Provided AI API Documentation

Base URL:

```text
https://ai-api.userfacet.com
```

## Health endpoint

```text
GET /health
```

Response:

```json
{
  "status": "ok"
}
```

This endpoint is unauthenticated.

However, do not repeatedly poll it during development.

---

## Usage endpoint

```text
GET /v1/usage
```

Authentication:

```text
Authorization: Bearer <AI_API_TOKEN>
```

Response:

```json
{
  "email": "alice@school.edu",
  "used": 3,
  "limit": 100,
  "remaining": 97
}
```

Do not repeatedly call this endpoint while developing.

If an admin AI-usage endpoint is implemented, it should call this only when the administrator explicitly requests usage information.

---

## Chat completions endpoint

```text
POST /v1/chat/completions
```

Authentication:

```text
Authorization: Bearer <AI_API_TOKEN>
```

Request body is compatible with OpenAI chat completion format.

Example structure:

```json
{
  "model": "gpt-4o-mini",
  "messages": [
    {
      "role": "user",
      "content": "..."
    }
  ],
  "max_tokens": 1000
}
```

Important restrictions:

- model is locked to `gpt-4o-mini`
- `max_tokens` is capped at 5000
- quota is 100 calls
- `n` is stripped server-side
- only one completion is returned

---

# 24. AI Error Handling

The backend should properly handle:

```text
400
401
403
404
429
```

Relevant errors:

```text
invalid_api_key
cors_rejected
model_not_found
rate_limit_exceeded
```

The backend should not expose raw provider errors unnecessarily to users.

For example, if the quota is exhausted, the application's response should be something like:

```json
{
  "success": false,
  "error": {
    "code": "AI_UNAVAILABLE",
    "message": "Book summary generation is temporarily unavailable."
  }
}
```

Do not expose the AI token.

---

# 25. AI Summary Caching

Do NOT generate a new AI summary every time a user requests the same book.

This is especially important because of the 100-call quota.

Add:

```text
BookSummary
----------------
id
book_id
summary
summary_type
source_type
model
created_at
updated_at
```

Possible values:

```text
summary_type:
SHORT
DETAILED
```

and:

```text
source_type:
METADATA
CONTENT
```

Example:

```text
BookSummary

book_id: 123
summary_type: SHORT
source_type: METADATA
model: gpt-4o-mini
summary: "..."
```

Workflow:

```text
User requests summary
        │
        ▼
Does cached summary exist?
        │
     ┌──┴──┐
     │     │
    YES    NO
     │     │
     │     ▼
     │   AI API
     │     │
     │     ▼
     │  Save result
     │     │
     └──┬──┘
        ▼
     Response
```

This is an important part of the system design.

---

# 26. AI Summary Input

The simplest implementation should use metadata:

```text
Book title
Author
Description
Categories
```

The AI receives a carefully constructed prompt and generates a summary.

Example conceptual input:

```text
Title: The Hobbit
Author: J. R. R. Tolkien
Description: ...
Categories: Fantasy, Adventure
```

This is preferable as the initial implementation because it minimizes AI calls.

---

# 27. Content-Based AI Summaries

The assignment allows summaries based on content.

This can be implemented as an advanced feature.

Architecture:

```text
BookFile
   │
   ▼
Text extraction
   │
   ▼
Text cleaning
   │
   ▼
Chunking
   │
   ▼
AI summarization
   │
   ▼
Combined summary
```

Do not send an entire 400-page book as one prompt.

Large documents require chunking.

However, content-based summarization may require many AI calls and therefore must be designed around the 100-call quota.

It should not be implemented in a way that accidentally consumes the entire quota from a single book.

A reasonable initial version should therefore implement **metadata-based summarization first**.

---

# 28. AI Client Architecture

Do not place raw HTTP calls to the AI provider inside controllers.

Use an abstraction such as:

```text
src/
└── services/
    └── ai/
        ├── ai.client.js
        └── book-summary.service.js
```

Conceptually:

```text
Book Controller
      │
      ▼
BookSummaryService
      │
      ▼
AIClient
      │
      ▼
External AI API
```

This makes it possible to replace the AI provider later and makes testing much easier.

The `AIClient` should be mockable.

Unit tests should use:

```text
FakeAIClient
```

rather than the real API.

---

# 29. API Design

Proposed REST API structure:

```text
/api

/auth
    POST   /register
    POST   /login
    POST   /logout

/users
    GET    /me
    PUT    /me
    PUT    /me/password

/books
    GET    /
    GET    /:id
    POST   /
    PUT    /:id
    DELETE /:id
    GET    /:id/file
    POST   /:id/borrow
    POST   /:id/renew
    GET    /:id/summary

/authors
    GET    /
    GET    /:id
    POST   /
    PUT    /:id
    DELETE /:id

/categories
    GET    /
    GET    /:id
    POST   /
    PUT    /:id
    DELETE /:id

/favorites
    GET    /
    POST   /:bookId
    DELETE /:bookId

/progress
    GET    /:bookId
    PUT    /:bookId

/reviews
    GET    /book/:bookId
    POST   /book/:bookId
    PUT    /:id
    DELETE /:id

/bookmarks
    GET    /:bookId
    POST   /:bookId
    PUT    /:id
    DELETE /:id
```

Admin-only endpoints should be protected appropriately.

This is a starting design, not a requirement that every endpoint must exist exactly as written.

---

# 30. Search

Book search should be implemented against PostgreSQL.

Example:

```text
GET /api/books?search=harry
```

Potential query parameters:

```text
search
author
category
language
sort
page
limit
```

Example:

```text
GET /api/books?
    search=harry
    &category=fantasy
    &sort=title
    &page=1
    &limit=20
```

The backend should support:

- search
- filtering
- sorting
- pagination

Do not query Open Library for normal user searches.

---

# 31. Authentication

Authentication should be handled by the backend.

Potential approach:

```text
JWT access token
+
refresh token
```

The exact implementation can be decided during coding.

The important separation is:

```text
Authentication
    ↓
Who are you?

Authorization
    ↓
Are you allowed to perform this action?
```

For example:

```text
GET /api/books
```

may be available to authenticated users.

But:

```text
POST /api/books
```

should require an administrator.

---

# 32. Authorization

At minimum:

```text
USER
ADMIN
```

Example:

```text
authenticate
      ↓
authorize(ADMIN)
      ↓
controller
```

Normal users should not be able to:

- delete books
- modify arbitrary books
- upload arbitrary book files
- manage users
- manage categories/authors globally

unless explicitly permitted.

---

# 33. File Access Security

Do not expose the entire storage directory directly.

Bad conceptual design:

```text
GET /storage/books/123/book.pdf
```

Instead:

```text
GET /api/books/:id/file
```

The backend should:

1. Authenticate the user
2. Find the book
3. Check whether the user has permission/access
4. Find the associated `BookFile`
5. Stream the file

This prevents users from simply guessing arbitrary filesystem paths.

---

# 34. Validation

All external input should be validated.

Zod is a reasonable choice.

For example, creating a book might require:

```text
title        required
description  optional
isbn         optional
language     optional
authorIds    array
categoryIds  array
```

Validation should happen before database operations.

---

# 35. Error Handling

Use centralized error handling.

A consistent API response can look like:

```json
{
  "success": false,
  "error": {
    "code": "BOOK_NOT_FOUND",
    "message": "Book not found"
  }
}
```

Use appropriate HTTP statuses:

```text
400 Bad Request
401 Unauthorized / Unauthenticated
403 Forbidden
404 Not Found
409 Conflict
422 Validation Error
500 Internal Server Error
```

Do not expose stack traces or secrets to clients.

---

# 36. Suggested Backend Structure

A maintainable structure could be:

```text
src/
├── app.js
├── server.js
│
├── config/
│   ├── database.js
│   └── env.js
│
├── routes/
│   ├── auth.routes.js
│   ├── books.routes.js
│   ├── users.routes.js
│   ├── authors.routes.js
│   ├── categories.routes.js
│   ├── reviews.routes.js
│   ├── favorites.routes.js
│   ├── progress.routes.js
│   └── bookmarks.routes.js
│
├── controllers/
│   ├── auth.controller.js
│   ├── books.controller.js
│   ├── users.controller.js
│   └── ...
│
├── services/
│   ├── auth.service.js
│   ├── books.service.js
│   ├── borrowing.service.js
│   ├── storage.service.js
│   └── ai/
│       ├── ai.client.js
│       └── book-summary.service.js
│
├── middleware/
│   ├── auth.middleware.js
│   ├── admin.middleware.js
│   ├── validation.middleware.js
│   └── error.middleware.js
│
├── validators/
│   └── ...
│
└── utils/
    ├── password.js
    └── jwt.js
```

The exact folder structure can be adjusted if the chosen framework/library stack makes another organization cleaner.

The key requirement is **separation of responsibilities**.

Controllers should not contain all business logic.

---

# 37. Recommended Development Order

Do not start by implementing random endpoints.

Use this sequence.

## Phase 1 — Requirements

Finalize:

- users
- roles
- books
- digital borrowing
- file access
- search
- reviews
- favorites
- reading progress
- bookmarks
- AI summaries

## Phase 2 — Database Design

Finalize:

- tables
- relationships
- foreign keys
- constraints
- indexes
- cascade behavior

Produce an ER diagram.

## Phase 3 — Project Setup

Set up:

```text
Node.js
Express
PostgreSQL
Prisma
environment configuration
linting/formatting
```

## Phase 4 — Authentication

Implement:

```text
register
login
logout
authentication middleware
authorization middleware
```

## Phase 5 — Book Catalog

Implement:

```text
books
authors
categories
relationships
CRUD
```

## Phase 6 — External Metadata Import

Implement Open Library integration.

Admin workflow:

```text
search external API
→ inspect result
→ import metadata
→ store locally
```

## Phase 7 — Digital Files

Implement:

```text
book upload
cover upload
file metadata
secure file streaming
```

## Phase 8 — Digital Borrowing

Implement:

```text
borrow
check active loan
expiration
renewal
access control
```

## Phase 9 — User Features

Implement:

```text
favorites
reading progress
bookmarks
reviews
ratings
```

## Phase 10 — Search

Implement:

```text
search
filtering
sorting
pagination
```

## Phase 11 — AI Summary

Implement:

```text
AI client abstraction
metadata-based summary
summary persistence
summary caching
AI error handling
mocked tests
```

Only after this works should content-based summarization be considered.

## Phase 12 — Security and Quality

Add:

```text
input validation
centralized errors
rate limiting
secure headers
file validation
authorization
logging
```

## Phase 13 — Testing

Test:

```text
authentication
authorization
book CRUD
search
borrowing
loan expiration
file access
favorites
reviews
progress
AI summary
AI failure handling
```

AI tests must use a mock/fake AI client.

## Phase 14 — Documentation

Document:

```text
architecture
database schema
ER diagram
API endpoints
authentication
borrowing model
file storage
AI integration
environment variables
setup instructions
testing instructions
```

---

# 38. Potential Advanced Features

The assignment explicitly encourages additional features.

Good candidates include:

### Book recommendations

Recommend books based on:

- favorites
- ratings
- reading history
- categories

This can initially be implemented without AI.

AI recommendations could be considered later.

### Recently read

Show books the user has recently accessed.

### Most popular books

Based on:

- borrow count
- favorites
- ratings

### Trending books

Based on activity over a recent period.

### Admin dashboard

Statistics such as:

```text
total users
total books
active loans
most borrowed books
most favorited books
average ratings
AI summaries generated
AI quota remaining
```

### Multiple digital formats

Allow:

```text
PDF
EPUB
```

for the same book.

### AI summary variants

For example:

```text
Short summary
Detailed summary
Key themes
Character overview
```

These should be cached independently.

Do not implement every possible feature just because it is possible. Prioritize coherent architecture.

---

# 39. Features That Should NOT Be Added

Avoid adding features merely because traditional library-management tutorials contain them.

Do not introduce:

```text
physical copies
inventory count
shelves
rack numbers
physical locations
physical return processing
late physical-return fines
copy availability
librarian checkout desk
```

unless the requirements explicitly change.

The application is an **E-Library**.

---

# 40. Important Edge Cases

The final system should consider:

### User

- duplicate email
- invalid email
- incorrect password
- deleted/disabled account
- unauthorized admin operation

### Books

- duplicate ISBN
- duplicate external ID
- missing metadata
- book with multiple authors
- book with multiple categories
- deleted book with existing loans/reviews
- missing digital file

### Borrowing

- borrowing the same book twice
- expired loan
- renewal of expired loan
- accessing a book without an active loan
- deleting a book with active loans

### Reviews

- multiple reviews from same user
- rating outside 1–5
- reviewing inaccessible/nonexistent books

### Files

- unsupported format
- oversized file
- malicious file upload
- missing file
- unauthorized file access
- path traversal

### AI

- invalid AI token
- provider unavailable
- quota exhausted
- timeout
- malformed provider response
- duplicate summary requests
- summary generation for a book with insufficient metadata

---

# 41. AI Testing Strategy

This deserves special emphasis.

The real AI API should NOT be used for ordinary automated testing.

Define an interface/abstraction similar to:

```text
AIClient
    generateSummary(input)
```

Production implementation:

```text
RealAIClient
    → provided AI API
```

Testing implementation:

```text
FakeAIClient
    → returns deterministic fake summary
```

Example fake response:

```text
"This is a test summary."
```

Unit tests should use `FakeAIClient`.

This allows tests such as:

```text
BookSummaryService
      │
      ▼
FakeAIClient
      │
      ▼
deterministic response
```

without consuming any quota.

The real API should only be used for an explicitly authorized integration test.

---

# 42. Environment Variables

Sensitive configuration should be environment-based.

Potential `.env`:

```env
DATABASE_URL=...
JWT_SECRET=...
AI_API_TOKEN=...
PORT=3000
STORAGE_PATH=./storage
```

`.env` must be in `.gitignore`.

Never commit:

```text
AI_API_TOKEN
JWT_SECRET
database passwords
```

Do not print environment secrets in logs.

---

# 43. Core Design Principle

The system should be designed around this relationship:

```text
User
 │
 ├── borrows/accesses ──> Digital Book
 │
 ├── favorites ─────────> Digital Book
 │
 ├── reviews ───────────> Digital Book
 │
 ├── bookmarks ─────────> Digital Book
 │
 └── reading progress ──> Digital Book

Digital Book
 │
 ├── metadata
 ├── authors
 ├── categories
 ├── digital files
 └── AI summaries
```

A digital book is a reusable resource.

Borrowing grants **user access**, not ownership of a physical copy.

---

# 44. Final Recommended Scope

For the first complete version, implement:

### Mandatory/core

- User registration/login
- User roles
- Book catalog
- Authors
- Categories
- Book metadata
- External metadata import
- Digital book file storage
- Secure book access
- Digital borrowing
- Loan expiration
- Search
- Filtering
- Sorting
- Pagination
- AI book summaries

### Strong additional features

- Favorites
- Reading progress
- Reviews/ratings
- Bookmarks
- Admin management
- AI summary caching
- AI usage monitoring

### Advanced, only if time permits

- Content-based summaries
- PDF/EPUB text extraction
- AI recommendations
- Trending/popular books
- Multiple summary formats
- Admin analytics dashboard

---

# 45. Most Important Instructions for the Implementing Agent

1. **Treat this as an E-Library, not a physical library.**
2. Do not introduce physical inventory or book-copy concepts.
3. Borrowing means digital access/entitlement.
4. The same book can be borrowed by unlimited users simultaneously.
5. Do not implement physical returns unless requirements explicitly change.
6. Keep book metadata separate from actual digital files.
7. Use PostgreSQL as the application's source of truth.
8. Use Open Library as an optional metadata-import source, not as the application's live database.
9. Keep the external AI API behind an internal service abstraction.
10. Never expose the AI token to the frontend.
11. Never hardcode the AI token.
12. **Do not call the real AI API during development/testing unless explicitly instructed to do so.**
13. Mock/fake the AI client for tests.
14. Remember that the AI quota is only 100 calls.
15. Cache/persist generated summaries to avoid repeated AI calls.
16. Do not introduce Python unless there is a concrete technical reason to use it.
17. Keep controllers, services, validation, middleware, storage and external integrations separated.
18. Validate all external input.
19. Secure digital file access.
20. Prioritize maintainability and sound design over adding arbitrary features.

---

# 46. Immediate Next Step

Before writing implementation code, the next design task should be:

**Finalize the complete PostgreSQL database schema.**

That should include:

```text
User
Book
Author
Category
BookAuthor
BookCategory
BookFile
DigitalLoan
Favorite
ReadingProgress
Bookmark
Review
BookSummary
```

For each table, determine:

- exact columns
- PostgreSQL data types
- primary keys
- foreign keys
- nullable fields
- default values
- unique constraints
- indexes
- relationships
- deletion/cascade behavior
- status enums
- timestamp behavior

After that, design the complete REST API around the finalized schema.

Do **not** begin by writing large amounts of application code before the schema and API contracts have been reviewed.

And again: **do not use the supplied AI API token as a playground or for test calls. Mock it until a real integration test is explicitly required.**
