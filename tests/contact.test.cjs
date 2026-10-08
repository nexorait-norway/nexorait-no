// Run with: node --test tests/contact.test.cjs
// Browser-free regression tests. No production requests or customer data.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const crypto = require('node:crypto');

function harness(fetchImpl) {
  let listener;
  const controls = [
    { disabled: false }, { disabled: false }, { disabled: false }
  ];
  const submit = { disabled: false, textContent: 'Send' };
  const status = { textContent: '' };
  const form = {
    action: 'https://example.invalid/api/inquiries',
    reportValidity: () => true,
    querySelector: () => submit,
    querySelectorAll: () => controls,
    addEventListener: (event, cb) => { if (event === 'submit') listener = cb; },
    setAttribute: () => {}
  };
  const data = { name: 'Testkunde', email: 'test@example.invalid', kind: 'other', message: 'Hei', contact_permission: 'on' };
  class MockFormData {
    constructor() {}
    get(key) { return data[key] ?? null; }
  }
  const context = {
    document: { getElementById: id => ({ 'contact-form': form, 'contact-status': status })[id] },
    window: { crypto: { getRandomValues: a => crypto.randomFillSync(a) } },
    FormData: MockFormData,
    fetch: fetchImpl,
    AbortController,
    setTimeout,
    clearTimeout
  };
  vm.runInNewContext(fs.readFileSync('contact.js', 'utf8'), context, { filename: 'contact.js' });
  return {
    submit: async () => listener({ preventDefault() {} }),
    data, status, submitButton: submit, controls
  };
}

test('successful save shows ticket receipt and prevents duplicate submission', async () => {
  const requests = [];
  const h = harness(async (_url, opts) => {
    requests.push(JSON.parse(opts.body));
    return { ok: true, json: async () => ({ saved: true, ticket_id: 'NXR-2026-123456' }) };
  });
  await h.submit();
  assert.equal(requests.length, 1);
  assert.match(h.status.textContent, /NXR-2026-123456/);
  assert.equal(h.submitButton.disabled, true);
  await h.submit();
  assert.equal(requests.length, 1);
});

test('failed request retries with same request_id for identical payload', async () => {
  const ids = [];
  let attempt = 0;
  const h = harness(async (_url, opts) => {
    ids.push(JSON.parse(opts.body).request_id);
    if (++attempt === 1) throw new Error('temporary network failure');
    return { ok: true, json: async () => ({ saved: true, ticket_id: 'NXR-2026-123457' }) };
  });
  await h.submit();
  assert.equal(h.submitButton.disabled, false);
  await h.submit();
  assert.equal(ids.length, 2);
  assert.equal(ids[0], ids[1]);
  assert.match(ids[0], /^[a-f0-9]{40}$/);
});

test('changed payload after failure creates a new request_id', async () => {
  const ids = [];
  const h = harness(async (_url, opts) => {
    ids.push(JSON.parse(opts.body).request_id);
    throw new Error('offline');
  });
  await h.submit();
  h.data.message = 'Endret melding';
  await h.submit();
  assert.notEqual(ids[0], ids[1]);
});

test('HTTP success without saved:true must not claim success', async () => {
  const h = harness(async () => ({ ok: true, json: async () => ({ saved: false, error: 'Not committed' }) }));
  await h.submit();
  assert.equal(h.submitButton.disabled, false);
  assert.match(h.status.textContent, /Not committed/);
  assert.doesNotMatch(h.status.textContent, /Henvendelsen er lagret/);
});
