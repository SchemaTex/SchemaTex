import assert from 'node:assert/strict';
import { test } from 'node:test';

const routes = ["website"];

for (const route of routes) {
  const { POST } = await import(new URL(`../../${route}/app/proxy/api/event/route.ts`, import.meta.url));
  test(`${route}: forwards the visitor IP, raw body and upstream response`, async () => {
    const originalFetch = globalThis.fetch;
    try {
      for (const [ipHeaders, expectedIp] of [
        [{ 'cf-connecting-ip': '203.0.113.7', 'x-real-ip': '172.68.0.1' }, '203.0.113.7'],
        [{ 'x-real-ip': '203.0.113.10', 'x-forwarded-for': '198.51.100.20, 192.0.2.30' }, '203.0.113.10'],
        [{ 'x-forwarded-for': '198.51.100.20 , 192.0.2.30' }, '198.51.100.20'],
      ]) {
        let calls = 0;
        const body = new Uint8Array([0x7b, 0x20, 0xff, 0x0a, 0x7d]);
        globalThis.fetch = async (url, init) => {
          calls++;
          assert.equal(url, 'https://plausible-analytics-ce-production-205c.up.railway.app/api/event');
          assert.equal(init.method, 'POST');
          assert.deepEqual(new Uint8Array(init.body), body);
          assert.deepEqual(Object.fromEntries(init.headers), {
            'content-type': 'text/plain;charset=UTF-8',
            'user-agent': 'Mozilla/5.0 test browser',
            'x-plausible-ip': expectedIp,
            'x-forwarded-for': expectedIp,
          });
          return new Response('accepted', { status: 202 });
        };
        const response = await POST(new Request('https://example.com/proxy/api/event', {
          method: 'POST',
          headers: {
            ...ipHeaders,
            'content-type': 'text/plain;charset=UTF-8',
            'user-agent': 'Mozilla/5.0 test browser',
            cookie: 'session=private',
            authorization: 'Bearer private',
            'x-plausible-ip': '192.0.2.99',
          },
          body,
        }));
        assert.equal(calls, 1);
        assert.equal(response.status, 202);
        assert.equal(await response.text(), 'accepted');
      }
      for (const status of [400, 429, 500]) {
        globalThis.fetch = async () => new Response('upstream error', { status });
        const response = await POST(new Request('https://example.com/proxy/api/event', { method: 'POST', body: 'event' }));
        assert.equal(response.status, status);
        assert.equal(await response.text(), 'upstream error');
      }
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
}
