#!/usr/bin/env node
/**
 * Verifies the browser-side Lupi MCP bridge that Codex, Claude Code, and
 * dev-browser automation depend on. This intentionally drives the real page
 * through both supported control paths:
 *
 * 1. direct page context: window.__lupiViewerMcp.execute(...)
 * 2. browser message bridge: window.postMessage({ type: 'lupi:mcp:execute' })
 *
 * Usage:
 *   VERIFY_URL=http://127.0.0.1:5174/#/mcp pnpm verify:mcp-bridge
 */

import { chromium } from 'playwright';
import { existsSync, mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '..');
const ARTIFACTS = resolve(REPO_ROOT, '.verify-artifacts');
const URL = process.env.VERIFY_URL ?? 'http://127.0.0.1:5174/#/mcp';
const timeout = Number(process.env.VERIFY_TIMEOUT ?? 30000);

if (!existsSync(ARTIFACTS)) mkdirSync(ARTIFACTS, { recursive: true });

const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const screenshotPath = join(ARTIFACTS, `${stamp}-mcp-bridge.png`);
const catalogScreenshotPath = join(ARTIFACTS, `${stamp}-mcp-catalog-controls.png`);
const agentDockScreenshotPath = join(ARTIFACTS, `${stamp}-agent-dock.png`);
const authCalloutScreenshotPath = join(ARTIFACTS, `${stamp}-auth-callout.png`);
const userMenuScreenshotPath = join(ARTIFACTS, `${stamp}-user-menu.png`);

const browser = await chromium.launch({
  headless: process.env.HEADLESS !== '0',
  executablePath: process.env.CHROME_PATH || undefined,
});

