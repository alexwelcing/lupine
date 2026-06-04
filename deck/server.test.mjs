import test from 'node:test';
import assert from 'node:assert/strict';

import { hashPassword, loadAccessRules, normalizeDeckPath } from './server.mjs';

test('normalizes protected deck paths to local html paths', () => {
  assert.equal(normalizeDeckPath('deck.html'), '/deck.html');
  assert.equal(normalizeDeckPath('/partner.html?x=1'), '/partner.html');
  assert.throws(() => normalizeDeckPath('/notes.txt'), /must end in \.html/);
});

test('loads single hashed password rule', () => {
  const hash = hashPassword('long investor phrase');
  const rules = loadAccessRules({
    INVESTOR_DECK_PASSWORD_HASH: hash,
    INVESTOR_DECK_DEFAULT_PATH: '/deck.html',
  });

  assert.equal(rules.length, 1);
  assert.equal(rules[0].deckPath, '/deck.html');
  assert.equal(rules[0].passwordHash, hash);
});

test('loads per-password deck rules from json', () => {
  const rules = loadAccessRules({
    INVESTOR_DECK_ACCESS_JSON: JSON.stringify([
      {
        id: 'lead',
        password: 'lead-password',
        deck: '/deck.html',
      },
      {
        id: 'strategic',
        passwordHash: hashPassword('strategic-password'),
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
});
