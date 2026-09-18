import test from 'node:test';
import assert from 'node:assert/strict';
import { createAuthorization, authorizationCode, base64url, requestTokens, SCOPES } from '../extension/auth.js';

test('PKCE uses an unpredictable verifier, S256 challenge and separate state', async () => {
  const auth = await createAuthorization('client', 'https://example.chromiumapp.org/spotify');
  const second = await createAuthorization('client', 'https://example.chromiumapp.org/spotify');
  const url = new URL(auth.url);
  assert.notEqual(auth.state, second.state);
  assert.notEqual(auth.verifier, second.verifier);
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(auth.verifier));
  assert.equal(url.searchParams.get('code_challenge'), base64url(new Uint8Array(digest)));
  assert.equal(url.searchParams.get('code_challenge_method'), 'S256');
  assert.equal(url.searchParams.get('scope'), SCOPES);
  assert.ok(!url.searchParams.has('client_secret'));
});

test('OAuth rejects wrong state, wrong redirect, denial and missing code', () => {
  const redirect = 'https://example.chromiumapp.org/spotify';
  assert.equal(authorizationCode(`${redirect}?state=expected&code=code`, redirect, 'expected'), 'code');
  for (const callback of [`${redirect}?state=wrong&code=code`, 'https://evil.test/spotify?state=expected&code=code', `${redirect}?state=expected&error=access_denied`, `${redirect}?state=expected`]) {
    assert.throws(() => authorizationCode(callback, redirect, 'expected'));
  }
});

test('token exchange uses form body, validates scopes and reports revoked refresh credentials', async (t) => {
  let outcome = 'ok';
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    assert.equal(url, 'https://accounts.spotify.com/api/token');
    assert.equal(options.method, 'POST');
    assert.equal(options.body.get('code_verifier'), 'verifier');
    return outcome === 'revoked' ? Response.json({}, { status: 400 })
      : Response.json({ access_token: 'access', refresh_token: 'refresh', expires_in: 3600, scope: outcome === 'ok' ? SCOPES : 'user-read-private' });
  });
  assert.equal((await requestTokens({ code_verifier: 'verifier' })).accessToken, 'access');
  outcome = 'missing-scopes';
  await assert.rejects(requestTokens({ code_verifier: 'verifier' }), /permissions/);
  outcome = 'revoked';
  await assert.rejects(requestTokens({ code_verifier: 'verifier' }), { status: 401 });
});
