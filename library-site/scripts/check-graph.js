#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const GRAPH_PATH = path.join(ROOT, 'dist', 'data', 'knowledge-graph.json');

function fail(message, details = null) {
  console.error(`[graph-check] ${message}`);
  if (details) console.error(JSON.stringify(details, null, 2));
  process.exitCode = 1;
}

if (!fs.existsSync(GRAPH_PATH)) {
  fail('knowledge-graph.json is missing. Run npm run build first.');
  process.exit();
}

const graph = JSON.parse(fs.readFileSync(GRAPH_PATH, 'utf8'));
const nodeIds = new Set();
const duplicateNodes = [];
for (const node of graph.nodes || []) {
  if (nodeIds.has(node.id)) duplicateNodes.push(node.id);
  nodeIds.add(node.id);
}

const badLinks = [];
const missingProvenance = [];
for (const link of graph.links || []) {
  if (!nodeIds.has(link.source) || !nodeIds.has(link.target)) badLinks.push(link);
  if (!link.provenance?.source || !link.provenance?.method || !link.provenance?.confidence) {
    missingProvenance.push(link.id || `${link.source}->${link.target}:${link.relation}`);
  }
}

const missingPositions = (graph.nodes || []).filter((node) =>
  !node.position ||
  !Number.isFinite(node.position.x) ||
  !Number.isFinite(node.position.y)
);

const relationTypes = new Set(Object.keys(graph.ontology?.relationTypes || {}));
const unknownRelations = (graph.links || []).filter((link) => !relationTypes.has(link.relation));
const confidenceValues = new Set(['declared', 'derived', 'extracted-reviewed', 'suggested']);
const unknownConfidence = (graph.links || []).filter((link) => !confidenceValues.has(link.provenance?.confidence));

if (graph.schema !== 'lupine-library-knowledge-graph-v1') fail('unexpected graph schema', { schema: graph.schema });
if (graph.scope !== 'library-only') fail('graph scope must stay library-only', { scope: graph.scope });
if (duplicateNodes.length) fail('duplicate node ids', duplicateNodes);
if (badLinks.length) fail('links reference missing nodes', badLinks.slice(0, 10));
if (missingPositions.length) fail('nodes missing deterministic positions', missingPositions.slice(0, 10).map(node => node.id));
if (missingProvenance.length) fail('links missing provenance', missingProvenance.slice(0, 10));
if (unknownRelations.length) fail('links use relations absent from ontology', unknownRelations.slice(0, 10));
if (unknownConfidence.length) fail('links use unknown confidence values', unknownConfidence.slice(0, 10));

const articleNodes = (graph.nodes || []).filter((node) => node.type === 'article').length;
if (articleNodes !== graph.stats?.articleCount) {
  fail('article node count does not match graph stats', { articleNodes, stats: graph.stats?.articleCount });
}

if (!process.exitCode) {
  const confidenceCounts = (graph.links || []).reduce((acc, link) => {
    const key = link.provenance.confidence;
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
  console.log(JSON.stringify({
    ok: true,
    nodes: graph.nodes.length,
    links: graph.links.length,
    articleNodes,
    confidenceCounts,
    perspectives: (graph.perspectives || []).map((perspective) => perspective.id),
  }, null, 2));
}
