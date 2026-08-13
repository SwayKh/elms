const { ApiError } = require('../../utils/ApiError');

function buildMetadataPrompt(book, summaryType) {
  const authors =
    book.authors?.map((rel) => rel.author?.name).filter(Boolean).join(', ') || 'Unknown author';
  const categories =
    book.categories?.map((rel) => rel.category?.name).filter(Boolean).join(', ') || 'Uncategorized';

  const scope =
    summaryType === 'DETAILED'
      ? 'Write a detailed multi-paragraph summary of the book (aim for 3-4 short paragraphs).'
      : 'Write a short summary of the book (2-3 sentences).';

  return [
    `You are a helpful assistant that writes summaries for an e-library catalog.`,
    scope,
    `Base the summary ONLY on the metadata below. Do not invent facts that are not present.`,
    ``,
    `Title: ${book.title}`,
    `Author(s): ${authors}`,
    `Publisher: ${book.publisher || 'Unknown'}`,
    `Publication date: ${book.publicationDate ? book.publicationDate.toISOString().slice(0, 10) : 'Unknown'}`,
    `Language: ${book.language || 'Unknown'}`,
    `Categories: ${categories}`,
    `Description: ${book.description || 'No description available.'}`,
    ``,
    `Summary:`,
  ].join('\n');
}

class BookSummaryService {
  constructor(prismaClient, aiClient) {
    this.prisma = prismaClient;
    this.aiClient = aiClient;
  }

  async getSummary(bookId, type = 'SHORT') {
    const summaryType = type === 'DETAILED' ? 'DETAILED' : 'SHORT';
    const sourceType = 'METADATA';

    const cached = await this.prisma.bookSummary.findUnique({
      where: {
        bookId_summaryType_sourceType: { bookId, summaryType, sourceType },
      },
    });
    if (cached) {
      return cached;
    }

    const book = await this.prisma.book.findUnique({
      where: { id: bookId },
      include: {
        authors: { include: { author: true } },
        categories: { include: { category: true } },
      },
    });
    if (!book) {
      throw ApiError.notFound('Book not found', 'BOOK_NOT_FOUND');
    }

    const prompt = buildMetadataPrompt(book, summaryType);
    const summary = await this.aiClient.generateSummary(prompt);

    return this.prisma.bookSummary.create({
      data: {
        bookId,
        summary,
        summaryType,
        sourceType,
        model: this.aiClient.model || 'gpt-4o-mini',
      },
    });
  }
}

module.exports = { BookSummaryService, buildMetadataPrompt };
