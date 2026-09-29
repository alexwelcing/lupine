import assert from 'node:assert/strict';
import test from 'node:test';

import { assertPublicLabels, privatePathReason } from './sphere-grid-label-policy.mjs';

const rejectedPaths = [
  '.env',
  '.env.local',
  '.envrc',
  'repo/.worktrees/private-card/evidence.md',
  '~/.hermes/kanban/boards/lupine/logs/worker.log',
  '~/.hermes/kanban/boards/lupine/workspaces/t_private/result.json',
  '~/.hermes/kanban/boards/lupine/attachments/t_private/secret.txt',
  'node-hermes://file/~/.hermes/kanban/boards/lupine/attachments/t_private/secret.txt',
  '/home/alex/private/file.md',
  'node-sphere://file//home/alex/private/file.md',
  'C:\\Users\\alex\\private\\file.md',
];

test('rejects sensitive, operational, and checkout-specific paths', () => {
  for (const value of rejectedPaths) {
    assert.ok(privatePathReason(value), `expected rejection for ${value}`);
    assert.throws(
      () => assertPublicLabels([{ text: 'otherwise harmless', description: value }]),
      /refusing/,
    );
  }
});

test('checks every public string field rather than a fixed field allowlist', () => {
  assert.throws(
    () => assertPublicLabels([{ text: '.env.production', detail: 'file · hermes-core' }]),
    /label text/,
  );
  assert.throws(
    () => assertPublicLabels([{ text: 'safe', future_path_field: 'repo/.worktrees/card' }]),
    /label future_path_field/,
  );
});

test('allows portable public labels and the non-operational board root', () => {
  const labels = [
    {
      description: '../lupine-rhizo/contracts/evidence.json',
      id: 'node-lupine-science://file/../lupine-rhizo/contracts/evidence.json',
      node_id: 'lupine-science://file/../lupine-rhizo/contracts/evidence.json',
      text: 'evidence.json',
    },
    {
      description: '~/.hermes/kanban/boards/lupine',
      id: 'node-hermes-local-extensions://config/~/.hermes/kanban/boards/lupine',
      text: 'lupine',
    },
  ];

  assert.doesNotThrow(() => assertPublicLabels(labels));
});
