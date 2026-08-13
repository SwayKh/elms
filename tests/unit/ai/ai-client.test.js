const { test } = require('node:test');
const assert = require('node:assert/strict');
const { AIClient } = require('../../../src/services/ai/ai.client');

function makeClient() {
  return new AIClient({ baseUrl: 'https://ai.example.com', apiKey: 'test-key', model: 'gpt-4o-mini' });
}

test('AIClient refuses to run without an API key', () => {
  assert.throws(() => new AIClient({ baseUrl: 'https://x', apiKey: '' }));
});

test('generateSummary returns trimmed content on success', async (t) => {
  const client = makeClient();
  const originalFetch = global.fetch;
  t.after(() => {
    global.fetch = originalFetch;
  });

  global.fetch = async (url, opts) => {
    assert.equal(url, 'https://ai.example.com/v1/chat/completions');
    assert.equal(opts.headers.Authorization, 'Bearer test-key');
    const body = JSON.parse(opts.body);
    assert.equal(body.model, 'gpt-4o-mini');
    assert.equal(body.messages[0].role, 'user');
    return {
      ok: true,
      json: async () => ({ choices: [{ message: { content: '  A short summary.  ' } }] }),
    };
  };

  const summary = await client.generateSummary('some prompt');
  assert.equal(summary, 'A short summary.');
});

test('generateSummary maps 429 to AI_RATE_LIMITED', async (t) => {
  const client = makeClient();
  const originalFetch = global.fetch;
  t.after(() => {
    global.fetch = originalFetch;
  });

  global.fetch = async () => ({ ok: false, status: 429, statusText: 'Too Many Requests' });

  await assert.rejects(
    () => client.generateSummary('x'),
    (err) => err.code === 'AI_RATE_LIMITED' && err.statusCode === 503,
  );
});

test('generateSummary maps 401 to AI_AUTH_ERROR', async (t) => {
  const client = makeClient();
  const originalFetch = global.fetch;
  t.after(() => {
    global.fetch = originalFetch;
  });

  global.fetch = async () => ({ ok: false, status: 401, statusText: 'Unauthorized' });

  await assert.rejects(() => client.generateSummary('x'), (err) => err.code === 'AI_AUTH_ERROR');
});

test('generateSummary maps a network failure to AI_UNAVAILABLE', async (t) => {
  const client = makeClient();
  const originalFetch = global.fetch;
  t.after(() => {
    global.fetch = originalFetch;
  });

  global.fetch = async () => {
    throw new TypeError('fetch failed');
  };

  await assert.rejects(() => client.generateSummary('x'), (err) => err.code === 'AI_UNAVAILABLE');
});

test('generateSummary rejects an invalid provider response', async (t) => {
  const client = makeClient();
  const originalFetch = global.fetch;
  t.after(() => {
    global.fetch = originalFetch;
  });

  global.fetch = async () => ({ ok: true, json: async () => ({ choices: [] }) });

  await assert.rejects(() => client.generateSummary('x'), (err) => err.code === 'AI_INVALID_RESPONSE');
});
