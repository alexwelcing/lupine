# Lupi MCP Roadmap

## Product Goal

Make Lupi MCP a secure, agent-usable molecular viewer service that Codex, Claude Code, and local research tools can drive from a development browser without manual viewer setup.

## Current Baseline

- `/#/mcp` runs the real Atlas viewer bridge, not the old marketing/studio mock.
- Firebase Auth is wired into the viewer header and MCP harness.
- The `shed-489901` Firebase project has Google sign-in enabled and authorizes local dev return domains.
- The production Firebase auth domain is branded as `lupi.live`, with Cloud Run proxying Firebase's reserved auth helper paths.
- The local viewer uses Firebase SDK redirect persistence and can expose a Firebase ID token that the MCP server can require on protected requests.
- A server-issued HttpOnly session cookie is still pending; it should be created by exchanging the ID token with an MCP/auth backend, not by writing a token cookie from the browser.
- Firestore is now the canonical saved-view store for user-owned `/view/:slug` share links. The public path is served through the saved-view social-card function and redirects human browsers into the SPA view route; saved views store the molecule source plus camera, display, background, material, annotation, playback, and export-base state.

## Milestone 1: Authenticated Local Dogfood

- Keep Google redirect sign-in as the default browser flow.
- Pass Firebase ID tokens with every browser-to-MCP request.
- Add an auth session endpoint that exchanges a fresh Firebase ID token for a `Secure`, `HttpOnly`, `SameSite=Lax` session cookie on `lupi.live`.
- Add an MCP server auth middleware that verifies Firebase ID tokens with the Admin SDK.
- Return structured auth failures: `UNAUTHENTICATED`, `TOKEN_EXPIRED`, and `FORBIDDEN`.
- Add a dev-only auth status probe so Codex can verify whether the viewer and server agree on the user.

## Milestone 2: Stable Agent Contract

- Freeze the first supported tool set around viewer control, structure loading, style changes, camera control, screenshots, and export.
- Publish JSON schemas for every request and response.
- Add an MCP command for `lupi.save_view` that writes the same Firestore saved-view document as the browser button.
- Add deterministic request IDs, transcript entries, and replayable command logs.
- Provide setup snippets for Codex and Claude Code that target the local MCP endpoint.

## Milestone 3: Production-Grade Viewer Operations

- Add durable scene/session IDs so agents can reopen or share a generated view.
- Stream large molecule loads and return progress events instead of blocking.
- Add screenshot/export artifact storage with authenticated download URLs.
- Gate expensive operations by user/project quotas.

## Milestone 4: Security And Admin

- Add Firebase custom claims for admin, internal tester, and public user roles.
- Keep all MCP mutating tools behind auth.
- Add audit logging for agent, user, tool name, latency, and artifact outputs.
- Add an admin settings surface for endpoint, auth state, token refresh, and server health.

## Milestone 5: Verification

- Add unit coverage for auth state, request token attachment, and schema validation.
- Add browser smoke tests for `/#/mcp`: signed-out state, redirect sign-in launch, token-present state, and authenticated command execution.
- Add server tests with valid, expired, malformed, and missing Firebase tokens.
- Add a release checklist that separates local build, deployed Firebase/Auth config, MCP server health, and live viewer behavior.
