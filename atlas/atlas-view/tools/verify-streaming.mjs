#!/usr/bin/env node
/**
 * verify-streaming.mjs — smoke-test the GCS .glimbin streaming path.
 *
 * This is the project's historically most fragile path (WAF blocks,
 * Cloudflare edge black-holing, Range-request support) and had ZERO
 * automated coverage — verify-gallery only exercised a local file.
 *
 * Two layers:
 *   1. Raw reachability: HEAD + a 256-byte Range request, to isolate
 *      "GCS/CDN reachable + partial content works" from parser logic.
 *   2. Real StreamingLoader: header -> index -> frame 0 -> metadata,
 *      the exact 3-phase path the viewer uses.
 *
 * Run from atlas-view root:  npx -y tsx tools/verify-streaming.mjs
 * Exit 0 = pass, 1 = fail. Network-dependent (hits public GCS).
 */

import { StreamingLoader, isGlimbinUrl } from '../packages/parsers/src/StreamingLoader.ts';

// Small (1k-atom) public GCS dataset — same bucket the gallery streams from.
const URL_ = process.env.STREAM_URL
  ?? 'https://storage.googleapis.com/glim-datasets/sims/oscillation_timeseries.glimbin';

const results = [];
const check = (name, ok, detail = '') => {
  results.push(ok);
  console.log(`${ok ? '  ✓' : '  ✗'} ${name}${detail ? ` — ${detail}` : ''}`);
};

console.log(`[verify-streaming] → ${URL_}`);

try {
  check('URL is recognised as a .glimbin', isGlimbinUrl(URL_));

  // ── Layer 1: raw reachability + Range support ──
  const head = await fetch(URL_, { method: 'HEAD' });
  check('GCS object reachable (HEAD 2xx)', head.ok, `HTTP ${head.status}`);
  const acceptsRanges = head.headers.get('accept-ranges');
  const totalLen = Number(head.headers.get('content-length') || 0);

  const ranged = await fetch(URL_, { headers: { Range: 'bytes=0-255' } });
  const partial = ranged.status === 206;
  const buf = new Uint8Array(await ranged.arrayBuffer());
  check('partial content works (HTTP 206 to a Range request)', partial, `HTTP ${ranged.status}, accept-ranges=${acceptsRanges}`);
  check('first 256 bytes returned', buf.byteLength === 256, `${buf.byteLength} bytes of ${totalLen}`);

  // ── Layer 2: the real StreamingLoader 3-phase path ──
  const loader = new StreamingLoader(URL_);
  const header = await loader.fetchHeader();
  check('fetchHeader() returns a header', !!header);
  await loader.fetchIndex();
  const meta = loader.getMetadata();
  check('getMetadata() populated', !!meta && meta.totalFrames > 0, `totalFrames=${meta?.totalFrames}`);

  const frame0 = await loader.fetchFrame(0);
  const n = frame0?.positions?.length ? frame0.positions.length / 3 : 0;
  check('fetchFrame(0) yields atoms', n > 0, `${n} atoms`);
  check('atom count is plausible (~1k for this dataset)', n > 100 && n < 100_000, `${n}`);
} catch (err) {
  check('streaming path ran without throwing', false, err?.message ?? String(err));
}

const failed = results.filter((r) => !r).length;
console.log(`\n[verify-streaming] ${results.length - failed}/${results.length} checks passed`);
process.exit(failed === 0 ? 0 : 1);