try {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();

  page.on('console', (msg) => {
    const text = msg.text();
    if (!text.includes('[lupi dev]')) return;
    console.log(`[PAGE ${msg.type()}] ${text}`);
  });
  page.on('pageerror', (error) => {
    console.log(`[PAGE ERROR] ${error.message}`);
  });

  console.log(`[verify:mcp] opening ${URL}`);
  await page.goto(URL, { waitUntil: 'domcontentloaded', timeout });

  await page.waitForFunction(
    () => window.__lupiViewerMcp?.ready === true && window.__lupiViewerMcpReady === true,
    null,
    { timeout }
  );

  const readyState = await page.evaluate(() => ({
    version: window.__lupiViewerMcpVersion,
    state: window.__lupiViewerMcp?.state(),
  }));
  check('bridge exposes ready driver', Boolean(readyState.version), readyState);

  const directResponse = await page.evaluate(async () => {
    return await window.__lupiViewerMcp.execute({
      id: 'verify-direct-water',
      tool: 'lupi.generate_molecule',
      arguments: {
        inputType: 'template',
        input: 'Water',
        viewer: {
          showBonds: true,
          atomScale: 1.2,
          cameraPreset: 'iso',
        },
      },
    });
  });
  check('direct execute loads Water', directResponse.ok && directResponse.result?.molecule?.name === 'Water', directResponse);

  const stateAfterDirect = await page.evaluate(() => window.__lupiViewerMcp.state());
  check('direct execute updates viewer state', stateAfterDirect.fileName === 'MCP: Water' && stateAfterDirect.atomCount === 3, stateAfterDirect);

  const messageResponse = await page.evaluate(async () => {
    const requestId = `verify-message-${Date.now()}`;
    return await new Promise((resolve, reject) => {
      const timer = window.setTimeout(() => {
        window.removeEventListener('message', onMessage);
        reject(new Error('Timed out waiting for lupi:mcp:response'));
      }, 6000);

      const onMessage = (event) => {
        if (event.data?.type !== 'lupi:mcp:response') return;
        if (event.data.requestId !== requestId) return;
        window.clearTimeout(timer);
        window.removeEventListener('message', onMessage);
        resolve(event.data);
      };

      window.addEventListener('message', onMessage);
      window.postMessage({
        type: 'lupi:mcp:execute',
        requestId,
        request: {
          id: 'verify-message-set-viewer',
          tool: 'lupi.set_viewer',
          arguments: {
            showBonds: false,
            atomScale: 1.05,
            backgroundPreset: 'blueprint',
            postprocessPreset: 'diagram',
          },
        },
      }, window.location.origin);
    });
  });
  check('postMessage execute replies', messageResponse.ok === true, messageResponse);

  const commandResponse = await page.evaluate(async () => {
    const requestId = `verify-command-${Date.now()}`;
    return await new Promise((resolve, reject) => {
      const timer = window.setTimeout(() => {
        window.removeEventListener('message', onMessage);
        reject(new Error('Timed out waiting for command response'));
      }, 6000);

      const onMessage = (event) => {
        if (event.data?.type !== 'lupi:mcp:response') return;
        if (event.data.requestId !== requestId) return;
        window.clearTimeout(timer);
        window.removeEventListener('message', onMessage);
        resolve(event.data);
      };

      window.addEventListener('message', onMessage);
      window.postMessage({
        type: 'lupi:mcp:execute',
        requestId,
        command: '{"id":"verify-command-state","tool":"lupi.viewer_state","arguments":{}}',
      }, window.location.origin);
    });
  });
  check('postMessage command parsing replies', commandResponse.responses?.[0]?.ok === true, commandResponse);

  const malformedResponse = await page.evaluate(async () => {
    const requestId = `verify-malformed-${Date.now()}`;
    return await new Promise((resolve, reject) => {
      const timer = window.setTimeout(() => {
        window.removeEventListener('message', onMessage);
        reject(new Error('Timed out waiting for malformed response'));
      }, 6000);

      const onMessage = (event) => {
        if (event.data?.type !== 'lupi:mcp:response') return;
        if (event.data.requestId !== requestId) return;
        window.clearTimeout(timer);
        window.removeEventListener('message', onMessage);
        resolve(event.data);
      };

      window.addEventListener('message', onMessage);
      window.postMessage({ type: 'lupi:mcp:execute', requestId, request: { nope: true } }, window.location.origin);
    });
  });
  check('malformed message returns structured error', malformedResponse.ok === false && Boolean(malformedResponse.responses?.[0]?.error?.message), malformedResponse);

  const logState = await page.evaluate(() => ({
    count: window.__lupiViewerMcpResponses?.length ?? 0,
    last: window.__lupiViewerMcpResponses?.at(-1) ?? null,
  }));
  check('bridge keeps response log', logState.count >= 3 && logState.last?.type === 'lupi:mcp:response', logState);

  await page.waitForFunction(() => Boolean(window.__lupiFirebaseAuth), null, { timeout });
  await page.waitForFunction(() => window.__lupiFirebaseAuth.getState().loading === false, null, { timeout });
  const authState = await page.evaluate(() => window.__lupiFirebaseAuth.getState());
  check('auth exposes settled shared state', authState.loading === false && 'hasToken' in authState, authState);
  const signedOutAuthTrigger = await page.locator('[data-testid="lupi-agent-dock-button"]').textContent();
  check(
    'signed-out auth trigger invites sign in',
    signedOutAuthTrigger?.includes('Sign in') && !signedOutAuthTrigger.includes('Checking'),
    signedOutAuthTrigger
  );

  await page.waitForSelector('[data-testid="lupi-auth-callout"]', { timeout: 8000 });
  const authCalloutState = await page.evaluate(() => ({
    text: document.querySelector('[data-testid="lupi-auth-callout"]')?.textContent ?? '',
    google: Boolean(document.querySelector('[data-testid="lupi-auth-callout-google"]')),
    github: Boolean(document.querySelector('[data-testid="lupi-auth-callout-github"]')),
  }));
  check(
    'sign-in callout exposes direct providers',
    authCalloutState.text.includes('Lupi ID') && authCalloutState.google && authCalloutState.github,
    authCalloutState
  );
  await page.screenshot({ path: authCalloutScreenshotPath, fullPage: false });
  console.log(`[verify:mcp] auth callout screenshot: ${authCalloutScreenshotPath}`);

  const overrideState = await page.evaluate(async () => {
    const before = window.__lupiFirebaseAuth.getState();
    if (!before.overrideAvailable) return { skipped: true, before };
    await window.__lupiFirebaseAuth.overrideSignIn();
    return window.__lupiFirebaseAuth.getState();
  });
  check(
    'auth override simulates Codex test account',
    overrideState.skipped || (overrideState.override === true && overrideState.email === 'codex-test@lupi.local' && overrideState.hasToken === true),
    overrideState
  );

  await page.waitForSelector('[data-testid="lupi-agent-dock-button"]', { timeout });
  await page.click('[data-testid="lupi-agent-dock-button"]');
  await page.waitForSelector('[data-testid="lupi-agent-dock-panel"]', { timeout: 8000 });
  await page.click('[data-testid="lupi-agent-dock-tab-mcp"]');
  await page.waitForSelector('[data-testid="lupi-agent-dock-mcp"]', { timeout: 8000 });
  check('agent dock exposes signed-in MCP controls', true, {});
  await page.screenshot({ path: agentDockScreenshotPath, fullPage: false });
  console.log(`[verify:mcp] agent dock screenshot: ${agentDockScreenshotPath}`);
  await page.click('[data-testid="lupi-agent-dock-tab-id"]');
  await page.waitForSelector('[data-testid="lupi-agent-dock-id"]', { timeout: 8000 });
  const userMenuState = await page.evaluate(() => ({
    text: document.querySelector('[data-testid="lupi-agent-dock-id"]')?.textContent ?? '',
    auth: window.__lupiFirebaseAuth?.getState(),
  }));
  check(
    'user menu renders signed-in session controls',
    userMenuState.text.includes('Codex Test')
      && userMenuState.text.includes('Copy token')
      && userMenuState.text.includes('Sign out')
      && userMenuState.auth?.override === true,
    userMenuState
  );
  await page.screenshot({ path: userMenuScreenshotPath, fullPage: false });
  console.log(`[verify:mcp] user menu screenshot: ${userMenuScreenshotPath}`);
  await page.click('[data-testid="lupi-agent-dock-button"]');

  await page.waitForSelector('[data-testid="lupine-mcp-harness"]', { timeout });
  await page.waitForSelector('[data-testid="lupine-mcp-catalog-search"]', { timeout });
  await page.fill('[data-testid="lupine-mcp-catalog-search"]', 'Fe');
  await page.waitForFunction(
    () => document.querySelectorAll('[data-testid^="lupine-mcp-catalog-result-"]').length > 0,
    null,
    { timeout: 8000 }
  );
  check('catalog-first controls render searchable results', true, {
    count: await page.locator('[data-testid^="lupine-mcp-catalog-result-"]').count(),
  });
  await page.screenshot({ path: catalogScreenshotPath, fullPage: false });
  console.log(`[verify:mcp] catalog screenshot: ${catalogScreenshotPath}`);

  await page.click('[data-testid="lupine-mcp-collapse"]');
  await page.waitForSelector('[data-testid="lupine-mcp-open"]', { timeout: 8000 });
  await page.click('[data-testid="lupine-mcp-open"]');
  await page.waitForSelector('[data-testid="lupine-mcp-harness"]', { timeout: 8000 });
  check('MCP controls collapse and reopen', true, {});

  await page.click('[data-testid="lupine-mcp-panel-command"]');
  await page.waitForSelector('[data-testid="lupine-mcp-command-input"]', { timeout: 8000 });
  check('advanced JSON command panel remains available', true, {});

  await page.click('[data-testid="lupine-mcp-panel-agent"]');
  await page.waitForSelector('[data-testid="lupine-mcp-agent-command"]', { timeout: 8000 });
  await page.fill('[data-testid="lupine-mcp-agent-command"]', 'load Water with bonds atom scale 1.1 paper look camera iso');
  await page.locator('[data-testid="lupine-mcp-send-agent"]').evaluate((button) => button.click());
  await page.waitForFunction(
    () => window.__lupiViewerMcp?.state().fileName === 'MCP: Water'
      && window.__lupiViewerMcpResponses?.some((entry) => entry.requestId?.startsWith('agent-postmessage-') && entry.ok),
    null,
    { timeout: 10000 }
  );
  const agentPanelState = await page.evaluate(() => ({
    fileName: window.__lupiViewerMcp?.state().fileName,
    logCount: document.querySelectorAll('[data-testid="lupine-mcp-response-entry"]').length,
    responses: window.__lupiViewerMcpResponses?.slice(-5).map((entry) => ({
      ok: entry.ok,
      requestId: entry.requestId,
      errors: entry.responses?.map((response) => response.error?.message).filter(Boolean),
      tools: entry.responses?.map((response) => response.tool),
    })),
    packetVisible: Boolean(document.querySelector('[data-testid="lupine-mcp-agent-packet"]')),
  }));
  check(
    'agent panel sends through postMessage bridge',
    agentPanelState.fileName === 'MCP: Water'
      && agentPanelState.packetVisible
      && agentPanelState.responses?.some((entry) => entry.requestId?.startsWith('agent-postmessage-') && entry.ok),
    agentPanelState
  );

  await page.click('[data-testid="lupine-mcp-panel-response"]');
  await page.waitForFunction(
    () => document.querySelectorAll('[data-testid="lupine-mcp-response-entry"]').length > 0,
    null,
    { timeout: 8000 }
  );
  const ledgerState = await page.evaluate(() => ({
    entryCount: document.querySelectorAll('[data-testid="lupine-mcp-response-entry"]').length,
    hasReplayActions: document.body.innerText.includes('Run')
      && document.body.innerText.includes('JSON')
      && document.body.innerText.includes('Packet'),
    storedCount: JSON.parse(localStorage.getItem('lupi.viewer.mcp.responses.v1') || '[]').length,
  }));
  check('MCP response log renders persistent run ledger', ledgerState.entryCount > 0 && ledgerState.hasReplayActions && ledgerState.storedCount > 0, ledgerState);

  await page.waitForFunction(
    () => document.body.innerText.includes('Lupi controls') || window.__lupiViewerMcp?.state().fileName,
    null,
    { timeout: 8000 }
  ).catch(() => undefined);
  await page.waitForTimeout(1000);
  await page.screenshot({ path: screenshotPath, fullPage: false });
  console.log(`[verify:mcp] screenshot: ${screenshotPath}`);
} finally {
  await browser.close();
}

function check(label, ok, detail) {
  if (!ok) {
    console.error(`[verify:mcp] FAIL ${label}`);
    console.error(JSON.stringify(detail, null, 2));
    process.exitCode = 1;
    throw new Error(label);
  }
  console.log(`[verify:mcp] OK ${label}`);
}
