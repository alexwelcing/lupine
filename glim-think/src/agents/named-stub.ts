/**
 * Lazy, test-safe accessor for a correctly-named Agent Durable Object stub.
 *
 * Why dynamic import: the `agents` package imports the `cloudflare:workers`
 * module scheme. A static `import { getAgentByName } from "agents"` pulls
 * that into the import graph of anything that transitively imports the queue
 * (e.g. research/__tests__/sync.test.ts), and Vitest's default ESM loader
 * cannot resolve `cloudflare:` → the whole test suite fails to load. A
 * dynamic import inside the call defers `agents` to the Worker runtime path,
 * where the bundler resolves it, while keeping tests loadable. The module
 * is cached after first import, so the hot path pays the cost once.
 *
 * Why this exists at all: getting an agent DO stub via raw
 * `env.X.idFromName()/get()` and calling an RPC method throws "Attempting to
 * read .name on <Agent> before it was set" (cloudflare/workerd#2240) outside
 * the routeAgentRequest HTTP path. getAgentByName sets the name.
 */

export async function getNamedAgentStub(
  namespace: DurableObjectNamespace,
  name: string,
): Promise<DurableObjectStub> {
  const { getAgentByName } = await import("agents");
  // `agents` types the namespace as DurableObjectNamespace<Agent<…>>; our
  // bindings are untyped DurableObjectNamespace. The runtime contract (name
  // → stub) is identical; callers already treat the stub structurally.
  const ns = namespace as unknown as Parameters<typeof getAgentByName>[0];
  return (await getAgentByName(ns, name)) as unknown as DurableObjectStub;
}
