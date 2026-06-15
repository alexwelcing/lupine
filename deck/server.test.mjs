import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';

import { hashAccessCode, hashPassword, loadAccessRules, normalizeDeckPath, createDeckServer } from './server.mjs';

function request(server, path) {
  return new Promise((resolve, reject) => {
    const { port } = server.address();
    http.get(`http://127.0.0.1:${port}${path}`, (res) => {
      let body = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => resolve({ status: res.statusCode, body }));
    }).on('error', reject);
  });
}

test('normalizes protected deck paths to local html paths', () => {
  assert.equal(normalizeDeckPath('deck.html'), '/deck.html');
  assert.equal(normalizeDeckPath('/partner.html?x=1'), '/partner.html');
  assert.throws(() => normalizeDeckPath('/notes.txt'), /must end in \.html/);
});

test('loads single hashed access-code rule', () => {
  const hash = hashAccessCode('long investor phrase');
  const rules = loadAccessRules({
    INVESTOR_DECK_ACCESS_CODE_HASH: hash,
    INVESTOR_DECK_DEFAULT_PATH: '/deck.html',
  });

  assert.equal(rules.length, 1);
  assert.equal(rules[0].deckPath, '/deck.html');
  assert.equal(rules[0].investor, 'seed');
  assert.equal(rules[0].accessCodeHash, hash);
  assert.equal(hashPassword('long investor phrase'), hash);
});

test('loads per-investor access code rules from json', () => {
  const rules = loadAccessRules({
    INVESTOR_DECK_ACCESS_JSON: JSON.stringify([
      {
        id: 'lead',
        accessCode: 'lead-code',
        deck: '/deck.html',
      },
      {
        id: 'strategic',
        codeHash: hashAccessCode('strategic-code'),
        deckPath: '/one-pager.html',
      },
    ]),
  });

  assert.equal(rules.length, 2);
  assert.deepEqual(
    rules.map((rule) => [rule.id, rule.deckPath]),
    [
      ['lead', '/deck.html'],
      ['strategic', '/one-pager.html'],
    ],
  );
  assert.equal(rules[0].accessCodeHash, hashAccessCode('lead-code'));
  assert.equal(rules[1].accessCodeHash, hashAccessCode('strategic-code'));
  assert.equal(rules[0].investor, 'lead');
});

test('keeps legacy password json keys working', () => {
  const rules = loadAccessRules({
    INVESTOR_DECK_ACCESS_JSON: JSON.stringify([
      {
        id: 'legacy',
        password: 'legacy-password',
        deck: '/deck.html',
      },
    ]),
  });

  assert.equal(rules.length, 1);
  assert.equal(rules[0].accessCodeHash, hashAccessCode('legacy-password'));
});

test('resolves HTML include markers for public pages', async () => {
  const server = createDeckServer();
  await new Promise((resolve) => server.listen(0, resolve));

  try {
    const { status, body } = await request(server, '/methodology.html');
    assert.equal(status, 200);
    assert.match(body, /<nav class="site-nav"/);
    assert.match(body, /<footer class="site-footer"/);
    assert.doesNotMatch(body, /<!--\s*include:/);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
