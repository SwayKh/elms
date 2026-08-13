const { env } = require('../../config/env');
const { AIClient } = require('./ai.client');
const { FakeAIClient } = require('./fake-ai.client');

/**
 * Factory used by the app. In tests / dev-without-token, a fake client is
 * returned so the real 100-call quota is never consumed accidentally.
 */
function createAIClient() {
  const useFake = env.AI_CLIENT === 'fake' || env.NODE_ENV === 'test' || !env.AI_API_TOKEN;
  if (useFake) {
    return new FakeAIClient({ model: env.AI_MODEL });
  }
  return new AIClient({
    baseUrl: env.AI_API_BASE_URL,
    apiKey: env.AI_API_TOKEN,
    model: env.AI_MODEL,
  });
}

module.exports = { createAIClient };
