const { ApiError } = require('../../utils/ApiError');

/**
 * Thin client for the provided AI API (OpenAI-compatible chat completions).
 *
 * The API is treated as a limited external resource (100-call quota). This
 * class is never used by automated tests — tests use FakeAIClient instead.
 */
class AIClient {
  constructor({ baseUrl, apiKey, model = 'gpt-4o-mini', timeoutMs = 60000 }) {
    if (!apiKey) {
      throw new Error('AI_API_TOKEN is not configured');
    }
    this.baseUrl = baseUrl.replace(/\/+$/, '');
    this.apiKey = apiKey;
    this.model = model;
    this.timeoutMs = timeoutMs;
  }

  async generateSummary(prompt, { maxTokens = 1000 } = {}) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    let response;
    try {
      response = await fetch(`${this.baseUrl}/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          messages: [{ role: 'user', content: prompt }],
          max_tokens: Math.min(maxTokens, 5000),
        }),
        signal: controller.signal,
      });
    } catch (err) {
      const aborted = err.name === 'AbortError';
      throw ApiError.unavailable(
        'Book summary generation is temporarily unavailable.',
        aborted ? 'AI_TIMEOUT' : 'AI_UNAVAILABLE',
      );
    } finally {
      clearTimeout(timer);
    }

    if (response.ok) {
      const data = await response.json().catch(() => null);
      const content = data?.choices?.[0]?.message?.content;
      if (typeof content !== 'string' || !content.trim()) {
        throw ApiError.badGateway(
          'Book summary generation returned an invalid response.',
          'AI_INVALID_RESPONSE',
        );
      }
      return content.trim();
    }

    throw this._mapError(response.status, response.statusText);
  }

  _mapError(status) {
    if (status === 429) {
      return ApiError.unavailable(
        'Book summary generation is temporarily unavailable.',
        'AI_RATE_LIMITED',
      );
    }
    if (status === 401 || status === 403) {
      return ApiError.unavailable(
        'Book summary generation is temporarily unavailable.',
        'AI_AUTH_ERROR',
      );
    }
    if (status === 400 || status === 404) {
      return ApiError.unavailable(
        'Book summary generation is temporarily unavailable.',
        'AI_UNAVAILABLE',
      );
    }
    return ApiError.badGateway(
      'Book summary generation is temporarily unavailable.',
      'AI_UNAVAILABLE',
    );
  }
}

module.exports = { AIClient };
