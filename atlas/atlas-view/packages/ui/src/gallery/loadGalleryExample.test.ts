import { describe, it, expect } from 'vitest';
import { parseKnowledgeLabelsPayload } from './loadGalleryExample';

describe('parseKnowledgeLabelsPayload', () => {
  it('returns an empty array for non-object/non-array payloads', () => {
    expect(parseKnowledgeLabelsPayload(null)).toEqual([]);
    expect(parseKnowledgeLabelsPayload(undefined)).toEqual([]);
    expect(parseKnowledgeLabelsPayload('labels')).toEqual([]);
    expect(parseKnowledgeLabelsPayload(42)).toEqual([]);
  });

  it('returns an empty array when labels property is missing or not an array', () => {
    expect(parseKnowledgeLabelsPayload({})).toEqual([]);
    expect(parseKnowledgeLabelsPayload({ labels: 'nope' })).toEqual([]);
  });

  it('parses a top-level array of labels', () => {
    const payload = [
      {
        id: 'sphere-test',
        kind: 'sphere',
        text: 'Test Sphere',
        detail: '10 nodes · 2 projects',
        sphere_id: 'test',
        sphere_index: 0,
        position: [1, 2, 3],
      },
    ];
    const labels = parseKnowledgeLabelsPayload(payload);
    expect(labels).toHaveLength(1);
    expect(labels[0]).toMatchObject({
      id: 'sphere-test',
      kind: 'sphere',
      text: 'Test Sphere',
      detail: '10 nodes · 2 projects',
      sphereId: 'test',
      sphereIndex: 0,
      position: [1, 2, 3],
    });
  });

  it('parses labels wrapped in { labels: [...] }', () => {
    const payload = {
      labels: [
        {
          id: 'node-1',
          kind: 'node',
          text: 'hermes-agent',
          node_kind: 'repo',
          node_id: '/home/alex/.hermes/hermes-agent',
          atom_index: 5,
          sphere_id: 'core',
          sphere_index: 1,
          degree: 7,
          salience: 1,
          position: [4, 5, 6],
        },
      ],
    };
    const labels = parseKnowledgeLabelsPayload(payload);
    expect(labels).toHaveLength(1);
    expect(labels[0]).toMatchObject({
      id: 'node-1',
      kind: 'node',
      text: 'hermes-agent',
      nodeKind: 'repo',
      nodeId: '/home/alex/.hermes/hermes-agent',
      atomIndex: 5,
      sphereId: 'core',
      sphereIndex: 1,
      degree: 7,
      salience: 1,
      position: [4, 5, 6],
    });
  });

  it('leaves salience undefined when absent', () => {
    const payload = {
      labels: [
        {
          id: 'node-no-salience',
          kind: 'node',
          text: 'plain',
          position: [0, 0, 0],
        },
      ],
    };
    const labels = parseKnowledgeLabelsPayload(payload);
    expect(labels).toHaveLength(1);
    expect(labels[0].salience).toBeUndefined();
  });

  it('skips malformed labels', () => {
    const payload = {
      labels: [
        { text: 'missing position' },
        { position: [1, 2] },
        { text: 'ok', position: [1, 2, 3] },
      ],
    };
    const labels = parseKnowledgeLabelsPayload(payload);
    expect(labels).toHaveLength(1);
    expect(labels[0].text).toBe('ok');
  });

  it('coerces numeric positions to numbers', () => {
    const payload = {
      labels: [
        {
          id: 'sphere-coerce',
          kind: 'sphere',
          text: 'Coerce',
          position: ['1.5', '2.5', '3.5'],
        },
      ],
    };
    const labels = parseKnowledgeLabelsPayload(payload);
    expect(labels[0].position).toEqual([1.5, 2.5, 3.5]);
  });
});
